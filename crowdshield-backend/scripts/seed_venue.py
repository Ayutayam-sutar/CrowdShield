import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import async_session, engine
from app.models.venue import Venue, Zone
from sqlalchemy.future import select

async def seed_venues():
    async with async_session() as session:
        print("🌱 Seeding Multi-Venue Telemetry Database (ITER Campus + Kalinga Stadium)...")
        
        # -------------------------------------------------------------------
        # 1. VENUE 1: Siksha 'O' Anusandhan ITER Campus
        # -------------------------------------------------------------------
        iter_venue_id = "soa-iter-01"
        result = await session.execute(select(Venue).where(Venue.id == iter_venue_id))
        iter_venue = result.scalars().first()
        
        if not iter_venue:
            iter_venue = Venue(
                id=iter_venue_id,
                name="Siksha 'O' Anusandhan University Campus",
                location="Bhubaneswar, Odisha",
                gps_center_lat=20.249400,
                gps_center_lng=85.800000,
                total_capacity=15000
            )
            session.add(iter_venue)
            print(f"✅ Created Venue: {iter_venue.name}")
        else:
            iter_venue.gps_center_lat = 20.249400
            iter_venue.gps_center_lng = 85.800000
            print(f"🔄 Updated Venue: {iter_venue.name}")

        # Tight spatial coordinates for ITER Campus
        # -------------------------------------------------------------------
        # CALIBRATED ITER CAMPUS COORDINATES
        # -------------------------------------------------------------------
       # -------------------------------------------------------------------
        # CALIBRATED ITER CAMPUS COORDINATES
        # -------------------------------------------------------------------
        iter_zones = [
            {
                "id": "gate_1", "code": "G-1", "name": "Main Gate", "sector": "gate",
                "capacity_limit": 300, "center_lat": 20.250451, "center_lng": 85.800041
            },
            {
                "id": "zone_admin_block_rd", "code": "Z-ADMIN", "name": "Administrative Block Road + Gate Approach", "sector": "pathway",
                "capacity_limit": 500, "center_lat": 20.249576, "center_lng": 85.800921
            },
            {
                "id": "zone_library_roundabout", "code": "Z-LIB", "name": "Central Library Roundabout", "sector": "junction",
                "capacity_limit": 400, "center_lat": 20.248713, "center_lng": 85.800364
            },
            {
                "id": "zone_e_block_lawn_rd", "code": "Z-EBLK", "name": "E Block Lawn / F Block Road", "sector": "pathway",
                "capacity_limit": 500, "center_lat": 20.247431, "center_lng": 85.800941
            },
            {
                "id": "zone_sports_complex_rd", "code": "Z-SPORT", "name": "Sports Complex / Physics Dept Road", "sector": "pathway",
                "capacity_limit": 500, "center_lat": 20.248029, "center_lng": 85.800828
            },
            {
                "id": "gate_2", "code": "G-2", "name": "EV Charging / Food Court Junction", "sector": "gate",
                "capacity_limit": 300, "center_lat": 20.247915, "center_lng": 85.802150
            }
        ]

        for z_data in iter_zones:
            result = await session.execute(select(Zone).where(Zone.id == z_data["id"]))
            zone = result.scalars().first()
            if not zone:
                zone = Zone(
                    id=z_data["id"],
                    venue_id=iter_venue_id,
                    code=z_data["code"],
                    name=z_data["name"],
                    sector=z_data["sector"],
                    capacity_limit=z_data["capacity_limit"],
                    center_lat=z_data["center_lat"],
                    center_lng=z_data["center_lng"]
                )
                session.add(zone)
                print(f"   └─ Created Zone: {zone.name} ({zone.code})")
            else:
                zone.venue_id = iter_venue_id
                zone.name = z_data["name"]
                zone.sector = z_data["sector"]
                zone.capacity_limit = z_data["capacity_limit"]
                zone.center_lat = z_data["center_lat"]
                zone.center_lng = z_data["center_lng"]
                print(f"   └─ Updated Zone: {zone.name} ({zone.code})")

        # -------------------------------------------------------------------
        # 2. VENUE 2: Kalinga International Stadium
        # -------------------------------------------------------------------
        kalinga_venue_id = "kalinga-stadium-01"
        result = await session.execute(select(Venue).where(Venue.id == kalinga_venue_id))
        kalinga_venue = result.scalars().first()

        if not kalinga_venue:
            kalinga_venue = Venue(
                id=kalinga_venue_id,
                name="Kalinga International Stadium Complex",
                location="Nayapalli, Bhubaneswar, Odisha",
                gps_center_lat=20.288000,
                gps_center_lng=85.823800,
                total_capacity=15000
            )
            session.add(kalinga_venue)
            print(f"✅ Created Venue: {kalinga_venue.name}")
        else:
            kalinga_venue.gps_center_lat = 20.288000
            kalinga_venue.gps_center_lng = 85.823800
            print(f"🔄 Updated Venue: {kalinga_venue.name}")

        kalinga_zones = [
            {
                "id": "ks_gate_3", "code": "KS-G3", "name": "Gate 3 (Main Entrance Plaza)", "sector": "gate",
                "capacity_limit": 500, "center_lat": 20.287800, "center_lng": 85.826100
            },
            {
                "id": "ks_hockey_turf", "code": "KS-HKY", "name": "Main Hockey Turf & Stand", "sector": "junction",
                "capacity_limit": 800, "center_lat": 20.288500, "center_lng": 85.824000
            },
            {
                "id": "ks_athletics", "code": "KS-ATH", "name": "Main Athletics Track Corridor", "sector": "pathway",
                "capacity_limit": 700, "center_lat": 20.287500, "center_lng": 85.823500
            },
            {
                "id": "ks_swimming", "code": "KS-SWM", "name": "Swimming Pool Complex Junction", "sector": "pathway",
                "capacity_limit": 400, "center_lat": 20.289000, "center_lng": 85.823000
            },
            {
                "id": "ks_indoor", "code": "KS-IND", "name": "Indoor Multi-Purpose Hall Exit", "sector": "gate",
                "capacity_limit": 500, "center_lat": 20.288000, "center_lng": 85.822500
            }
        ]

        for z_data in kalinga_zones:
            result = await session.execute(select(Zone).where(Zone.id == z_data["id"]))
            zone = result.scalars().first()
            if not zone:
                zone = Zone(
                    id=z_data["id"],
                    venue_id=kalinga_venue_id,
                    code=z_data["code"],
                    name=z_data["name"],
                    sector=z_data["sector"],
                    capacity_limit=z_data["capacity_limit"],
                    center_lat=z_data["center_lat"],
                    center_lng=z_data["center_lng"]
                )
                session.add(zone)
                print(f"   └─ Created Zone: {zone.name} ({zone.code})")
            else:
                zone.venue_id = kalinga_venue_id
                zone.name = z_data["name"]
                zone.sector = z_data["sector"]
                zone.capacity_limit = z_data["capacity_limit"]
                zone.center_lat = z_data["center_lat"]
                zone.center_lng = z_data["center_lng"]
                print(f"   └─ Updated Zone: {zone.name} ({zone.code})")

        await session.commit()
        
        # -------------------------------------------------------------------
        # 3. Seed Default Admin User
        # -------------------------------------------------------------------
        from app.models.user import User, UserRole
        from app.core.security import get_password_hash
        
        result = await session.execute(select(User).where(User.username == "admin@crowdshield.com"))
        admin_user = result.scalars().first()
        if not admin_user:
            admin_user = User(
                username="admin@crowdshield.com",
                hashed_password=get_password_hash("Sentinel@2026"),
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin_user)
            await session.commit()
            print("👤 Created default admin user (admin@crowdshield.com).")
        else:
            print("👤 Default admin user already exists.")
            
        print("✨ Multi-venue database seeding complete.")

async def main():
    try:
        await seed_venues()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())