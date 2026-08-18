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
    venue_id: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    media_url: Optional[str] = None
    media_type: Optional[str] = "image"


class IncidentStatusUpdate(BaseModel):
    status: str  


class IncidentResponse(IncidentCreate):
    id: str
    status: ReportStatus
    upvotes: int
    venue_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)