"""
Zone endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.venue import Zone
from app.schemas.zone import ZoneResponse

router = APIRouter()

@router.get("/", response_model=List[ZoneResponse])
async def read_zones(skip: int = 0, limit: int = 100, venue_id: str | None = None, db: AsyncSession = Depends(get_db)):
    """
    Get all zones.
    """
    query = select(Zone).offset(skip).limit(limit)
    if venue_id:
        query = query.where(Zone.venue_id == venue_id)
        
    result = await db.execute(query)
    zones = result.scalars().all()
    return zones

@router.get("/{zone_id}", response_model=ZoneResponse)
async def read_zone(zone_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get zone by ID.
    """
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone
