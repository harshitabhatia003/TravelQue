"""
Escalation Service - Handles escalation creation, search, ranking, and resolution
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from app.models.user import Escalation, BookingItem, EscalationStatus, EscalationPriority, BookingType, BookingStatus
from app.schemas.escalation import AlternativeOption, RankedAlternatives
from app.services.api_integrations import AmadeusAPI
import math


class EscalationService:
    """Service for managing booking escalations"""
    
    @staticmethod
    def calculate_priority(departure_date: Optional[date], now: datetime = None) -> EscalationPriority:
        """Calculate priority based on departure date"""
        if now is None:
            now = datetime.utcnow()
        
        if not departure_date:
            return EscalationPriority.MEDIUM
        
        days_until_departure = (departure_date - now.date()).days
        
        if days_until_departure <= 1:
            return EscalationPriority.URGENT
        elif days_until_departure <= 3:
            return EscalationPriority.HIGH
        elif days_until_departure <= 7:
            return EscalationPriority.MEDIUM
        else:
            return EscalationPriority.LOW
    
    @staticmethod
    def create_escalation(
        journey_id: str,
        failed_booking_item: BookingItem,
        customer_name: str,
        customer_email: str,
        customer_city: Optional[str] = None,
        origin_city: Optional[str] = None,
        destination_city: Optional[str] = None,
        departure_date: Optional[date] = None,
        arrival_date: Optional[date] = None,
        travelers_count: int = 1,
        customer_preferences: Optional[Dict[str, Any]] = None,
        budget: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Create an escalation record for a failed booking
        
        Returns escalation data dict ready for DB insertion
        """
        priority = EscalationService.calculate_priority(departure_date)
        
        escalation_data = {
            "journey_id": journey_id,
            "failed_booking_item_id": failed_booking_item.id,
            "failed_item_type": failed_booking_item.booking_type,
            "failed_item_details": failed_booking_item.item_details,
            "customer_city": customer_city,
            "origin_city": origin_city,
            "destination_city": destination_city,
            "departure_date": departure_date,
            "arrival_date": arrival_date,
            "travelers_count": travelers_count,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_preferences": customer_preferences,
            "budget": budget,
            "priority": priority,
            "status": EscalationStatus.OPEN,
            "created_at": datetime.utcnow(),
        }
        
        return escalation_data
    
    @staticmethod
    def rank_alternatives(
        alternatives: List[AlternativeOption],
        escalation: Escalation,
        max_results: int = 10
    ) -> RankedAlternatives:
      
        ranked = []
        
        for alt in alternatives:
            # Convert Pydantic model to dict for scoring calculation
            alt_dict = alt.model_dump() if hasattr(alt, 'model_dump') else alt.__dict__
            
            score = EscalationService._calculate_match_score(
                alt_dict,
                escalation.failed_item_type,
                escalation.customer_preferences or {},
                escalation.budget or 0
            )
            
            alt_option = AlternativeOption(
                provider=alt.provider,
                provider_id=alt.provider_id,
                name=alt.name,
                details=alt.details,
                price=alt.price,
                currency=alt.currency,
                match_score=score,
                reasoning=alt.reasoning,
                pros=alt.pros,
                cons=alt.cons,
                recommendation_level=EscalationService._get_recommendation_level(score),
                price_difference=alt.price - (escalation.budget or 0)
            )
            ranked.append(alt_option)
        
        # Sort by match score descending
        ranked.sort(key=lambda x: x.match_score, reverse=True)
        
        return RankedAlternatives(
            total_found=len(alternatives),
            alternatives=ranked[:max_results],
            search_criteria={
                "booking_type": escalation.failed_item_type.value,
                "customer_city": escalation.customer_city,
                "origin_city": escalation.origin_city,
                "destination_city": escalation.destination_city,
                "departure_date": escalation.departure_date.isoformat() if escalation.departure_date else None,
                "travelers": escalation.travelers_count,
            },
            generated_at=datetime.utcnow()
        )
    
    @staticmethod
    def _calculate_match_score(
        alternative: Dict[str, Any],
        booking_type: BookingType,
        customer_preferences: Dict[str, Any],
        budget: float
    ) -> int:
        """Calculate match score (0-100) based on booking type and preferences"""
        score = 50  # Base score
        alt_price = alternative.get("price", budget)
        
        # Price matching (±20% acceptable)
        if budget > 0:
            price_diff = abs(alt_price - budget) / budget
            if price_diff <= 0.20:
                score += 20
            elif price_diff <= 0.30:
                score += 10
        
        # Booking type specific scoring
        if booking_type == BookingType.HOTEL:
            # Score based on amenities, location, rating
            if alternative.get("rating", 0) >= 4.5:
                score += 15
            if "amenities" in alternative and customer_preferences.get("special_requests"):
                matching_amenities = any(
                    pref.lower() in str(amenity).lower()
                    for amenity in alternative.get("amenities", [])
                    for pref in str(customer_preferences.get("special_requests", "")).split(",")
                )
                if matching_amenities:
                    score += 10
        
        elif booking_type == BookingType.FLIGHT:
            # Score based on duration, layovers, timing
            if alternative.get("layovers", 0) == 0:
                score += 10
            duration_hours = alternative.get("duration_hours", 0)
            if duration_hours > 0 and duration_hours <= 8:
                score += 10
        
        elif booking_type == BookingType.TRAIN:
            # Score based on duration, direct route
            if alternative.get("is_direct"):
                score += 15
            duration_hours = alternative.get("duration_hours", 0)
            if duration_hours > 0 and duration_hours <= 12:
                score += 10
        
        elif booking_type == BookingType.TRANSFER:
            # Score based on vehicle comfort, availability
            if alternative.get("vehicle_category") in ["luxury", "premium"]:
                score += 10
            if alternative.get("available_now"):
                score += 10
        
        return min(100, score)  # Cap at 100
    
    @staticmethod
    def _get_recommendation_level(score: int) -> str:
        """Get recommendation level based on match score"""
        if score >= 80:
            return "HIGH"
        elif score >= 60:
            return "MEDIUM"
        else:
            return "LOW"


class AlternativeSearchService:
    """Service for searching alternatives from various providers using real APIs"""
    
    @staticmethod
    async def search_hotel_alternatives(
        city: str,
        check_in: date,
        check_out: date,
        room_type: str,
        occupancy: int,
        budget: float,
        max_variance: float = 0.20
    ) -> List[AlternativeOption]:
        """
        Search for hotel alternatives
        Note: Hotel booking is not available via Amadeus API
        Returns mock data for demonstration
        """
        # Handle None dates
        if not check_in:
            from datetime import timedelta
            check_in = datetime.utcnow().date()
            check_out = (check_in + timedelta(days=3))
        
        if not check_out:
            from datetime import timedelta
            check_out = check_in + timedelta(days=3)
        
        # Mock hotel alternatives
        check_in_str = check_in.strftime("%B %d, %Y")
        check_out_str = check_out.strftime("%B %d, %Y")
        nights = (check_out - check_in).days
        
        mock_hotels = [
            AlternativeOption(
                provider="Hotel Mock",
                provider_id="mock-hotel-001",
                name=f"4-Star Hotel in {city}",
                details={
                    "rating": 4.5,
                    "check_in": check_in_str,
                    "check_out": check_out_str,
                    "nights": nights,
                    "amenities": ["Free WiFi", "Gym", "Restaurant"]
                },
                price=budget,
                currency="USD",
                match_score=80,
                reasoning="Matching your budget and preferences",
                pros=["Central location", "Excellent reviews"],
                cons=["Peak season surcharge"],
                recommendation_level="HIGH",
                price_difference=0.0
            )
        ]
        
        return mock_hotels
    
    @staticmethod
    async def search_flight_alternatives(
        origin: str,
        destination: str,
        departure_date: date,
        cabin_class: str,
        passengers: int,
        budget: float,
        max_variance: float = 0.20
    ) -> List[AlternativeOption]:
        """Search for flight alternatives using Amadeus API"""
        # Handle None date
        if not departure_date:
            departure_date = datetime.utcnow().date()
        
        amadeus_api = AmadeusAPI()
        
        alternatives = await amadeus_api.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date.isoformat(),
            adults=passengers,
            limit=5
        )
        
        return alternatives[:5]
    
    @staticmethod
    async def search_train_alternatives(
        origin: str,
        destination: str,
        departure_date: date,
        train_class: str,
        passengers: int,
        budget: float,
        max_variance: float = 0.20
    ) -> List[AlternativeOption]:
        """
        Search for train alternatives
        Note: Train booking is not available via Amadeus API
        Returns mock data for demonstration
        """
        # Handle None date
        if not departure_date:
            departure_date = datetime.utcnow().date()
        
        # Mock train alternatives
        departure_str = departure_date.strftime("%B %d, %Y")
        
        mock_trains = [
            AlternativeOption(
                provider="Train Mock",
                provider_id="mock-train-001",
                name=f"Express Train from {origin} to {destination}",
                details={
                    "departure_time": "08:00",
                    "arrival_time": "14:30",
                    "duration": "6h 30m",
                    "departure_date": departure_str,
                    "train_type": "High-speed"
                },
                price=budget,
                currency="USD",
                match_score=75,
                reasoning="Direct connection with comfortable seating",
                pros=["Scenic journey", "Central stations"],
                cons=["Limited luggage space"],
                recommendation_level="MEDIUM",
                price_difference=0.0
            )
        ]
        
        return mock_trains
    
    @staticmethod
    async def search_transfer_alternatives(
        pickup_point: str,
        dropoff_point: str,
        pickup_date: date,
        pickup_time: str,
        vehicle_category: str,
        passengers: int,
        budget: float,
        max_variance: float = 0.20
    ) -> List[AlternativeOption]:
        """
        Search for transfer alternatives
        Note: Transfer booking is not available via Amadeus API
        Returns mock data for demonstration
        """
        # Handle None date
        if not pickup_date:
            pickup_date = datetime.utcnow().date()
        
        pickup_str = pickup_date.strftime("%B %d, %Y at %s")
        
        mock_transfers = [
            AlternativeOption(
                provider="Transfer Mock",
                provider_id="mock-transfer-001",
                name=f"Professional Transfer Service",
                details={
                    "pickup_point": pickup_point,
                    "dropoff_point": dropoff_point,
                    "pickup_date": pickup_str,
                    "vehicle_type": vehicle_category,
                    "duration": "45 mins"
                },
                price=budget,
                currency="USD",
                match_score=70,
                reasoning="Reliable transfer with professional drivers",
                pros=["Professional drivers", "Real-time tracking"],
                cons=["No luggage assistance"],
                recommendation_level="MEDIUM",
                price_difference=0.0
            )
        ]
        
        return mock_transfers
