"""
Venue & Zone ORM models — mirrors frontend VenueInfo and VenueZone types.
"""

from sqlalchemy import (
    String, Integer, Float, Boolean, Enum as SAEnum, ForeignKey, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.base import Base

class RiskLevel(str, enum.Enum):
    safe = "safe"
    caution = "caution"
    warning = "warning"
    critical = "critical"

class GateStatus(str, enum.Enum):
    open = "open"
    restricted = "restricted"
    closed = "closed"
    one_way = "one_way"
    evacuation = "evacuation"

class Trend(str, enum.Enum):
    up = "up"
    down = "down"
    stable = "stable"


class Venue(Base):
    """
    A monitored venue (stadium, festival ground, transit plaza).
    Maps to frontend `VenueInfo` interface.
    """
    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    gps_center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    gps_center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    zones: Mapped[list["Zone"]] = relationship("Zone", back_populates="venue", lazy="selectin")


class Zone(Base):
    """
    A monitored zone within a venue (gate, corridor, stand, concourse).
    Maps to frontend `VenueZone` interface.
    """
    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    venue_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(16), nullable=False)  # e.g., "Z-03"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sector: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    capacity_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_headcount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    density: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # p/m²
    flow_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # p/min
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # 0-100
    risk_level: Mapped[RiskLevel] = mapped_column(
        SAEnum(RiskLevel, name="risk_level_enum", create_constraint=True),
        nullable=False,
        default=RiskLevel.safe,
    )
    trend: Mapped[Trend] = mapped_column(
        SAEnum(Trend, name="trend_enum", create_constraint=True),
        nullable=False,
        default=Trend.stable,
    )

    gate_status: Mapped[GateStatus] = mapped_column(
        SAEnum(GateStatus, name="gate_status_enum", create_constraint=True),
        nullable=False,
        default=GateStatus.open,
    )

    coordinates_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="GPS polygon [[lat,lng], ...] for map rendering"
    )
    center_lat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reverse_flow_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    flow_conflict: Mapped[bool] = mapped_column(Boolean, default=False)
    venue: Mapped["Venue"] = relationship("Venue", back_populates="zones")
