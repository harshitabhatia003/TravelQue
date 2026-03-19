"""
API client integrations for real flight and hotel searches.
- Amadeus API: For flights (requires valid OAuth2 credentials)
- RapidAPI Hotels: For hotel searches (requires valid API key)

SETUP REQUIREMENTS:
1. Get Amadeus API credentials from https://developer.amadeus.com/
   - Create an app and enable "Self-Serve Workspace"
   - Get your Client ID and Client Secret
   - Add to .env as AMADEUS_API_KEY and AMADEUS_API_SECRET

2. Get RapidAPI credentials from https://rapidapi.com/
   - Search for "Hotels.com" API
   - Get your API Key and Host
   - Add to .env as RAPID_API_KEY and RAPID_API_HOST
"""

import httpx
import logging
from typing import Optional, Dict, List, Any
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from app.core.config_api import get_settings, validate_api_configuration
from app.schemas.escalation import AlternativeOption
import asyncio

logger = logging.getLogger(__name__)


class BaseAPIClient(ABC):
    """Base class for all API integrations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.timeout = self.settings.API_REQUEST_TIMEOUT
        self.max_retries = self.settings.MAX_RETRIES
        self.retry_backoff = self.settings.RETRY_BACKOFF
    
    async def _make_request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict] = None,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
        use_mock: bool = False
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic
        Raises error if USE_MOCK_APIS is False and request fails
        """
        if use_mock or self.settings.USE_MOCK_APIS:
            return await self.get_mock_data()
        
        headers = headers or {}
        headers["User-Agent"] = "TravelQue/1.0"
        
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    if self.settings.LOG_API_CALLS:
                        logger.info(f"API Call: {method} {url}")
                    
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        params=params,
                        json=json
                    )
                    
                    response.raise_for_status()
                    return response.json()
                    
            except httpx.HTTPError as e:
                logger.warning(f"API request failed (attempt {attempt+1}/{self.max_retries}): {e}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_backoff ** attempt)
                else:
                    # All retries exhausted, raise error
                    logger.error(f"API request failed after {self.max_retries} attempts: {url}")
                    raise
            
            except Exception as e:
                logger.error(f"Unexpected error in API request: {e}")
                raise
        
        raise Exception("API request failed")
    
    @abstractmethod
    async def get_mock_data(self) -> Dict[str, Any]:
        """Return mock data when API is unavailable"""
        pass


class AmadeusAPI(BaseAPIClient):
    """Amadeus API integration for flight searches and bookings"""
    
    def __init__(self):
        super().__init__()
        self.api_key = self.settings.AMADEUS_API_KEY
        self.api_secret = self.settings.AMADEUS_API_SECRET
        self.base_url = self.settings.AMADEUS_API_URL
        self.access_token = None
    
    async def _get_access_token(self) -> str:
        """Get OAuth2 access token from Amadeus"""
        if self.access_token:
            return self.access_token
        
        if not self.api_key or not self.api_secret:
            logger.warning("Amadeus credentials not configured, using mock data")
            return None
        
        try:
            url = "https://test.api.amadeus.com/v1/security/oauth2/token"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.api_key,
                        "client_secret": self.api_secret
                    }
                )
                response.raise_for_status()
                data = response.json()
                self.access_token = data["access_token"]
                return self.access_token
        except Exception as e:
            logger.error(f"Failed to get Amadeus token: {e}")
            logger.error(f"Amadeus API Key: {self.api_key[:10]}..." if self.api_key else "No API key configured")
            return None
    
    async def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        adults: int = 1,
        limit: int = 5
    ) -> List[AlternativeOption]:
        """
        Search flights on Amadeus
        Returns list of AlternativeOption objects
        """
        
        token = await self._get_access_token()
        if not token:
            raise Exception("Failed to authenticate with Amadeus API. Check credentials in .env file.")
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        params = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": departure_date,
            "adults": str(adults),
            "max": str(limit)
        }
        
        if return_date:
            params["returnDate"] = return_date
        
        url = f"{self.base_url}/shopping/flight-offers"
        
        # Don't use mock - require real API
        response = await self._make_request(
            "GET",
            url,
            headers=headers,
            params=params,
            use_mock=False
        )
        
        return await self._parse_flight_results(response, limit)
    
    async def _parse_flight_results(
        self,
        response: Dict,
        limit: int
    ) -> List[AlternativeOption]:
        """Parse Amadeus response into AlternativeOption objects"""
        
        alternatives = []
        
        # Handle both real API and mock response format
        flights = response.get("data", response.get("flights", []))
        
        for i, flight in enumerate(flights[:limit]):
            flight_id = flight.get("id") or str(i)
            
            # Get first itinerary
            itineraries = flight.get("itineraries", [])
            if not itineraries:
                continue
            
            first_leg = itineraries[0]
            segments = first_leg.get("segments", [])
            
            # Build flight string
            flight_details = []
            for segment in segments:
                departure = segment.get("departure", {})
                arrival = segment.get("arrival", {})
                
                dep_time = departure.get("at", "").split("T")[1] if departure.get("at") else "N/A"
                arr_time = arrival.get("at", "").split("T")[1] if arrival.get("at") else "N/A"
                airline = segment.get("operating", {}).get("carrierCode", "?")
                duration = segment.get("duration", "N/A")
                
                flight_details.append(f"{airline} {dep_time}-{arr_time} ({duration})")
            
            price = flight.get("price", {})
            total_price = float(price.get("total", 450))
            currency = price.get("currency", "USD")
            
            stops = len(segments) - 1
            is_direct = stops == 0
            
            match_score = min(100, 50 + (30 if is_direct else 20))
            recommendation_level = "HIGH" if is_direct else "MEDIUM"
            
            alt = AlternativeOption(
                provider="Amadeus",
                provider_id=flight_id,
                name=f"{'Direct' if is_direct else f'{stops} stop'} flight - {' → '.join([s.get('departure', {}).get('at', '').split('T')[0] for s in segments])}",
                details={
                    "flights": flight_details,
                    "stops": stops,
                    "total_duration": itineraries[0].get("duration", "N/A"),
                    "aircraft": segments[0].get("aircraft", {}).get("code", "N/A") if segments else "N/A",
                    "seat_class": "Economy"
                },
                price=total_price,
                currency="USD",
                match_score=match_score,
                reasoning=f"{'Direct flight' if is_direct else f'{stops} stops'} from Amadeus, competitive pricing",
                pros=[
                    "Real-time availability",
                    f"{'Non-stop service' if is_direct else 'Cost-effective option'}",
                    "Flexible rebooking"
                ],
                cons=[
                    "Non-refundable base fare",
                    "Baggage fees may apply" if not is_direct else "Limited seat selection"
                ],
                recommendation_level=recommendation_level,
                price_difference=0.0
            )
            alternatives.append(alt)
        
        return alternatives
    
    async def get_mock_data(self) -> Dict[str, Any]:
        """Return mock flight data"""
        return {
            "data": [
                {
                    "id": "am-001",
                    "itineraries": [{
                        "duration": "PT2H30M",
                        "segments": [{
                            "departure": {"at": "2026-02-15T08:00:00"},
                            "arrival": {"at": "2026-02-15T10:30:00"},
                            "operating": {"carrierCode": "BA"},
                            "aircraft": {"code": "320"},
                            "duration": "PT2H30M"
                        }]
                    }],
                    "price": {"total": 450, "currency": "USD"}
                },
                {
                    "id": "am-002",
                    "itineraries": [{
                        "duration": "PT3H45M",
                        "segments": [
                            {
                                "departure": {"at": "2026-02-15T10:15:00"},
                                "arrival": {"at": "2026-02-15T12:00:00"},
                                "operating": {"carrierCode": "LH"},
                                "aircraft": {"code": "319"},
                                "duration": "PT1H45M"
                            },
                            {
                                "departure": {"at": "2026-02-15T13:00:00"},
                                "arrival": {"at": "2026-02-15T13:45:00"},
                                "operating": {"carrierCode": "LH"},
                                "aircraft": {"code": "320"},
                                "duration": "PT2H00M"
                            }
                        ]
                    }],
                    "price": {"total": 380, "currency": "USD"}
                },
                {
                    "id": "am-003",
                    "itineraries": [{
                        "duration": "PT2H15M",
                        "segments": [{
                            "departure": {"at": "2026-02-15T14:30:00"},
                            "arrival": {"at": "2026-02-15T17:00:00"},
                            "operating": {"carrierCode": "AF"},
                            "aircraft": {"code": "321"},
                            "duration": "PT2H15M"
                        }]
                    }],
                    "price": {"total": 520, "currency": "USD"}
                }
            ]
        }

class HotelsAPI(BaseAPIClient):
    """RapidAPI integration for hotel searches"""
    
    def __init__(self):
        super().__init__()
        self.api_key = self.settings.RAPID_API_KEY
        self.api_host = self.settings.RAPID_API_HOST
        self.base_url = "https://hotels-com-free.p.rapidapi.com"
    
    async def search_hotels(
        self,
        destination: str,
        check_in: str,
        check_out: str,
        guests: int = 1,
        rooms: int = 1,
        rating_min: Optional[float] = None,
        price_max: Optional[float] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search hotels using RapidAPI Hotels.com API
        Returns list of hotel results only - no mock data fallback
        """
        
        if not self.api_key or not self.api_host:
            raise Exception("RapidAPI credentials not configured")
        
        try:
            # Calculate nights
            from datetime import datetime
            ci = datetime.strptime(check_in, "%Y-%m-%d")
            co = datetime.strptime(check_out, "%Y-%m-%d")
            nights = max((co - ci).days, 1)
            
            headers = {
                "x-rapidapi-key": self.api_key,
                "x-rapidapi-host": self.api_host
            }
            
            params = {
                "q": destination,
                "domain": "com",
                "checkIn": check_in,
                "checkOut": check_out,
                "guests": str(guests),
                "rooms": str(rooms),
                "adults": str(guests)
            }
            
            if rating_min:
                params["starRating"] = str(int(rating_min))
            
            # First, search for destination - don't use mock
            search_url = f"{self.base_url}/search"
            search_response = await self._make_request(
                "GET",
                search_url,
                headers=headers,
                params=params,
                use_mock=False
            )
            
            if not search_response or "result" not in search_response:
                raise Exception("No results from hotel API")
            
            results = []
            for hotel in search_response.get("result", [])[:limit]:
                room_data = hotel.get("accessibilityLabel", {})
                price = hotel.get("priceBreakdown", {}).get("grossPrice", {}).get("value", 0)
                cost = round(price * nights * rooms, 2)
                sell = round(cost * 1.12, 2)
                
                if price_max and sell > price_max:
                    continue
                
                results.append({
                    "id": hotel.get("id"),
                    "name": hotel.get("name", "Unknown Hotel"),
                    "rating": hotel.get("reviewScore", 0) / 20 if hotel.get("reviewScore") else 0,
                    "location": hotel.get("city", destination),
                    "price_per_night": price,
                    "total_nights": nights,
                    "cost_price": cost,
                    "sell_price": sell,
                    "rooms": rooms,
                    "guests": guests,
                    "amenities": hotel.get("amenities", [])[:5],
                    "availability": hotel.get("availableRooms", 0),
                    "url": hotel.get("url")
                })
            
            if not results:
                raise Exception("No hotels found matching criteria")
            
            return {"hotels": results}
            
        except Exception as e:
            logger.error(f"Hotel search failed: {e}")
            raise
    
    async def get_mock_data(self) -> Dict[str, Any]:
        """Return mock hotel data"""
        return {
            "hotels": [
                {
                    "id": "ht-001",
                    "name": "Grand Plaza Hotel",
                    "rating": 4.5,
                    "location": "City Centre",
                    "price_per_night": 180,
                    "total_nights": 3,
                    "cost_price": 540,
                    "sell_price": 604.8,
                    "rooms": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "Pool", "Gym", "Spa", "Restaurant"],
                    "availability": 5,
                    "url": "https://example.com/hotel/grand-plaza"
                },
                {
                    "id": "ht-002",
                    "name": "Marriott Suites",
                    "rating": 4.3,
                    "location": "Business District",
                    "price_per_night": 220,
                    "total_nights": 3,
                    "cost_price": 660,
                    "sell_price": 739.2,
                    "rooms": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "Gym", "Restaurant", "Bar", "Concierge"],
                    "availability": 3,
                    "url": "https://example.com/hotel/marriott-suites"
                },
                {
                    "id": "ht-003",
                    "name": "Hilton Garden Inn",
                    "rating": 4.0,
                    "location": "Airport Area",
                    "price_per_night": 120,
                    "total_nights": 3,
                    "cost_price": 360,
                    "sell_price": 403.2,
                    "rooms": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "Parking", "Breakfast Included", "Gym"],
                    "availability": 12,
                    "url": "https://example.com/hotel/hilton-garden-inn"
                },
                {
                    "id": "ht-004",
                    "name": "Boutique Residence",
                    "rating": 4.7,
                    "location": "Old Town",
                    "price_per_night": 280,
                    "total_nights": 3,
                    "cost_price": 840,
                    "sell_price": 940.8,
                    "rooms": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "Rooftop Bar", "Concierge", "Spa", "Museum Access"],
                    "availability": 2,
                    "url": "https://example.com/hotel/boutique-residence"
                },
                {
                    "id": "ht-005",
                    "name": "Intercontinental Waterfront",
                    "rating": 4.8,
                    "location": "Waterfront",
                    "price_per_night": 350,
                    "total_nights": 3,
                    "cost_price": 1050,
                    "sell_price": 1176,
                    "rooms": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "Pool", "Spa", "Beach Access", "Fine Dining"],
                    "availability": 4,
                    "url": "https://example.com/hotel/intercontinental"
                }
            ]
        }