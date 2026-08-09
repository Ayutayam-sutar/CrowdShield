"""
Analytics endpoints for post-incident reporting and AI summaries.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, literal_column
from pydantic import BaseModel

import os
from google import genai
from google.genai import types

from app.db.session import get_db
from app.models.alert import CrowdAlert, AlertStatus
from app.models.venue import Zone
from app.models.telemetry import TelemetryLog
from app.api.deps import get_current_active_admin
from app.core.config import settings
from app.services.predictive_engine import predict_density
from typing import Any

router = APIRouter()

class HistoricalDataResponse(BaseModel):
    hour: str
    footfall: int
    bottlenecks: int

@router.get("/history", response_model=list[HistoricalDataResponse])
async def get_historical_analytics(db: AsyncSession = Depends(get_db)):
    """
    Fetches historical telemetry data and alert counts aggregated by hour for the past 24 hours.
    """
    from datetime import datetime, timedelta, timezone
    
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    # 1. Footfall query (max headcount per hour) - FIXED GROUPING
    footfall_query = (
        select(
            func.date_trunc(text("'hour'"), TelemetryLog.timestamp).label('hour_ts'),
            func.max(TelemetryLog.person_count).label('footfall')
        )
        .where(TelemetryLog.timestamp >= twenty_four_hours_ago)
        .group_by(literal_column('hour_ts'))
        .order_by(literal_column('hour_ts'))
    )
    footfall_result = await db.execute(footfall_query)
    footfall_rows = footfall_result.all()

    # 2. Alerts query for bottlenecks - FIXED GROUPING
    alerts_query = (
        select(
            func.date_trunc(text("'hour'"), CrowdAlert.created_at).label('hour_ts'),
            func.count(CrowdAlert.id).label('bottlenecks')
        )
        .where(CrowdAlert.created_at >= twenty_four_hours_ago)
        .group_by(literal_column('hour_ts'))
    )
    alerts_result = await db.execute(alerts_query)
    alerts_rows = alerts_result.all()

    # Merge results
    hourly_data = {}
    
    for row in footfall_rows:
        if not row.hour_ts: continue
        hour_str = row.hour_ts.strftime('%H:00')
        hourly_data[hour_str] = {
            "hour": hour_str,
            "footfall": int(row.footfall or 0),
            "bottlenecks": 0,
            "_ts": row.hour_ts
        }
        
    for row in alerts_rows:
        if not row.hour_ts: continue
        hour_str = row.hour_ts.strftime('%H:00')
        if hour_str not in hourly_data:
            hourly_data[hour_str] = {
                "hour": hour_str,
                "footfall": 0,
                "bottlenecks": int(row.bottlenecks or 0),
                "_ts": row.hour_ts
            }
        else:
            hourly_data[hour_str]["bottlenecks"] = int(row.bottlenecks or 0)

    # Sort by timestamp
    sorted_values = sorted(hourly_data.values(), key=lambda x: x["_ts"])
    
    # Remove _ts before returning
    for item in sorted_values:
        item.pop("_ts", None)
        
    return sorted_values


class SummaryResponse(BaseModel):
    summary: str

@router.post("/generate-summary/{incident_id}", response_model=SummaryResponse, dependencies=[Depends(get_current_active_admin)])
async def generate_ai_summary(incident_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generates an NDRF-compliant post-incident executive summary using Gemini or a mocked LLM.
    """
    # Fetch Alert (using incident_id which corresponds to alert.id in our system)
    result = await db.execute(select(CrowdAlert).where(CrowdAlert.id == incident_id))
    alert = result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Fetch Zone for context
    zone_result = await db.execute(select(Zone).where(Zone.id == alert.zone_id))
    zone = zone_result.scalars().first()
    
    zone_name = zone.name if zone else alert.zone_id
    resolution_time = "Unknown"
    if alert.resolved_at and alert.created_at:
        diff_mins = (alert.resolved_at - alert.created_at).total_seconds() / 60.0
        resolution_time = f"{diff_mins:.1f} mins"
    
    mitigation_actions = "No automated mitigation logged."
    if alert.recommended_actions:
        mitigation_actions = ", ".join([a.get('actionText', '') for a in alert.recommended_actions])

    prompt = f"""
    You are an emergency management AI assistant (Sentinel).
    Generate a highly professional, NDRF-compliant post-incident executive summary (max 150 words).
    
    Incident Details:
    - Alert ID: {alert.id}
    - Location: {zone_name}
    - Category: {alert.category}
    - Peak Density: {alert.density} p/m²
    - Trigger Reason: {alert.trigger_reason}
    - Mitigation Actions Taken: {mitigation_actions}
    - Resolution Time: {resolution_time}
    - Status: {alert.status.value}
    
    Format the response clearly using Markdown (bolding key metrics).
    """

    if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY) < 5:
        # MOCK LLM SERVICE Fallback
        mock_summary = f"**NDRF Structured Incident Summary**\n\nBased on recent SQLite TelemetryLog entries:\nIncident **{alert.id}** occurred at **{zone_name}** and was triggered due to **{alert.trigger_reason}**. Peak density reached an unsafe level of **{alert.density} p/m²**. \n\nMitigation actions deployed: {mitigation_actions}. The incident was officially resolved in **{resolution_time}**."
        return {"summary": mock_summary}

    try:
        # Initialize the new google-genai client
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return {"summary": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    zone: str
    peak_density: str
    intervention: str
    resolution_time: str

@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    """
    Fetches past incidents for the audit log.
    """
    query = (
        select(CrowdAlert, Zone.name.label("zone_name"))
        .outerjoin(Zone, CrowdAlert.zone_id == Zone.id)
        .order_by(CrowdAlert.created_at.desc())
        .limit(20)
    )
    result = await db.execute(query)
    rows = result.all()
    
    audit_logs = []
    for alert, zone_name in rows:
        res_time = "Unresolved"
        if alert.resolved_at and alert.created_at:
            diff = (alert.resolved_at - alert.created_at).total_seconds() / 60.0
            res_time = f"{diff:.1f} mins"
            
        intervention = "None"
        if alert.recommended_actions and len(alert.recommended_actions) > 0:
            intervention = alert.recommended_actions[0].get("actionText", "Action Dispatched")
            
        # Ensure we have a valid string ID
        alert_id_str = str(alert.id)
        short_id = f"#LOG-{alert_id_str[-4:].upper()}" if len(alert_id_str) >= 4 else f"#LOG-{alert_id_str.upper()}"
            
        audit_logs.append({
            "id": short_id,
            "timestamp": alert.created_at.strftime("%H:%M:%S") if alert.created_at else "Unknown",
            "zone": zone_name or str(alert.zone_id) or "Unknown Zone",
            "peak_density": f"{alert.density:.1f} p/m²" if alert.density else "N/A",
            "intervention": intervention,
            "resolution_time": res_time
        })
        
    return audit_logs


class PredictiveForecastResponse(BaseModel):
    historical: list[dict[str, Any]]
    projected: list[dict[str, Any]]
    warning_triggered: bool
    current_density: float
    predicted_10m: float

@router.get("/predictive-forecast/{zone_id}", response_model=PredictiveForecastResponse)
async def get_predictive_forecast(zone_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches 10-minute predictive forecast for a zone based on historical telemetry.
    """
    res = await predict_density(zone_id, db)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res