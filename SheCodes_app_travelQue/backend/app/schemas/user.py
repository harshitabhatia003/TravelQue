from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from datetime import datetime,date
from enum import Enum
from typing import List, Optional, Dict, Any

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    AGENT = "AGENT"
    OPERATIONS = "OPERATIONS"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse



class TravelerType(str, Enum):
    ADULT = "adult"
    CHILD = "child"
    INFANT = "infant"


class TripType(str, Enum):
    DOMESTIC = "domestic"
    INTERNATIONAL = "international"


class CabinClass(str, Enum):
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"


class RoomType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TWIN = "twin"
    SUITE = "suite"


class VehicleCategory(str, Enum):
    SEDAN = "sedan"
    SUV = "suv"
    VAN = "van"
    BUS = "bus"
    LUXURY = "luxury"

class TravelerDetails(BaseModel):
    full_name: str
    traveler_type: TravelerType
    date_of_birth: date
    trip_type: TripType
    contact_number: Optional[str] = None
    email_address: Optional[EmailStr] = None
    
    # National ID - Required for both domestic and international
    national_id: str
    
    # Passport Details - Required only for international trips
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None

    @field_validator("passport_number", "passport_expiry", mode="before")
    @classmethod
    def validate_passport_for_international(cls, v, info):
        trip_type = info.data.get("trip_type")
        
        if trip_type == TripType.INTERNATIONAL:
            if info.field_name == "passport_number" and not v:
                raise ValueError("Passport number is required for international trips")
            if info.field_name == "passport_expiry" and not v:
                raise ValueError("Passport expiry date is required for international trips")
        
        return v

    @field_validator("passport_expiry")
    @classmethod
    def validate_passport_not_expired(cls, v, info):
        if v and info.data.get("trip_type") == TripType.INTERNATIONAL:
            if v < date.today():
                raise ValueError("Passport has expired")
        return v

class FlightSegment(BaseModel):
    origin_city: str
    destination_city: str
    departure_date: date
    cabin_class: CabinClass = CabinClass.ECONOMY

class AccommodationDetails(BaseModel):
    city_location: str
    check_in_date: date
    check_out_date: date
    room_type: RoomType
    occupancy_mapping: List[str]
class GroundTransferDetails(BaseModel):
    pickup_point: str
    dropoff_point: str
    pickup_date: date
    pickup_time: str
    vehicle_category: VehicleCategory
class CustomerFormSubmit(BaseModel):
    currency: str = "USD"
    total_passenger_count: int

    lead_name: str
    lead_email: EmailStr
    lead_phone: str

    budget: float
    travel_start_date: date
    travel_end_date: date

    travelers: List[TravelerDetails]

    flights: Optional[List[FlightSegment]] = []
    accommodations: Optional[List[AccommodationDetails]] = []
    ground_transfers: Optional[List[GroundTransferDetails]] = []

    special_requests: Optional[str] = None

    # ✅ Passenger count validation
    @field_validator("travelers")
    @classmethod
    def validate_traveler_count(cls, travelers, info):
        expected = info.data.get("total_passenger_count")
        if expected and len(travelers) != expected:
            raise ValueError(
                f"Expected {expected} travelers, got {len(travelers)}"
            )
        return travelers
    @model_validator(mode="after")
    def validate_dates(self):
        if self.travel_end_date < self.travel_start_date:
            raise ValueError("travel_end_date cannot be before travel_start_date")
        return self

class CustomerFormResponse(BaseModel):
    id: str
    currency: str = "USD"
    total_passenger_count: int
    lead_name: str
    lead_email: str
    lead_phone: str
    budget: float
    travel_start_date: Optional[date]
    travel_end_date: Optional[date]

    travelers: Optional[List[Dict[str, Any]]] = None
    flights: Optional[List[Dict[str, Any]]] = None
    accommodations: Optional[List[Dict[str, Any]]] = None
    ground_transfers: Optional[List[Dict[str, Any]]] = None

    special_requests: Optional[str] = None
    submitted_at: Optional[datetime] = None
    is_used: bool

    # 🔑 METADATA FIELDS
    created_by_agent_id: Optional[str] = None
    used_by_agent_id: Optional[str] = None
    journey_id: Optional[str] = None
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CustomerFormLinkResponse(BaseModel):
    form_id: str
    link: str
    expires_at: Optional[datetime]