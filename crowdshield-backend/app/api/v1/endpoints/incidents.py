"""
Incidents endpoints for citizen SOS reports.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.incident import CitizenReport
from app.schemas.incident import IncidentCreate, IncidentResponse

router = APIRouter()

@router.post("/", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, db: AsyncSession = Depends(get_db)):
    """
    Submit a citizen SOS report.
    """
    db_incident = CitizenReport(
        category=incident.category,
        description=incident.description,
        location_name=incident.location_name,
        latitude=incident.latitude,
        longitude=incident.longitude,
        media_url=incident.media_url,
        media_type=incident.media_type
    )
    db.add(db_incident)
    await db.flush()
    return db_incident

@router.get("/", response_model=List[IncidentResponse])
async def read_incidents(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    Get all citizen SOS reports.
    """
    result = await db.execute(select(CitizenReport).offset(skip).limit(limit))
    return result.scalars().all()

@router.patch("/{incident_id}/upvote", response_model=IncidentResponse)
async def upvote_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """
    Upvote a citizen report.
    """
    result = await db.execute(select(CitizenReport).where(CitizenReport.id == incident_id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.upvotes += 1
    await db.flush()
    return incident
