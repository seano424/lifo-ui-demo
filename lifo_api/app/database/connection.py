"""
Async PostgreSQL database connection for LIFO AI Engine
Production-ready connection pool with proper error handling
"""

import asyncio
import re
from collections.abc import AsyncGenerator

import asyncpg
import structlog
from sqlalchemy import event, text
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


def create_sync_asyncpg_connection():
    """
    Custom sync connection creator that returns an asyncpg connection
    properly configured for pgbouncer compatibility
    """
    import asyncio
    import urllib.parse

    # Get the database URL and parse it
    database_url = get_database_url().replace("postgresql+asyncpg://", "postgresql://")
    parsed = urllib.parse.urlparse(database_url)

    # Create an event loop if none exists (for sync context)
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    # Create connection with statement_cache_size=0 for pgbouncer
    async def create_conn():
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/'),
            ssl='require',
            statement_cache_size=0,  # Critical for pgbouncer transaction pooling
            command_timeout=30
        )
        logger.info("Created direct asyncpg connection with statement_cache_size=0 for pgbouncer")
        return conn

    return loop.run_until_complete(create_conn())


def _setup_engine_events(engine):
    """Setup engine events to ensure pgbouncer compatibility"""

    @event.listens_for(engine.sync_engine, "do_connect")
    def _set_connection_params(dialect, conn_rec, cargs, cparams):
        """Configure connection parameters before connection is created"""
        # Force disable prepared statements for pgbouncer compatibility
        # The error message specifically mentions "statement_cache_size" not "prepared_statement_cache_size"
        cparams['statement_cache_size'] = 0
        cparams['prepared_statement_cache_size'] = 0  # Also set this for good measure
        cparams['prepared_statement_name_func'] = None

        logger.debug("Forcing connection parameters for pgbouncer compatibility",
                    statement_cache_size=cparams.get('statement_cache_size'),
                    prepared_statement_cache_size=cparams.get('prepared_statement_cache_size'))

    @event.listens_for(engine.sync_engine, "connect")
    def _on_connect(dbapi_conn, connection_record):
        """Handle connection setup after connection is established"""
        logger.debug("Connection established with pgbouncer settings")

    return engine


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
            # PostgreSQL Development: AGGRESSIVE pgbouncer transaction pooler compatibility
            # This prevents connection reuse which can cause prepared statement conflicts
            _engine = create_async_engine(
                database_url,
                echo=False,  # Disable SQL echo to reduce prepared statement conflicts
                future=True,
                poolclass=NullPool,  # Critical: No pooling to avoid prepared statement conflicts
                connect_args={
                    "ssl": "require",  # Required for Supabase
                    "statement_cache_size": 0,  # Critical: Disable prepared statements for pgbouncer
                    "prepared_statement_cache_size": 0,  # Alternative parameter name
                    "prepared_statement_name_func": None,  # Disable named prepared statements
                    "command_timeout": 30,  # Add command timeout
                    "server_settings": {
                        "statement_timeout": "25s",
                        "lock_timeout": "5s",
                        "jit": "off",  # Disable JIT to prevent optimization-related prepared statements
                        "plan_cache_mode": "force_generic_plan",  # Force generic plans
                        "log_statement": "none",  # Disable query logging
                    },
                },
                execution_options={
                    "compiled_cache": {},  # Disable SQLAlchemy's compiled statement cache
                    "schema_translate_map": None,  # Disable schema translation cache
                }
            )
            # Setup engine events for pgbouncer compatibility
            _engine = _setup_engine_events(_engine)
        else:
            # PostgreSQL Production: AGGRESSIVE pgbouncer transaction pooler compatibility
            # Note: pgbouncer handles the connection pooling, so SQLAlchemy should not pool
            _engine = create_async_engine(
                database_url,
                echo=False,
                future=True,
                poolclass=NullPool,  # Critical: No pooling, pgbouncer handles this
                connect_args={
                    "command_timeout": 30,  # MOBILE: Faster timeout for mobile queries
                    "ssl": "require",  # Required for Supabase
                    "statement_cache_size": 0,  # Critical: Disable prepared statements for pgbouncer
                    "prepared_statement_cache_size": 0,  # Alternative parameter name
                    "prepared_statement_name_func": None,  # Disable named prepared statements
                    "server_settings": {
                        "jit": "off",  # Disable JIT for more predictable performance
                        "statement_timeout": "25s",  # MOBILE: Hard limit for mobile queries
                        "lock_timeout": "5s",  # MOBILE: Fast lock timeout
                        "idle_in_transaction_session_timeout": "10min",  # MOBILE: Cleanup idle sessions
                        "plan_cache_mode": "force_generic_plan",  # Force generic plans
                        "log_statement": "none",  # Disable query logging in production
                    },
                },
                execution_options={
                    "compiled_cache": {},  # Disable SQLAlchemy's compiled statement cache
                    "schema_translate_map": None,  # Disable schema translation cache
                }
            )
            # Setup engine events for pgbouncer compatibility
            _engine = _setup_engine_events(_engine)
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
            # MOBILE OPTIMIZATION: Session configured for mobile performance
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

        # For pgbouncer transaction pooling, skip connection test during startup
        # The connection will be tested on first actual use
        logger.info("Skipping database connection test for pgbouncer compatibility")
        logger.info("Database will be tested on first API request requiring database access")

        logger.info("Database initialization completed successfully (deferred connection test)")

    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        # Don't raise the error - let the app start and handle DB errors per request
        logger.warning("Database connection will be attempted on first use")


async def test_connection() -> bool:
    """
    Test database connection health with pgbouncer compatibility

    Returns:
        bool: True if connection is healthy
    """
    try:
        # Use a fresh connection for each test to avoid prepared statement conflicts
        async with get_async_session()() as session:
            # Execute a simple query using the session
            result = await session.execute(text("SELECT 1"))
            test_result = result.scalar()

            if test_result == 1:
                logger.debug("Database connection test successful")
                return True
            else:
                logger.error("Database connection test failed - unexpected result")
                return False

    except Exception as e:
        if "prepared statement" in str(e).lower():
            logger.warning("Prepared statement error in connection test - this is expected with pgbouncer transaction pooling", error=str(e))
            # Try one more time with a different approach
            try:
                # Direct asyncpg connection test bypassing SQLAlchemy
                import urllib.parse
                database_url = get_database_url().replace("postgresql+asyncpg://", "postgresql://")
                parsed = urllib.parse.urlparse(database_url)

                conn = await asyncpg.connect(
                    host=parsed.hostname,
                    port=parsed.port or 5432,
                    user=parsed.username,
                    password=parsed.password,
                    database=parsed.path.lstrip('/'),
                    ssl='require',
                    statement_cache_size=0
                )

                result = await conn.fetchval("SELECT 1")
                await conn.close()

                if result == 1:
                    logger.debug("Direct asyncpg connection test successful")
                    return True
                else:
                    logger.error("Direct asyncpg connection test failed - unexpected result")
                    return False

            except Exception as direct_error:
                logger.error("Direct asyncpg connection test also failed", error=str(direct_error))
                return False
        else:
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


async def get_async_database_session() -> AsyncSession:
    """
    Get an async database session for use in async contexts
    
    Returns:
        AsyncSession: Async database session
    """
    return async_session()()


def get_db_sync():
    """
    Synchronous database session function for legacy CSV processor compatibility
    Note: This returns None to trigger graceful fallback in CSV processor
    The CSV processor will use hardcoded category codes instead of database lookups
    """
    return None


class DatabaseManager:
    """
    Database manager for advanced operations
    """

    def __init__(self):
        self.engine = engine()
        self.session_factory = async_session()
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
                        text(
                            "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
                        )
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
                    result = await session.execute(
                        text("SELECT COUNT(*) FROM business.stores")
                    )
                    store_count = result.scalar()

                    end_time = asyncio.get_event_loop().time()
                    response_time = (end_time - start_time) * 1000

                    # Handle pool stats safely (different pool types have different methods)
                    pool_stats = {}
                    try:
                        if hasattr(self.engine.pool, 'size'):
                            pool_stats = {
                                "size": self.engine.pool.size(),
                                "checked_in": self.engine.pool.checkedin(),
                                "checked_out": self.engine.pool.checkedout(),
                                "overflow": self.engine.pool.overflow(),
                                "invalid": self.engine.pool.invalid(),
                            }
                        else:
                            pool_stats = {"type": "NullPool", "pooling_disabled": True}
                    except AttributeError:
                        pool_stats = {"error": "Unable to get pool stats"}

                    return {
                        "status": "healthy",
                        "response_time_ms": round(response_time, 2),
                        "store_count": store_count,
                        "connection_pool": pool_stats,
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
