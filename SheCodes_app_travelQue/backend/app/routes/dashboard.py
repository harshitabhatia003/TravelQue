from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date, or_, Integer
from datetime import datetime, timedelta, date
from typing import Optional

from app.core.database import get_db
from app.models.customer import Customer, CustomerStatus
from app.models.journey import Journey, JourneyStatus
from app.models.booking import Booking, BookingStatus
from app.models.activity import Activity
from app.schemas.dashboard import (
    DashboardStatsResponse,
    DashboardJourneyStats,
    DashboardRevenueStats,
    DashboardCustomerStats,
    DashboardBookingStats,
    DashboardActivitiesResponse,
    ActivityResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    period: str = Query("month", description="Period: today, week, month, year"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive dashboard statistics for the specified period.
    Includes journey metrics, revenue with margin %, customer segmentation, booking success rates,
    average transaction value, and journey duration analysis.
    """

    # Calculate date range based on period
    today = date.today()

    if period == "today":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "year":
        start_date = today - timedelta(days=365)
    else:  # month
        start_date = today - timedelta(days=30)

    # ── Customer Stats ──
    total_customers_result = await db.execute(
        select(func.count(Customer.id)).where(Customer.status != CustomerStatus.PENDING)
    )
    total_customers = total_customers_result.scalar() or 0

    new_customers_result = await db.execute(
        select(func.count(Customer.id)).where(
            and_(
                cast(Customer.created_at, Date) >= start_date,
                Customer.status == CustomerStatus.COMPLETED,
            )
        )
    )
    new_customers = new_customers_result.scalar() or 0

    completed_customers_result = await db.execute(
        select(func.count(Customer.id)).where(Customer.status == CustomerStatus.COMPLETED)
    )
    completed_customers = completed_customers_result.scalar() or 0

    pending_customers_result = await db.execute(
        select(func.count(Customer.id)).where(Customer.status == CustomerStatus.PENDING)
    )
    pending_customers = pending_customers_result.scalar() or 0

    # ── Journey Stats ──
    journey_total = (await db.execute(select(func.count()).select_from(Journey))).scalar() or 0

    journey_in_progress = (await db.execute(
        select(func.count()).select_from(Journey).where(
            Journey.status.in_([
                JourneyStatus.BOOKING_IN_PROGRESS,
                JourneyStatus.IN_PROGRESS,
                JourneyStatus.DRAFT,
                JourneyStatus.QUOTED,
            ])
        )
    )).scalar() or 0

    journey_confirmed = (await db.execute(
        select(func.count()).select_from(Journey).where(
            Journey.status.in_([JourneyStatus.CONFIRMED, JourneyStatus.FULLY_CONFIRMED])
        )
    )).scalar() or 0

    journey_completed = (await db.execute(
        select(func.count()).select_from(Journey).where(Journey.status == JourneyStatus.COMPLETED)
    )).scalar() or 0

    # Calculate average journey duration
    avg_duration_result = await db.execute(
        select(func.avg(cast((Journey.end_date - Journey.start_date), Integer)))
        .where(Journey.end_date.isnot(None), Journey.start_date.isnot(None))
    )
    avg_duration = float(avg_duration_result.scalar() or 0)

    # ── Revenue Stats (from journeys) ──
    revenue_result = await db.execute(
        select(
            func.coalesce(func.sum(Journey.total_sell), 0.0),
            func.coalesce(func.sum(Journey.total_cost), 0.0),
            func.coalesce(func.sum(Journey.profit_margin), 0.0),
        )
    )
    rev_row = revenue_result.first()
    total_sell = float(rev_row[0])
    total_cost = float(rev_row[1])
    profit_margin = float(rev_row[2])
    margin_percent = (profit_margin / total_sell * 100) if total_sell > 0 else 0.0
    avg_transaction = (total_sell / journey_completed) if journey_completed > 0 else 0.0

    # ── Booking Stats ──
    booking_pending = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.status.in_([BookingStatus.PROCESSING, BookingStatus.PARTIALLY_CONFIRMED])
        )
    )).scalar() or 0

    booking_confirmed = (await db.execute(
        select(func.count()).select_from(Booking).where(Booking.status == BookingStatus.CONFIRMED)
    )).scalar() or 0

    booking_failed = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.status.in_([BookingStatus.FAILED, BookingStatus.CANCELLED])
        )
    )).scalar() or 0

    booking_total = booking_confirmed + booking_failed
    success_rate = (booking_confirmed / booking_total * 100) if booking_total > 0 else 0.0

    return DashboardStatsResponse(
        period=period,
        journeys=DashboardJourneyStats(
            total=journey_total,
            in_progress=journey_in_progress,
            confirmed=journey_confirmed,
            completed=journey_completed,
            avg_duration_days=round(avg_duration, 1),
        ),
        revenue=DashboardRevenueStats(
            total_sell=round(total_sell, 2),
            total_cost=round(total_cost, 2),
            profit_margin=round(profit_margin, 2),
            margin_percent=round(margin_percent, 2),
            avg_transaction=round(avg_transaction, 2),
        ),
        customers=DashboardCustomerStats(
            total=total_customers,
            new_this_month=new_customers,
            completed=completed_customers,
            pending=pending_customers,
            vip_count=0,  # Set to 0 for now (would require tier column)
            repeat_customers=total_customers - new_customers if total_customers >= new_customers else 0,
        ),
        bookings=DashboardBookingStats(
            pending=booking_pending,
            confirmed=booking_confirmed,
            failed=booking_failed,
            success_rate=round(success_rate, 2),
        ),
    )


@router.get("/activities", response_model=DashboardActivitiesResponse)
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50, description="Number of activities to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent activities in the system.
    Returns a list of recent actions performed by agents.
    """
    
    result = await db.execute(
        select(Activity)
        .order_by(Activity.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()
    
    return DashboardActivitiesResponse(
        activities=[ActivityResponse.model_validate(activity) for activity in activities]
    )
