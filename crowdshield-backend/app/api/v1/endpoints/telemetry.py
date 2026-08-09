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
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("/", response_model=TelemetryResponse)
async def create_telemetry(
    telemetry: TelemetryCreate, db: AsyncSession = Depends(get_db)
):
  """Ingest ML telemetry from YOLO/ByteTrack pipeline.

  Calculates risk, updates zone, updates A* pathfinding weights, generates
  alerts, and broadcasts via WS.
  """
  # 1. Get Zone (Auto-create if missing to avoid crashes)
  result = await db.execute(select(Zone).where(Zone.id == telemetry.zone_id))
  zone = result.scalars().first()

  if not zone:
    # Fetch an active venue from DB to satisfy the NOT NULL venue_id constraint
    venue_result = await db.execute(select(Venue))
    existing_venue = venue_result.scalars().first()
    if not existing_venue:
      existing_venue = Venue(
          id="v-1",
          name="Siksha 'O' Anusandhan University Campus",
          location="Bhubaneswar, Odisha",
          gps_center_lat=20.2496,
          gps_center_lng=85.7988,
          total_capacity=60000,
      )
      db.add(existing_venue)
      await db.flush()

    assigned_venue_id = existing_venue.id

    # Assign distinct Bhubaneswar GPS offsets per zone
    zone_offsets = {
        "z-1": (0.002, -0.002, "North Plaza Gate"),
        "z-01": (0.002, -0.002, "North Plaza Gate"),
        "z-2": (-0.002, -0.002, "South Concourse"),
        "z-02": (-0.002, -0.002, "South Concourse"),
        "z-3": (0.002, 0.002, "West Exit Corridor"),
        "z-03": (0.002, 0.002, "West Exit Corridor"),
        "z-4": (-0.002, 0.002, "East Stand Gate"),
        "z-04": (-0.002, 0.002, "East Stand Gate"),
    }
    lat_off, lng_off, zone_label = zone_offsets.get(
        telemetry.zone_id, (0.0, 0.0, "General Zone")
    )

    print(
        f"[Auto-Setup] Creating missing zone '{telemetry.zone_id}' under venue"
        f" '{assigned_venue_id}'..."
    )
    zone = Zone(
        id=telemetry.zone_id,
        venue_id=assigned_venue_id,
        code=telemetry.zone_id,
        name=f"{zone_label} ({telemetry.zone_id})",
        sector="Sector Bravo",
        capacity_limit=3500,
        current_headcount=0,
        density=0.0,
        flow_rate=0.0,
        risk_score=0.0,
        center_lat=20.2496 + lat_off,
        center_lng=85.7988 + lng_off,
    )
    db.add(zone)
    await db.flush()

  # Fix stale Delhi coordinates from prior seeding (auto-migrate to Bhubaneswar)
  if zone and (
      zone.center_lat == 0.0 or abs(zone.center_lat - 28.5833) < 0.01
  ):
    zone_offsets = {
        "z-1": (0.002, -0.002),
        "z-01": (0.002, -0.002),
        "z-2": (-0.002, -0.002),
        "z-02": (-0.002, -0.002),
        "z-3": (0.002, 0.002),
        "z-03": (0.002, 0.002),
        "z-4": (-0.002, 0.002),
        "z-04": (-0.002, 0.002),
    }
    lat_off, lng_off = zone_offsets.get(telemetry.zone_id, (0.0, 0.0))
    zone.center_lat = 20.2496 + lat_off
    zone.center_lng = 85.7988 + lng_off

  # Also fix venue coordinates if still set to Delhi
  if zone and zone.venue_id:
    v_result = await db.execute(select(Venue).where(Venue.id == zone.venue_id))
    v = v_result.scalars().first()
    if v and abs(v.gps_center_lat - 28.5833) < 0.01:
      v.name = "Siksha 'O' Anusandhan University Campus"
      v.location = "Bhubaneswar, Odisha"
      v.gps_center_lat = 20.2496
      v.gps_center_lng = 85.7988

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
                      "Broadcast Bhashini Multilingual PA Diversion Announcement"
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