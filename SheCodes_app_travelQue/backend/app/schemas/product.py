from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class ProductType(str, Enum):
    FLIGHT = "FLIGHT"
    HOTEL = "HOTEL"
    TRANSFER = "TRANSFER"
    TRAIN = "TRAIN"
    VISA = "VISA"
    INSURANCE = "INSURANCE"
    ACTIVITY = "ACTIVITY"


class ProductStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ==================== Journey Product Schemas ====================

class ProductCreate(BaseModel):
    product_type: ProductType
    product_id: Optional[str] = None  # from search result
    name: str
    supplier: Optional[str] = None
    description: Optional[str] = None
    cost_price: float = 0.0
    sell_price: float = 0.0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    supplier: Optional[str] = None
    description: Optional[str] = None
    cost_price: Optional[float] = None
    sell_price: Optional[float] = None
    status: Optional[ProductStatus] = None
    booking_reference: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductResponse(BaseModel):
    id: str
    journey_id: str
    product_type: str
    name: str
    supplier: Optional[str] = None
    description: Optional[str] = None
    cost_price: float = 0.0
    sell_price: float = 0.0
    status: str
    booking_reference: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductsSummary(BaseModel):
    total_cost: float = 0.0
    total_sell: float = 0.0
    profit_margin: float = 0.0


class JourneyProductsResponse(BaseModel):
    products: List[ProductResponse]
    summary: ProductsSummary


# ==================== Product Search Result Schemas ====================

class FlightResult(BaseModel):
    id: str
    airline: str
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: str
    cabin_class: str
    cost_price: float
    sell_price: float
    availability: int


class TrainResult(BaseModel):
    id: str
    operator: str
    train_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: str
    travel_class: str
    cost_price: float
    sell_price: float
    availability: int


class HotelResult(BaseModel):
    id: str
    name: str
    location: str
    rating: float
    room_type: str
    price_per_night: float
    total_nights: int
    cost_price: float
    sell_price: float
    amenities: List[str]
    availability: int


class TransferResult(BaseModel):
    id: str
    provider: str
    vehicle: str
    passengers: int
    pickup_location: str
    dropoff_location: str
    duration: str
    cost_price: float
    sell_price: float
    availability: bool
