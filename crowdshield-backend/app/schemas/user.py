"""
Pydantic schemas for User.
"""
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    role: UserRole
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
