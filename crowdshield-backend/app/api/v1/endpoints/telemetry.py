"""ML Telemetry Ingestion endpoint."""

import uuid

from app.core.websocket import ws_manager
from app.db.session import get_db
from app.models.alert import AlertSeverity, AlertStatus, CrowdAlert
from app.models.telemetry import TelemetryLog
from app.models.user import User  # Ensure User model is visible if needed
from app.models.venue import RiskLevel, Venue, Zone
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse
from app.services.pathfinding import pathfinder  # Dynamic A* Pathfinder Engine
from app.services.predictive_engine import predict_density
from app.services.risk_engine import risk_engine
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# ---------------------------------------------------------------------------
# Single canonical venue: ITER, Siksha 'O' Anusandhan University.
# Real campus coordinates (Khandagiri, Bhubaneswar) — replace the per-zone
# lat/lng below with exact values pulled from Google Maps "What's here?" on
# each real gate/block for full accuracy.
# ---------------------------------------------------------------------------
CANONICAL_VENUE_ID = "soa-iter-01"
CANONICAL_VENUE = {
    "id": CANONICAL_VENUE_ID,
    "name": "Siksha 'O' Anusandhan University Campus",
    "location": "Bhubaneswar, Odisha",
    "gps_center_lat": 20.2496,
    "gps_center_lng": 85.7988,
    "total_capacity": 15000,
}

# Registry of the real zones for this venue, matching venue_graph.json.
# Only zone_ids listed here may be auto-created on first telemetry — anything
# else is rejected rather than silently invented.
ZONE_REGISTRY = {
    "gate_1": {
        "name": "Main Gate",
        "sector": "Main Gate",
        "capacity_limit": 300,
        "center_lat": 20.2596,
        "center_lng": 85.7912,
    },
    "zone_admin_block_rd": {
        "name": "Administrative Block Road + Gate Approach",
        "sector": "Admin Block",
        "capacity_limit": 500,
        "center_lat": 20.2593,
        "center_lng": 85.7916,
    },
    "zone_library_roundabout": {
        "name": "Central Library Roundabout",
        "sector": "Library",
        "capacity_limit": 400,
        "center_lat": 20.2588,
        "center_lng": 85.7920,
    },
    "zone_sports_complex_rd": {
        "name": "Sports Complex / Physics Dept Road",
        "sector": "Sports Complex",
        "capacity_limit": 500,
        "center_lat": 20.2591,
        "center_lng": 85.7925,
    },
    "gate_2": {
        "name": "EV Charging / Food Court Junction",
        "sector": "Food Court",
        "capacity_limit": 300,
        "center_lat": 20.2585,
        "center_lng": 85.7928,
    },
    "zone_e_block_lawn_rd": {
        "name": "E Block Lawn / F Block Road",
        "sector": "E Block",
        "capacity_limit": 500,
        "center_lat": 20.2582,
        "center_lng": 85.7921,
    },
}


async def _get_or_create_canonical_venue(db: AsyncSession) -> Venue:
    """Fetches the single canonical ITER/SOA venue, creating it once if absent."""
    result = await db.execute(
        select(Venue).where(Venue.id == CANONICAL_VENUE_ID)
    )
    venue = result.scalars().first()
    if not venue:
        venue = Venue(**CANONICAL_VENUE)
        db.add(venue)
        await db.flush()
    return venue


@router.post("/", response_model=TelemetryResponse)
async def create_telemetry(
    telemetry: TelemetryCreate, db: AsyncSession = Depends(get_db)
):
  """Ingest ML telemetry from YOLO/ByteTrack pipeline.

  Calculates risk, updates zone, updates A* pathfinding weights, generates
  alerts, and broadcasts via WS.
  """
  # 1. Get Zone. Auto-create only if it's a known real zone for this venue;
  #    reject anything else instead of inventing a mock "General Zone".
  result = await db.execute(select(Zone).where(Zone.id == telemetry.zone_id))
  zone = result.scalars().first()

  if not zone:
    zone_def = ZONE_REGISTRY.get(telemetry.zone_id)
    if not zone_def:
      raise HTTPException(
          status_code=400,
          detail=(
              f"Unknown zone_id '{telemetry.zone_id}'. Valid zones for this "
              f"venue are: {', '.join(ZONE_REGISTRY.keys())}. Check your "
              "edge camera config — it may still be posting a legacy zone_id."
          ),
      )

    venue = await _get_or_create_canonical_venue(db)

    print(
        f"[Auto-Setup] Creating known zone '{telemetry.zone_id}' "
        f"('{zone_def['name']}') under venue '{venue.id}'..."
    )
    zone = Zone(
        id=telemetry.zone_id,
        venue_id=venue.id,
        code=telemetry.zone_id,
        name=zone_def["name"],
        sector=zone_def["sector"],
        capacity_limit=zone_def["capacity_limit"],
        current_headcount=0,
        density=0.0,
        flow_rate=0.0,
        risk_score=0.0,
        center_lat=zone_def["center_lat"],
        center_lng=zone_def["center_lng"],
    )
    db.add(zone)
    await db.flush()

  # 2. Calculate Density & Capacity Ratio
  area_sqm = zone.capacity_limit / 5.0 if zone.capacity_limit else 100.0
  density = telemetry.person_count / area_sqm
  capacity_ratio = (
      telemetry.person_count / zone.capacity_limit
      if zone.capacity_limit
      else 0.0
  )

  # Surge score calculation
  surge_score = getattr(telemetry, "surge_score", 0.0)
  if not surge_score:
    surge_score = min(
        (telemetry.person_count / (zone.capacity_limit or 1))
        + (0.2 if telemetry.flow_conflict else 0.0),
        1.0,
    )

  # 3. XGBoost Risk Engine Inference
  (
      final_risk_score,
      calculated_risk_level,
      override_applied,
  ) = risk_engine.calculate_risk(
      density=density,
      avg_speed=telemetry.avg_speed,
      flow_conflict=telemetry.flow_conflict,
      reverse_flow_detected=telemetry.reverse_flow_detected,
      capacity_ratio=capacity_ratio,
      surge_score=surge_score,
  )

  # Update Zone DB fields
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
      "critical": RiskLevel.critical,
  }
  zone.risk_level = risk_enum_map.get(calculated_risk_level, RiskLevel.safe)

  # ---------------------------------------------------------
  # 4. UPDATE DYNAMIC A* PATHFINDING GRAPH
  # ---------------------------------------------------------
  pathfinder.update_live_telemetry([zone])
  evacuation_route = pathfinder.compute_safest_evacuation(zone.id)

  # 5. Save TelemetryLog
  log = TelemetryLog(
      zone_id=telemetry.zone_id,
      person_count=telemetry.person_count,
      density=density,
      avg_speed=telemetry.avg_speed,
      flow_conflict=telemetry.flow_conflict,
      reverse_flow_detected=telemetry.reverse_flow_detected,
      surge_score=surge_score,
      calculated_risk_score=final_risk_score,
  )
  db.add(log)
  await db.flush()  # flush to generate log.id

  # 6. Generate Alert if WARNING or CRITICAL
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
      route_msg = evacuation_route.get(
          "message", "Proceed to nearest clear exit."
      )
      new_alert = CrowdAlert(
          id=f"ALT-{uuid.uuid4().hex[:6].upper()}",
          zone_id=zone.id,
          venue_id=zone.venue_id,
          severity=(
              AlertSeverity.critical
              if calculated_risk_level == "critical"
              else AlertSeverity.warning
          ),
          title=f"Crowd Surge Detected in {zone.name}",
          trigger_reason="Density or Capacity threshold exceeded.",
          sentinel_analysis=(
              "XGBoost Risk Engine flagged conditions. Override"
              f" Applied: {override_applied}. {route_msg}"
          ),
          confidence_score=surge_score * 100,
          density=density,
          status=AlertStatus.OPEN,
          recommended_actions=[
              {
                  "id": f"act-1-{zone.id}",
                  "actionText": (
                      f"Open Auxiliary Emergency Gates near {zone.name}"
                  ),
                  "impact": "Immediate -40% headcount relief",
                  "targetGateOrZone": zone.name,
              },
              {
                  "id": f"act-2-{zone.id}",
                  "actionText": (
                      "Broadcast Sarvam AI Multilingual PA Diversion Announcement"
                  ),
                  "impact": f"Redirect traffic via route: {route_msg}",
                  "targetGateOrZone": zone.name,
              },
          ],
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
          "category": getattr(new_alert, "category", "surge"),
          "status": "active",
          "sentinelAnalysis": new_alert.sentinel_analysis,
          "recommendedActions": new_alert.recommended_actions,
          "evacuationRoute": evacuation_route,
      }

  # 7. WebSocket Broadcast to Dashboard & Citizen PWA
  prediction = await predict_density(zone.id, db)
  predictive_10m_curve = (
      prediction.get("projected", [])
      if isinstance(prediction, dict) and "projected" in prediction
      else []
  )

  payload = {
      "event": "TELEMETRY_UPDATE",
      "zone": {
          "id": zone.id,
          "name": zone.name,
          "code": zone.code,
          "venue_id": zone.venue_id,
          "sector": zone.sector,
          "density": round(density, 2),
          "maxCapacity": zone.capacity_limit,
          "currentHeadcount": telemetry.person_count,
          "flowRate": zone.flow_rate,
          "riskScore": round(final_risk_score, 1),
          "riskLevel": zone.risk_level.value,
          "trend": (
              zone.trend.value
              if hasattr(zone.trend, "value")
              else str(zone.trend)
          ),
          "gateStatus": (
              zone.gate_status.value
              if hasattr(zone.gate_status, "value")
              else str(zone.gate_status)
          ),
          "center_lat": zone.center_lat,
          "center_lng": zone.center_lng,
          "predictive_10m_curve": predictive_10m_curve,
          "evacuationRoute": evacuation_route,  # Dynamic A* Route
          "inference_ms": getattr(telemetry, "inference_ms", 0.0),
      },
  }
  if new_alert_dict:
    payload["alert"] = new_alert_dict

  await ws_manager.broadcast(payload)

  # Commit database changes
  await db.commit()

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
      calculated_risk_score=log.calculated_risk_score,
  )