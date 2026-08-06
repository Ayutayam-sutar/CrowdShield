"""
TelemetryLog ORM model — high-frequency CV/ML telemetry ingestion records.
Each row represents a single inference frame from the YOLO11/ByteTrack pipeline.
"""

from sqlalchemy import (
    BigInteger, String, Float, Boolean, DateTime, ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone

from app.db.base import Base


class TelemetryLog(Base):
    """
    High-frequency telemetry log from edge YOLO inference nodes.
    Indexed by timestamp for time-series queries.
    """
    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    zone_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # ─── Raw Sensor Data ───
    person_count: Mapped[int] = mapped_column(default=0)
    density: Mapped[float] = mapped_column(Float, default=0.0, doc="p/m²")
    avg_speed: Mapped[float] = mapped_column(Float, default=0.0, doc="m/s")

    # ─── Anomaly Flags ───
    flow_conflict: Mapped[bool] = mapped_column(Boolean, default=False)
    reverse_flow_detected: Mapped[bool] = mapped_column(Boolean, default=False)

    # ─── Computed Scores ───
    surge_score: Mapped[float] = mapped_column(
        Float, default=0.0, doc="Raw ML surge probability [0-1]"
    )
    calculated_risk_score: Mapped[float] = mapped_column(
        Float, default=0.0, doc="Final risk score after rule overrides [0-100]"
    )
