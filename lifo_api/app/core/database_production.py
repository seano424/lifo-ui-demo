"""
Production database configuration for LIFO AI Engine
Optimized for Digital Ocean App Platform deployment
"""

from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models"""

    pass


class DatabaseManager:
    """Production database manager with connection pooling and error handling"""

    def __init__(self):
        self.engine = None
        self.async_session_maker = None
        self._initialize_engine()

    def _initialize_engine(self):
        """Initialize async database engine with production settings"""
        database_url = settings.database_url

        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required for production")

        # Convert postgres:// to postgresql:// if needed (for compatibility)
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        # Ensure async driver
        if not database_url.startswith("postgresql+asyncpg://"):
            if database_url.startswith("postgresql://"):
                database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            else:
                raise ValueError("Database URL must use PostgreSQL")

        # Production engine configuration
        engine_kwargs = {
            "url": database_url,
            "echo": settings.debug,
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_recycle": settings.db_pool_recycle,
            "pool_pre_ping": True,  # Verify connections before use
            "poolclass": pool.QueuePool,
            "connect_args": {
                "server_settings": {
                    "application_name": "lifo_ai_api",
                    "jit": "off",  # Disable JIT for better connection startup performance
                },
                "command_timeout": 60,
                "prepared_statement_cache_size": 0,  # Disable prepared statement cache
            }
        }

        self.engine = create_async_engine(**engine_kwargs)

        self.async_session_maker = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=True,
            autocommit=False,
        )

        logger.info(
            "Database engine initialized",
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_recycle=settings.db_pool_recycle,
        )

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session with proper error handling"""
        if not self.async_session_maker:
            raise RuntimeError("Database not initialized")

        async with self.async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def health_check(self) -> bool:
        """Check database connectivity for health endpoints"""
        try:
            async with self.async_session_maker() as session:
                await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False

    async def close(self):
        """Clean shutdown of database connections"""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async for session in db_manager.get_session():
        yield session


# Health check function
async def check_database_health() -> bool:
    """Health check function for monitoring"""
    return await db_manager.health_check()


# Shutdown handler
async def close_db_connections():
    """Shutdown handler for graceful database closure"""
    await db_manager.close()
