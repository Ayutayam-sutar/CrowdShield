"""
Pydantic schemas for Zone and Venue.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from app.models.venue import RiskLevel, GateStatus, Trend

class ZoneBase(BaseModel):
    name: str
    code: str
    sector: str = ""
    capacity_limit: int
    current_headcount: int = 0
    density: float = 0.0
    avg_speed: float = 0.0
    flow_rate: float = 0.0
    risk_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.safe
    trend: Trend = Trend.stable
    gate_status: GateStatus = GateStatus.open
    coordinates_json: Optional[Any] = None
    center_lat: float = 0.0
    center_lng: float = 0.0
    reverse_flow_detected: bool = False
    flow_conflict: bool = False

class ZoneResponse(ZoneBase):
    id: str
    venue_id: str

    model_config = ConfigDict(from_attributes=True)


class VenueBase(BaseModel):
    name: str
    location: str
    gps_center_lat: float
    gps_center_lng: float
    total_capacity: int = 0

class VenueResponse(VenueBase):
    id: str
    zones: List[ZoneResponse] = []

    model_config = ConfigDict(from_attributes=True)
