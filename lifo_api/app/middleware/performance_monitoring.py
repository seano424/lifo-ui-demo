"""
FastAPI middleware for comprehensive performance monitoring
Real-time request/response tracking with mobile optimization focus
"""

import asyncio
import time
from collections.abc import Callable
from urllib.parse import unquote

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.monitoring.metrics import get_metrics_collector

logger = structlog.get_logger()


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive performance monitoring middleware
    Tracks API performance with special focus on mobile targets
    """

    def __init__(self, app, enable_detailed_logging: bool = True):
        super().__init__(app)
        self.metrics_collector = get_metrics_collector()
        self.enable_detailed_logging = enable_detailed_logging

        # Mobile endpoints that have strict performance requirements
        self.mobile_endpoints = {
            "/api/v1/mobile-summary/": 300,  # 300ms target
            "/api/v1/batch-quick-score/": 200,  # 200ms target for real-time scanning
            "/api/v1/store-health/": 300,  # 300ms target
            "/api/v1/batch-list-mobile/": 300,  # 300ms target
            "/api/v1/mobile-performance-health": 500,  # 500ms target for health checks
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with comprehensive performance monitoring"""
        start_time = time.time()
        request_id = getattr(request.state, "request_id", "unknown")

        # Extract request details
        method = request.method
        path = unquote(request.url.path)
        client_ip = self._get_client_ip(request)
        request.headers.get("user-agent", "unknown")

        # Identify mobile requests
        is_mobile_request = self._is_mobile_request(request)
        is_mobile_endpoint = any(
            mobile_path in path for mobile_path in self.mobile_endpoints.keys()
        )

        # Get user context if available
        user_id = None
        store_id = None
        try:
            if hasattr(request.state, "current_user"):
                user_id = request.state.current_user.get("sub")

            # Extract store_id from path parameters
            path_parts = path.split("/")
            for i, part in enumerate(path_parts):
                if part in [
                    "store-health",
                    "mobile-summary",
                    "batch-list-mobile",
                ] and i + 1 < len(path_parts):
                    store_id = path_parts[i + 1]
                    break
        except Exception:
            # User context extraction failed, metrics will use generic identifiers
            logger.debug("Failed to extract user context from request path")

        # Initialize response variables
        response = None
        status_code = 500
        response_size = 0
        error_details = None

        try:
            # Process request
            response = await call_next(request)
            status_code = response.status_code

            # Calculate response size if possible
            if hasattr(response, "body"):
                response_size = len(response.body) if response.body else 0

        except Exception as e:
            # Handle request processing errors
            error_details = str(e)
            logger.error(
                "Request processing error",
                request_id=request_id,
                method=method,
                path=path,
                error=error_details,
            )
            raise

        finally:
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000

            # Record metrics
            self.metrics_collector.record_api_request(
                endpoint=path,
                method=method,
                status_code=status_code,
                response_time_ms=processing_time_ms,
                user_id=user_id,
                store_id=store_id,
            )

            # Check mobile performance targets
            performance_status = self._check_performance_targets(
                path, processing_time_ms, is_mobile_endpoint
            )

            # Log request details
            log_level = (
                "warning" if processing_time_ms > 1000 or status_code >= 400 else "info"
            )

            log_data = {
                "request_id": request_id,
                "method": method,
                "path": path,
                "status_code": status_code,
                "processing_time_ms": round(processing_time_ms, 2),
                "client_ip": client_ip,
                "user_id": user_id,
                "store_id": store_id,
                "is_mobile_request": is_mobile_request,
                "is_mobile_endpoint": is_mobile_endpoint,
                "response_size_bytes": response_size,
                "performance_status": performance_status,
            }

            if error_details:
                log_data["error"] = error_details

            if self.enable_detailed_logging:
                if log_level == "warning":
                    logger.warning("Request completed with issues", **log_data)
                else:
                    logger.info("Request completed", **log_data)

            # Add performance headers to response
            if response:
                response.headers["X-Response-Time-Ms"] = str(
                    round(processing_time_ms, 2)
                )
                response.headers["X-Performance-Status"] = performance_status
                if is_mobile_endpoint:
                    response.headers["X-Mobile-Optimized"] = "true"

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers"""
        # Check for forwarded IP headers (load balancer, proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        return getattr(request.client, "host", "unknown")

    def _is_mobile_request(self, request: Request) -> bool:
        """Determine if request is from mobile client"""
        user_agent = request.headers.get("user-agent", "").lower()

        mobile_indicators = [
            "mobile",
            "android",
            "iphone",
            "ipad",
            "ipod",
            "blackberry",
            "webos",
            "opera mini",
            "samsung",
        ]

        return any(indicator in user_agent for indicator in mobile_indicators)

    def _check_performance_targets(
        self, path: str, processing_time_ms: float, is_mobile_endpoint: bool
    ) -> str:
        """Check if request meets performance targets"""

        if is_mobile_endpoint:
            # Check specific mobile endpoint targets
            for endpoint_pattern, target_ms in self.mobile_endpoints.items():
                if endpoint_pattern in path:
                    if processing_time_ms <= target_ms:
                        return "optimal"
                    elif processing_time_ms <= target_ms * 1.5:
                        return "acceptable"
                    else:
                        return "degraded"

            # Default mobile target
            if processing_time_ms <= 300:
                return "optimal"
            elif processing_time_ms <= 500:
                return "acceptable"
            else:
                return "degraded"

        else:
            # General API performance targets
            if processing_time_ms <= 500:
                return "optimal"
            elif processing_time_ms <= 1000:
                return "acceptable"
            else:
                return "degraded"


class DatabasePerformanceMiddleware:
    """
    Database performance monitoring middleware
    Can be used as a decorator or context manager
    """

    def __init__(self):
        self.metrics_collector = get_metrics_collector()

    def __call__(self, query_name: str):
        """Decorator for database query performance monitoring"""

        def decorator(func):
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                result = None
                error = None
                result_count = 0

                try:
                    result = await func(*args, **kwargs)

                    # Estimate result count
                    if hasattr(result, "__len__"):
                        result_count = len(result)
                    elif hasattr(result, "rowcount"):
                        result_count = result.rowcount

                    return result

                except Exception as e:
                    success = False
                    error = str(e)
                    raise

                finally:
                    execution_time_ms = (time.time() - start_time) * 1000

                    self.metrics_collector.record_database_query(
                        query_name=query_name,
                        execution_time_ms=execution_time_ms,
                        result_count=result_count,
                        success=success,
                        error=error,
                    )

            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                result = None
                error = None
                result_count = 0

                try:
                    result = func(*args, **kwargs)

                    # Estimate result count
                    if hasattr(result, "__len__"):
                        result_count = len(result)

                    return result

                except Exception as e:
                    success = False
                    error = str(e)
                    raise

                finally:
                    execution_time_ms = (time.time() - start_time) * 1000

                    self.metrics_collector.record_database_query(
                        query_name=query_name,
                        execution_time_ms=execution_time_ms,
                        result_count=result_count,
                        success=success,
                        error=error,
                    )

            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

        return decorator


class CachePerformanceMiddleware:
    """
    Cache performance monitoring middleware
    Can be used as a decorator or context manager
    """

    def __init__(self):
        self.metrics_collector = get_metrics_collector()

    def record_operation(self, operation: str, cache_name: str, key: str | None = None):
        """Record cache operation"""
        start_time = time.time()

        def record_completion():
            execution_time_ms = (time.time() - start_time) * 1000
            self.metrics_collector.record_cache_operation(
                operation=operation,
                cache_name=cache_name,
                key=key,
                execution_time_ms=execution_time_ms,
            )

        return record_completion


# Global middleware instances
db_perf_monitor = DatabasePerformanceMiddleware()
cache_perf_monitor = CachePerformanceMiddleware()


# Decorator shortcuts
def monitor_db_query(query_name: str):
    """Decorator for monitoring database query performance"""
    return db_perf_monitor(query_name)


def monitor_cache_operation(operation: str, cache_name: str, key: str | None = None):
    """Context manager for monitoring cache operations"""
    return cache_perf_monitor.record_operation(operation, cache_name, key)
