from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, Text, Integer, JSON, Date, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from app.core.database import Base
import uuid


class CustomerType(str, enum.Enum):
    INDIVIDUAL = "Individual"
    CORPORATE = "Corporate"
    FAMILY = "Family"


class CustomerStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    EXPIRED = "expired"


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True)  # C-{timestamp} format
    
    # === Personal Info ===
    title = Column(String)
    first_name = Column(String, nullable=False)
    middle_name = Column(String)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String)
    nationality = Column(String)
    
    # === Contact Info ===
    email = Column(String, nullable=False, index=True)
    phone_primary = Column(String, nullable=False)
    phone_alternate = Column(String)
    preferred_contact_method = Column(String)  # email, phone, whatsapp
    
    # === Address (JSON) ===
    address = Column(JSON)  # {street, apartment, city, state, postal_code, country}
    
    # === Travel Documents (JSON) ===
    travel_documents = Column(JSON)  # {passport: {number, issuing_country, issue_date, expiry_date}}
    
    # === Preferences (JSON) ===
    preferences = Column(JSON)  # {airlines, cabin_class, seat_preference, meal_preference, hotel_chains, room_type, special_requests}
    
    # === Loyalty Programs (JSON Array) ===
    loyalty_programs = Column(JSON)  # [{type, provider, program_name, number}]
    
    # === Emergency Contact (JSON) ===
    emergency_contact = Column(JSON)  # {name, relationship, phone, email}
    
    # === Classification ===
    customer_type = Column(SQLEnum(CustomerType), default=CustomerType.INDIVIDUAL)
    tags = Column(JSON)  # Array of strings
    source = Column(String)  # Referral, Google, Repeat Customer, etc.
    
    # === Internal ===
    internal_notes = Column(Text)
    
    # === Stats (calculated fields) ===
    total_bookings = Column(Integer, default=0)
    lifetime_value = Column(Float, default=0.0)
    average_booking = Column(Float, default=0.0)
    upcoming_trips = Column(Integer, default=0)
    
    # === Form Link Metadata ===
    status = Column(SQLEnum(CustomerStatus), default=CustomerStatus.PENDING)
    form_link_generated_at = Column(DateTime)
    form_link_expires_at = Column(DateTime)
    form_submitted_at = Column(DateTime)
    created_by_agent_id = Column(String)
    
    # === Timestamps ===
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
