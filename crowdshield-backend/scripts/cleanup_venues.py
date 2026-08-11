"""
One-shot DB cleanup: delete duplicate venues, keep only the canonical one.
Consolidates all zones under venue_id 'soa-iter-01' with the correct name.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import async_session, engine
from app.models.venue import Venue, Zone
from sqlalchemy.future import select
from sqlalchemy import delete, update


KEEP_VENUE_ID = "soa-iter-01"
CORRECT_NAME = "Siksha 'O' Anusandhan University Campus"
CORRECT_LOCATION = "Bhubaneswar, Odisha"


async def cleanup():
    async with async_session() as session:
        # 1. List all venues currently in the DB
        result = await session.execute(select(Venue))
        all_venues = result.scalars().all()
        print(f"Found {len(all_venues)} venue(s) in database:")
        for v in all_venues:
            print(f"  - id={v.id}  name={v.name}  location={v.location}")

        # 2. Re-assign any zones pointing at other venues to KEEP_VENUE_ID
        other_ids = [v.id for v in all_venues if v.id != KEEP_VENUE_ID]
        if other_ids:
            print(f"\nRe-assigning zones from {other_ids} -> {KEEP_VENUE_ID}")
            await session.execute(
                update(Zone)
                .where(Zone.venue_id.in_(other_ids))
                .values(venue_id=KEEP_VENUE_ID)
            )

        # 3. Delete all venues except the canonical one
        if other_ids:
            print(f"Deleting duplicate venues: {other_ids}")
            await session.execute(
                delete(Venue).where(Venue.id.in_(other_ids))
            )

        # 4. Rename the canonical venue to the correct name
        result2 = await session.execute(select(Venue).where(Venue.id == KEEP_VENUE_ID))
        keep_venue = result2.scalars().first()
        if keep_venue:
            keep_venue.name = CORRECT_NAME
            keep_venue.location = CORRECT_LOCATION
            print(f"\nRenamed venue {KEEP_VENUE_ID} -> '{CORRECT_NAME}'")
        else:
            print(f"\nVenue {KEEP_VENUE_ID} not found! Creating it...")
            new_venue = Venue(
                id=KEEP_VENUE_ID,
                name=CORRECT_NAME,
                location=CORRECT_LOCATION,
                gps_center_lat=20.2496,
                gps_center_lng=85.7988,
                total_capacity=15000,
            )
            session.add(new_venue)

        await session.commit()

        # 5. Verify
        result3 = await session.execute(select(Venue))
        final = result3.scalars().all()
        print(f"\nFinal state: {len(final)} venue(s):")
        for v in final:
            print(f"  - id={v.id}  name={v.name}")


async def main():
    try:
        await cleanup()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
