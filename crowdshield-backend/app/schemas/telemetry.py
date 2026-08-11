"""
Pydantic schemas for TelemetryLog.
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class TelemetryCreate(BaseModel):
    zone_id: str
    person_count: int
    avg_speed: Optional[float] = 0.0
    flow_rate: Optional[float] = 0.0
    density: Optional[float] = 0.0
    surge_score: Optional[float] = 0.0
    flow_conflict: bool = False
    reverse_flow_detected: bool = False
    inference_ms: Optional[float] = 0.0

class TelemetryResponse(TelemetryCreate):
    id: int
    timestamp: datetime
    density: float
    surge_score: float
    calculated_risk_score: float
    model_config = ConfigDict(from_attributes=True)
