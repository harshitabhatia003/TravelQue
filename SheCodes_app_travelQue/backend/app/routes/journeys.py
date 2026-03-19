from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
from typing import Optional
import time
import uuid

from app.core.database import get_db
from app.models.journey import Journey, JourneyStatus
from app.models.product import Product, ProductType, ProductStatus
from app.models.customer import Customer
from app.utils import recalculate_journey_totals
from app.schemas.journey import (
    JourneyCreate,
    JourneyUpdate,
    JourneyStatusUpdate,
    JourneyResponse,
    JourneyListItem,
    JourneyProductSummary,
)
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductsSummary,
    JourneyProductsResponse,
)

router = APIRouter(tags=["Journeys"])


# ==================== JOURNEY CRUD ====================


@router.get("/journeys", response_model=dict)
async def list_journeys(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    destination: Optional[str] = Query(None, description="Filter by destination"),
    start_date_from: Optional[str] = Query(None, description="Start date from (YYYY-MM-DD)"),
    start_date_to: Optional[str] = Query(None, description="Start date to (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search by title, client name, destination"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all journeys with filters and pagination."""

    query = select(Journey)

    # Apply filters
    if customer_id:
        query = query.where(Journey.customer_id == customer_id)
    if status_filter:
        query = query.where(Journey.status == status_filter)
    if destination:
        query = query.where(Journey.destination.ilike(f"%{destination}%"))
    if start_date_from:
        query = query.where(Journey.start_date >= start_date_from)
    if start_date_to:
        query = query.where(Journey.start_date <= start_date_to)
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                Journey.title.ilike(term),
                Journey.client_name.ilike(term),
                Journey.destination.ilike(term),
                Journey.reference_number.ilike(term),
            )
        )

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order + paginate
    query = query.order_by(Journey.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    journeys = result.scalars().all()

    return {
        "total": total,
        "journeys": [
            {
                "id": j.id,
                "reference_number": j.reference_number,
                "title": j.title,
                "customer_id": j.customer_id,
                "client_name": j.client_name,
                "client_email": j.client_email,
                "destination": j.destination,
                "start_date": j.start_date,
                "end_date": j.end_date,
                "status": j.status.value if j.status else "DRAFT",
                "total_cost": j.total_cost or 0,
                "total_sell": j.total_sell or 0,
                "profit_margin": j.profit_margin or 0,
                "created_at": j.created_at,
                "updated_at": j.updated_at,
            }
            for j in journeys
        ],
    }


@router.get("/journeys/{journey_id}", response_model=dict)
async def get_journey(
    journey_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get journey details including its products."""

    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # Fetch products
    prod_result = await db.execute(
        select(Product).where(Product.journey_id == journey_id).order_by(Product.created_at)
    )
    products = prod_result.scalars().all()

    return {
        "id": journey.id,
        "reference_number": journey.reference_number,
        "title": journey.title,
        "customer_id": journey.customer_id,
        "client_name": journey.client_name,
        "client_email": journey.client_email,
        "client_phone": journey.client_phone,
        "destination": journey.destination,
        "start_date": journey.start_date,
        "end_date": journey.end_date,
        "budget_constraint": journey.budget_constraint,
        "notes": journey.notes,
        "status": journey.status.value if journey.status else "DRAFT",
        "total_cost": journey.total_cost or 0,
        "total_sell": journey.total_sell or 0,
        "profit_margin": journey.profit_margin or 0,
        "created_by": journey.created_by,
        "assigned_to": journey.assigned_to,
        "products": [
            {
                "id": p.id,
                "product_type": p.product_type.value if p.product_type else None,
                "name": p.name,
                "supplier": p.supplier,
                "cost_price": p.cost_price or 0,
                "sell_price": p.sell_price or 0,
                "status": p.status.value if p.status else "PENDING",
                "booking_reference": p.booking_reference,
            }
            for p in products
        ],
        "created_at": journey.created_at,
        "updated_at": journey.updated_at,
    }


@router.post("/journeys", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_journey(
    payload: JourneyCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new journey, optionally with inline products.
    
    - Validates end_date >= start_date
    - Sets defaults for destination and budget_constraint
    - Calculates totals from products
    - Logs journey creation activity
    - Returns detailed product information
    """
    
    # ── Validation ──
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be on or after start date"
        )
    
    # Check customer exists
    customer_result = await db.execute(
        select(Customer).where(Customer.id == payload.customer_id)
    )
    customer = customer_result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    journey_id = f"J-{int(time.time() * 1000)}"

    # Generate reference number: TQ-{year}-{seq}
    count_result = await db.execute(select(func.count()).select_from(Journey))
    seq = (count_result.scalar() or 0) + 1
    ref = f"TQ-{datetime.utcnow().year}-{str(seq).zfill(3)}"

    # Set defaults for optional fields
    destination = payload.destination or "TBD"
    budget_constraint = payload.budget_constraint or "Flexible"
    notes = payload.notes or ""

    journey = Journey(
        id=journey_id,
        reference_number=ref,
        title=payload.title,
        customer_id=payload.customer_id,
        client_name=payload.client_name,
        client_email=payload.client_email,
        client_phone=payload.client_phone,
        destination=destination,
        start_date=payload.start_date,
        end_date=payload.end_date,
        budget_constraint=budget_constraint,
        notes=notes,
        status=JourneyStatus.DRAFT,
        created_by="Agent",
    )
    db.add(journey)

    # Create inline products if provided
    total_cost = 0.0
    total_sell = 0.0
    created_products = []

    if payload.products:
        for idx, p in enumerate(payload.products):
            product_id = f"P-{int(time.time() * 1000)}-{idx}"
            product = Product(
                id=product_id,
                journey_id=journey_id,
                product_type=p.product_type,
                name=p.name,
                supplier=p.supplier,
                cost_price=p.cost_price or 0.0,
                sell_price=p.sell_price or 0.0,
                status=ProductStatus.PENDING,
            )
            db.add(product)
            total_cost += (p.cost_price or 0.0)
            total_sell += (p.sell_price or 0.0)
            created_products.append({
                "id": product_id,
                "product_type": p.product_type.value,
                "name": p.name,
                "supplier": p.supplier,
                "cost_price": p.cost_price or 0.0,
                "sell_price": p.sell_price or 0.0,
            })

        journey.total_cost = total_cost
        journey.total_sell = total_sell
        journey.profit_margin = total_sell - total_cost

    await db.commit()
    await db.refresh(journey)

    # Log activity
    from app.models.activity import Activity, ActivityType
    activity = Activity(
        id=f"ACT-{int(time.time() * 1000)}",
        activity_type=ActivityType.JOURNEY_CREATED,
        customer_id=payload.customer_id,
        journey_id=journey_id,
        description=f"Journey '{payload.title}' created for {payload.client_name}",
        created_by="Agent",
    )
    db.add(activity)
    await db.commit()

    return {
        "id": journey.id,
        "reference_number": journey.reference_number,
        "title": journey.title,
        "destination": journey.destination,
        "start_date": str(journey.start_date),
        "end_date": str(journey.end_date),
        "budget_constraint": journey.budget_constraint,
        "status": journey.status.value,
        "total_cost": journey.total_cost or 0,
        "total_sell": journey.total_sell or 0,
        "profit_margin": journey.profit_margin or 0,
        "products": created_products,
        "created_at": journey.created_at,
    }


@router.put("/journeys/{journey_id}", response_model=dict)
async def update_journey(
    journey_id: str,
    payload: JourneyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update journey details."""

    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    update_fields = payload.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(journey, field, value)

    journey.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(journey)

    return {
        "id": journey.id,
        "reference_number": journey.reference_number,
        "title": journey.title,
        "status": journey.status.value if journey.status else "DRAFT",
        "updated_at": journey.updated_at,
    }


@router.patch("/journeys/{journey_id}/status", response_model=dict)
async def update_journey_status(
    journey_id: str,
    payload: JourneyStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update only the journey status."""

    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    journey.status = payload.status.value
    if payload.notes:
        journey.notes = payload.notes
    journey.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(journey)

    return {
        "id": journey.id,
        "status": journey.status.value if hasattr(journey.status, "value") else journey.status,
        "updated_at": journey.updated_at,
    }


@router.delete("/journeys/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey(
    journey_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a journey and its products (cascade)."""

    result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # Delete products first (in case cascade not set on DB level)
    prod_result = await db.execute(select(Product).where(Product.journey_id == journey_id))
    for p in prod_result.scalars().all():
        await db.delete(p)

    await db.delete(journey)
    await db.commit()
    return None


# ==================== JOURNEY PRODUCTS ====================


@router.get("/journeys/{journey_id}/products", response_model=dict)
async def list_journey_products(
    journey_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all products in a journey with cost summary."""

    # Verify journey exists
    j_result = await db.execute(select(Journey).where(Journey.id == journey_id))
    if not j_result.scalars().first():
        raise HTTPException(status_code=404, detail="Journey not found")

    result = await db.execute(
        select(Product).where(Product.journey_id == journey_id).order_by(Product.created_at)
    )
    products = result.scalars().all()

    total_cost = sum(p.cost_price or 0 for p in products if p.status != ProductStatus.CANCELLED)
    total_sell = sum(p.sell_price or 0 for p in products if p.status != ProductStatus.CANCELLED)

    return {
        "products": [
            {
                "id": p.id,
                "journey_id": p.journey_id,
                "product_type": p.product_type.value if p.product_type else None,
                "name": p.name,
                "supplier": p.supplier,
                "description": p.description,
                "cost_price": p.cost_price or 0,
                "sell_price": p.sell_price or 0,
                "status": p.status.value if p.status else "PENDING",
                "booking_reference": p.booking_reference,
                "start_date": p.start_date,
                "end_date": p.end_date,
                "metadata_json": p.metadata_json,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
            }
            for p in products
        ],
        "summary": {
            "total_cost": total_cost,
            "total_sell": total_sell,
            "profit_margin": total_sell - total_cost,
        },
    }


@router.post(
    "/journeys/{journey_id}/products",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
async def add_product_to_journey(
    journey_id: str,
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a product to a journey."""

    # Verify journey exists
    j_result = await db.execute(select(Journey).where(Journey.id == journey_id))
    journey = j_result.scalars().first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    product_id = f"P-{int(time.time() * 1000)}"
    product = Product(
        id=product_id,
        journey_id=journey_id,
        product_type=payload.product_type.value,
        name=payload.name,
        supplier=payload.supplier,
        description=payload.description,
        cost_price=payload.cost_price,
        sell_price=payload.sell_price,
        status=ProductStatus.PENDING,
        start_date=payload.start_date,
        end_date=payload.end_date,
        metadata_json=payload.metadata,
    )
    db.add(product)

    # Recalculate journey totals
    await db.flush()
    await recalculate_journey_totals(db, journey_id)

    await db.commit()
    await db.refresh(product)

    return {
        "id": product.id,
        "journey_id": product.journey_id,
        "product_type": product.product_type.value if hasattr(product.product_type, "value") else product.product_type,
        "name": product.name,
        "status": product.status.value if hasattr(product.status, "value") else product.status,
        "cost_price": product.cost_price,
        "sell_price": product.sell_price,
        "created_at": product.created_at,
    }


@router.put("/journeys/{journey_id}/products/{product_id}", response_model=dict)
async def update_journey_product(
    journey_id: str,
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a product in a journey (status, booking ref, pricing, etc.)."""

    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.journey_id == journey_id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this journey")

    update_fields = payload.model_dump(exclude_unset=True)
    # Handle metadata separately
    if "metadata" in update_fields:
        product.metadata_json = update_fields.pop("metadata")
    for field, value in update_fields.items():
        setattr(product, field, value)

    product.updated_at = datetime.utcnow()

    # Recalculate journey totals
    await db.flush()
    await recalculate_journey_totals(db, journey_id)

    await db.commit()
    await db.refresh(product)

    return {
        "id": product.id,
        "status": product.status.value if hasattr(product.status, "value") else product.status,
        "booking_reference": product.booking_reference,
        "cost_price": product.cost_price,
        "sell_price": product.sell_price,
        "updated_at": product.updated_at,
    }


@router.delete(
    "/journeys/{journey_id}/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_product_from_journey(
    journey_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a product from a journey."""

    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.journey_id == journey_id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in this journey")

    await db.delete(product)
    await db.flush()
    await recalculate_journey_totals(db, journey_id)
    await db.commit()
    return None
