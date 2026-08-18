"""
AuditLog ORM model — tracks all operator commands for NDRF compliance.
"""

from sqlalchemy import Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.db.base import Base
class AuditLog(Base):
    """
    Immutable audit trail of operator actions (gate overrides, PA broadcasts,
    guard dispatches) required for NDRF compliance and post-incident review.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operator_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    target_entity: Mapped[str] = mapped_column(
        String(200), nullable=False,
        doc="Zone ID, gate ID, camera ID, or system component",
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
