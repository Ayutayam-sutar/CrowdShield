"""
Incidents endpoints for citizen SOS reports and Admin Analytics management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.websocket import ws_manager
from app.db.session import get_db
from app.models.incident import CitizenReport, ReportStatus
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
)
router = APIRouter()
@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident: IncidentCreate, db: AsyncSession = Depends(get_db)
):
    """
    Submit a citizen SOS / Hazard report.
    Persists to DB and broadcasts real-time WS alert to Admin Analytics.
    """
    db_incident = CitizenReport(
        category=incident.category,
        description=incident.description,
        location_name=incident.location_name,
        venue_id=incident.venue_id,
        latitude=incident.latitude,
        longitude=incident.longitude,
        media_url=incident.media_url,
        media_type=incident.media_type,
        status=ReportStatus.PENDING,
    )
    db.add(db_incident)

    await db.commit()
    await db.refresh(db_incident)
    try:
        await ws_manager.broadcast({
            "event": "CITIZEN_HAZARD_SUBMITTED",
            "report": {
                "id": db_incident.id,
                "category": db_incident.category.value if hasattr(db_incident.category, "value") else str(db_incident.category),
                "location": db_incident.location_name,
                "venue_id": db_incident.venue_id,
                "description": db_incident.description,
                "imageUrl": db_incident.media_url,
                "status": db_incident.status.value if hasattr(db_incident.status, "value") else str(db_incident.status),
                "timestamp": db_incident.created_at.strftime("%H:%M") if db_incident.created_at else "Just now",
                "confirmationsCount": db_incident.upvotes or 0,
            },
            "message": f"NEW REPORT: {db_incident.category} at {db_incident.location_name}",
        })
    except Exception as ws_err:
        print(f"WebSocket broadcast warning: {ws_err}")

    return db_incident

@router.get("/", response_model=List[IncidentResponse])
async def read_incidents(
    venue_id: str | None = None, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """
    Get all citizen SOS reports ordered newest first.
    """
    query = select(CitizenReport).order_by(CitizenReport.created_at.desc())
    if venue_id:
        query = query.where(CitizenReport.venue_id == venue_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{incident_id}/status", response_model=dict)
async def update_incident_status(
    incident_id: str,
    status_update: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin action: Update incident status (PENDING -> VERIFIED/CONFIRMED -> RESOLVED).
    Returns a clean dictionary response to eliminate Pydantic serialization errors.
    """
    result = await db.execute(
        select(CitizenReport).where(CitizenReport.id == incident_id)
    )
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    target_status = status_update.status.upper()
    if target_status in ["CONFIRMED", "VERIFIED"]:
        incident.status = ReportStatus.VERIFIED
    elif target_status == "RESOLVED":
        incident.status = ReportStatus.RESOLVED
    elif target_status == "PENDING":
        incident.status = ReportStatus.PENDING
    elif target_status == "DISPATCHED":
        incident.status = ReportStatus.DISPATCHED
    else:
        raise HTTPException(
            status_code=400, detail=f"Invalid status value: {status_update.status}"
        )

    await db.commit()
    await db.refresh(incident)

    status_str = incident.status.value if hasattr(incident.status, "value") else str(incident.status)
    frontend_status = "CONFIRMED" if status_str == "VERIFIED" else status_str
    try:
        await ws_manager.broadcast({
            "event": "HAZARD_STATUS_UPDATED",
            "reportId": incident.id,
            "status": frontend_status,
        })
    except Exception as ws_err:
        print(f"WebSocket status broadcast warning: {ws_err}")

    return {
        "status": "success",
        "message": f"Incident {incident.id} updated to {frontend_status}.",
        "reportId": incident.id,
        "newStatus": frontend_status,
    }


@router.patch("/{incident_id}/upvote", response_model=dict)
async def upvote_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """
    Upvote a citizen report for community confirmation.
    """
    result = await db.execute(
        select(CitizenReport).where(CitizenReport.id == incident_id)
    )
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.upvotes += 1

    await db.commit()
    await db.refresh(incident)

    return {
        "status": "success",
        "id": incident.id,
        "upvotes": incident.upvotes,
    }