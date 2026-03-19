from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, Text, Integer, JSON, Date, Enum as SQLEnum, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
import enum
from app.core.database import Base
import uuid


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    AGENT = "AGENT"
    OPERATIONS = "OPERATIONS"


class BookingType(str, enum.Enum):
    HOTEL = "hotel"
    FLIGHT = "flight"
    TRAIN = "train"
    TRANSFER = "transfer"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class EscalationStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class EscalationPriority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CustomerFormSubmission(Base):
    __tablename__ = "customer_form_submissions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # === Journey Metadata ===
    currency = Column(String, default="USD")
    total_passenger_count = Column(Integer, nullable=False)
    
    # === Lead Contact (Primary Customer) ===
    lead_name = Column(String, nullable=False)
    lead_email = Column(String, nullable=False)
    lead_phone = Column(String, nullable=False)
    
    # === Budget & Timeline ===
    budget = Column(Float, nullable=False)
    travel_start_date = Column(Date)
    travel_end_date = Column(Date)
    
    # === Multi-Traveler Details (Stored as JSON Array) ===
    # Each traveler object contains: name, type, dob, gender, trip_type, passport details, national_id, etc.
    travelers = Column(JSON, nullable=False)  # Array of traveler objects
    
    # === Itinerary Segments (JSON Arrays) ===
    flights = Column(JSON)  # Array of flight segment objects
    accommodations = Column(JSON)  # Array of hotel booking objects
    ground_transfers = Column(JSON)  # Array of transfer objects
    
    # === Additional Preferences ===
    special_requests = Column(Text)
    
    # === Metadata ===
    submitted_at = Column(DateTime, default=datetime.utcnow)
    is_used = Column(Boolean, default=False)
    created_by_agent_id = Column(String, nullable=True)
    used_by_agent_id = Column(String, nullable=True)
    journey_id = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=True)


class BookingItem(Base):
    __tablename__ = "booking_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # === References ===
    journey_id = Column(String, nullable=False, index=True)
    customer_form_id = Column(String, nullable=False)
    
    # === Booking Details ===
    booking_type = Column(SQLEnum(BookingType), nullable=False, index=True)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, index=True)
    
    # === Item Info ===
    item_details = Column(JSON, nullable=False)  # Contains type-specific info (hotel, flight, etc)
    
    # === Booking Reference ===
    confirmation_number = Column(String, nullable=True, unique=True)
    provider = Column(String, nullable=True)  # e.g., "booking.com", "amadeus", "skyscanner"
    provider_id = Column(String, nullable=True)  # ID from provider
    
    # === Financial Info ===
    price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    
    # === Timestamps ===
    booked_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failed_reason = Column(Text, nullable=True)
    
    # === Metadata ===
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Escalation(Base):
    __tablename__ = "escalations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # === References ===
    journey_id = Column(String, nullable=False, index=True)
    failed_booking_item_id = Column(String, ForeignKey("booking_items.id"), nullable=False)
    
    # === Failed Item Context ===
    failed_item_type = Column(SQLEnum(BookingType), nullable=False, index=True)
    failed_item_details = Column(JSON, nullable=False)
    
    # === Location / Route Info ===
    customer_city = Column(String, nullable=True)  # For hotels
    origin_city = Column(String, nullable=True)  # For flights/trains
    destination_city = Column(String, nullable=True)  # For flights/trains
    
    # === Travel Details ===
    departure_date = Column(Date, nullable=True)
    arrival_date = Column(Date, nullable=True)
    travelers_count = Column(Integer, nullable=False)
    
    # === Customer Context ===
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    customer_preferences = Column(JSON, nullable=True)  # From submitted form
    budget = Column(Float, nullable=True)
    
    # === Escalation Status ===
    priority = Column(SQLEnum(EscalationPriority), default=EscalationPriority.MEDIUM, index=True)
    status = Column(SQLEnum(EscalationStatus), default=EscalationStatus.OPEN, index=True)
    
    # === AI Ranking & Alternatives ===
    ai_ranking_data = Column(JSON, nullable=True)  # Stores ranked alternatives with scores
    
    # === Resolution Info ===
    claimed_by_ops_id = Column(String, nullable=True)  # Ops user who is handling this
    claimed_at = Column(DateTime, nullable=True)
    resolved_by_ops_id = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    alternative_details = Column(JSON, nullable=True)  # Selected alternative
    
    # === Timestamps ===
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)