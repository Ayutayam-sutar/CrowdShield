"""
CitizenReport ORM model — mirrors frontend CitizenReport interface.
Tracks citizen SOS incident submissions with media and community upvotes.
"""

from sqlalchemy import (
    String, Integer, Float, Text, DateTime, Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
import uuid
import enum

from app.db.base import Base


class ReportCategory(str, enum.Enum):
    Overcrowding = "Overcrowding"
    Medical = "Medical Emergency"
    Hazard = "Hazard"
    Panic = "Panic / Commotion"


class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    DISPATCHED = "DISPATCHED"
    RESOLVED = "RESOLVED"


class CitizenReport(Base):
    """
    A citizen-submitted SOS/incident report.
    Maps to frontend `CitizenReport` interface.
    """
    __tablename__ = "citizen_reports"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    category: Mapped[ReportCategory] = mapped_column(
        SAEnum(ReportCategory, name="report_category_enum", create_constraint=True),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_name: Mapped[str] = mapped_column(String(300), nullable=False)
    venue_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Media Attachments
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_type: Mapped[str | None] = mapped_column(
        String(16), nullable=True, doc="image | video"
    )

    # Community Validation
    upvotes: Mapped[int] = mapped_column(Integer, default=0)

    # Status Lifecycle
    status: Mapped[ReportStatus] = mapped_column(
        SAEnum(ReportStatus, name="report_status_enum", create_constraint=True),
        nullable=False,
        default=ReportStatus.PENDING,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
