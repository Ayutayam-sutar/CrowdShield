import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import async_session, engine
from app.models.venue import Venue, Zone
from sqlalchemy.future import select

async def seed_venue():
    async with async_session() as session:
        print("Seeding ITER Campus venue and zones...")
        
        # Matches the DEFAULT_VENUE_ID in your .env
        venue_id = "soa-iter-01"
        
        # Upsert Venue
        result = await session.execute(select(Venue).where(Venue.id == venue_id))
        venue = result.scalars().first()
        
        if not venue:
            venue = Venue(
                id=venue_id,
                name="Institute of Technical Education and Research (SOA)",
                location="Bhubaneswar, Odisha",
                gps_center_lat=20.2496,
                gps_center_lng=85.7988,
                total_capacity=15000
            )
            session.add(venue)
            print(f"Created Venue: {venue.name}")
        else:
            print(f"Venue {venue.name} already exists. Updating...")
        
        # Define Zones matching venue_graph.json EXACTLY, with realistic spatial offsets
        zones_data = [
            {
                "id": "gate_1",
                "code": "G-1",
                "name": "Main Gate",
                "sector": "gate",
                "capacity_limit": 300,
                "center_lat": 20.2515,
                "center_lng": 85.7980
            },
            {
                "id": "zone_admin_block_rd",
                "code": "Z-ADMIN",
                "name": "Administrative Block Road + Gate Approach",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2508,
                "center_lng": 85.7984
            },
            {
                "id": "zone_library_roundabout",
                "code": "Z-LIB",
                "name": "Central Library Roundabout",
                "sector": "junction",
                "capacity_limit": 400,
                "center_lat": 20.2496,
                "center_lng": 85.7988
            },
            {
                "id": "zone_sports_complex_rd",
                "code": "Z-SPORT",
                "name": "Sports Complex / Physics Dept Road",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2485,
                "center_lng": 85.7980
            },
            {
                "id": "gate_2",
                "code": "G-2",
                "name": "EV Charging / Food Court Junction",
                "sector": "gate",
                "capacity_limit": 300,
                "center_lat": 20.2475,
                "center_lng": 85.7975
            },
            {
                "id": "zone_e_block_lawn_rd",
                "code": "Z-EBLK",
                "name": "E Block Lawn / F Block Road",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2488,
                "center_lng": 85.7995
            }
        ]
        
        for z_data in zones_data:
            result = await session.execute(select(Zone).where(Zone.id == z_data["id"]))
            zone = result.scalars().first()
            if not zone:
                zone = Zone(
                    id=z_data["id"],
                    venue_id=venue_id,
                    code=z_data["code"],
                    name=z_data["name"],
                    sector=z_data["sector"],
                    capacity_limit=z_data["capacity_limit"],
                    center_lat=z_data["center_lat"],
                    center_lng=z_data["center_lng"]
                )
                session.add(zone)
                print(f"Created Zone: {zone.name} ({zone.id})")
            else:
                zone.name = z_data["name"]
                zone.sector = z_data["sector"]
                zone.capacity_limit = z_data["capacity_limit"]
                zone.center_lat = z_data["center_lat"]
                zone.center_lng = z_data["center_lng"]
                print(f"Updated Zone: {zone.name} ({zone.id})")

        await session.commit()
        print("Seeding complete.")

async def main():
    try:
        await seed_venue()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())