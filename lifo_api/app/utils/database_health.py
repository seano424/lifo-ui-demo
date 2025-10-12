"""
Database health monitoring and recovery utilities for transaction management
"""

import asyncio
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class DatabaseHealthMonitor:
    """Monitor database health and provide recovery mechanisms"""

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="db_health")
        self._error_counts = {}
        self._last_health_check = None
        self._consecutive_failures = 0

    async def check_session_health(self, session: AsyncSession) -> bool:
        """
        Check if a database session is healthy and can execute queries

        Args:
            session: Database session to check

        Returns:
            bool: True if session is healthy, False otherwise
        """
        try:
            # Simple connectivity test
            result = await session.execute(text("SELECT 1"))
            test_result = result.scalar()

            if test_result == 1:
                self._consecutive_failures = 0
                self._last_health_check = datetime.utcnow()
                return True
            else:
                self._consecutive_failures += 1
                self.logger.warning(
                    "Database health check failed - unexpected result",
                    expected=1,
                    actual=test_result,
                    consecutive_failures=self._consecutive_failures,
                )
                return False

        except Exception as e:
            self._consecutive_failures += 1
            error_type = type(e).__name__

            # Track error patterns
            if error_type not in self._error_counts:
                self._error_counts[error_type] = 0
            self._error_counts[error_type] += 1

            self.logger.error(
                "Database health check failed",
                error=str(e),
                error_type=error_type,
                consecutive_failures=self._consecutive_failures,
                error_counts=self._error_counts,
            )
            return False

    async def is_transaction_aborted_error(self, error: Exception) -> bool:
        """
        Check if an error indicates an aborted transaction

        Args:
            error: Exception to check

        Returns:
            bool: True if error indicates aborted transaction
        """
        error_str = str(error).lower()
        aborted_indicators = [
            "current transaction is aborted",
            "infailedsqltransactionerror",
            "commands ignored until end of transaction block",
            "transaction is aborted",
            "transaction was aborted",
            "current transaction is aborted, commands ignored",
        ]

        return any(indicator in error_str for indicator in aborted_indicators)

    async def is_connection_error(self, error: Exception) -> bool:
        """
        Check if an error indicates a connection issue

        Args:
            error: Exception to check

        Returns:
            bool: True if error indicates connection issue
        """
        error_str = str(error).lower()
        connection_indicators = [
            "connection closed",
            "connection refused",
            "connection timeout",
            "connection reset",
            "lost connection",
            "broken pipe",
            "network error",
            "server closed the connection",
            "connection already closed",
        ]

        return any(indicator in error_str for indicator in connection_indicators)

    async def should_retry_operation(
        self, error: Exception, retry_count: int, max_retries: int = 3
    ) -> bool:
        """
        Determine if an operation should be retried based on the error type

        Args:
            error: Exception that occurred
            retry_count: Current retry attempt number
            max_retries: Maximum number of retries allowed

        Returns:
            bool: True if operation should be retried
        """
        if retry_count >= max_retries:
            return False

        # Always retry on transaction aborted errors
        if await self.is_transaction_aborted_error(error):
            return True

        # Always retry on connection errors
        if await self.is_connection_error(error):
            return True

        # Retry on specific database errors that are typically transient
        error_str = str(error).lower()
        transient_indicators = [
            "deadlock detected",
            "lock timeout",
            "timeout expired",
            "temporary failure",
            "could not serialize",
            "serialization failure",
        ]

        return any(indicator in error_str for indicator in transient_indicators)

    async def get_retry_delay(self, retry_count: int, error: Exception) -> float:
        """
        Calculate appropriate delay before retry based on error type and attempt count

        Args:
            retry_count: Current retry attempt number
            error: Exception that occurred

        Returns:
            float: Delay in seconds before retry
        """
        base_delay = 0.1

        # Longer delays for connection errors
        if await self.is_connection_error(error):
            base_delay = 0.5

        # Exponential backoff with jitter
        delay = base_delay * (2**retry_count)

        # Add some randomization to avoid thundering herd
        import random

        jitter = random.uniform(0.8, 1.2)  # noqa: S311  # Not for cryptographic use - retry jitter only

        return min(delay * jitter, 5.0)  # Cap at 5 seconds

    async def log_operation_metrics(
        self,
        operation: str,
        success: bool,
        duration_ms: float,
        error: Exception | None = None,
    ):
        """
        Log detailed metrics for database operations

        Args:
            operation: Name of the operation
            success: Whether operation was successful
            duration_ms: Duration in milliseconds
            error: Exception if operation failed
        """
        metrics = {
            "operation": operation,
            "success": success,
            "duration_ms": round(duration_ms, 2),
            "consecutive_failures": self._consecutive_failures,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if error:
            metrics.update(
                {
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "is_transaction_aborted": await self.is_transaction_aborted_error(
                        error
                    ),
                    "is_connection_error": await self.is_connection_error(error),
                }
            )

        if success:
            self.logger.info("Database operation succeeded", **metrics)
        else:
            self.logger.error("Database operation failed", **metrics)

    def get_health_summary(self) -> dict[str, Any]:
        """
        Get summary of database health status

        Returns:
            Dict containing health summary
        """
        return {
            "consecutive_failures": self._consecutive_failures,
            "last_health_check": self._last_health_check.isoformat()
            if self._last_health_check
            else None,
            "error_counts": self._error_counts.copy(),
            "is_healthy": self._consecutive_failures < 5,
            "needs_attention": self._consecutive_failures >= 3,
        }


# Global instance for use across the application
database_health_monitor = DatabaseHealthMonitor()


async def execute_with_retry(
    operation_name: str, operation_func, max_retries: int = 3, *args, **kwargs
) -> tuple[bool, Any, Exception | None]:
    """
    Execute a database operation with automatic retry logic

    Args:
        operation_name: Name of the operation for logging
        operation_func: Async function to execute
        max_retries: Maximum number of retry attempts
        *args: Arguments to pass to operation_func
        **kwargs: Keyword arguments to pass to operation_func

    Returns:
        tuple: (success: bool, result: Any, error: Optional[Exception])
    """
    retry_count = 0
    last_error = None
    start_time = datetime.utcnow()

    while retry_count <= max_retries:
        try:
            result = await operation_func(*args, **kwargs)
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            await database_health_monitor.log_operation_metrics(
                operation_name, True, duration_ms
            )

            return True, result, None

        except Exception as e:
            last_error = e
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            should_retry = await database_health_monitor.should_retry_operation(
                e, retry_count, max_retries
            )

            if should_retry and retry_count < max_retries:
                retry_count += 1
                delay = await database_health_monitor.get_retry_delay(retry_count, e)

                logger.warning(
                    f"Database operation '{operation_name}' failed, retrying",
                    error=str(e),
                    retry_count=retry_count,
                    max_retries=max_retries,
                    retry_delay=delay,
                )

                await asyncio.sleep(delay)
            else:
                await database_health_monitor.log_operation_metrics(
                    operation_name, False, duration_ms, e
                )
                break

    return False, None, last_error


async def create_fresh_session():
    """
    Create a fresh database session with health monitoring and PgBouncer compatibility

    Returns:
        AsyncSession: New database session with PgBouncer-compatible settings
    """
    from app.database.connection import get_async_session

    # Use the existing PgBouncer-compatible session factory
    # This ensures the session inherits statement_cache_size=0 and other PgBouncer settings
    async_session_factory = get_async_session()
    session = async_session_factory()

    # For PgBouncer compatibility, skip the health check that uses prepared statements
    # The health check itself was causing the "prepared statement already exists" errors
    # Since we're using a fresh session from the PgBouncer-compatible factory, it should be healthy
    logger.debug(
        "Created fresh database session with PgBouncer compatibility",
        session_id=id(session),
    )

    return session
