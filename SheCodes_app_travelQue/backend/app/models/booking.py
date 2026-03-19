from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class BookingStatus(str, enum.Enum):
    PROCESSING = "PROCESSING"
    PARTIALLY_CONFIRMED = "PARTIALLY_CONFIRMED"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, index=True)  # B-{timestamp}
    reference_number = Column(String, unique=True, index=True)  # BK-2026-001
    journey_id = Column(String, ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PROCESSING)
    cancel_reason = Column(String)
    refund_amount = Column(Float)
    cancelled_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BookingProduct(Base):
    __tablename__ = "booking_products"

    id = Column(String, primary_key=True)
    booking_id = Column(String, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING")  # mirrors ProductStatus
    booking_reference = Column(String)
    confirmed_at = Column(DateTime)
