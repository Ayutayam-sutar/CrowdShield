"""
Alerts endpoints for volunteer resolution loop.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.alert import CrowdAlert, AlertStatus
from app.models.venue import Zone
from app.schemas.alert import AlertResponse, AlertUpdate
from app.core.websocket import ws_manager
from app.api.deps import get_current_active_admin

router = APIRouter()

@router.get("/", response_model=List[AlertResponse], dependencies=[Depends(get_current_active_admin)])
async def read_alerts(skip: int = 0, limit: int = 100, venue_id: str | None = None, db: AsyncSession = Depends(get_db)):
    """
    Get all active alerts.
    """
    query = select(CrowdAlert).offset(skip).limit(limit)
    if venue_id:
        query = query.where(CrowdAlert.venue_id == venue_id)
        
    result = await db.execute(query)
    alerts = result.scalars().all()
    return alerts

@router.patch("/{alert_id}/status", response_model=AlertResponse, dependencies=[Depends(get_current_active_admin)])
async def update_alert_status(alert_id: str, alert_update: AlertUpdate, db: AsyncSession = Depends(get_db)):
    """
    Volunteer Resolution Loop: Updates alert status.
    """
    result = await db.execute(select(CrowdAlert).where(CrowdAlert.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = alert_update.status
    if alert_update.resolved_by:
        alert.resolved_by = alert_update.resolved_by
        
    if alert_update.status == AlertStatus.RESOLVED:
        alert.resolved_at = datetime.now(timezone.utc)
    
        zone_result = await db.execute(select(Zone).where(Zone.id == alert.zone_id))
        zone = zone_result.scalars().first()
        if zone:

            zone.risk_score = min(zone.risk_score, 35.0)
            zone.risk_level = "safe"
            
    await db.flush()

    if alert.status == AlertStatus.RESOLVED:
        payload = {
            "event": "RESOLVED_BY_VOLUNTEER",
            "alert_id": alert.id,
            "resolved_by": alert.resolved_by
        }
        await ws_manager.broadcast(payload)
        
    return alert
