"""
CCTVFeed ORM model — mirrors frontend CCTVFeed interface.
Stores camera metadata, YOLO detection snapshots as JSON.
"""

from sqlalchemy import String, Integer, Float, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.db.base import Base
class CameraStatus(str, enum.Enum):
    online = "online"
    warning = "warning"
    offline = "offline"


class CCTVFeed(Base):
    """
    A CCTV camera feed with edge YOLO inference metadata.
    Maps to frontend `CCTVFeed` interface.
    """
    __tablename__ = "cctv_feeds"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g., "cam_01"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(String(300), nullable=False)
    zone_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False
    )

    status: Mapped[CameraStatus] = mapped_column(
        SAEnum(CameraStatus, name="camera_status_enum", create_constraint=True),
        nullable=False,
        default=CameraStatus.online,
    )
    fps: Mapped[int] = mapped_column(Integer, default=30)
    person_count: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    edge_node_id: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    yolo_detections_json: Mapped[list | None] = mapped_column(
        JSON, nullable=True,
        doc='[{"id": "d1", "label": "...", "confidence": 0.96, "bbox": {...}, "type": "person"}]',
    )
