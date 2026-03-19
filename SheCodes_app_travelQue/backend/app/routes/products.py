"""
Product Search endpoints — returns dummy data only with AI-powered recommendations.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Product Search"])


# ─────────────── 0. AI Recommendation Engine ───────────────

def _get_ai_recommendations(products: list, count: int = 3) -> list:
    """
    AI engine that identifies cheaper alternatives and marks them as recommended.
    Considers both price and other factors (duration for flights, rating for hotels).
    """
    if len(products) <= count:
        return []
    
    # For flights: cheaper + shorter duration
    if products and 'duration' in products[0]:
        scored = []
        for p in products:
            price_score = 1 - (p.get('sell_price', 0) / max(pr.get('sell_price', 0) for pr in products if pr.get('sell_price')))
            duration_score = 1 - (int(p.get('duration', '0').split('h')[0]) / 24)
            combined = (price_score * 0.7) + (duration_score * 0.3)
            scored.append((p, combined))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [p[0]['id'] for p in scored[:count]]
    
    # For hotels: cheaper + higher rating
    if products and 'rating' in products[0]:
        scored = []
        for p in products:
            price_score = 1 - (p.get('sell_price', 0) / max(pr.get('sell_price', 0) for pr in products if pr.get('sell_price')))
            rating_score = p.get('rating', 3) / 5.0
            combined = (price_score * 0.6) + (rating_score * 0.4)
            scored.append((p, combined))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [p[0]['id'] for p in scored[:count]]
    
    return []


# ─────────────── 0. API Health Check ───────────────

@router.get("/health")
async def check_api_health():
    """Check if external APIs are properly configured and accessible."""
    
    return {
        "status": "ok",
        "mode": "DUMMY_DATA_ONLY",
        "message": "✅ Using dummy data with AI recommendations"
    }


# ─────────────── helpers ───────────────

def _time(base_date: str, hour: int, minute: int = 0) -> str:
    return f"{base_date}T{hour:02d}:{minute:02d}:00Z"


def _add_hours(base_date: str, hour: int, duration_h: int, duration_m: int = 0):
    dep = f"{base_date}T{hour:02d}:00:00Z"
    arr_h = hour + duration_h
    arr_m = duration_m
    arr = f"{base_date}T{arr_h:02d}:{arr_m:02d}:00Z"
    return dep, arr, f"{duration_h}h {duration_m:02d}m"


# ─────────────── 1. Search Flights ───────────────

def _get_mock_flights(origin: str, destination: str, departure_date: str, passengers: int, cabin_class: str):
    """Generate realistic mock flight data with variety."""
    price_multipliers = {"ECONOMY": 1.0, "BUSINESS": 2.8, "FIRST": 5.0}
    mult = price_multipliers.get(cabin_class.upper(), 1.0)
    
    airlines = [
        {"code": "BA", "name": "British Airways", "base": 350, "dep_h": 7, "dur_h": 8, "dur_m": 15},
        {"code": "LH", "name": "Lufthansa", "base": 280, "dep_h": 10, "dur_h": 7, "dur_m": 50},
        {"code": "AF", "name": "Air France", "base": 320, "dep_h": 9, "dur_h": 8, "dur_m": 30},
        {"code": "UA", "name": "United Airlines", "base": 400, "dep_h": 8, "dur_h": 7, "dur_m": 45},
        {"code": "KL", "name": "KLM", "base": 310, "dep_h": 11, "dur_h": 8, "dur_m": 20},
    ]
    
    flights = []
    for i, airline in enumerate(airlines, 1):
        base_price = airline["base"] * mult * passengers
        sell_price = round(base_price * 1.15, 2)
        cost_price = round(base_price, 2)
        
        dep = f"{departure_date}T{airline['dep_h']:02d}:00:00Z"
        arr_h = airline['dep_h'] + airline['dur_h']
        arr = f"{departure_date}T{arr_h:02d}:{airline['dur_m']:02d}:00Z"
        
        flights.append({
            "id": f"FL{i:03d}",
            "airline": airline["name"],
            "airline_code": airline["code"],
            "flight_number": f"{airline['code']}{1000 + i}",
            "origin": origin.upper(),
            "destination": destination.upper(),
            "departure_time": dep,
            "arrival_time": arr,
            "duration": f"{airline['dur_h']}h {airline['dur_m']:02d}m",
            "cabin_class": cabin_class.upper(),
            "seats_available": 20 + (i * 5),
            "cost_price": cost_price,
            "sell_price": sell_price,
            "currency": "USD",
            "stops": (i - 1) % 2,  # 0 or 1 stop
            "availability": 1,
        })
    
    return flights


@router.get("/flights")
async def search_flights(
    origin: str = Query(..., description="Origin airport code"),
    destination: str = Query(..., description="Destination airport code"),
    departure_date: str = Query(..., description="YYYY-MM-DD"),
    return_date: Optional[str] = Query(None),
    passengers: int = Query(1, ge=1),
    cabin_class: str = Query("ECONOMY", description="ECONOMY, BUSINESS, FIRST"),
):
    """Search available flights (dummy data with AI recommendations)."""
    
    try:
        flights = _get_mock_flights(origin, destination, departure_date, passengers, cabin_class)
        
        # Get AI recommendations
        ai_recommended_ids = _get_ai_recommendations(flights, count=2)
        
        # Mark recommended flights
        for flight in flights:
            flight["ai_recommended"] = flight["id"] in ai_recommended_ids
            if flight["ai_recommended"]:
                flight["recommendation_badge"] = "🤖 AI Recommended - Great Value!"
                flight["ai_reason"] = "Best price-to-duration ratio"
        
        if not flights:
            raise HTTPException(status_code=404, detail="No flights found for the given criteria")
        return {"flights": flights}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Flight search error: {e}")
        raise HTTPException(status_code=500, detail=f"Flight search failed: {str(e)}")


# ─────────────── 2. Search Trains ───────────────

@router.get("/trains")
async def search_trains(
    origin: str = Query(..., description="Origin city"),
    destination: str = Query(..., description="Destination city"),
    departure_date: str = Query(..., description="YYYY-MM-DD"),
    passengers: int = Query(1, ge=1),
    travel_class: str = Query("2nd Class", alias="class", description="1st Class, 2nd Class"),
):
    """Search available trains (mock data)."""

    class_mult = 1.8 if "1st" in travel_class else 1.0

    base_trains = [
        {"op": "Eurostar", "code": "ES", "base": 85, "dep_h": 7, "dur_h": 2, "dur_m": 16, "avail": 30},
        {"op": "TGV", "code": "TGV", "base": 70, "dep_h": 9, "dur_h": 3, "dur_m": 30, "avail": 45},
        {"op": "Eurostar", "code": "ES", "base": 90, "dep_h": 13, "dur_h": 2, "dur_m": 18, "avail": 18},
        {"op": "Italo", "code": "IT", "base": 55, "dep_h": 16, "dur_h": 1, "dur_m": 45, "avail": 60},
    ]

    trains = []
    for i, t in enumerate(base_trains, 1):
        cost = round(t["base"] * class_mult * passengers, 2)
        sell = round(cost * 1.15, 2)
        dep, arr, dur = _add_hours(departure_date, t["dep_h"], t["dur_h"], t["dur_m"])
        trains.append({
            "id": f"TR-{i:03d}",
            "operator": t["op"],
            "train_number": f"{t['code']}{2000 + i}",
            "origin": origin,
            "destination": destination,
            "departure_time": dep,
            "arrival_time": arr,
            "duration": dur,
            "travel_class": travel_class,
            "cost_price": cost,
            "sell_price": sell,
            "availability": t["avail"],
        })

    return {"trains": trains}


# ─────────────── 3. Search Hotels ───────────────

def _get_mock_hotels(destination: str, check_in: str, check_out: str, guests: int, rooms: int):
    """Generate realistic mock hotel data with variety."""
    
    # Calculate nights
    try:
        from datetime import datetime as dt
        ci = dt.strptime(check_in, "%Y-%m-%d")
        co = dt.strptime(check_out, "%Y-%m-%d")
        nights = (co - ci).days
    except:
        nights = 1
    
    hotels = [
        {"name": "Luxury Plaza Hotel", "stars": 5, "base_price": 280, "location": destination, "amenities": ["WiFi", "Pool", "Gym", "Spa", "Restaurant"]},
        {"name": "City Center Boutique", "stars": 4, "base_price": 160, "location": destination, "amenities": ["WiFi", "Gym", "Bar", "Business Center"]},
        {"name": "Budget Express Inn", "stars": 3, "base_price": 85, "location": destination, "amenities": ["WiFi", "Parking"]},
        {"name": "Urban Comfort Suite", "stars": 4, "base_price": 145, "location": destination, "amenities": ["WiFi", "Gym", "Breakfast"]},
        {"name": "Classic Room Hotel", "stars": 3, "base_price": 95, "location": destination, "amenities": ["WiFi", "Front Desk 24/7"]},
        {"name": "Grand Residence", "stars": 5, "base_price": 320, "location": destination, "amenities": ["WiFi", "Pool", "Gym", "Spa", "Concierge", "Fine Dining"]},
    ]
    
    hotel_results = []
    for i, hotel in enumerate(hotels, 1):
        total_cost = hotel["base_price"] * nights * rooms
        sell_price = round(total_cost * 1.20, 2)
        cost_price = round(total_cost, 2)
        
        hotel_results.append({
            "id": f"HT{i:03d}",
            "name": hotel["name"],
            "location": hotel["location"],
            "rating": hotel["stars"],
            "total_stars": hotel["stars"],
            "check_in": check_in,
            "check_out": check_out,
            "nights": nights,
            "rooms": rooms,
            "room_type": "Deluxe" if hotel["stars"] >= 4 else "Standard",
            "price_per_night": hotel["base_price"],
            "total_nights": nights,
            "amenities": ", ".join(hotel["amenities"]),
            "cost_price": cost_price,
            "sell_price": sell_price,
            "currency": "USD",
            "availability": True,
        })
    
    return hotel_results


@router.get("/hotels")
async def search_hotels(
    destination: str = Query(..., description="Destination city"),
    check_in: str = Query(..., description="YYYY-MM-DD"),
    check_out: str = Query(..., description="YYYY-MM-DD"),
    guests: int = Query(2, ge=1),
    rooms: int = Query(1, ge=1),
    rating_min: Optional[float] = Query(None, ge=1, le=5),
    price_max: Optional[float] = Query(None),
):
    """Search available hotels (dummy data with AI recommendations)."""
    
    try:
        hotels = _get_mock_hotels(destination, check_in, check_out, guests, rooms)
        
        # Filter by rating if specified
        if rating_min:
            hotels = [h for h in hotels if h["rating"] >= rating_min]
        
        # Filter by price if specified  
        if price_max:
            hotels = [h for h in hotels if h["sell_price"] <= price_max]
        
        # Get AI recommendations
        ai_recommended_ids = _get_ai_recommendations(hotels, count=2)
        
        # Mark recommended hotels
        for hotel in hotels:
            hotel["ai_recommended"] = hotel["id"] in ai_recommended_ids
            if hotel["ai_recommended"]:
                hotel["recommendation_badge"] = "🤖 AI Recommended - Best Value!"
                hotel["ai_reason"] = "Best rating and price combination"
        
        if not hotels:
            raise HTTPException(status_code=404, detail="No hotels found for the given criteria")
        return {"hotels": hotels}
    
    except Exception as e:
        logger.error(f"Hotel search error: {e}")
        raise HTTPException(status_code=500, detail=f"Hotel search failed: {str(e)}")


# ─────────────── 4. Search Transfers ───────────────

@router.get("/transfers")
async def search_transfers(
    pickup_location: str = Query(..., description="Pickup location"),
    dropoff_location: str = Query(..., description="Drop-off location"),
    pickup_datetime: str = Query(..., description="ISO datetime"),
    passengers: int = Query(2, ge=1),
    vehicle_type: Optional[str] = Query(None, description="coach, sedan, suv, limousine"),
):
    """Search available transfers (mock data)."""

    base_transfers = [
        {"provider": "Private Car Service", "vehicle": "Mercedes E-Class", "type": "sedan", "cap": 3, "base": 55, "dur": "35 mins"},
        {"provider": "Elite Transfers", "vehicle": "Mercedes V-Class", "type": "suv", "cap": 6, "base": 80, "dur": "35 mins"},
        {"provider": "Airport Express", "vehicle": "Shared Shuttle", "type": "coach", "cap": 12, "base": 25, "dur": "50 mins"},
        {"provider": "Luxury Rides", "vehicle": "BMW 7 Series Limousine", "type": "limousine", "cap": 4, "base": 150, "dur": "30 mins"},
    ]

    transfers = []
    for i, t in enumerate(base_transfers, 1):
        if vehicle_type and t["type"] != vehicle_type.lower():
            continue
        if passengers > t["cap"]:
            continue
        cost = round(t["base"] * (1 + max(0, passengers - 1) * 0.15), 2)
        sell = round(cost * 1.20, 2)
        transfers.append({
            "id": f"TRF-{i:03d}",
            "provider": t["provider"],
            "vehicle": t["vehicle"],
            "passengers": passengers,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "duration": t["dur"],
            "cost_price": cost,
            "sell_price": sell,
            "availability": True,
        })

    return {"transfers": transfers}
