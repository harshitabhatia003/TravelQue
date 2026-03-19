from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class BookingStatus(str, Enum):
    PROCESSING = "PROCESSING"
    PARTIALLY_CONFIRMED = "PARTIALLY_CONFIRMED"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class BookingCreate(BaseModel):
    journey_id: str
    products: List[str]  # list of product IDs


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingCancelRequest(BaseModel):
    reason: Optional[str] = "Customer request"
    refund_amount: Optional[float] = 0.0


class BookingProductResponse(BaseModel):
    product_id: str
    product_type: Optional[str] = None
    name: Optional[str] = None
    status: str
    booking_reference: Optional[str] = None
    confirmed_at: Optional[datetime] = None


class BookingResponse(BaseModel):
    id: str
    journey_id: str
    reference_number: str
    status: str
    products: List[BookingProductResponse] = []
    cancel_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
