"""
ML Telemetry Ingestion endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.db.session import get_db
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse
from app.models.telemetry import TelemetryLog
from app.models.venue import Zone, RiskLevel
from app.models.alert import CrowdAlert, AlertSeverity, AlertStatus
from app.services.risk_engine import risk_engine
from app.core.websocket import ws_manager
from app.api.deps import get_current_active_admin

router = APIRouter()

@router.post("/", response_model=TelemetryResponse, dependencies=[Depends(get_current_active_admin)])
async def create_telemetry(telemetry: TelemetryCreate, db: AsyncSession = Depends(get_db)):
    """
    Ingest ML telemetry from YOLO/ByteTrack pipeline.
    Calculates risk, updates zone, generates alerts, and broadcasts via WS.
    """
    # 1. Get Zone
    result = await db.execute(select(Zone).where(Zone.id == telemetry.zone_id))
    zone = result.scalars().first()
    
    if not zone:
        # For a robust system we'd handle missing zones gracefully.
        raise ValueError(f"Zone {telemetry.zone_id} not found")
        
    # 2. Calculate Density
    area_sqm = zone.capacity_limit / 5.0 if zone.capacity_limit else 100.0
    density = telemetry.person_count / area_sqm
    capacity_ratio = telemetry.person_count / zone.capacity_limit if zone.capacity_limit else 0.0

    # Mock an incoming surge score from YOLO for this frame if one isn't provided directly
    mock_surge_score = min((telemetry.person_count / (zone.capacity_limit or 1)) + (0.2 if telemetry.flow_conflict else 0.0), 1.0)

    # 3. Risk Engine
    final_risk_score, calculated_risk_level, override_applied = risk_engine.calculate_risk(
        density=density,
        avg_speed=telemetry.avg_speed,
        flow_conflict=telemetry.flow_conflict,
        reverse_flow_detected=telemetry.reverse_flow_detected,
        capacity_ratio=capacity_ratio,
        surge_score=mock_surge_score
    )
    
    # Update Zone
    zone.current_headcount = telemetry.person_count
    zone.density = density
    zone.risk_score = final_risk_score
    zone.reverse_flow_detected = telemetry.reverse_flow_detected
    zone.flow_conflict = telemetry.flow_conflict
    
    # Map string return to Enum
    risk_enum_map = {
        "safe": RiskLevel.safe,
        "caution": RiskLevel.caution,
        "warning": RiskLevel.warning,
        "critical": RiskLevel.critical
    }
    zone.risk_level = risk_enum_map.get(calculated_risk_level, RiskLevel.safe)

    # 4. Save TelemetryLog
    log = TelemetryLog(
        zone_id=telemetry.zone_id,
        person_count=telemetry.person_count,
        density=density,
        avg_speed=telemetry.avg_speed,
        flow_conflict=telemetry.flow_conflict,
        reverse_flow_detected=telemetry.reverse_flow_detected,
        surge_score=mock_surge_score,
        calculated_risk_score=final_risk_score
    )
    db.add(log)
    await db.flush() # flush to get the ID but not commit yet
    
    # 5. Generate Alert if WARNING or CRITICAL
    new_alert_dict = None
    if calculated_risk_level in ["warning", "critical"]:
        # Check if an OPEN alert already exists for this zone
        alert_result = await db.execute(
            select(CrowdAlert)
            .where(CrowdAlert.zone_id == zone.id)
            .where(CrowdAlert.status == AlertStatus.OPEN)
        )
        existing_alert = alert_result.scalars().first()
        
        if not existing_alert:
            new_alert = CrowdAlert(
                id=f"ALT-{uuid.uuid4().hex[:6].upper()}",
                zone_id=zone.id,
                venue_id=zone.venue_id,
                severity=AlertSeverity.critical if calculated_risk_level == "critical" else AlertSeverity.warning,
                title=f"Crowd Surge Detected in {zone.name}",
                trigger_reason="Density or Capacity threshold exceeded.",
                sentinel_analysis=f"Risk engine flagged conditions. Override Applied: {override_applied}.",
                confidence_score=mock_surge_score * 100,
                density=density,
                status=AlertStatus.OPEN,
                # Mock recommended actions for the UI
                recommended_actions=[
                    {
                        "id": f"act-1-{zone.id}",
                        "actionText": f"Open Auxiliary Emergency Gates near {zone.name}",
                        "impact": "Immediate -40% headcount relief",
                        "targetGateOrZone": zone.name
                    },
                    {
                        "id": f"act-2-{zone.id}",
                        "actionText": "Broadcast Bhashini Multilingual PA Diversion Announcement",
                        "impact": "Redirect incoming crowd",
                        "targetGateOrZone": zone.name
                    }
                ]
            )
            db.add(new_alert)
            await db.flush()
            
            new_alert_dict = {
                "id": new_alert.id,
                "title": new_alert.title,
                "zoneId": new_alert.zone_id,
                "zoneName": zone.name,
                "riskLevel": new_alert.severity.value,
                "density": new_alert.density,
                "flowRate": zone.flow_rate,
                "category": new_alert.category,
                "status": "active", # frontend uses 'active' for OPEN
                "sentinelAnalysis": new_alert.sentinel_analysis,
                "recommendedActions": new_alert.recommended_actions
            }

    # 6. WebSocket Broadcast
    payload = {
        "event": "TELEMETRY_UPDATE",
        "zone": {
            "id": zone.id,
            "density": density,
            "riskScore": final_risk_score,
            "riskLevel": zone.risk_level.value,
            "currentHeadcount": telemetry.person_count,
            "flowRate": zone.flow_rate,
            "gateStatus": zone.gate_status.value
        }
    }
    if new_alert_dict:
        payload["alert"] = new_alert_dict
        
    await ws_manager.broadcast(payload)

    return TelemetryResponse(
        id=log.id,
        zone_id=log.zone_id,
        person_count=log.person_count,
        avg_speed=log.avg_speed,
        flow_conflict=log.flow_conflict,
        reverse_flow_detected=log.reverse_flow_detected,
        timestamp=log.timestamp,
        density=log.density,
        surge_score=log.surge_score,
        calculated_risk_score=log.calculated_risk_score
    )
