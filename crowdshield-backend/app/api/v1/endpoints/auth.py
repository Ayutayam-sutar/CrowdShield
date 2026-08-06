"""
Authentication endpoints.
"""

from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.token import Token
from pydantic import BaseModel

router = APIRouter()

@router.post("/login/admin", response_model=Token)
async def login_admin(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    elif user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not an admin user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, role=user.role.value, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": user.role.value
    }


class CitizenLoginRequest(BaseModel):
    contact: str
    name: str
    otp: str

@router.post("/login/citizen", response_model=Token)
async def login_citizen(
    data: CitizenLoginRequest,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Citizen login via Contact Number and OTP.
    For the hackathon MVP, we mock the OTP validation and auto-create the user if they don't exist.
    """
    # MVP: Any OTP works, or we can check a static one
    if not data.otp or len(data.otp) < 4:
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    result = await db.execute(select(User).where(User.username == data.contact))
    user = result.scalars().first()
    
    if not user:
        # Auto-create citizen user for MVP
        user = User(
            username=data.contact,
            hashed_password=security.get_password_hash(data.otp),
            role=UserRole.CITIZEN
        )
        db.add(user)
        await db.flush()
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, role=user.role.value, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": user.role.value
    }
