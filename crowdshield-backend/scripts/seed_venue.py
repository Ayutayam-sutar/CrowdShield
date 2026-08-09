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
        print("Seeding venue and zones...")
        
        venue_id = "venue_iter"
        
        # Upsert Venue
        result = await session.execute(select(Venue).where(Venue.id == venue_id))
        venue = result.scalars().first()
        
        if not venue:
            venue = Venue(
                id=venue_id,
                name="ITER",
                location="Siksha 'O' Anusandhan Campus, Bhubaneswar",
                gps_center_lat=20.2496, # TODO: Placeholder, needs real GPS
                gps_center_lng=85.8000, # TODO: Placeholder, needs real GPS
                total_capacity=2500
            )
            session.add(venue)
            print(f"Created Venue: {venue.name}")
        else:
            print(f"Venue {venue.name} already exists. Updating...")
        
        # Define Zones
        zones_data = [
            {
                "id": "gate_1",
                "code": "G-1",
                "name": "Main Gate",
                "sector": "gate",
                "capacity_limit": 300,
                "center_lat": 20.2500, # TODO: Needs real GPS coordinates
                "center_lng": 85.8010  # TODO: Needs real GPS coordinates
            },
            {
                "id": "zone_admin_block_rd",
                "code": "Z-ADMIN",
                "name": "Administrative Block Road + Gate Approach",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2501, # TODO: Needs real GPS coordinates
                "center_lng": 85.8015  # TODO: Needs real GPS coordinates
            },
            {
                "id": "zone_library_roundabout",
                "code": "Z-LIB",
                "name": "Central Library Roundabout",
                "sector": "junction",
                "capacity_limit": 400,
                "center_lat": 20.2505, # TODO: Needs real GPS coordinates
                "center_lng": 85.8020  # TODO: Needs real GPS coordinates
            },
            {
                "id": "zone_sports_complex_rd",
                "code": "Z-SPORT",
                "name": "Sports Complex / Physics Dept Road",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2510, # TODO: Needs real GPS coordinates
                "center_lng": 85.8025  # TODO: Needs real GPS coordinates
            },
            {
                "id": "gate_2",
                "code": "G-2",
                "name": "EV Charging / Food Court Junction",
                "sector": "gate",
                "capacity_limit": 300,
                "center_lat": 20.2515, # TODO: Needs real GPS coordinates
                "center_lng": 85.8030  # TODO: Needs real GPS coordinates
            },
            {
                "id": "zone_e_block_lawn_rd",
                "code": "Z-EBLK",
                "name": "E Block Lawn / F Block Road",
                "sector": "pathway",
                "capacity_limit": 500,
                "center_lat": 20.2508, # TODO: Needs real GPS coordinates
                "center_lng": 85.8018  # TODO: Needs real GPS coordinates
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
