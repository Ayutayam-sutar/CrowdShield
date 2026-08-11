"""
Pydantic schemas for CitizenReport / Incidents.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.incident import ReportCategory, ReportStatus


class IncidentCreate(BaseModel):
    category: ReportCategory
    description: str
    location_name: str
    latitude: float = 0.0
    longitude: float = 0.0
    media_url: Optional[str] = None
    media_type: Optional[str] = "image"


class IncidentStatusUpdate(BaseModel):
    status: str  # Accepts 'CONFIRMED', 'VERIFIED', 'RESOLVED', 'PENDING'


class IncidentResponse(IncidentCreate):
    id: str
    upvotes: int
    status: ReportStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)