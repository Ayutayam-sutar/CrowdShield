"""
Venue API Endpoints — Live database queries for venues & associated zones.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.venue import Venue, Zone
from app.schemas.zone import VenueResponse

router = APIRouter()


@router.get("/", response_model=List[VenueResponse])
async def read_venues(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    Get all active venues with their associated zones.
    If zones exist in the database without a venue, automatically assigns a default venue.
    """
    result = await db.execute(select(Venue).offset(skip).limit(limit))
    venues = result.scalars().all()

    if not venues:
        # Check if orphan zones exist in DB created by telemetry
        zones_result = await db.execute(select(Zone))
        zones = zones_result.scalars().all()
        if zones:
            default_venue = Venue(
                id="v-1",
                name="Siksha 'O' Anusandhan University Campus",
                location="Bhubaneswar, Odisha",
                gps_center_lat=20.2496,
                gps_center_lng=85.7988,
                total_capacity=60000
            )
            db.add(default_venue)
            await db.flush()
            for z in zones:
                z.venue_id = default_venue.id
            await db.commit()
            
            result = await db.execute(select(Venue).offset(skip).limit(limit))
            venues = result.scalars().all()

    return venues


@router.get("/{venue_id}", response_model=VenueResponse)
async def read_venue(venue_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific venue by ID with its nested zones.
    """
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue
