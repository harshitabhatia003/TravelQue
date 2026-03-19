"""Reset database: drop all old tables and recreate fresh"""
import asyncio
from sqlalchemy import text
from app.core.database import engine, Base

# Import all models so they register with Base.metadata
from app.models.user import User
from app.models.customer import Customer


async def reset_db():
    async with engine.begin() as conn:
        # Drop ALL SQLAlchemy-managed tables
        await conn.run_sync(Base.metadata.drop_all)
        print("All SQLAlchemy tables dropped.")

        # Drop leftover enum types and legacy tables from old models
        await conn.execute(text("DROP TYPE IF EXISTS customertier CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS customer_notes CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS customer_communications CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS customer_form_submissions CASCADE"))
        print("Dropped legacy enums and tables.")

        # Recreate tables with current models only
        await conn.run_sync(Base.metadata.create_all)
        print("Tables recreated successfully!")

        # Show current tables
        result = await conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
        )
        tables = result.fetchall()
        print(f"Current tables: {[t[0] for t in tables]}")

        # Show current enum types
        result2 = await conn.execute(
            text("SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')")
        )
        enums = result2.fetchall()
        print(f"Current enums: {[e[0] for e in enums]}")


asyncio.run(reset_db())
