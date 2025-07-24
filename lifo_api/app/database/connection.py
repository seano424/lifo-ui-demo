"""
Async PostgreSQL database connection for LIFO AI Engine
Production-ready connection pool with proper error handling
"""

import asyncio
import re
from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import get_database_url, settings

logger = structlog.get_logger()

# Create the base class for models
Base = declarative_base()

# Lazy initialization for database engine and session
_engine = None
_async_session = None


def get_engine():
    """Get or create the global database engine instance"""
    global _engine
    if _engine is None:
        database_url = get_database_url()

        if database_url.startswith("sqlite"):
            # SQLite (testing): Use NullPool and no pooling parameters
            _engine = create_async_engine(
                database_url,
                echo=settings.debug,
                future=True,
                poolclass=NullPool,
                connect_args={"check_same_thread": False},
            )
        elif settings.debug:
            # PostgreSQL Development: Use NullPool for simplicity
            _engine = create_async_engine(
                database_url,
                echo=settings.debug,
                future=True,
                poolclass=NullPool,
            )
        else:
            # PostgreSQL Production: Use connection pooling
            _engine = create_async_engine(
                database_url,
                echo=False,
                future=True,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                pool_pre_ping=True,
                pool_recycle=settings.db_pool_recycle,
                connect_args={
                    "command_timeout": 60,
                    "server_settings": {
                        "jit": "off",  # Disable JIT for more predictable performance
                    },
                },
            )
    return _engine


def get_async_session():
    """Get or create the global async session factory"""
    global _async_session
    if _async_session is None:
        engine = get_engine()
        _async_session = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,  # Keep objects accessible after commit
            autocommit=False,
            autoflush=True,
        )
    return _async_session


# For backwards compatibility with existing code
def engine():
    """Get the database engine (lazy-initialized)"""
    return get_engine()


def async_session():
    """Get the async session factory (lazy-initialized)"""
    return get_async_session()


async def init_database():
    """
    Initialize database connection and create tables if needed
    """
    try:
        logger.info("Initializing database connection...")

        # Test the connection
        async with engine().begin():
            # Import all models to ensure they're registered

            # Skip table creation in development - use Supabase migrations instead
            # Your database already has the correct schema from migrations
            if settings.debug:
                # await conn.run_sync(Base.metadata.create_all)  # Disabled - use migrations
                logger.info(
                    "Database connection verified (table creation skipped - using Supabase migrations)"
                )

        logger.info("Database initialization completed successfully")

    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise


async def test_connection() -> bool:
    """
    Test database connection health

    Returns:
        bool: True if connection is healthy
    """
    try:
        async with engine().begin() as conn:
            # Execute a simple query
            result = await conn.execute(text("SELECT 1"))
            test_result = result.scalar()

            if test_result == 1:
                logger.debug("Database connection test successful")
                return True
            else:
                logger.error("Database connection test failed - unexpected result")
                return False

    except Exception as e:
        logger.error("Database connection test failed", error=str(e))
        return False


async def get_database() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get database session

    Yields:
        AsyncSession: Database session for request
    """
    async with async_session()() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error("Database session error", error=str(e))
            raise
        finally:
            await session.close()


# Alias for compatibility
get_db = get_database


async def get_database_session() -> AsyncSession:
    """
    Get a database session for manual management
    Note: Remember to close the session when done

    Returns:
        AsyncSession: Database session
    """
    return async_session()()


class DatabaseManager:
    """
    Database manager for advanced operations
    """

    def __init__(self):
        self.engine = engine()
        self.session_factory = async_session()
        self.logger = structlog.get_logger().bind(component="db_manager")

    async def execute_safe_query(self, query: str, params: dict = None):
        """
        Execute parameterized SQL query with security validation

        Args:
            query: Parameterized SQL query string (must use :param_name format)
            params: Query parameters dictionary

        Returns:
            Query result

        Raises:
            SecurityError: If query contains potential SQL injection patterns
        """
        # Security validation: ensure query uses parameterized format
        if params and not all(f":{param}" in query for param in params):
            raise ValueError("Query must use parameterized format (:param_name)")

        # Block dangerous SQL patterns
        dangerous_patterns = [
            r"\bDROP\b",
            r"\bDELETE\b.*\bWHERE\b.*1\b.*=\b.*1",
            r"\bUNION\b.*\bSELECT\b",
            r"--",
            r"/\*",
            r"\*/",
            r"\bEXEC\b",
            r"\bEXECUTE\b",
            r"\bxp_cmdshell\b",
        ]

        query_upper = query.upper()
        for pattern in dangerous_patterns:
            if re.search(pattern, query_upper, re.IGNORECASE):
                self.logger.warning(
                    "Potential SQL injection attempt blocked", query_pattern=pattern
                )
                raise ValueError("Query contains potentially unsafe SQL patterns")

        async with self.session_factory() as session:
            try:
                result = await session.execute(text(query), params or {})
                await session.commit()
                return result
            except Exception as e:
                await session.rollback()
                self.logger.error("Safe query execution failed", error=str(e))
                raise

    async def bulk_insert(self, model_class, data: list):
        """
        Perform bulk insert operation

        Args:
            model_class: SQLAlchemy model class
            data: List of dictionaries with data to insert
        """
        async with self.session_factory() as session:
            try:
                objects = [model_class(**item) for item in data]
                session.add_all(objects)
                await session.commit()

                self.logger.info(
                    "Bulk insert completed", model=model_class.__name__, count=len(data)
                )

                return objects

            except Exception as e:
                await session.rollback()
                self.logger.error(
                    "Bulk insert failed",
                    model=model_class.__name__,
                    count=len(data),
                    error=str(e),
                )
                raise

    async def bulk_update(self, model_class, updates: list):
        """
        Perform bulk update operation

        Args:
            model_class: SQLAlchemy model class
            updates: List of dictionaries with id and update data
        """
        async with self.session_factory() as session:
            try:
                for update_data in updates:
                    obj_id = update_data.pop("id")
                    await session.execute(
                        model_class.__table__.update()
                        .where(model_class.id == obj_id)
                        .values(**update_data)
                    )

                await session.commit()

                self.logger.info(
                    "Bulk update completed",
                    model=model_class.__name__,
                    count=len(updates),
                )

            except Exception as e:
                await session.rollback()
                self.logger.error(
                    "Bulk update failed",
                    model=model_class.__name__,
                    count=len(updates),
                    error=str(e),
                )
                raise

    async def get_connection_info(self) -> dict:
        """
        Get database connection information

        Returns:
            dict: Connection information
        """
        try:
            async with self.session_factory() as session:
                database_url = get_database_url()

                if database_url.startswith("sqlite"):
                    # SQLite connection info
                    result = await session.execute(text("SELECT sqlite_version()"))
                    version = result.scalar()

                    return {
                        "sqlite_version": version,
                        "database_type": "SQLite",
                        "database_url": "sqlite:///:memory:",
                    }
                else:
                    # PostgreSQL connection info
                    result = await session.execute(text("SELECT version()"))
                    pg_version = result.scalar()

                    # Get current database name
                    result = await session.execute(text("SELECT current_database()"))
                    db_name = result.scalar()

                    # Get connection count
                    result = await session.execute(
                        text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                    )
                    active_connections = result.scalar()

                    return {
                        "postgresql_version": pg_version,
                        "database_name": db_name,
                        "active_connections": active_connections,
                        "pool_size": settings.db_pool_size,
                        "max_overflow": settings.db_max_overflow,
                    }

        except Exception as e:
            self.logger.error("Failed to get connection info", error=str(e))
            return {"error": str(e)}

    async def health_check(self) -> dict:
        """
        Comprehensive database health check

        Returns:
            dict: Health check results
        """
        start_time = asyncio.get_event_loop().time()

        try:
            async with self.session_factory() as session:
                # Test basic connectivity
                await session.execute(text("SELECT 1"))

                database_url = get_database_url()

                if database_url.startswith("sqlite"):
                    # SQLite health check (simpler)
                    end_time = asyncio.get_event_loop().time()
                    response_time = (end_time - start_time) * 1000

                    return {
                        "status": "healthy",
                        "response_time_ms": round(response_time, 2),
                        "database_type": "SQLite",
                        "connection_pool": "NullPool (no pooling)",
                    }
                else:
                    # PostgreSQL health check
                    result = await session.execute(text("SELECT COUNT(*) FROM business.stores"))
                    store_count = result.scalar()

                    end_time = asyncio.get_event_loop().time()
                    response_time = (end_time - start_time) * 1000

                    return {
                        "status": "healthy",
                        "response_time_ms": round(response_time, 2),
                        "store_count": store_count,
                        "connection_pool": {
                            "size": self.engine.pool.size(),
                            "checked_in": self.engine.pool.checkedin(),
                            "checked_out": self.engine.pool.checkedout(),
                            "overflow": self.engine.pool.overflow(),
                            "invalid": self.engine.pool.invalid(),
                        },
                    }

        except Exception as e:
            end_time = asyncio.get_event_loop().time()
            response_time = (end_time - start_time) * 1000

            self.logger.error("Database health check failed", error=str(e))

            return {
                "status": "unhealthy",
                "response_time_ms": round(response_time, 2),
                "error": str(e),
            }


# Global database manager instance (lazy initialization)
_db_manager = None


def get_db_manager() -> DatabaseManager:
    """Get or create the global DatabaseManager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


async def cleanup_database():
    """
    Cleanup database connections on application shutdown
    """
    try:
        await engine().dispose()
        logger.info("Database connections cleaned up")
    except Exception as e:
        logger.error("Error during database cleanup", error=str(e))
