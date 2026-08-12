"""
Venue API Endpoints — Live database queries for venues & associated zones.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.venue import Venue, Zone
from app.schemas.zone import VenueResponse
from pydantic import BaseModel
from app.core.websocket import ws_manager

router = APIRouter()

ACTIVE_VENUE_ID = None

class ActiveVenueRequest(BaseModel):
    venue_id: str

class ActiveVenueResponse(BaseModel):
    venue_id: str | None


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
                id=os.getenv("DEFAULT_VENUE_ID", "soa-iter-01"),
                name=os.getenv("DEFAULT_VENUE_NAME", "Siksha 'O' Anusandhan University Campus"),
                location=os.getenv("DEFAULT_VENUE_LOCATION", "Bhubaneswar, Odisha"),
                gps_center_lat=float(os.getenv("DEFAULT_VENUE_LAT", "20.2496")),
                gps_center_lng=float(os.getenv("DEFAULT_VENUE_LNG", "85.7988")),
                total_capacity=int(os.getenv("DEFAULT_VENUE_CAPACITY", "15000"))
            )
            db.add(default_venue)
            await db.flush()
            for z in zones:
                z.venue_id = default_venue.id
            await db.commit()
            
            result = await db.execute(select(Venue).offset(skip).limit(limit))
            venues = result.scalars().all()

    # [CRITICAL FIX]: Snap massive 200m fallback boxes into tight ~25m building perimeters
    for venue in venues:
        for zone in venue.zones:
            if not zone.coordinates_json:
                lat_offset = 0.00012  # ~13 meters north/south
                lng_offset = 0.00015  # ~16 meters east/west
                zone.coordinates_json = [
                    [zone.center_lat + lat_offset, zone.center_lng - lng_offset], # Top Left
                    [zone.center_lat + lat_offset, zone.center_lng + lng_offset], # Top Right
                    [zone.center_lat - lat_offset, zone.center_lng + lng_offset], # Bottom Right
                    [zone.center_lat - lat_offset, zone.center_lng - lng_offset]  # Bottom Left
                ]

    return venues

@router.get("/active", response_model=ActiveVenueResponse)
async def get_active_venue():
    """
    Get the currently active venue ID.
    """
    return {"venue_id": ACTIVE_VENUE_ID}

@router.post("/active")
async def set_active_venue(req: ActiveVenueRequest, db: AsyncSession = Depends(get_db)):
    """
    Set the currently active venue ID and broadcast to all clients.
    """
    global ACTIVE_VENUE_ID
    # Validate venue exists
    result = await db.execute(select(Venue).where(Venue.id == req.venue_id))
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
        
    ACTIVE_VENUE_ID = req.venue_id
    
    # Broadcast switch
    await ws_manager.broadcast({
        "event": "VENUE_SWITCHED",
        "venue_id": ACTIVE_VENUE_ID
    })
    
    return {"status": "success", "venue_id": ACTIVE_VENUE_ID}

@router.get("/{venue_id}", response_model=VenueResponse)
async def read_venue(venue_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific venue by ID with its nested zones.
    """
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = result.scalars().first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
        
    # Snap the boxes for single-venue queries as well
    for zone in venue.zones:
        if not zone.coordinates_json:
            lat_offset = 0.00012
            lng_offset = 0.00015
            zone.coordinates_json = [
                [zone.center_lat + lat_offset, zone.center_lng - lng_offset],
                [zone.center_lat + lat_offset, zone.center_lng + lng_offset],
                [zone.center_lat - lat_offset, zone.center_lng + lng_offset],
                [zone.center_lat - lat_offset, zone.center_lng - lng_offset]
            ]
            
    return venue