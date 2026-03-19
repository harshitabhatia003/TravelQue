from sqlalchemy import Column, String, Float, Text, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class JourneyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    QUOTED = "QUOTED"
    CONFIRMED = "CONFIRMED"
    BOOKING_IN_PROGRESS = "BOOKING_IN_PROGRESS"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FULLY_CONFIRMED = "FULLY_CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Journey(Base):
    __tablename__ = "journeys"

    id = Column(String, primary_key=True, index=True)  # J-{timestamp}
    reference_number = Column(String, unique=True, index=True)  # TQ-2026-001
    title = Column(String, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String)
    client_phone = Column(String)
    destination = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    budget_constraint = Column(String)
    notes = Column(Text)
    status = Column(SQLEnum(JourneyStatus), default=JourneyStatus.DRAFT)
    total_cost = Column(Float, default=0.0)
    total_sell = Column(Float, default=0.0)
    profit_margin = Column(Float, default=0.0)
    created_by = Column(String)
    assigned_to = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
