import asyncio
from sqlalchemy import text
from app.db.session import engine

async def alter_table():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE citizen_reports ADD COLUMN venue_id VARCHAR(50);"))
            print("Column venue_id added successfully.")
        except Exception as e:
            print(f"Error adding column (maybe it already exists?): {e}")

if __name__ == "__main__":
    asyncio.run(alter_table())
