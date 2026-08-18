"""
Pydantic schemas for CrowdAlert.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from app.models.alert import AlertSeverity, AlertStatus
class RecommendedAction(BaseModel):
    id: str
    actionText: str
    impact: str
    targetGateOrZone: str
class AlertBase(BaseModel):
    title: str
    category: str = "Overcrowding"
    trigger_reason: str
    sentinel_analysis: str = ""
    confidence_score: float = 0.0
    density: float = 0.0
    flow_rate: float = 0.0
    recommended_actions: Optional[List[RecommendedAction]] = None
    suggested_action: str = ""

class AlertCreate(AlertBase):
    zone_id: str
    venue_id: str
    severity: AlertSeverity = AlertSeverity.warning

class AlertUpdate(BaseModel):
    status: AlertStatus
    resolved_by: Optional[str] = None
class AlertResponse(AlertBase):
    id: str
    zone_id: str
    venue_id: str
    severity: AlertSeverity
    status: AlertStatus
    resolved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
