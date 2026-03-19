"""Shared utility functions for the TravelQue backend."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import uuid

from app.models.activity import Activity, ActivityType
from app.models.product import Product, ProductStatus


async def log_activity(
    db: AsyncSession,
    activity_type: ActivityType,
    title: str,
    description: str,
    reference_id: str = None,
    reference_type: str = None,
    created_by: str = "System",
):
    """Log an activity to the activities table."""
    activity = Activity(
        id=f"ACT-{uuid.uuid4()}",
        type=activity_type,
        title=title,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by=created_by,
        created_at=datetime.utcnow(),
    )
    db.add(activity)


async def recalculate_journey_totals(db: AsyncSession, journey_id: str):
    """Recalculate journey total_cost, total_sell, profit_margin from its products."""
    from app.models.journey import Journey

    result = await db.execute(
        select(
            func.coalesce(func.sum(Product.cost_price), 0.0),
            func.coalesce(func.sum(Product.sell_price), 0.0),
        )
        .where(Product.journey_id == journey_id)
        .where(Product.status != ProductStatus.CANCELLED)
    )
    row = result.first()
    total_cost = float(row[0])
    total_sell = float(row[1])

    journey_result = await db.execute(
        select(Journey).where(Journey.id == journey_id)
    )
    journey = journey_result.scalars().first()
    if journey:
        journey.total_cost = total_cost
        journey.total_sell = total_sell
        journey.profit_margin = total_sell - total_cost
