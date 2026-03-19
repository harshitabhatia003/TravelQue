#!/usr/bin/env python
"""Test startup script to diagnose errors"""
import sys
import traceback

try:
    print("1. Importing FastAPI...")
    from fastapi import FastAPI
    print("   ✓ FastAPI imported")
    
    print("2. Importing CORS middleware...")
    from fastapi.middleware.cors import CORSMiddleware
    print("   ✓ CORS imported")
    
    print("3. Importing SQLAlchemy...")
    from sqlalchemy import text
    print("   ✓ SQLAlchemy imported")
    
    print("4. Importing auth router...")
    from app.auth import router as auth_router
    print("   ✓ Auth router imported")
    
    print("5. Importing escalation router...")
    from app.router.escalation import router as escalation_router
    print("   ✓ Escalation router imported")
    
    print("6. Importing database...")
    from app.core.database import Base, engine, get_db
    print("   ✓ Database imported")
    
    print("7. Importing route modules...")
    from app.routes import customers, dashboard, journeys, products, bookings
    print("   ✓ Routes imported")
    
    print("8. Importing models...")
    from app.models.user import User, Escalation, BookingItem
    from app.models.customer import Customer
    from app.models.activity import Activity
    from app.models.journey import Journey
    from app.models.product import Product
    from app.models.booking import Booking, BookingProduct
    print("   ✓ All models imported")
    
    print("\n✅ All imports successful! Backend should start now.")
    
except Exception as e:
    print(f"\n❌ Error during import:")
    print(f"   {type(e).__name__}: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
