"""
User ORM model — for authentication and role-based access.
"""

from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum
import uuid

from app.db.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CITIZEN = "CITIZEN"
    VOLUNTEER = "VOLUNTEER"


class User(Base):
    """
    User account for Admin, Citizen, or Volunteer roles.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role_enum", create_constraint=True),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
