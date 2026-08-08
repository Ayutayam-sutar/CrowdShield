"""
Unified Authentication endpoints.
"""

from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.token import Token

router = APIRouter()

class UnifiedLoginRequest(BaseModel):
    email: str
    password: str

class CitizenRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@router.post("/login", response_model=Token)
async def login(
    data: UnifiedLoginRequest,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Unified login endpoint for both Admins and Citizens using email and password.
    """
    result = await db.execute(select(User).where(User.username == data.email))
    user = result.scalars().first()
    
    if not user or not security.verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, role=user.role.value, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": user.role.value
    }

@router.post("/register", response_model=Token)
async def register(
    data: CitizenRegisterRequest,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Citizen registration endpoint. Creates a new user with the CITIZEN role.
    """
    result = await db.execute(select(User).where(User.username == data.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    # Create new citizen user
    new_user = User(
        username=data.email,
        hashed_password=security.get_password_hash(data.password),
        role=UserRole.CITIZEN
    )
    db.add(new_user)
    await db.flush() # Flush to get the generated ID
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            new_user.id, role=new_user.role.value, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "role": new_user.role.value
    }
