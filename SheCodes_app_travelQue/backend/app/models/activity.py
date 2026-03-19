from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from datetime import datetime
import enum

from app.core.database import Base


class ActivityType(str, enum.Enum):
    CUSTOMER_CREATED = "customer_created"
    CUSTOMER_UPDATED = "customer_updated"
    CUSTOMER_FORM_GENERATED = "customer_form_generated"
    CUSTOMER_FORM_SUBMITTED = "customer_form_submitted"
    NOTE_ADDED = "note_added"
    COMMUNICATION_LOGGED = "communication_logged"
    JOURNEY_CREATED = "journey_created"
    JOURNEY_UPDATED = "journey_updated"
    JOURNEY_STATUS_CHANGED = "journey_status_changed"
    BOOKING_CREATED = "booking_created"
    BOOKING_CANCELLED = "booking_cancelled"
    PRODUCT_ADDED = "product_added"


class Activity(Base):
    __tablename__ = "activities"

    # Primary Info
    id = Column(String, primary_key=True, index=True)  # ACT-{uuid}
    
    # Activity Details
    type = Column(SQLEnum(ActivityType), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    
    # Reference
    reference_id = Column(String)  # Customer ID, etc.
    reference_type = Column(String)  # "customer", "note", etc.
    
    # Agent Info
    created_by = Column(String)  # Agent name or ID
    created_by_agent_id = Column(String, ForeignKey("users.id"))
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
