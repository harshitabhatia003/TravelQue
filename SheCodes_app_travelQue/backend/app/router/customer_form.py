from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from uuid import uuid4

from app.core.database import get_db
from app.models.user import CustomerFormSubmission
from app.schemas.user import  CustomerFormSubmit, CustomerFormResponse, CustomerFormLinkResponse


router = APIRouter(
    prefix="",
    tags=["Customer Form"]
)

@router.post("/create-link", response_model=CustomerFormLinkResponse)
async def create_customer_form_link(db: AsyncSession = Depends(get_db)):
    form = CustomerFormSubmission(
        id=str(uuid4()),
        total_passenger_count=0,
        lead_name="",
        lead_email="",
        lead_phone="",
        budget=0.0,
        travelers=[],
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(days=3)
    )

    db.add(form)
    await db.commit()
    await db.refresh(form)

    return {
        "form_id": form.id,
        "link": f"http://127.0.0.1:8000/api/customer-form/submit/{form.id}",
        "expires_at": form.expires_at
    }

@router.post("/submit/{form_id}", response_model=CustomerFormResponse, status_code=201)
async def submit_customer_form(
    form_id: str,
    payload: CustomerFormSubmit,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CustomerFormSubmission).filter(CustomerFormSubmission.id == form_id))
    form = result.scalars().first()

    if not form:
        raise HTTPException(status_code=404, detail="Invalid form link")

    if form.is_used:
        raise HTTPException(status_code=400, detail="Form already submitted")

    if form.expires_at and form.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Form link expired")

    # Set non-JSON fields normally, convert JSON fields to JSON-serializable format
    form.currency = payload.currency
    form.total_passenger_count = payload.total_passenger_count
    form.lead_name = payload.lead_name
    form.lead_email = payload.lead_email
    form.lead_phone = payload.lead_phone
    form.budget = payload.budget
    form.travel_start_date = payload.travel_start_date
    form.travel_end_date = payload.travel_end_date
    
    # Convert nested objects to JSON-serializable dicts
    form.travelers = [t.model_dump(mode='json') for t in payload.travelers]
    form.flights = [f.model_dump(mode='json') for f in payload.flights] if payload.flights else []
    form.accommodations = [a.model_dump(mode='json') for a in payload.accommodations] if payload.accommodations else []
    form.ground_transfers = [g.model_dump(mode='json') for g in payload.ground_transfers] if payload.ground_transfers else []
    
    form.special_requests = payload.special_requests
    form.is_used = True
    form.submitted_at = datetime.utcnow()

    await db.commit()
    await db.refresh(form)

    return form

@router.get("/{form_id}", response_model=CustomerFormResponse)
async def get_customer_form(form_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomerFormSubmission).filter(CustomerFormSubmission.id == form_id))
    form = result.scalars().first()

    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return form
