from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any


class BookingType(str, Enum):
    HOTEL = "hotel"
    FLIGHT = "flight"
    TRAIN = "train"
    TRANSFER = "transfer"


class EscalationStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class EscalationPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class AlternativeOption(BaseModel):
    """Represents a single alternative option for a failed booking"""
    provider: str
    provider_id: str
    name: str
    details: Dict[str, Any]
    price: float
    currency: str
    match_score: int  # 0-100
    reasoning: str
    pros: List[str]
    cons: List[str]
    recommendation_level: str  # HIGH, MEDIUM, LOW
    price_difference: float  # vs original


class RankedAlternatives(BaseModel):
    """Ranked alternatives with AI scoring"""
    total_found: int
    alternatives: List[AlternativeOption]
    search_criteria: Dict[str, Any]
    generated_at: datetime


class EscalationResponse(BaseModel):
    """Escalation details with all context"""
    id: str
    journey_id: str
    failed_booking_item_id: str
    failed_item_type: BookingType
    failed_item_details: Dict[str, Any]
    
    customer_city: Optional[str]
    origin_city: Optional[str]
    destination_city: Optional[str]
    
    departure_date: Optional[date]
    arrival_date: Optional[date]
    travelers_count: int
    
    customer_name: str
    customer_email: str
    customer_preferences: Optional[Dict[str, Any]]
    budget: Optional[float]
    
    priority: EscalationPriority
    status: EscalationStatus
    
    ai_ranking_data: Optional[RankedAlternatives]
    
    claimed_by_ops_id: Optional[str]
    claimed_at: Optional[datetime]
    resolved_by_ops_id: Optional[str]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    alternative_details: Optional[Dict[str, Any]]
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EscalationListResponse(BaseModel):
    """Simplified escalation for list view"""
    id: str
    journey_id: str
    customer_name: str
    customer_email: str
    failed_item_type: BookingType
    origin_city: Optional[str]
    destination_city: Optional[str]
    budget: Optional[float]
    departure_date: Optional[date]
    travelers_count: int
    priority: EscalationPriority
    status: EscalationStatus
    claimed_by_ops_id: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SearchAlternativesRequest(BaseModel):
    """Request to search for alternatives"""
    search_criteria: Optional[Dict[str, Any]] = None  # Override default search params
    max_results: int = 10
    max_price_variance: float = 0.20  # ±20%


class CreateEscalationRequest(BaseModel):
    """Request to create a new escalation"""
    journey_id: str
    booking_type: BookingType
    customer_name: str
    customer_email: EmailStr
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    customer_city: Optional[str] = None
    departure_date: Optional[date] = None
    arrival_date: Optional[date] = None
    travelers_count: int = 1
    budget: Optional[float] = None
    customer_preferences: Optional[Dict[str, Any]] = None
    failed_item_details: Optional[Dict[str, Any]] = None


class ResolveEscalationRequest(BaseModel):
    """Request to resolve escalation with selected alternative"""
    selected_alternative: AlternativeOption
    resolution_notes: Optional[str] = None
    # Backend will auto-book the selected alternative


class CreateBookingItemRequest(BaseModel):
    """Request to create a booking item"""
    journey_id: str
    customer_form_id: str
    booking_type: BookingType
    item_details: Dict[str, Any]
    price: float
    currency: str = "USD"


class BookingItemResponse(BaseModel):
    """Booking item details"""
    id: str
    journey_id: str
    booking_type: BookingType
    status: BookingStatus
    item_details: Dict[str, Any]
    confirmation_number: Optional[str]
    provider: Optional[str]
    price: float
    currency: str
    booked_at: Optional[datetime]
    failed_at: Optional[datetime]
    failed_reason: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class HotelAlternativeRequest(BaseModel):
    """Hotel search request"""
    city: str
    check_in_date: date
    check_out_date: date
    room_type: str
    occupancy: int
    budget: float
    max_variance: float = 0.20


class FlightAlternativeRequest(BaseModel):
    """Flight search request"""
    origin_city: str
    destination_city: str
    departure_date: date
    cabin_class: str
    passengers: int
    budget: float
    max_variance: float = 0.20


class TrainAlternativeRequest(BaseModel):
    """Train search request"""
    origin_city: str
    destination_city: str
    departure_date: date
    train_class: str
    passengers: int
    budget: float
    max_variance: float = 0.20


class TransferAlternativeRequest(BaseModel):
    """Transfer search request"""
    pickup_point: str
    dropoff_point: str
    pickup_date: date
    pickup_time: str
    vehicle_category: str
    passengers: int
    budget: float
    max_variance: float = 0.20
