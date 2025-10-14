"""
Async PostgreSQL database connection for LIFO AI Engine
Production-ready connection pool with pgBouncer compatibility
"""

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

# Lazy initialization for database engines and sessions
_engine = None
_async_session = None
_direct_engine = None
_direct_async_session = None


def _get_supavisor_connect_args(timeout: int = 30) -> dict:
    """Get Supavisor session mode connection arguments with optimized caching"""
    return {
        "ssl": "require",
        "statement_cache_size": 10,  # Optimized: Small cache for Supavisor session mode (~5-7% faster)
        "prepared_statement_cache_size": 0,  # SQLAlchemy-level cache (keep disabled)
        "prepared_statement_name_func": None,
        "command_timeout": timeout,
        "server_settings": {
            "statement_timeout": f"{timeout - 5}s",
            "lock_timeout": "5s",
            "jit": "off",
            "plan_cache_mode": "force_generic_plan",
            "log_statement": "none",
        },
    }


def get_engine():
    """Get or create the global database engine instance"""
    global _engine
    if _engine is None:
        database_url = get_database_url()

        if database_url.startswith("sqlite"):
            # SQLite (testing): Simple config with NullPool
            _engine = create_async_engine(
                database_url,
                echo=settings.debug,
                future=True,
                poolclass=NullPool,
                connect_args={"check_same_thread": False},
            )
        else:
            # PostgreSQL: Supavisor session mode config
            # Note: Supavisor handles connection pooling, so we use NullPool
            _engine = create_async_engine(
                database_url,
                echo=False,
                future=True,
                poolclass=NullPool,  # Supavisor handles pooling
                query_cache_size=0,  # Disable query compilation cache
                connect_args=_get_supavisor_connect_args(timeout=30),
                execution_options={
                    "compiled_cache": {},
                    "schema_translate_map": None,
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
            expire_on_commit=False,
            autocommit=False,
            autoflush=True,
        )
    return _async_session


def get_direct_engine():
    """
    Get or create a direct database engine via Supavisor session mode.
    Used for bulk operations that benefit from optimized prepared statement caching.
    """
    global _direct_engine
    if _direct_engine is None:
        import os

        direct_url = os.getenv("DATABASE_DIRECT_URL")
        if not direct_url:
            logger.warning(
                "DATABASE_DIRECT_URL not set, falling back to regular engine"
            )
            return get_engine()

        logger.info("Creating database engine via Supavisor session mode for bulk operations")
        _direct_engine = create_async_engine(
            direct_url,
            echo=False,
            future=True,
            poolclass=NullPool,
            query_cache_size=0,
            connect_args=_get_supavisor_connect_args(
                timeout=60
            ),  # Longer timeout for bulk ops
            execution_options={
                "compiled_cache": {},
                "schema_translate_map": None,
            },
        )
    return _direct_engine


def get_direct_async_session():
    """Get or create the direct database async session factory"""
    global _direct_async_session
    if _direct_async_session is None:
        engine = get_direct_engine()
        _direct_async_session = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=True,
        )
    return _direct_async_session


# Backwards compatibility aliases
engine = get_engine
async_session = get_async_session
direct_async_session = get_direct_async_session


async def init_database():
    """Initialize database connection (creates tables if needed)"""
    try:
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise


async def test_connection(db_manager=None) -> bool:
    """Test database connectivity"""
    try:
        if db_manager:
            # Use provided database manager
            async with db_manager.session_factory() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        else:
            # Use global session factory
            session_factory = get_async_session()
            async with session_factory() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
    except Exception as e:
        logger.error("Database connection test failed", error=str(e))
        return False


async def get_database() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.
    Yields a database session and ensures proper cleanup.
    """
    session_factory = get_async_session()
    async with session_factory() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error("Database session error", error=str(e))
            raise
        finally:
            await session.close()


# Alias for convenience
get_db = get_database


class DatabaseManager:
    """Database manager for advanced operations"""

    def __init__(self):
        self.engine = get_engine()
        self.session_factory = get_async_session()
        self.logger = structlog.get_logger().bind(component="db_manager")

    async def execute_safe_query(self, query: str, params: dict | None = None):
        """
        Execute parameterized SQL query with security validation

        Args:
            query: Parameterized SQL query string (must use :param_name format)
            params: Query parameters dictionary

        Returns:
            Query result

        Raises:
            ValueError: If query contains potential SQL injection patterns
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
                    obj = await session.get(model_class, obj_id)
                    if obj:
                        for key, value in update_data.items():
                            setattr(obj, key, value)

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
        """Get current database connection information"""
        try:
            async with self.session_factory() as session:
                # Get database version
                version_result = await session.execute(text("SELECT version()"))
                version = version_result.scalar()

                # Get connection count
                conn_result = await session.execute(
                    text(
                        """
                    SELECT count(*)
                    FROM pg_stat_activity
                    WHERE datname = current_database()
                """
                    )
                )
                connection_count = conn_result.scalar()

                # Get database size
                size_result = await session.execute(
                    text(
                        """
                    SELECT pg_size_pretty(pg_database_size(current_database()))
                """
                    )
                )
                db_size = size_result.scalar()

                return {
                    "version": version,
                    "connection_count": connection_count,
                    "database_size": db_size,
                    "engine_pool_size": (
                        self.engine.pool.size()
                        if hasattr(self.engine.pool, "size")
                        else "N/A (NullPool)"
                    ),
                }

        except Exception as e:
            self.logger.error("Failed to get connection info", error=str(e))
            return {"error": str(e)}

    async def health_check(self) -> dict:
        """Perform database health check"""
        try:
            async with self.session_factory() as session:
                # Test basic connectivity
                result = await session.execute(text("SELECT 1"))
                is_connected = result.scalar() == 1

                # Get connection stats
                conn_info = await self.get_connection_info()

                return {
                    "status": "healthy" if is_connected else "unhealthy",
                    "connected": is_connected,
                    "connection_info": conn_info,
                }

        except Exception as e:
            self.logger.error("Database health check failed", error=str(e))
            return {"status": "unhealthy", "error": str(e)}


# Global database manager instance
_db_manager = None


def get_db_manager() -> DatabaseManager:
    """Get or create global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


async def cleanup_database():
    """Cleanup database connections"""
    global _engine, _direct_engine, _async_session, _direct_async_session

    if _engine:
        await _engine.dispose()
        _engine = None
        _async_session = None
        logger.info("Database engine disposed")

    if _direct_engine:
        await _direct_engine.dispose()
        _direct_engine = None
        _direct_async_session = None
        logger.info("Direct database engine disposed")
