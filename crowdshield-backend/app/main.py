"""
FastAPI application initialization and lifespan.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, async_session
from app.api.v1.api import api_router
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for FastAPI.
    Initializes database tables on startup.
    """
    logger.info("Starting up CrowdShield Backend...")

    async with engine.begin() as conn:
    
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables verified/created.")

    async with async_session() as session:
        async with session.begin():
            result = await session.execute(select(User).where(User.username == "admin@crowdshield.com"))
            admin_user = result.scalars().first()
            if not admin_user:
                logger.info("Seeding default admin user...")
                new_admin = User(
                    username="admin@crowdshield.com",
                    hashed_password=get_password_hash("Sentinel@2026"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                session.add(new_admin)
                logger.info("Default admin user seeded.")
            else:
                logger.info("Default admin user already exists.")
    
    yield
    
    logger.info("Shutting down CrowdShield Backend...")
    await engine.dispose()

app = FastAPI(
    title="CrowdShield Backend",
    description="AI-Powered Early Warning Crowd Stampede Prevention System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://crowdshieldjuggernaut.netlify.app",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

app.include_router(api_router, prefix="/api/v1")
@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": app.version}
