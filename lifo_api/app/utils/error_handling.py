"""
Comprehensive error handling and recovery system
Production-ready error management with monitoring and recovery
"""

import asyncio
import inspect
import threading
import time
import traceback
from collections import defaultdict, deque
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from functools import wraps
from typing import Any

import structlog
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

logger = structlog.get_logger()


class ErrorCategory:
    """Error category constants"""
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    EXTERNAL_SERVICE = "external_service"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    PERFORMANCE = "performance"
    SECURITY = "security"
    UNKNOWN = "unknown"


class ErrorSeverity:
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorEvent:
    """Structured error event for tracking and analysis"""

    def __init__(
        self,
        error: Exception,
        category: str,
        severity: str,
        endpoint: str | None = None,
        user_id: str | None = None,
        client_ip: str | None = None,
        context: dict[str, Any] | None = None,
        recovery_attempted: bool = False,
        recovery_successful: bool = False
    ):
        self.error = error
        self.error_type = type(error).__name__
        self.error_message = str(error)
        self.category = category
        self.severity = severity
        self.endpoint = endpoint
        self.user_id = user_id
        self.client_ip = client_ip
        self.context = context or {}
        self.recovery_attempted = recovery_attempted
        self.recovery_successful = recovery_successful
        self.timestamp = datetime.now(UTC)
        self.traceback = traceback.format_exc()
        self.error_id = self._generate_error_id()

    def _generate_error_id(self) -> str:
        """Generate unique error ID"""
        import hashlib
        data = f"{self.timestamp.isoformat()}{self.error_type}{self.endpoint or 'unknown'}"
        return hashlib.md5(data.encode()).hexdigest()[:12]

    def to_dict(self) -> dict[str, Any]:
        """Convert error event to dictionary"""
        return {
            "error_id": self.error_id,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "category": self.category,
            "severity": self.severity,
            "endpoint": self.endpoint,
            "user_id": self.user_id,
            "client_ip": self.client_ip,
            "context": self.context,
            "recovery_attempted": self.recovery_attempted,
            "recovery_successful": self.recovery_successful,
            "timestamp": self.timestamp.isoformat(),
            "traceback": self.traceback if self.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL] else None
        }


class ErrorTracker:
    """
    Comprehensive error tracking and analysis system
    Monitors error patterns, frequencies, and trends
    """

    def __init__(self):
        self.lock = threading.RLock()

        # Error storage (keep last 10k errors)
        self.error_events = deque(maxlen=10000)

        # Error frequency tracking
        self.error_frequency = defaultdict(lambda: deque(maxlen=100))  # Error type -> timestamps
        self.endpoint_errors = defaultdict(lambda: deque(maxlen=100))  # Endpoint -> error events
        self.user_errors = defaultdict(lambda: deque(maxlen=50))       # User -> error events

        # Error pattern detection
        self.error_patterns = defaultdict(int)  # Pattern -> count
        self.cascade_errors = []  # Errors that might be related

        # Recovery statistics
        self.recovery_stats = defaultdict(lambda: {"attempted": 0, "successful": 0})

        # Start background analysis
        self._start_analysis_tasks()

    def track_error(self, error_event: ErrorEvent):
        """Track an error event"""
        with self.lock:
            # Store the error
            self.error_events.append(error_event)

            # Update frequency tracking
            self.error_frequency[error_event.error_type].append(error_event.timestamp)

            if error_event.endpoint:
                self.endpoint_errors[error_event.endpoint].append(error_event)

            if error_event.user_id:
                self.user_errors[error_event.user_id].append(error_event)

            # Update pattern tracking
            pattern_key = f"{error_event.category}:{error_event.error_type}"
            self.error_patterns[pattern_key] += 1

            # Update recovery stats
            if error_event.recovery_attempted:
                self.recovery_stats[error_event.error_type]["attempted"] += 1
                if error_event.recovery_successful:
                    self.recovery_stats[error_event.error_type]["successful"] += 1

            # Detect error cascades
            self._detect_error_cascade(error_event)

        # Log the error
        log_level = self._get_log_level(error_event.severity)
        getattr(logger, log_level)(
            "Error tracked",
            error_id=error_event.error_id,
            error_type=error_event.error_type,
            category=error_event.category,
            severity=error_event.severity,
            endpoint=error_event.endpoint,
            message=error_event.error_message[:200]  # Truncate long messages
        )

    def _detect_error_cascade(self, error_event: ErrorEvent):
        """Detect potential error cascades"""
        # Check for multiple errors in short time window
        recent_cutoff = error_event.timestamp - timedelta(minutes=5)
        recent_errors = [
            e for e in self.error_events
            if e.timestamp >= recent_cutoff and e.endpoint == error_event.endpoint
        ]

        if len(recent_errors) >= 5:  # 5+ errors in 5 minutes on same endpoint
            self.cascade_errors.append({
                "timestamp": error_event.timestamp.isoformat(),
                "endpoint": error_event.endpoint,
                "error_count": len(recent_errors),
                "error_types": list(set(e.error_type for e in recent_errors))
            })

            logger.warning(
                "Potential error cascade detected",
                endpoint=error_event.endpoint,
                error_count=len(recent_errors),
                time_window_minutes=5
            )

    def get_error_statistics(self) -> dict[str, Any]:
        """Get comprehensive error statistics"""
        with self.lock:
            now = datetime.now(UTC)

            # Time-based statistics
            last_24h = [e for e in self.error_events if e.timestamp > now - timedelta(hours=24)]
            last_1h = [e for e in self.error_events if e.timestamp > now - timedelta(hours=1)]

            # Category breakdown
            category_counts = defaultdict(int)
            severity_counts = defaultdict(int)
            error_type_counts = defaultdict(int)

            for event in last_24h:
                category_counts[event.category] += 1
                severity_counts[event.severity] += 1
                error_type_counts[event.error_type] += 1

            # Top error endpoints
            endpoint_error_counts = defaultdict(int)
            for endpoint, errors in self.endpoint_errors.items():
                recent_errors = [e for e in errors if e.timestamp > now - timedelta(hours=24)]
                endpoint_error_counts[endpoint] = len(recent_errors)

            top_error_endpoints = sorted(
                endpoint_error_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]

            # Recovery success rates
            recovery_rates = {}
            for error_type, stats in self.recovery_stats.items():
                if stats["attempted"] > 0:
                    success_rate = stats["successful"] / stats["attempted"]
                    recovery_rates[error_type] = {
                        "success_rate": success_rate,
                        "attempted": stats["attempted"],
                        "successful": stats["successful"]
                    }

            return {
                "timestamp": now.isoformat(),
                "total_errors": len(self.error_events),
                "errors_last_24h": len(last_24h),
                "errors_last_1h": len(last_1h),
                "category_breakdown_24h": dict(category_counts),
                "severity_breakdown_24h": dict(severity_counts),
                "top_error_types_24h": dict(sorted(error_type_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
                "top_error_endpoints": top_error_endpoints,
                "recovery_success_rates": recovery_rates,
                "error_cascades_detected": len(self.cascade_errors),
                "recent_cascades": self.cascade_errors[-5:],  # Last 5 cascades
                "monitoring_health": "active"
            }

    def get_endpoint_error_analysis(self, endpoint: str) -> dict[str, Any]:
        """Get detailed error analysis for a specific endpoint"""
        with self.lock:
            endpoint_events = list(self.endpoint_errors[endpoint])

            if not endpoint_events:
                return {"endpoint": endpoint, "no_errors": True}

            # Recent errors (last 24h)
            now = datetime.now(UTC)
            recent_errors = [
                e for e in endpoint_events
                if e.timestamp > now - timedelta(hours=24)
            ]

            # Error type breakdown
            error_types = defaultdict(int)
            severities = defaultdict(int)

            for event in recent_errors:
                error_types[event.error_type] += 1
                severities[event.severity] += 1

            # Average time between errors
            if len(endpoint_events) > 1:
                time_diffs = []
                for i in range(1, len(endpoint_events)):
                    diff = (endpoint_events[i].timestamp - endpoint_events[i-1].timestamp).total_seconds()
                    time_diffs.append(diff)
                avg_time_between_errors = sum(time_diffs) / len(time_diffs) if time_diffs else 0
            else:
                avg_time_between_errors = 0

            return {
                "endpoint": endpoint,
                "total_errors": len(endpoint_events),
                "errors_last_24h": len(recent_errors),
                "error_types": dict(error_types),
                "severity_breakdown": dict(severities),
                "avg_time_between_errors_seconds": avg_time_between_errors,
                "first_error": endpoint_events[0].timestamp.isoformat() if endpoint_events else None,
                "last_error": endpoint_events[-1].timestamp.isoformat() if endpoint_events else None,
                "most_recent_errors": [e.to_dict() for e in recent_errors[-5:]]  # Last 5 errors
            }

    def _get_log_level(self, severity: str) -> str:
        """Convert severity to log level"""
        severity_map = {
            ErrorSeverity.LOW: "info",
            ErrorSeverity.MEDIUM: "warning",
            ErrorSeverity.HIGH: "error",
            ErrorSeverity.CRITICAL: "error"
        }
        return severity_map.get(severity, "warning")

    def _start_analysis_tasks(self):
        """Start background analysis tasks"""
        def cleanup_old_errors():
            while True:
                try:
                    with self.lock:
                        now = datetime.now(UTC)
                        cutoff = now - timedelta(hours=72)  # Keep 72 hours

                        # Clean up old data
                        for error_type, timestamps in list(self.error_frequency.items()):
                            while timestamps and timestamps[0] < cutoff:
                                timestamps.popleft()
                            if not timestamps:
                                del self.error_frequency[error_type]

                        for endpoint, events in list(self.endpoint_errors.items()):
                            while events and events[0].timestamp < cutoff:
                                events.popleft()
                            if not events:
                                del self.endpoint_errors[endpoint]

                        for user_id, events in list(self.user_errors.items()):
                            while events and events[0].timestamp < cutoff:
                                events.popleft()
                            if not events:
                                del self.user_errors[user_id]

                        # Clean up old cascades
                        self.cascade_errors = [
                            cascade for cascade in self.cascade_errors
                            if cascade["timestamp"] > cutoff
                        ]

                    time.sleep(3600)  # Cleanup every hour

                except Exception as e:
                    logger.error("Error tracker cleanup failed", error=str(e))
                    time.sleep(3600)

        cleanup_thread = threading.Thread(target=cleanup_old_errors, daemon=True)
        cleanup_thread.start()


class ErrorRecoveryManager:
    """
    Automatic error recovery and retry system
    Implements intelligent recovery strategies for different error types
    """

    def __init__(self):
        self.recovery_strategies = {}
        self.recovery_stats = defaultdict(lambda: {"attempts": 0, "successes": 0})

        # Register default recovery strategies
        self._register_default_strategies()

    def _register_default_strategies(self):
        """Register default recovery strategies"""

        # Database connection recovery
        self.register_recovery_strategy(
            OperationalError,
            self._recover_database_connection,
            max_retries=3,
            backoff_multiplier=2
        )

        # External service recovery
        self.register_recovery_strategy(
            ConnectionError,
            self._recover_external_service,
            max_retries=2,
            backoff_multiplier=1.5
        )

        # Validation error recovery
        self.register_recovery_strategy(
            ValidationError,
            self._recover_validation_error,
            max_retries=1,
            backoff_multiplier=1
        )

    def register_recovery_strategy(
        self,
        error_type: type[Exception],
        recovery_func: Callable,
        max_retries: int = 3,
        backoff_multiplier: float = 2.0
    ):
        """Register a recovery strategy for an error type"""
        self.recovery_strategies[error_type] = {
            "func": recovery_func,
            "max_retries": max_retries,
            "backoff_multiplier": backoff_multiplier
        }

    async def attempt_recovery(
        self,
        error: Exception,
        operation_func: Callable,
        *args,
        **kwargs
    ) -> tuple[bool, Any]:
        """
        Attempt to recover from an error and retry the operation
        
        Returns:
            Tuple of (recovery_successful, result)
        """
        error_type = type(error)

        if error_type not in self.recovery_strategies:
            return False, None

        strategy = self.recovery_strategies[error_type]
        recovery_func = strategy["func"]
        max_retries = strategy["max_retries"]
        backoff_multiplier = strategy["backoff_multiplier"]

        self.recovery_stats[error_type.__name__]["attempts"] += 1

        for attempt in range(max_retries):
            try:
                # Attempt recovery
                recovery_successful = await recovery_func(error, attempt)

                if recovery_successful:
                    # Retry the operation
                    if asyncio.iscoroutinefunction(operation_func):
                        result = await operation_func(*args, **kwargs)
                    else:
                        result = operation_func(*args, **kwargs)

                    self.recovery_stats[error_type.__name__]["successes"] += 1

                    logger.info(
                        "Error recovery successful",
                        error_type=error_type.__name__,
                        attempt=attempt + 1,
                        max_retries=max_retries
                    )

                    return True, result

            except Exception as retry_error:
                logger.warning(
                    "Recovery attempt failed",
                    error_type=error_type.__name__,
                    attempt=attempt + 1,
                    retry_error=str(retry_error)
                )

            # Wait before next retry (exponential backoff)
            if attempt < max_retries - 1:
                wait_time = (backoff_multiplier ** attempt)
                await asyncio.sleep(wait_time)

        logger.error(
            "Error recovery failed after all attempts",
            error_type=error_type.__name__,
            max_retries=max_retries
        )

        return False, None

    async def _recover_database_connection(self, error: Exception, attempt: int) -> bool:
        """Attempt to recover from database connection errors"""
        try:
            # Import here to avoid circular imports
            from app.database.connection import init_database, test_connection

            logger.info(f"Attempting database recovery (attempt {attempt + 1})")

            # Test current connection
            if await test_connection():
                return True

            # Reinitialize database connection
            await init_database()

            # Test again
            return await test_connection()

        except Exception as e:
            logger.error("Database recovery failed", error=str(e))
            return False

    async def _recover_external_service(self, error: Exception, attempt: int) -> bool:
        """Attempt to recover from external service errors"""
        try:
            logger.info(f"Attempting external service recovery (attempt {attempt + 1})")

            # Wait a bit for service to recover
            await asyncio.sleep(1.0 * (attempt + 1))

            # For now, just return True to retry
            # In a real implementation, you might check service health
            return True

        except Exception as e:
            logger.error("External service recovery failed", error=str(e))
            return False

    async def _recover_validation_error(self, error: Exception, attempt: int) -> bool:
        """Attempt to recover from validation errors"""
        # Validation errors typically can't be automatically recovered
        # This is mostly for logging purposes
        logger.info("Validation error detected - no automatic recovery possible")
        return False


def error_handler(
    category: str = ErrorCategory.UNKNOWN,
    severity: str = ErrorSeverity.MEDIUM,
    recovery_enabled: bool = True
):
    """
    Decorator for comprehensive error handling and recovery
    
    Args:
        category: Error category for classification
        severity: Error severity level
        recovery_enabled: Whether to attempt automatic recovery
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                return result

            except Exception as e:
                execution_time = time.time() - start_time

                # Create error event
                error_event = ErrorEvent(
                    error=e,
                    category=category,
                    severity=severity,
                    endpoint=_get_endpoint_from_context(),
                    user_id=_get_user_id_from_context(args, kwargs),
                    context={
                        "function": func.__name__,
                        "execution_time": execution_time,
                        "args_count": len(args),
                        "kwargs_keys": list(kwargs.keys())
                    }
                )

                # Track the error
                error_tracker.track_error(error_event)

                # Attempt recovery if enabled
                if recovery_enabled:
                    error_event.recovery_attempted = True
                    recovery_successful, recovered_result = await error_recovery_manager.attempt_recovery(
                        e, func, *args, **kwargs
                    )

                    if recovery_successful:
                        error_event.recovery_successful = True
                        # Update the tracked error with recovery success
                        error_tracker.track_error(error_event)
                        return recovered_result

                # Re-raise the error if recovery failed or wasn't attempted
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                return result

            except Exception as e:
                execution_time = time.time() - start_time

                # Create error event
                error_event = ErrorEvent(
                    error=e,
                    category=category,
                    severity=severity,
                    endpoint=_get_endpoint_from_context(),
                    user_id=_get_user_id_from_context(args, kwargs),
                    context={
                        "function": func.__name__,
                        "execution_time": execution_time,
                        "args_count": len(args),
                        "kwargs_keys": list(kwargs.keys())
                    }
                )

                # Track the error
                error_tracker.track_error(error_event)

                # Re-raise the error (sync functions don't support recovery)
                raise

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def _get_endpoint_from_context() -> str | None:
    """Try to extract endpoint from call stack context"""
    try:
        for frame_info in inspect.stack():
            filename = frame_info.filename
            if "/api/v1/" in filename:
                # Extract endpoint name from file path
                parts = filename.split("/api/v1/")
                if len(parts) > 1:
                    endpoint_file = parts[1].replace(".py", "")
                    return f"/api/v1/{endpoint_file}"
        return None
    except:
        return None


def _get_user_id_from_context(args: tuple, kwargs: dict) -> str | None:
    """Try to extract user ID from function arguments"""
    try:
        # Look for common user ID parameter names
        user_keys = ["user_id", "current_user", "user"]

        for key in user_keys:
            if key in kwargs:
                user_data = kwargs[key]
                if isinstance(user_data, dict):
                    return user_data.get("sub") or user_data.get("id") or user_data.get("user_id")
                elif hasattr(user_data, "user_id"):
                    return user_data.user_id
                elif isinstance(user_data, str):
                    return user_data

        return None
    except:
        return None


# Global instances
error_tracker = ErrorTracker()
error_recovery_manager = ErrorRecoveryManager()


def get_error_tracker() -> ErrorTracker:
    """Get the global error tracker instance"""
    return error_tracker


def get_error_recovery_manager() -> ErrorRecoveryManager:
    """Get the global error recovery manager instance"""
    return error_recovery_manager
