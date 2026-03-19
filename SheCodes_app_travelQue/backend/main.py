from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.auth import router as auth_router
from app.router.escalation import router as escalation_router

from app.core.database import Base, engine, get_db
from app.routes import customers, dashboard, journeys, products, bookings

# Import all models so they register with Base.metadata
from app.models.user import User, Escalation, BookingItem
from app.models.customer import Customer
from app.models.activity import Activity
from app.models.journey import Journey
from app.models.product import Product
from app.models.booking import Booking, BookingProduct


app = FastAPI(title="TravelQue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(escalation_router, prefix="")
app.include_router(customers.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(journeys.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Add new activity‑type enum values (safe for PG 9.3+)
    new_types = [
        'journey_created', 'journey_updated', 'journey_status_changed',
        'booking_created', 'booking_cancelled', 'product_added',
    ]
    for val in new_types:
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text(f"ALTER TYPE activitytype ADD VALUE IF NOT EXISTS '{val}'")
                )
        except Exception:
            pass  # value already exists or enum not yet used


@app.get("/")
async def root():
    return {"message": "TravelQue API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
