"""
Booking Failure Handler - Utility for simulating booking failures and triggering escalations
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import BookingItem, Escalation, BookingStatus, BookingType
from app.services.escalation_service import EscalationService


async def handle_booking_failure(
    db: AsyncSession,
    booking_item: BookingItem,
    failure_reason: str,
    journey_id: str,
    customer_name: str,
    customer_email: str,
    customer_city: Optional[str] = None,
    origin_city: Optional[str] = None,
    destination_city: Optional[str] = None,
    departure_date: Optional[Any] = None,
    arrival_date: Optional[Any] = None,
    travelers_count: int = 1,
    customer_preferences: Optional[Dict[str, Any]] = None,
    budget: Optional[float] = None,
) -> Escalation:
    """
    Handle a booking failure by:
    1. Updating booking status to FAILED
    2. Creating an escalation record
    3. Setting priority based on departure date
    
    Returns the created escalation
    """
    
    # Update booking item status
    booking_item.status = BookingStatus.FAILED
    booking_item.failed_at = datetime.utcnow()
    booking_item.failed_reason = failure_reason
    await db.flush()
    
    # Create escalation data
    escalation_data = EscalationService.create_escalation(
        journey_id=journey_id,
        failed_booking_item=booking_item,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_city=customer_city,
        origin_city=origin_city,
        destination_city=destination_city,
        departure_date=departure_date,
        arrival_date=arrival_date,
        travelers_count=travelers_count,
        customer_preferences=customer_preferences,
        budget=budget,
    )
    
    # Create escalation record
    escalation = Escalation(**escalation_data)
    db.add(escalation)
    
    await db.commit()
    await db.refresh(escalation)
    
    return escalation


async def simulate_booking_failure(
    db: AsyncSession,
    journey_id: str,
    booking_type: BookingType,
    failure_reason: str,
    customer_name: str = "Test Customer",
    customer_email: str = "test@example.com",
    customer_city: Optional[str] = None,
    origin_city: Optional[str] = None,
    destination_city: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Simulate a booking failure for testing purposes
    
    Creates a mock booking item and escalation to test the workflow
    """
    
    # Create a mock booking item
    booking_item = BookingItem(
        journey_id=journey_id,
        customer_form_id=journey_id,  # Assuming journey_id = customer_form_id for testing
        booking_type=booking_type,
        status=BookingStatus.PENDING,
        item_details={
            "city": customer_city or "London",
            "check_in": "2026-02-15",
            "check_out": "2026-02-20",
        },
        price=1500.0,
        currency="USD",
    )
    db.add(booking_item)
    await db.flush()
    
    # Create escalation
    escalation = await handle_booking_failure(
        db=db,
        booking_item=booking_item,
        failure_reason=failure_reason,
        journey_id=journey_id,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_city=customer_city or "London",
        origin_city=origin_city or "New York",
        destination_city=destination_city or "London",
        departure_date=None,  # Parse from item_details if needed
        arrival_date=None,
        travelers_count=1,
        customer_preferences={"dietary": "vegetarian"},
        budget=1500.0,
    )
    
    return {
        "booking_item_id": booking_item.id,
        "escalation_id": escalation.id,
        "priority": escalation.priority.value,
        "status": escalation.status.value,
    }
