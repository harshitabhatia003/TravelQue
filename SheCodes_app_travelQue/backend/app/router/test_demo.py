"""
Test/Demo Router - For testing escalation workflow
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.core.database import get_db
from app.models.user import BookingType
from app.services.booking_failure_handler import simulate_booking_failure

router = APIRouter(
    prefix="/api/test",
    tags=["Testing"]
)


@router.post("/simulate-booking-failure")
async def simulate_failure(
    journey_id: str,
    booking_type: str = "hotel",
    failure_reason: str = "Item not available",
    customer_name: str = "Test Customer",
    customer_email: str = "test@example.com",
    customer_city: str = "London",
    db: AsyncSession = Depends(get_db),
):
    """
    Simulate a booking failure to test the escalation workflow
    
    This endpoint creates a mock booking and immediately triggers an escalation
    """
    try:
        booking_type_enum = BookingType[booking_type.upper()]
    except KeyError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid booking type. Must be one of: {[bt.value for bt in BookingType]}"
        )
    
    result = await simulate_booking_failure(
        db=db,
        journey_id=journey_id,
        booking_type=booking_type_enum,
        failure_reason=failure_reason,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_city=customer_city,
    )
    
    return {
        "message": "Booking failure simulated successfully",
        **result
    }
