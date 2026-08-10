"""Intervention and Countermeasure Dispatch Endpoints."""

from typing import Optional
from app.core.websocket import ws_manager
from app.db.session import get_db
from app.models.alert import AlertStatus, CrowdAlert
from app.models.venue import Zone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class InterventionRequest(BaseModel):
    actionId: Optional[str] = None
    actionText: Optional[str] = None
    zoneId: Optional[str] = "soa-iter-01"
    impact: Optional[str] = "Immediate risk mitigation"
    language: Optional[str] = "en"
    announcementText: Optional[str] = None

class ScenarioRequest(BaseModel):
    action: str  # Expects 'trigger' or 'reset'

@router.post("/dispatch")
@router.post("/execute")
async def dispatch_intervention(
    payload: InterventionRequest, db: AsyncSession = Depends(get_db)
):
    """Dispatches an emergency intervention, resolves alerts, and broadcasts to citizens."""
    target_action = payload.actionText or payload.actionId or "Emergency Action"
    target_zone_id = payload.zoneId or "soa-iter-01"

    # Fetch related zone details
    zone_result = await db.execute(select(Zone).where(Zone.id == target_zone_id))
    zone = zone_result.scalars().first()
    zone_name = zone.name if zone else target_zone_id

    # Mark open alerts for this zone as RESOLVED
    alerts_result = await db.execute(
        select(CrowdAlert)
        .where(CrowdAlert.zone_id == target_zone_id)
        .where(CrowdAlert.status == AlertStatus.OPEN)
    )
    open_alerts = alerts_result.scalars().all()

    for alert in open_alerts:
        alert.status = AlertStatus.RESOLVED

    await db.commit()

    # Broadcast real-time dispatch event over WebSockets to ALL devices
    ws_payload = {
        "event": "INTERVENTION_DISPATCHED",
        "actionText": target_action,
        "zoneId": target_zone_id,
        "zoneName": zone_name,
        "impact": payload.impact,
        "language": payload.language or "en",
        "announcementText": payload.announcementText,
        "status": "DISPATCHED",
        "message": f"CRITICAL: {target_action} deployed for {zone_name}."
    }
    await ws_manager.broadcast(ws_payload)

    return {
        "status": "success",
        "message": f"Intervention '{target_action}' dispatched to {zone_name}.",
        "resolved_alerts_count": len(open_alerts),
    }

@router.post("/scenario")
async def trigger_scenario(payload: ScenarioRequest):
    """Global emergency override to trigger or reset the stampede simulation."""
    if payload.action == "trigger":
        await ws_manager.broadcast({
            "event": "SCENARIO_TRIGGERED", 
            "message": "Global Stampede Scenario Activated"
        })
        return {"status": "success", "scenario": "triggered"}
    
    elif payload.action == "reset":
        await ws_manager.broadcast({
            "event": "SCENARIO_RESET", 
            "message": "Scenario Stood Down"
        })
        return {"status": "success", "scenario": "reset"}
        
    raise HTTPException(status_code=400, detail="Invalid action payload. Use 'trigger' or 'reset'.")