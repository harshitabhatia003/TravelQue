import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine("postgresql+asyncpg://postgres:mite@localhost/travelQue")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, email, full_name, role, is_active, created_at FROM users"))
        rows = result.fetchall()
        print(f"Users in DB: {len(rows)}")
        for r in rows:
            print(f"  - {r}")
    await engine.dispose()

asyncio.run(check())
