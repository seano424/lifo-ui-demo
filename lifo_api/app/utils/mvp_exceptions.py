"""
MVP-specific error handling and mobile-friendly exceptions
Custom exceptions and error responses optimized for mobile consumption
"""

import traceback
from datetime import datetime, timedelta
from typing import Any, Optional

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from app.models.scan_models import MobileOptimizedError

logger = structlog.get_logger()


# Custom MVP exceptions
class MVPBaseException(Exception):
    """Base exception for MVP-specific errors"""

    def __init__(
        self,
        message: str,
        error_code: str = "MVP_ERROR",
        status_code: int = 400,
        user_message: str = None,
        retry_allowed: bool = True,
        retry_after_seconds: Optional[int] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.user_message = user_message or message
        self.retry_allowed = retry_allowed
        self.retry_after_seconds = retry_after_seconds
        super().__init__(self.message)


class ScanWorkflowException(MVPBaseException):
    """Exception for scan workflow specific errors"""

    def __init__(
        self,
        message: str,
        workflow: str,
        error_code: str = "SCAN_ERROR",
        status_code: int = 400,
        user_message: str = None,
    ):
        self.workflow = workflow
        user_msg = user_message or f"Scan workflow error: {message}"
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status_code,
            user_message=user_msg,
            retry_allowed=True,
        )


class MobilePerformanceException(MVPBaseException):
    """Exception for mobile performance related errors"""

    def __init__(self, message: str, processing_time_ms: float):
        self.processing_time_ms = processing_time_ms
        super().__init__(
            message=f"Performance issue: {message} (took {processing_time_ms:.1f}ms)",
            error_code="PERFORMANCE_ERROR",
            status_code=503,
            user_message="Service temporarily slow, please try again",
            retry_allowed=True,
            retry_after_seconds=5,
        )


class ValidationException(MVPBaseException):
    """Exception for data validation errors"""

    def __init__(
        self, message: str, field: str = None, validation_errors: list[str] = None
    ):
        self.field = field
        self.validation_errors = validation_errors or []

        user_message = "Please check your input and try again"
        if field:
            user_message = f"Invalid {field}: {message}"

        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            user_message=user_message,
            retry_allowed=True,
        )


class SecurityException(MVPBaseException):
    """Exception for security-related errors"""

    def __init__(self, message: str, security_type: str = "general"):
        self.security_type = security_type
        super().__init__(
            message=f"Security issue: {message}",
            error_code="SECURITY_ERROR",
            status_code=403,
            user_message="Access denied",
            retry_allowed=False,
        )


class AuthenticationException(MVPBaseException):
    """Exception for authentication errors"""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            user_message="Please sign in to continue",
            retry_allowed=False,
        )


class AuthorizationException(MVPBaseException):
    """Exception for authorization errors"""

    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            user_message="You don't have permission to access this resource",
            retry_allowed=False,
        )


class RateLimitException(MVPBaseException):
    """Exception for rate limiting"""

    def __init__(self, message: str, retry_after: int = 60):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            user_message="Too many requests, please wait and try again",
            retry_allowed=True,
            retry_after_seconds=retry_after,
        )


class DatabaseException(MVPBaseException):
    """Exception for database-related errors"""

    def __init__(self, message: str, operation: str = "database"):
        self.operation = operation
        super().__init__(
            message=f"Database error during {operation}: {message}",
            error_code="DATABASE_ERROR",
            status_code=500,
            user_message="Service temporarily unavailable, please try again",
            retry_allowed=True,
            retry_after_seconds=10,
        )


class ScoringException(MVPBaseException):
    """Exception for AI scoring related errors"""

    def __init__(self, message: str, batch_id: str = None):
        self.batch_id = batch_id
        super().__init__(
            message=f"Scoring error: {message}",
            error_code="SCORING_ERROR",
            status_code=500,
            user_message="Unable to calculate scores, please try again",
            retry_allowed=True,
            retry_after_seconds=5,
        )


class CSVProcessingException(MVPBaseException):
    """Exception for CSV processing errors"""

    def __init__(self, message: str, row_number: int = None, field: str = None):
        self.row_number = row_number
        self.field = field

        user_message = f"CSV processing error: {message}"
        if row_number:
            user_message += f" (row {row_number})"
        if field:
            user_message += f" (field: {field})"

        super().__init__(
            message=message,
            error_code="CSV_PROCESSING_ERROR",
            status_code=400,
            user_message=user_message,
            retry_allowed=True,
        )


# Error response formatters
def create_mobile_error_response(
    exception: MVPBaseException, request: Request = None, include_debug: bool = False
) -> MobileOptimizedError:
    """Create mobile-optimized error response"""

    # Log the error for monitoring
    logger.error(
        "MVP exception occurred",
        error_code=exception.error_code,
        message=exception.message,
        status_code=exception.status_code,
        user_message=exception.user_message,
        retry_allowed=exception.retry_allowed,
        path=str(request.url) if request else None,
    )

    error_response = MobileOptimizedError(
        success=False,
        error_code=exception.error_code,
        message=exception.message,
        user_message=exception.user_message,
        retry_allowed=exception.retry_allowed,
        retry_after_seconds=exception.retry_after_seconds,
        timestamp=datetime.utcnow().isoformat(),
    )

    # Add debug information in development
    if include_debug and hasattr(exception, "__traceback__"):
        error_response.debug_info = {
            "traceback": traceback.format_exc(),
            "exception_type": type(exception).__name__,
        }

    return error_response


def create_standard_error_response(
    status_code: int,
    message: str,
    error_code: str = "UNKNOWN_ERROR",
    user_message: str = None,
) -> dict[str, Any]:
    """Create standard error response for non-MVP exceptions"""

    return {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "user_message": user_message or message,
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code,
        },
    }


# Exception handlers
async def mvp_exception_handler(request: Request, exc: MVPBaseException):
    """Handle MVP-specific exceptions"""
    mobile_error = create_mobile_error_response(exc, request)

    return JSONResponse(
        status_code=exc.status_code,
        content=mobile_error.dict(),
        headers={
            "X-Error-Code": exc.error_code,
            "X-Retry-Allowed": str(exc.retry_allowed).lower(),
            **(
                {"Retry-After": str(exc.retry_after_seconds)}
                if exc.retry_after_seconds
                else {}
            ),
        },
    )


async def validation_exception_handler(request: Request, exc: ValidationException):
    """Handle validation exceptions with detailed field information"""
    response_data = create_mobile_error_response(exc, request).dict()

    # Add validation-specific details
    response_data["validation_details"] = {
        "field": exc.field,
        "errors": exc.validation_errors,
    }

    return JSONResponse(
        status_code=exc.status_code,
        content=response_data,
        headers={"X-Error-Code": exc.error_code},
    )


async def performance_exception_handler(
    request: Request, exc: MobilePerformanceException
):
    """Handle performance exceptions with timing information"""
    response_data = create_mobile_error_response(exc, request).dict()

    # Add performance-specific details
    response_data["performance_info"] = {
        "processing_time_ms": exc.processing_time_ms,
        "threshold_exceeded": True,
        "suggested_retry_delay": exc.retry_after_seconds,
    }

    return JSONResponse(
        status_code=exc.status_code,
        content=response_data,
        headers={
            "X-Error-Code": exc.error_code,
            "X-Processing-Time": str(exc.processing_time_ms),
            "Retry-After": str(exc.retry_after_seconds),
        },
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions not caught by specific handlers"""

    # Log unexpected errors
    logger.error(
        "Unexpected exception occurred",
        exception_type=type(exc).__name__,
        message=str(exc),
        path=str(request.url),
        traceback=traceback.format_exc(),
    )

    # Create generic mobile-friendly error
    error_response = create_standard_error_response(
        status_code=500,
        message="An unexpected error occurred",
        error_code="INTERNAL_ERROR",
        user_message="Something went wrong, please try again",
    )

    return JSONResponse(
        status_code=500,
        content=error_response,
        headers={"X-Error-Code": "INTERNAL_ERROR"},
    )


# Error tracking and monitoring
class ErrorTracker:
    """Track and monitor errors for MVP analytics"""

    def __init__(self):
        self.error_counts = {}
        self.error_history = []
        self.max_history = 1000

    def record_error(self, error_code: str, endpoint: str, user_id: str = None):
        """Record an error occurrence"""
        key = f"{error_code}:{endpoint}"
        self.error_counts[key] = self.error_counts.get(key, 0) + 1

        self.error_history.append(
            {
                "error_code": error_code,
                "endpoint": endpoint,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Keep history manageable
        if len(self.error_history) > self.max_history:
            self.error_history = self.error_history[-self.max_history :]

    def get_error_summary(self, hours: int = 24) -> dict[str, Any]:
        """Get error summary for the last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_errors = [e for e in self.error_history if e["timestamp"] > cutoff]

        # Count by error code
        error_counts = {}
        endpoint_errors = {}

        for error in recent_errors:
            error_code = error["error_code"]
            endpoint = error["endpoint"]

            error_counts[error_code] = error_counts.get(error_code, 0) + 1
            endpoint_errors[endpoint] = endpoint_errors.get(endpoint, 0) + 1

        return {
            "total_errors": len(recent_errors),
            "error_by_code": error_counts,
            "error_by_endpoint": endpoint_errors,
            "error_rate": len(recent_errors) / max(hours, 1),  # errors per hour
            "most_common_error": max(error_counts.items(), key=lambda x: x[1])[0]
            if error_counts
            else None,
        }


# Global error tracker
error_tracker = ErrorTracker()


# Middleware for error tracking
async def error_tracking_middleware(request: Request, call_next):
    """Middleware to track errors"""
    try:
        response = await call_next(request)
        return response
    except MVPBaseException as e:
        error_tracker.record_error(e.error_code, str(request.url.path))
        raise
    except Exception:
        error_tracker.record_error("UNEXPECTED_ERROR", str(request.url.path))
        raise


# Helper functions for common error scenarios
def raise_if_not_found(item: Any, item_type: str, identifier: str):
    """Raise exception if item not found"""
    if item is None:
        raise ValidationException(
            message=f"{item_type} not found",
            field="id",
            validation_errors=[
                f"{item_type} with identifier '{identifier}' does not exist"
            ],
        )


def raise_if_invalid_uuid(uuid_string: str, field_name: str = "id"):
    """Raise exception if UUID format is invalid"""
    try:
        import uuid

        uuid.UUID(uuid_string)
    except (ValueError, TypeError):
        raise ValidationException(
            message="Invalid UUID format",
            field=field_name,
            validation_errors=[f"'{uuid_string}' is not a valid UUID"],
        )


def raise_if_expired_batch(days_to_expiry: int, batch_id: str):
    """Raise exception if trying to scan expired batch"""
    if days_to_expiry < -7:  # More than a week expired
        raise ScanWorkflowException(
            message=f"Batch expired {abs(days_to_expiry)} days ago",
            workflow="scan_validation",
            error_code="BATCH_EXPIRED",
            user_message="This item expired too long ago and cannot be processed",
        )


def raise_if_insufficient_quantity(requested: float, available: float, batch_id: str):
    """Raise exception if insufficient quantity for scan-out"""
    if requested > available:
        raise ScanWorkflowException(
            message=f"Cannot move {requested} items - only {available} available",
            workflow="scan_out",
            error_code="INSUFFICIENT_QUANTITY",
            user_message=f"Only {available} items available (requested: {requested})",
        )


def validate_mobile_performance(processing_time_ms: float, operation: str):
    """Validate mobile performance requirements"""
    mobile_threshold = 500  # 0.5 seconds

    if processing_time_ms > mobile_threshold:
        raise MobilePerformanceException(
            message=f"{operation} exceeded mobile performance threshold",
            processing_time_ms=processing_time_ms,
        )
