from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import List
import time

from app.core.database import get_db
from app.models.booking import Booking, BookingStatus, BookingProduct
from app.models.product import Product, ProductStatus
from app.models.journey import Journey, JourneyStatus
from app.schemas.booking import (
    BookingCreate,
    BookingStatusUpdate,
    BookingCancelRequest,
    BookingResponse,
    BookingProductResponse,
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ─────────────── 1. Create Booking ───────────────

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a booking from a journey's products."""

    # Verify journey exists
    j_result = await db.execute(select(Journey).where(Journey.id == payload.journey_id))
    journey = j_result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # Verify all products exist and belong to this journey
    products = []
    for pid in payload.products:
        result = await db.execute(
            select(Product).where(Product.id == pid, Product.journey_id == payload.journey_id)
        )
        product = result.scalars().first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {pid} not found in journey {payload.journey_id}",
            )
        products.append(product)

    # Generate booking ID and reference
    booking_id = f"B-{int(time.time() * 1000)}"
    count_result = await db.execute(select(func.count()).select_from(Booking))
    seq = (count_result.scalar() or 0) + 1
    ref = f"BK-{datetime.utcnow().year}-{str(seq).zfill(3)}"

    booking = Booking(
        id=booking_id,
        reference_number=ref,
        journey_id=payload.journey_id,
        status=BookingStatus.PROCESSING,
    )
    db.add(booking)

    # Create booking-product links
    bp_responses = []
    for product in products:
        bp = BookingProduct(
            id=f"BP-{int(time.time() * 1000)}-{product.id}",
            booking_id=booking_id,
            product_id=product.id,
            status="PENDING",
        )
        db.add(bp)
        bp_responses.append({
            "product_id": product.id,
            "product_type": product.product_type.value if product.product_type else None,
            "name": product.name,
            "status": "PENDING",
            "booking_reference": None,
            "confirmed_at": None,
        })

    # Update journey status
    journey.status = JourneyStatus.BOOKING_IN_PROGRESS
    journey.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(booking)

    return {
        "id": booking.id,
        "journey_id": booking.journey_id,
        "reference_number": booking.reference_number,
        "status": booking.status.value,
        "products": bp_responses,
        "created_at": booking.created_at,
    }


# ─────────────── 2. Get Booking ───────────────

@router.get("/{booking_id}", response_model=dict)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get booking details with product statuses."""

    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Fetch booking products with product details
    bp_result = await db.execute(
        select(BookingProduct).where(BookingProduct.booking_id == booking_id)
    )
    booking_products = bp_result.scalars().all()

    products_response = []
    for bp in booking_products:
        # Get product details
        prod_result = await db.execute(select(Product).where(Product.id == bp.product_id))
        product = prod_result.scalars().first()
        products_response.append({
            "product_id": bp.product_id,
            "product_type": product.product_type.value if product and product.product_type else None,
            "name": product.name if product else None,
            "status": bp.status,
            "booking_reference": bp.booking_reference,
            "confirmed_at": bp.confirmed_at,
        })

    return {
        "id": booking.id,
        "journey_id": booking.journey_id,
        "reference_number": booking.reference_number,
        "status": booking.status.value,
        "products": products_response,
        "cancel_reason": booking.cancel_reason,
        "refund_amount": booking.refund_amount,
        "cancelled_at": booking.cancelled_at,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
    }


# ─────────────── 3. Update Booking Status ───────────────

@router.patch("/{booking_id}/status", response_model=dict)
async def update_booking_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update booking status."""

    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = payload.status.value
    booking.updated_at = datetime.utcnow()

    # If booking is confirmed, update all booking products and the journey
    if payload.status.value == BookingStatus.CONFIRMED.value:
        bp_result = await db.execute(
            select(BookingProduct).where(BookingProduct.booking_id == booking_id)
        )
        for bp in bp_result.scalars().all():
            bp.status = "CONFIRMED"
            bp.confirmed_at = datetime.utcnow()
            # Also update the actual product
            prod_result = await db.execute(select(Product).where(Product.id == bp.product_id))
            product = prod_result.scalars().first()
            if product:
                product.status = ProductStatus.CONFIRMED

        # Update journey status
        j_result = await db.execute(select(Journey).where(Journey.id == booking.journey_id))
        journey = j_result.scalars().first()
        if journey:
            journey.status = JourneyStatus.FULLY_CONFIRMED
            journey.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(booking)

    return {
        "id": booking.id,
        "status": booking.status.value if hasattr(booking.status, "value") else booking.status,
        "updated_at": booking.updated_at,
    }


# ─────────────── 4. Cancel Booking ───────────────

@router.post("/{booking_id}/cancel", response_model=dict)
async def cancel_booking(
    booking_id: str,
    payload: BookingCancelRequest,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking."""

    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = BookingStatus.CANCELLED
    booking.cancel_reason = payload.reason
    booking.refund_amount = payload.refund_amount
    booking.cancelled_at = datetime.utcnow()
    booking.updated_at = datetime.utcnow()

    # Cancel all booking products
    bp_result = await db.execute(
        select(BookingProduct).where(BookingProduct.booking_id == booking_id)
    )
    for bp in bp_result.scalars().all():
        bp.status = "CANCELLED"
        # Also update the actual product
        prod_result = await db.execute(select(Product).where(Product.id == bp.product_id))
        product = prod_result.scalars().first()
        if product:
            product.status = ProductStatus.CANCELLED

    # Update journey status
    j_result = await db.execute(select(Journey).where(Journey.id == booking.journey_id))
    journey = j_result.scalars().first()
    if journey:
        journey.status = JourneyStatus.CANCELLED
        journey.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(booking)

    return {
        "id": booking.id,
        "status": booking.status.value if hasattr(booking.status, "value") else booking.status,
        "cancel_reason": booking.cancel_reason,
        "refund_amount": booking.refund_amount,
        "cancelled_at": booking.cancelled_at,
    }
