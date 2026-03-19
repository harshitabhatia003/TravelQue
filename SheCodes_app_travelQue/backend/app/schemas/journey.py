from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Any
from enum import Enum


class JourneyStatus(str, Enum):
    DRAFT = "DRAFT"
    QUOTED = "QUOTED"
    CONFIRMED = "CONFIRMED"
    BOOKING_IN_PROGRESS = "BOOKING_IN_PROGRESS"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FULLY_CONFIRMED = "FULLY_CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ProductInlineCreate(BaseModel):
    """Inline product when creating a journey"""
    product_type: str
    name: str
    supplier: Optional[str] = None
    cost_price: float = 0.0
    sell_price: float = 0.0


class JourneyCreate(BaseModel):
    customer_id: Optional[str] = None
    title: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_constraint: Optional[str] = None
    notes: Optional[str] = None
    products: Optional[List[ProductInlineCreate]] = None


class JourneyUpdate(BaseModel):
    title: Optional[str] = None
    customer_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_constraint: Optional[str] = None
    notes: Optional[str] = None


class JourneyStatusUpdate(BaseModel):
    status: JourneyStatus
    notes: Optional[str] = None


class JourneyProductSummary(BaseModel):
    id: str
    product_type: str
    name: str
    supplier: Optional[str] = None
    cost_price: float = 0.0
    sell_price: float = 0.0
    status: str = "PENDING"
    booking_reference: Optional[str] = None


class JourneyResponse(BaseModel):
    id: str
    reference_number: str
    title: str
    customer_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_constraint: Optional[str] = None
    notes: Optional[str] = None
    status: str
    total_cost: float = 0.0
    total_sell: float = 0.0
    profit_margin: float = 0.0
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    products: Optional[List[JourneyProductSummary]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JourneyListItem(BaseModel):
    id: str
    reference_number: str
    title: str
    customer_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    total_cost: float = 0.0
    total_sell: float = 0.0
    profit_margin: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
