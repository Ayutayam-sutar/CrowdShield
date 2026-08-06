"""
Async SQLAlchemy engine & session factory for Neon DB (Cloud PostgreSQL).
Provides the `get_db` dependency for FastAPI route injection.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from typing import AsyncGenerator

from app.core.config import settings

# ─── Async Engine ───
# Neon DB requires SSL; pool_pre_ping ensures stale connections are recycled.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# ─── Async Session Factory ───
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.
    Automatically commits on success, rolls back on exception.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
