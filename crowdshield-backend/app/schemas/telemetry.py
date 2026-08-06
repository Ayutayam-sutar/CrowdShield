"""
Pydantic schemas for TelemetryLog.
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class TelemetryCreate(BaseModel):
    zone_id: str
    person_count: int
    avg_speed: float
    flow_conflict: bool = False
    reverse_flow_detected: bool = False

class TelemetryResponse(TelemetryCreate):
    id: int
    timestamp: datetime
    density: float
    surge_score: float
    calculated_risk_score: float

    model_config = ConfigDict(from_attributes=True)
