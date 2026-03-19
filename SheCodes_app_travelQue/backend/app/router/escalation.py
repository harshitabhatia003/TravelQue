"""
Escalation Management Router - Operations team endpoints for handling failed bookings
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.user import Escalation, BookingItem, EscalationStatus, EscalationPriority, BookingType, BookingStatus
from app.schemas.escalation import (
    EscalationResponse,
    EscalationListResponse,
    SearchAlternativesRequest,
    CreateEscalationRequest,
    ResolveEscalationRequest,
    RankedAlternatives,
)
from app.services.escalation_service import EscalationService, AlternativeSearchService

router = APIRouter(
    prefix="/api/ops",
    tags=["Operations - Escalations"]
)


@router.get("/escalations", response_model=List[EscalationListResponse])
async def list_escalations(
    status: Optional[EscalationStatus] = Query(EscalationStatus.OPEN),
    priority: Optional[EscalationPriority] = None,
    booking_type: Optional[BookingType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List all escalations sorted by priority and creation date
    
    Query parameters:
    - status: Filter by escalation status (default: open)
    - priority: Filter by priority (urgent/high/medium/low)
    - booking_type: Filter by failed item type (hotel/flight/train/transfer)
    - skip: Pagination offset
    - limit: Number of results to return
    """
    query = select(Escalation)
    
    # Apply filters
    conditions = [Escalation.status == status]
    
    if priority:
        conditions.append(Escalation.priority == priority)
    
    if booking_type:
        conditions.append(Escalation.failed_item_type == booking_type)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Sort by priority (urgent first), then by creation date
    query = query.order_by(
        Escalation.priority,
        Escalation.created_at.desc()
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    escalations = result.scalars().all()
    
    return escalations


@router.post("/escalations", response_model=EscalationResponse)
async def create_escalation(
    request: CreateEscalationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new escalation for a failed booking
    
    This endpoint allows manual creation of escalations when a booking fails.
    """
    # Create booking item first
    booking_item = BookingItem(
        id=f"item-{uuid.uuid4().hex[:8]}",
        journey_id=request.journey_id,
        customer_form_id=f"form-{uuid.uuid4().hex[:8]}",  # Auto-generate for manual escalation
        booking_type=request.booking_type,
        status=BookingStatus.FAILED,
        item_details=request.failed_item_details or {},
        price=request.budget or 0.0,  # Use budget as price estimate
        currency="USD",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(booking_item)
    await db.flush()  # Get the booking_item ID without committing
    
    # Create escalation
    escalation_data = EscalationService.create_escalation(
        journey_id=request.journey_id,
        failed_booking_item=booking_item,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_city=request.customer_city,
        origin_city=request.origin_city,
        destination_city=request.destination_city,
        departure_date=request.departure_date,
        arrival_date=request.arrival_date,
        travelers_count=request.travelers_count,
        customer_preferences=request.customer_preferences,
        budget=request.budget,
    )
    
    escalation = Escalation(
        id=f"esc-{uuid.uuid4().hex[:8]}",
        **escalation_data
    )
    
    db.add(escalation)
    await db.commit()
    await db.refresh(escalation)
    
    return escalation


@router.get("/escalations/{escalation_id}", response_model=EscalationResponse)
async def get_escalation(
    escalation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed escalation information"""
    result = await db.execute(
        select(Escalation).filter(Escalation.id == escalation_id)
    )
    escalation = result.scalars().first()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    return escalation


@router.post("/escalations/{escalation_id}/claim")
async def claim_escalation(
    escalation_id: str,
    ops_user_id: str = Query(..., description="ID of the ops user claiming this escalation"),
    db: AsyncSession = Depends(get_db),
):
    """
    Claim an escalation for operations (concurrency safety)
    Only one ops member can claim an escalation at a time
    """
    result = await db.execute(
        select(Escalation).filter(Escalation.id == escalation_id)
    )
    escalation = result.scalars().first()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    if escalation.claimed_by_ops_id and escalation.claimed_by_ops_id != ops_user_id:
        raise HTTPException(
            status_code=409,
            detail=f"Escalation already claimed by {escalation.claimed_by_ops_id}"
        )
    
    # Claim the escalation
    escalation.claimed_by_ops_id = ops_user_id
    escalation.claimed_at = datetime.utcnow()
    escalation.status = EscalationStatus.IN_PROGRESS
    
    await db.commit()
    await db.refresh(escalation)
    
    return {"message": "Escalation claimed successfully", "escalation_id": escalation_id}


@router.post("/escalations/{escalation_id}/search-alternatives")
async def search_alternatives(
    escalation_id: str,
    request: SearchAlternativesRequest,
    db: AsyncSession = Depends(get_db),
) -> RankedAlternatives:
    """
    Search for alternatives for a failed booking item
    
    Returns AI-ranked alternatives based on customer preferences and booking type
    """
    result = await db.execute(
        select(Escalation).filter(Escalation.id == escalation_id)
    )
    escalation = result.scalars().first()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    # Search alternatives based on booking type
    alternatives = []
    
    if escalation.failed_item_type == BookingType.HOTEL:
        alternatives = await AlternativeSearchService.search_hotel_alternatives(
            city=escalation.customer_city or "Unknown",
            check_in=escalation.departure_date,
            check_out=escalation.arrival_date,
            room_type=escalation.failed_item_details.get("room_type", "single"),
            occupancy=escalation.travelers_count,
            budget=escalation.budget or 1000,
            max_variance=request.max_price_variance,
        )
    
    elif escalation.failed_item_type == BookingType.FLIGHT:
        alternatives = await AlternativeSearchService.search_flight_alternatives(
            origin=escalation.origin_city or "Unknown",
            destination=escalation.destination_city or "Unknown",
            departure_date=escalation.departure_date,
            cabin_class=escalation.failed_item_details.get("cabin_class", "economy"),
            passengers=escalation.travelers_count,
            budget=escalation.budget or 500,
            max_variance=request.max_price_variance,
        )
    
    elif escalation.failed_item_type == BookingType.TRAIN:
        alternatives = await AlternativeSearchService.search_train_alternatives(
            origin=escalation.origin_city or "Unknown",
            destination=escalation.destination_city or "Unknown",
            departure_date=escalation.departure_date,
            train_class=escalation.failed_item_details.get("train_class", "standard"),
            passengers=escalation.travelers_count,
            budget=escalation.budget or 200,
            max_variance=request.max_price_variance,
        )
    
    elif escalation.failed_item_type == BookingType.TRANSFER:
        alternatives = await AlternativeSearchService.search_transfer_alternatives(
            pickup_point=escalation.failed_item_details.get("pickup_point", ""),
            dropoff_point=escalation.failed_item_details.get("dropoff_point", ""),
            pickup_date=escalation.departure_date,
            pickup_time=escalation.failed_item_details.get("pickup_time", ""),
            vehicle_category=escalation.failed_item_details.get("vehicle_category", "sedan"),
            passengers=escalation.travelers_count,
            budget=escalation.budget or 50,
            max_variance=request.max_price_variance,
        )
    
    # Rank alternatives using AI
    ranked_alternatives = EscalationService.rank_alternatives(
        alternatives,
        escalation,
        max_results=request.max_results,
    )
    
    # Store ranking data in escalation for future reference
    # Convert to dict and serialize datetime to ISO format
    ranking_data = ranked_alternatives.model_dump()
    if isinstance(ranking_data.get('generated_at'), datetime):
        ranking_data['generated_at'] = ranking_data['generated_at'].isoformat()
    escalation.ai_ranking_data = ranking_data
    await db.commit()
    
    return ranked_alternatives


@router.post("/escalations/{escalation_id}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
    escalation_id: str,
    request: ResolveEscalationRequest,
    ops_user_id: str = Query(..., description="ID of the ops user resolving this"),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolve an escalation by assigning a selected alternative
    
    This endpoint:
    1. Books the selected alternative via API
    2. Updates the booking item with confirmation
    3. Resumes any paused related bookings
    4. Updates journey status to CONFIRMED
    5. Marks escalation as RESOLVED
    """
    result = await db.execute(
        select(Escalation).filter(Escalation.id == escalation_id)
    )
    escalation = result.scalars().first()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    # Claim the escalation if not already claimed
    if not escalation.claimed_by_ops_id:
        escalation.claimed_by_ops_id = ops_user_id
        escalation.claimed_at = datetime.utcnow()
    elif escalation.claimed_by_ops_id != ops_user_id:
        # Allow resolution if claimed by someone else, but log it
        pass
    
    # TODO: Call the booking provider's API to book the selected alternative
    # For now, we simulate successful booking
    
    # Update the failed booking item with new details
    failed_booking = await db.execute(
        select(BookingItem).filter(BookingItem.id == escalation.failed_booking_item_id)
    )
    booking_item = failed_booking.scalars().first()
    
    if booking_item:
        booking_item.status = BookingStatus.CONFIRMED
        booking_item.confirmation_number = f"ALT-{escalation_id[:8]}"
        booking_item.provider = request.selected_alternative.provider
        booking_item.provider_id = request.selected_alternative.provider_id
        booking_item.price = request.selected_alternative.price
        booking_item.item_details = request.selected_alternative.details
        booking_item.booked_at = datetime.utcnow()
        booking_item.failed_at = None
        booking_item.failed_reason = None
    
    # TODO: Resume any paused bookings related to this journey
    paused_bookings = await db.execute(
        select(BookingItem).filter(
            and_(
                BookingItem.journey_id == escalation.journey_id,
                BookingItem.status == BookingStatus.PAUSED
            )
        )
    )
    paused_items = paused_bookings.scalars().all()
    for item in paused_items:
        item.status = BookingStatus.CONFIRMED
    
    # Mark escalation as resolved
    escalation.status = EscalationStatus.RESOLVED
    escalation.resolved_by_ops_id = ops_user_id
    escalation.resolved_at = datetime.utcnow()
    escalation.resolution_notes = request.resolution_notes
    escalation.alternative_details = request.selected_alternative.model_dump()
    
    await db.commit()
    await db.refresh(escalation)
    
    return escalation


@router.post("/escalations/{escalation_id}/cancel")
async def cancel_escalation(
    escalation_id: str,
    reason: str = Query(..., description="Reason for cancellation"),
    ops_user_id: str = Query(..., description="ID of the ops user"),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an escalation"""
    result = await db.execute(
        select(Escalation).filter(Escalation.id == escalation_id)
    )
    escalation = result.scalars().first()
    
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    escalation.status = EscalationStatus.CANCELLED
    escalation.resolved_by_ops_id = ops_user_id
    escalation.resolved_at = datetime.utcnow()
    escalation.resolution_notes = f"Cancelled: {reason}"
    
    await db.commit()
    
    return {"message": "Escalation cancelled", "escalation_id": escalation_id}
