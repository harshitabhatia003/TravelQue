from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any


class CustomerType(str, Enum):
    INDIVIDUAL = "Individual"
    CORPORATE = "Corporate"
    FAMILY = "Family"


class CustomerStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    EXPIRED = "expired"


# === Customer Form Submission Schemas ===

class PersonalInfo(BaseModel):
    title: Optional[str] = None
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None


class AddressInfo(BaseModel):
    street: str
    apartment: Optional[str] = None
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str


class ContactInfo(BaseModel):
    email: EmailStr
    phone_primary: str
    preferred_contact_method: Optional[str] = "email"
    address: AddressInfo


class PassportInfo(BaseModel):
    number: str
    issuing_country: str
    expiry_date: date
    issue_date: Optional[date] = None


class TravelDocuments(BaseModel):
    passport: Optional[PassportInfo] = None


class Preferences(BaseModel):
    airlines: Optional[List[str]] = None
    cabin_class: Optional[str] = None
    seat_preference: Optional[str] = None
    meal_preference: Optional[str] = None
    hotel_chains: Optional[List[str]] = None
    room_type: Optional[str] = None
    special_requests: Optional[str] = None


class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[EmailStr] = None


class CustomerFormSubmit(BaseModel):
    """Schema for public customer form submission"""
    personal_info: PersonalInfo
    contact: ContactInfo
    travel_documents: Optional[TravelDocuments] = None
    preferences: Optional[Preferences] = None
    emergency_contact: EmergencyContact


# === Customer CRUD Schemas ===

class Classification(BaseModel):
    tags: Optional[List[str]] = None
    customer_type: CustomerType = CustomerType.INDIVIDUAL
    source: Optional[str] = None


class CustomerCreate(BaseModel):
    """Schema for agent creating customer manually"""
    personal_info: PersonalInfo
    contact: ContactInfo
    travel_documents: Optional[TravelDocuments] = None
    preferences: Optional[Preferences] = None
    emergency_contact: Optional[EmergencyContact] = None
    classification: Optional[Classification] = None
    internal_notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    """Schema for updating customer"""
    personal_info: Optional[PersonalInfo] = None
    contact: Optional[ContactInfo] = None
    travel_documents: Optional[TravelDocuments] = None
    preferences: Optional[Preferences] = None
    emergency_contact: Optional[EmergencyContact] = None
    classification: Optional[Classification] = None
    internal_notes: Optional[str] = None


class CustomerStats(BaseModel):
    total_bookings: int = 0
    lifetime_value: float = 0.0
    average_booking: float = 0.0
    upcoming_trips: int = 0


class CustomerResponse(BaseModel):
    """Full customer response"""
    id: str
    personal_info: Dict[str, Any]
    contact: Dict[str, Any]
    travel_documents: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    classification: Dict[str, Any]
    stats: CustomerStats
    internal_notes: Optional[str] = None
    status: CustomerStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerListItem(BaseModel):
    """Simplified customer for list view"""
    id: str
    personal_info: Dict[str, Any]
    contact: Dict[str, Any]
    classification: Dict[str, Any]
    stats: CustomerStats
    status: CustomerStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# === Customer Form Link Schemas ===

class GenerateLinkRequest(BaseModel):
    agent_notes: Optional[str] = None


class GenerateLinkResponse(BaseModel):
    customer_id: str
    form_link: str
    expires_at: datetime
    status: CustomerStatus


class CustomerFormStatusResponse(BaseModel):
    customer_id: str
    status: CustomerStatus
    created_at: datetime
    submitted_at: Optional[datetime] = None
    expires_at: datetime


class CustomerFormSubmitResponse(BaseModel):
    customer_id: str
    status: CustomerStatus
    message: str
