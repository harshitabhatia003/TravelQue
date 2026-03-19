from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from datetime import datetime, timedelta
from typing import Optional, List
import time
import uuid

from app.core.database import get_db
from app.models.customer import Customer, CustomerStatus
from app.models.activity import Activity, ActivityType
from app.schemas.customer import (
    GenerateLinkRequest,
    GenerateLinkResponse,
    CustomerFormSubmit,
    CustomerFormSubmitResponse,
    CustomerFormStatusResponse,
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListItem,
)

router = APIRouter(prefix="/customers", tags=["Customers"])


# Helper function to log activities
async def log_activity(
    db: AsyncSession,
    activity_type: ActivityType,
    title: str,
    description: str,
    reference_id: str = None,
    reference_type: str = None,
    created_by: str = "System"
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
        created_at=datetime.utcnow()
    )
    db.add(activity)


# ==================== PRIORITY 1: Customer Form Link System ====================

@router.post("/generate-link", response_model=GenerateLinkResponse, status_code=status.HTTP_201_CREATED)
async def generate_customer_form_link(
    payload: GenerateLinkRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a shareable customer form link.
    The customer can fill out their details via this link.
    """
    # Generate unique customer ID with timestamp
    customer_id = f"C-{int(time.time() * 1000)}"
    
    # Create pending customer record
    expires_at = datetime.utcnow() + timedelta(days=7)  # 7-day expiry
    
    customer = Customer(
        id=customer_id,
        first_name="",  # Will be filled when form is submitted
        last_name="",
        email="",
        phone_primary="",
        status=CustomerStatus.PENDING,
        form_link_generated_at=datetime.utcnow(),
        form_link_expires_at=expires_at,
        internal_notes=payload.agent_notes
    )
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    # Log activity
    await log_activity(
        db=db,
        activity_type=ActivityType.CUSTOMER_FORM_GENERATED,
        title="Customer form link generated",
        description=f"Form link created for pending customer {customer_id}",
        reference_id=customer_id,
        reference_type="customer"
    )
    await db.commit()
    
    # Generate form link
    form_link = f"https://travelque.app/customer-form/{customer_id}"
    
    return GenerateLinkResponse(
        customer_id=customer_id,
        form_link=form_link,
        expires_at=expires_at,
        status=CustomerStatus.PENDING
    )


@router.get("/form/{customer_id}/status", response_model=CustomerFormStatusResponse)
async def get_customer_form_status(
    customer_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check the status of a customer form (public endpoint - no auth required).
    Returns: pending, completed, or expired
    """
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer form not found"
        )
    
    # Check if expired
    if customer.form_link_expires_at and customer.form_link_expires_at < datetime.utcnow():
        if customer.status == CustomerStatus.PENDING:
            customer.status = CustomerStatus.EXPIRED
            await db.commit()
    
    return CustomerFormStatusResponse(
        customer_id=customer.id,
        status=customer.status,
        created_at=customer.created_at,
        submitted_at=customer.form_submitted_at,
        expires_at=customer.form_link_expires_at
    )


@router.post("/form/{customer_id}", response_model=CustomerFormSubmitResponse, status_code=status.HTTP_200_OK)
async def submit_customer_form(
    customer_id: str,
    payload: CustomerFormSubmit,
    db: AsyncSession = Depends(get_db)
):
    """
    Public endpoint for customer to submit their information via the form link.
    No authentication required.
    """
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid form link"
        )
    
    # Check if already submitted
    if customer.status == CustomerStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form already submitted"
        )
    
    # Check if expired
    if customer.form_link_expires_at and customer.form_link_expires_at < datetime.utcnow():
        customer.status = CustomerStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form link has expired"
        )
    
    # Update customer with submitted data
    customer.title = payload.personal_info.title
    customer.first_name = payload.personal_info.first_name
    customer.last_name = payload.personal_info.last_name
    customer.date_of_birth = payload.personal_info.date_of_birth
    customer.gender = payload.personal_info.gender
    customer.nationality = payload.personal_info.nationality
    
    customer.email = payload.contact.email
    customer.phone_primary = payload.contact.phone_primary
    customer.preferred_contact_method = payload.contact.preferred_contact_method
    customer.address = payload.contact.address.model_dump()
    
    if payload.travel_documents:
        customer.travel_documents = payload.travel_documents.model_dump()
    
    if payload.preferences:
        customer.preferences = payload.preferences.model_dump()
    
    if payload.emergency_contact:
        customer.emergency_contact = payload.emergency_contact.model_dump()
    
    customer.status = CustomerStatus.COMPLETED
    customer.form_submitted_at = datetime.utcnow()
    customer.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(customer)
    
    # Log activity
    await log_activity(
        db=db,
        activity_type=ActivityType.CUSTOMER_FORM_SUBMITTED,
        title="Customer form submitted",
        description=f"{customer.first_name} {customer.last_name} completed their information form",
        reference_id=customer.id,
        reference_type="customer"
    )
    await db.commit()
    
    return CustomerFormSubmitResponse(
        customer_id=customer.id,
        status=CustomerStatus.COMPLETED,
        message="Thank you! Your information has been submitted successfully."
    )


# ==================== PRIORITY 2: Customer Management ====================

@router.get("", response_model=dict)
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, phone, or ID"),
    customer_type: Optional[str] = Query(None, description="Filter by type: Individual, Corporate, Family"),
    source: Optional[str] = Query(None, description="Filter by source"),
    status: Optional[str] = Query(None, description="Filter by status: pending, completed, expired"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at", description="Sort by: created_at, lifetime_value, last_activity"),
    order: str = Query("desc", description="Order: asc or desc"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all customers with search, filters, and pagination.
    """
    query = select(Customer).where(Customer.status != CustomerStatus.PENDING)
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.email.ilike(search_term),
                Customer.phone_primary.ilike(search_term),
                Customer.id.ilike(search_term)
            )
        )
    
    # Apply filters
    if customer_type:
        query = query.where(Customer.customer_type == customer_type)
    if source:
        query = query.where(Customer.source == source)
    if status:
        query = query.where(Customer.status == status)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "lifetime_value":
        order_column = Customer.lifetime_value
    elif sort_by == "last_activity":
        order_column = Customer.updated_at
    else:
        order_column = Customer.created_at
    
    if order == "asc":
        query = query.order_by(order_column.asc())
    else:
        query = query.order_by(order_column.desc())
    
    # Apply pagination
    query = query.limit(limit).offset(offset)
    
    # Execute query
    result = await db.execute(query)
    customers = result.scalars().all()
    
    # Format response
    customers_list = []
    for customer in customers:
        customers_list.append({
            "id": customer.id,
            "personal_info": {
                "title": customer.title,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "date_of_birth": customer.date_of_birth,
                "gender": customer.gender,
                "nationality": customer.nationality
            },
            "contact": {
                "email": customer.email,
                "phone_primary": customer.phone_primary,
                "phone_alternate": customer.phone_alternate,
                "preferred_contact_method": customer.preferred_contact_method,
                "address": customer.address
            },
            "classification": {
                "tags": customer.tags,
                "customer_type": customer.customer_type
            },
            "stats": {
                "total_bookings": customer.total_bookings,
                "lifetime_value": customer.lifetime_value,
                "average_booking": customer.average_booking,
                "upcoming_trips": customer.upcoming_trips
            },
            "status": customer.status,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        })
    
    return {
        "total": total,
        "customers": customers_list
    }


@router.get("/{customer_id}", response_model=dict)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed customer information by ID.
    """
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return {
        "id": customer.id,
        "personal_info": {
            "title": customer.title,
            "first_name": customer.first_name,
            "middle_name": customer.middle_name,
            "last_name": customer.last_name,
            "date_of_birth": customer.date_of_birth,
            "gender": customer.gender,
            "nationality": customer.nationality
        },
        "contact": {
            "email": customer.email,
            "phone_primary": customer.phone_primary,
            "phone_alternate": customer.phone_alternate,
            "preferred_contact_method": customer.preferred_contact_method,
            "address": customer.address
        },
        "travel_documents": customer.travel_documents,
        "preferences": customer.preferences,
        "loyalty_programs": customer.loyalty_programs,
        "emergency_contact": customer.emergency_contact,
        "classification": {
            "tags": customer.tags,
            "customer_type": customer.customer_type,
            "source": customer.source
        },
        "stats": {
            "total_bookings": customer.total_bookings,
            "lifetime_value": customer.lifetime_value,
            "average_booking": customer.average_booking,
            "upcoming_trips": customer.upcoming_trips
        },
        "internal_notes": customer.internal_notes,
        "status": customer.status,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer_manually(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a customer manually (agent creates without form link).
    """
    # Generate customer ID
    customer_id = f"C-{int(time.time() * 1000)}"
    
    customer = Customer(
        id=customer_id,
        title=payload.personal_info.title,
        first_name=payload.personal_info.first_name,
        last_name=payload.personal_info.last_name,
        date_of_birth=payload.personal_info.date_of_birth,
        gender=payload.personal_info.gender,
        nationality=payload.personal_info.nationality,
        email=payload.contact.email,
        phone_primary=payload.contact.phone_primary,
        preferred_contact_method=payload.contact.preferred_contact_method,
        address=payload.contact.address.model_dump(),
        travel_documents=payload.travel_documents.model_dump() if payload.travel_documents else None,
        preferences=payload.preferences.model_dump() if payload.preferences else None,
        emergency_contact=payload.emergency_contact.model_dump() if payload.emergency_contact else None,
        customer_type=payload.classification.customer_type if payload.classification else None,
        tags=payload.classification.tags if payload.classification else None,
        source=payload.classification.source if payload.classification else None,
        internal_notes=payload.internal_notes,
        status=CustomerStatus.COMPLETED,
    )
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    # Log activity
    await log_activity(
        db=db,
        activity_type=ActivityType.CUSTOMER_CREATED,
        title="New customer created",
        description=f"Customer {customer.first_name} {customer.last_name} added to system",
        reference_id=customer.id,
        reference_type="customer",
        created_by="Agent"
    )
    await db.commit()
    
    return {
        "id": customer.id,
        "personal_info": {
            "title": customer.title,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "date_of_birth": customer.date_of_birth,
            "gender": customer.gender,
            "nationality": customer.nationality
        },
        "contact": {
            "email": customer.email,
            "phone_primary": customer.phone_primary,
            "address": customer.address
        },
        "created_at": customer.created_at
    }


@router.put("/{customer_id}", response_model=dict)
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update customer information.
    """
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Update fields if provided
    if payload.personal_info:
        customer.title = payload.personal_info.title
        customer.first_name = payload.personal_info.first_name
        customer.last_name = payload.personal_info.last_name
        customer.date_of_birth = payload.personal_info.date_of_birth
        customer.gender = payload.personal_info.gender
        customer.nationality = payload.personal_info.nationality
    
    if payload.contact:
        customer.email = payload.contact.email
        customer.phone_primary = payload.contact.phone_primary
        customer.preferred_contact_method = payload.contact.preferred_contact_method
        customer.address = payload.contact.address.model_dump()
    
    if payload.travel_documents:
        customer.travel_documents = payload.travel_documents.model_dump()
    
    if payload.preferences:
        customer.preferences = payload.preferences.model_dump()
    
    if payload.emergency_contact:
        customer.emergency_contact = payload.emergency_contact.model_dump()
    
    if payload.classification:
        customer.customer_type = payload.classification.customer_type
        customer.tags = payload.classification.tags
        customer.source = payload.classification.source
    
    if payload.internal_notes is not None:
        customer.internal_notes = payload.internal_notes
    
    customer.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(customer)
    
    # Log activity
    await log_activity(
        db=db,
        activity_type=ActivityType.CUSTOMER_UPDATED,
        title="Customer updated",
        description=f"Customer {customer.first_name} {customer.last_name} information updated",
        reference_id=customer.id,
        reference_type="customer",
        created_by="Agent"
    )
    await db.commit()
    
    return {
        "id": customer.id,
        "updated_at": customer.updated_at
    }


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a customer (soft delete - you can modify to set a deleted flag instead).
    """
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    await db.delete(customer)
    await db.commit()
    
    return None
