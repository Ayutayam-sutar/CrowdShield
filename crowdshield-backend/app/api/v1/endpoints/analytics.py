"""
Analytics endpoints for post-incident reporting and AI summaries.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

import os
from google import genai
from google.genai import types

from app.db.session import get_db
from app.models.alert import CrowdAlert, AlertStatus
from app.models.venue import Zone
from app.api.deps import get_current_active_admin
from app.core.config import settings

router = APIRouter()

class SummaryResponse(BaseModel):
    summary: str

@router.post("/summary/{alert_id}", response_model=SummaryResponse, dependencies=[Depends(get_current_active_admin)])
async def generate_ai_summary(alert_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generates an NDRF-compliant post-incident executive summary using Gemini.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    # Fetch Alert
    result = await db.execute(select(CrowdAlert).where(CrowdAlert.id == alert_id))
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
