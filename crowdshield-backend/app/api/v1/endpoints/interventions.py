"""Intervention and Countermeasure Dispatch Endpoints."""

from datetime import datetime, timezone
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
    zoneId: Optional[str] = "ks_gate_1"


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
        "message": f"CRITICAL: {target_action} deployed for {zone_name}.",
    }
    await ws_manager.broadcast(ws_payload)

    return {
        "status": "success",
        "message": f"Intervention '{target_action}' dispatched to {zone_name}.",
        "resolved_alerts_count": len(open_alerts),
    }


@router.post("/scenario")
async def trigger_scenario(
    payload: ScenarioRequest, db: AsyncSession = Depends(get_db)
):
    """Global emergency override to trigger or reset the stampede simulation."""
    if payload.action == "trigger":
        # 1. Elevate all DB zones to critical risk
        zones_result = await db.execute(select(Zone))
        zones = zones_result.scalars().all()
        for z in zones:
            if hasattr(z, "risk_score"):
                z.risk_score = 94.2
            if hasattr(z, "risk_level"):
                z.risk_level = "critical"
            if hasattr(z, "density"):
                z.density = 5.82

        # 2. Define targets for BOTH ITER Campus and Kalinga Stadium
        target_locations = [
            {
                "zone_id": "zone_library_roundabout",
                "venue_id": "soa-iter-01",
                "zone_name": "Central Library Roundabout (ITER Campus)",
            },
            {
                "zone_id": "ks_gate_3",
                "venue_id": "kalinga-stadium-01",
                "zone_name": "Kalinga Main Gate (Gate 3)",
            },
        ]

        primary_alert_payload = None

        # 3. Create persistent CrowdAlert records for both venues
        for loc in target_locations:
            import uuid
            timestamp_str = int(datetime.now(timezone.utc).timestamp())
            short_uuid = str(uuid.uuid4()).replace("-", "")[:12]
            alert_id = f"ALT-{timestamp_str}-{short_uuid}"
            
            new_alert = CrowdAlert(
                id=alert_id,
                zone_id=loc["zone_id"],
                venue_id=loc["venue_id"],
                title="CRITICAL: Structural Stampede Risk & Surge Flow",
                category="Surge",
                density=5.82,
                flow_rate=185.0,
                status=AlertStatus.OPEN,
                sentinel_analysis=f"CRITICAL WARNING: High density convergence (>5.8 p/m²) detected at {loc['zone_name']}. Evacuation routes activated.",
            )
            db.add(new_alert)

            alert_dict = {
                "id": new_alert.id,
                "zoneId": loc["zone_id"],
                "venueId": loc["venue_id"],
                "zoneName": loc["zone_name"],
                "title": new_alert.title,
                "category": new_alert.category,
                "riskLevel": "critical",
                "density": 5.82,
                "flowRate": 185.0,
                "status": "active",
                "timestamp": "Just now",
                "sentinelAnalysis": new_alert.sentinel_analysis,
                "recommendedActions": [
                    {
                        "id": f"{alert_id}-act-1",
                        "actionText": "Open Secondary Relief Gate / Safe Egress",
                        "impact": "Reduces bottleneck density by ~42%",
                    },
                    {
                        "id": f"{alert_id}-act-2",
                        "actionText": "Dispatch Multilingual PA Evacuation Broadcast",
                        "impact": "Initiates controlled crowdsourcing egress",
                    },
                ],
            }

            if not primary_alert_payload:
                primary_alert_payload = alert_dict

            # Broadcast new alert for each venue to WS subscribers
            await ws_manager.broadcast({
                "event": "NEW_ALERT",
                "alert": alert_dict,
            })

        await db.commit()

        # 4. Broadcast global crisis flag to force emergency state on all Citizen & Admin clients
        await ws_manager.broadcast({
            "event": "SCENARIO_TRIGGERED",
            "message": "Global Stampede Scenario Activated",
            "active": True,
            "alert": primary_alert_payload,
        })

        return {
            "status": "success",
            "scenario": "triggered",
            "alerts_created": len(target_locations),
        }

    elif payload.action == "reset":
        # 1. Mark all open alerts in DB as RESOLVED
        alerts_result = await db.execute(
            select(CrowdAlert).where(CrowdAlert.status == AlertStatus.OPEN)
        )
        open_alerts = alerts_result.scalars().all()
        for alert in open_alerts:
            alert.status = AlertStatus.RESOLVED

        # 2. Reset all zone risks to safe
        zones_result = await db.execute(select(Zone))
        zones = zones_result.scalars().all()
        for z in zones:
            if hasattr(z, "risk_score"):
                z.risk_score = 15.0
            if hasattr(z, "risk_level"):
                z.risk_level = "safe"

        await db.commit()

        # 3. Broadcast WS Reset
        await ws_manager.broadcast({
            "event": "SCENARIO_RESET",
            "message": "Scenario Stood Down",
            "active": False,
        })

        return {
            "status": "success",
            "scenario": "reset",
            "resolved_count": len(open_alerts),
        }

    raise HTTPException(
        status_code=400, detail="Invalid action payload. Use 'trigger' or 'reset'."
    )


@router.get("/scenario/status")
async def get_scenario_status(db: AsyncSession = Depends(get_db)):
    """Check if the stampede scenario is currently active by looking for open structural alerts."""
    alerts_result = await db.execute(
        select(CrowdAlert)
        .where(CrowdAlert.title == "CRITICAL: Structural Stampede Risk & Surge Flow")
        .where(CrowdAlert.status == AlertStatus.OPEN)
    )
    active_alert = alerts_result.scalars().first()
    
    alert_dict = None
    if active_alert:
        alert_dict = {
            "id": active_alert.id,
            "zoneId": active_alert.zone_id,
            "venueId": active_alert.venue_id,
            "title": active_alert.title,
            "category": active_alert.category,
            "riskLevel": "critical",
            "density": active_alert.density,
            "flowRate": active_alert.flow_rate,
            "status": "active",
            "timestamp": "Just now",
            "sentinelAnalysis": active_alert.sentinel_analysis,
        }

    return {
        "active": active_alert is not None,
        "alert": alert_dict
    }