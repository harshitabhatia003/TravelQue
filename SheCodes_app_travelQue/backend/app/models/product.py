from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class ProductType(str, enum.Enum):
    FLIGHT = "FLIGHT"
    HOTEL = "HOTEL"
    TRANSFER = "TRANSFER"
    TRAIN = "TRAIN"
    VISA = "VISA"
    INSURANCE = "INSURANCE"
    ACTIVITY = "ACTIVITY"


class ProductStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)  # P-{timestamp}
    journey_id = Column(String, ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True)
    product_type = Column(SQLEnum(ProductType), nullable=False)
    name = Column(String, nullable=False)
    supplier = Column(String)
    description = Column(String)
    cost_price = Column(Float, default=0.0)
    sell_price = Column(Float, default=0.0)
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.PENDING)
    booking_reference = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    metadata_json = Column(JSON)  # Extra details per product type
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
