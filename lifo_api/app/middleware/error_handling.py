"""
Production-ready error handling middleware
Comprehensive error processing, logging, and user-friendly responses
"""

import time
from collections.abc import Callable

import structlog
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.utils.error_handling import (
    ErrorCategory,
    ErrorEvent,
    ErrorSeverity,
    get_error_tracker,
)

logger = structlog.get_logger()


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive error handling middleware
    Captures, processes, and responds to all application errors
    """

    def __init__(self, app):
        super().__init__(app)
        self.error_tracker = get_error_tracker()

        # Error response templates
        self.error_templates = {
            "database": {
                "message": "A database operation failed. Please try again later.",
                "code": "DATABASE_ERROR",
                "status_code": 503,
            },
            "validation": {
                "message": "The request data is invalid. Please check your input and try again.",
                "code": "VALIDATION_ERROR",
                "status_code": 400,
            },
            "authentication": {
                "message": "Authentication failed. Please check your credentials.",
                "code": "AUTHENTICATION_ERROR",
                "status_code": 401,
            },
            "authorization": {
                "message": "You don't have permission to access this resource.",
                "code": "AUTHORIZATION_ERROR",
                "status_code": 403,
            },
            "external_service": {
                "message": "An external service is temporarily unavailable. Please try again later.",
                "code": "EXTERNAL_SERVICE_ERROR",
                "status_code": 503,
            },
            "business_logic": {
                "message": "The requested operation cannot be completed due to business rules.",
                "code": "BUSINESS_ERROR",
                "status_code": 422,
            },
            "system": {
                "message": "A system error occurred. Please try again later.",
                "code": "SYSTEM_ERROR",
                "status_code": 500,
            },
            "performance": {
                "message": "The request took too long to process. Please try again.",
                "code": "TIMEOUT_ERROR",
                "status_code": 408,
            },
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main error handling pipeline"""
        start_time = time.time()

        try:
            # Process the request
            response = await call_next(request)

            # Check for error status codes
            if response.status_code >= 400:
                await self._handle_error_response(request, response, start_time)

            return response

        except HTTPException as http_error:
            # Handle FastAPI HTTP exceptions
            return await self._handle_http_exception(request, http_error, start_time)

        except Exception as error:
            # Handle all other exceptions
            return await self._handle_general_exception(request, error, start_time)

    async def _handle_http_exception(
        self, request: Request, http_error: HTTPException, start_time: float
    ) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""

        # Categorize the error
        category, severity = self._categorize_http_error(http_error)

        # Create error event
        error_event = ErrorEvent(
            error=http_error,
            category=category,
            severity=severity,
            endpoint=request.url.path,
            client_ip=self._get_client_ip(request),
            context={
                "status_code": http_error.status_code,
                "processing_time": (time.time() - start_time) * 1000,
            },
        )

        # Track the error
        self.error_tracker.track_error(error_event)

        # Create user-friendly response
        response_data = self._create_error_response(
            http_error, category, error_event.error_id, include_details=settings.debug
        )

        from fastapi.encoders import jsonable_encoder
        from fastapi.responses import JSONResponse

        class LocalCustomJSONResponse(JSONResponse):
            def render(self, content) -> bytes:
                encoded_content = jsonable_encoder(content)
                return super().render(encoded_content)

        return LocalCustomJSONResponse(
            status_code=http_error.status_code,
            content=response_data,
            headers=self._get_error_response_headers(error_event),
        )

    async def _handle_general_exception(
        self, request: Request, error: Exception, start_time: float
    ) -> JSONResponse:
        """Handle general Python exceptions"""

        # Categorize the error
        category, severity = self._categorize_exception(error)

        # Create error event
        error_event = ErrorEvent(
            error=error,
            category=category,
            severity=severity,
            endpoint=request.url.path,
            client_ip=self._get_client_ip(request),
            context={
                "processing_time": (time.time() - start_time) * 1000,
                "request_method": request.method,
                "request_size": request.headers.get("content-length", "unknown"),
            },
        )

        # Track the error
        self.error_tracker.track_error(error_event)

        # Get error template
        template = self.error_templates.get(category, self.error_templates["system"])

        # Create response
        response_data = {
            "error": True,
            "error_id": error_event.error_id,
            "code": template["code"],
            "message": template["message"],
            "timestamp": error_event.timestamp.isoformat(),
        }

        # Add debug information if in debug mode
        if settings.debug:
            response_data["debug"] = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "category": category,
                "severity": severity,
            }

        # Log the error with appropriate level
        log_level = self._get_log_level(severity)
        getattr(logger, log_level)(
            "Unhandled exception caught",
            error_id=error_event.error_id,
            error_type=type(error).__name__,
            category=category,
            severity=severity,
            endpoint=request.url.path,
            method=request.method,
            processing_time_ms=(time.time() - start_time) * 1000,
        )

        from fastapi.encoders import jsonable_encoder
        from fastapi.responses import JSONResponse

        class LocalCustomJSONResponse(JSONResponse):
            def render(self, content) -> bytes:
                encoded_content = jsonable_encoder(content)
                return super().render(encoded_content)

        return LocalCustomJSONResponse(
            status_code=template["status_code"],
            content=response_data,
            headers=self._get_error_response_headers(error_event),
        )

    async def _handle_error_response(
        self, request: Request, response: Response, start_time: float
    ):
        """Handle error status codes from successful request processing"""

        # Only track client errors (4xx) and server errors (5xx)
        if response.status_code < 400:
            return

        # Determine category and severity based on status code
        if response.status_code == 401:
            category = ErrorCategory.AUTHENTICATION
            severity = ErrorSeverity.MEDIUM
        elif response.status_code == 403:
            category = ErrorCategory.AUTHORIZATION
            severity = ErrorSeverity.MEDIUM
        elif response.status_code == 404:
            category = ErrorCategory.BUSINESS_LOGIC
            severity = ErrorSeverity.LOW
        elif response.status_code == 422:
            category = ErrorCategory.VALIDATION
            severity = ErrorSeverity.LOW
        elif response.status_code == 429:
            category = ErrorCategory.SECURITY
            severity = ErrorSeverity.MEDIUM
        elif 500 <= response.status_code < 600:
            category = ErrorCategory.SYSTEM
            severity = ErrorSeverity.HIGH
        else:
            category = ErrorCategory.UNKNOWN
            severity = ErrorSeverity.MEDIUM

        # Create a synthetic error for tracking
        synthetic_error = Exception(f"HTTP {response.status_code} response")

        error_event = ErrorEvent(
            error=synthetic_error,
            category=category,
            severity=severity,
            endpoint=request.url.path,
            client_ip=self._get_client_ip(request),
            context={
                "status_code": response.status_code,
                "processing_time": (time.time() - start_time) * 1000,
                "response_type": "error_status",
            },
        )

        # Track the error
        self.error_tracker.track_error(error_event)

        # Add error tracking headers to the response
        error_headers = self._get_error_response_headers(error_event)
        for header_name, header_value in error_headers.items():
            response.headers[header_name] = header_value

    def _categorize_http_error(self, error: HTTPException) -> tuple[str, str]:
        """Categorize HTTP exceptions"""
        status_code = error.status_code

        if status_code == 400:
            return ErrorCategory.VALIDATION, ErrorSeverity.LOW
        elif status_code == 401:
            return ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM
        elif status_code == 403:
            return ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM
        elif status_code == 404:
            return ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.LOW
        elif status_code == 408:
            return ErrorCategory.PERFORMANCE, ErrorSeverity.MEDIUM
        elif status_code == 422:
            return ErrorCategory.VALIDATION, ErrorSeverity.LOW
        elif status_code == 429:
            return ErrorCategory.SECURITY, ErrorSeverity.MEDIUM
        elif status_code >= 500:
            return ErrorCategory.SYSTEM, ErrorSeverity.HIGH
        else:
            return ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM

    def _categorize_exception(self, error: Exception) -> tuple[str, str]:
        """Categorize general exceptions"""
        error_type = type(error).__name__

        # Database errors
        if isinstance(error, (SQLAlchemyError, OperationalError)):
            return ErrorCategory.DATABASE, ErrorSeverity.HIGH
        elif isinstance(error, IntegrityError):
            return ErrorCategory.DATABASE, ErrorSeverity.MEDIUM

        # Validation errors
        elif isinstance(error, ValidationError):
            return ErrorCategory.VALIDATION, ErrorSeverity.LOW
        elif isinstance(error, (ValueError, TypeError)):
            return ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM

        # Network/external service errors
        elif isinstance(error, (ConnectionError, TimeoutError)):
            return ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.MEDIUM

        # Permission errors
        elif isinstance(error, PermissionError):
            return ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM

        # Memory and resource errors
        elif isinstance(error, MemoryError):
            return ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL
        elif isinstance(error, OSError):
            return ErrorCategory.SYSTEM, ErrorSeverity.HIGH

        # Default categorization
        else:
            return ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM

    def _create_error_response(
        self,
        error: Exception,
        category: str,
        error_id: str,
        include_details: bool = False,
    ) -> dict:
        """Create standardized error response"""

        template = self.error_templates.get(category, self.error_templates["system"])

        response_data = {
            "error": True,
            "error_id": error_id,
            "code": template["code"],
            "message": template["message"],
            "timestamp": time.time(),
        }

        if include_details:
            response_data["details"] = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "category": category,
            }

        return response_data

    def _get_error_response_headers(self, error_event: ErrorEvent) -> dict:
        """Get standard error response headers"""
        return {
            "X-Error-ID": error_event.error_id,
            "X-Error-Category": error_event.category,
            "X-Error-Timestamp": str(int(error_event.timestamp.timestamp())),
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        }

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return getattr(request.client, "host", "unknown")

    def _get_log_level(self, severity: str) -> str:
        """Convert severity to log level"""
        severity_map = {
            ErrorSeverity.LOW: "info",
            ErrorSeverity.MEDIUM: "warning",
            ErrorSeverity.HIGH: "error",
            ErrorSeverity.CRITICAL: "error",
        }
        return severity_map.get(severity, "warning")


class CustomExceptionHandler:
    """
    Custom exception handlers for specific error types
    Provides specialized handling for different categories of errors
    """

    def __init__(self):
        self.error_tracker = get_error_tracker()

    def database_error_handler(
        self, request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle database-specific errors"""

        error_event = ErrorEvent(
            error=exc,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            endpoint=request.url.path,
            client_ip=self._get_client_ip(request),
            context={"error_type": "database_operation"},
        )

        self.error_tracker.track_error(error_event)

        # Don't expose database details in production
        if settings.environment == "production":
            message = "A database error occurred. Please try again later."
        else:
            message = f"Database error: {str(exc)}"

        from fastapi.encoders import jsonable_encoder
        from fastapi.responses import JSONResponse

        class LocalCustomJSONResponse(JSONResponse):
            def render(self, content) -> bytes:
                encoded_content = jsonable_encoder(content)
                return super().render(encoded_content)

        return LocalCustomJSONResponse(
            status_code=503,
            content={
                "error": True,
                "error_id": error_event.error_id,
                "code": "DATABASE_ERROR",
                "message": message,
                "timestamp": error_event.timestamp.isoformat(),
                "retry_after": 30,
            },
            headers={"X-Error-ID": error_event.error_id, "Retry-After": "30"},
        )

    def validation_error_handler(
        self, request: Request, exc: ValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors"""

        error_event = ErrorEvent(
            error=exc,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            endpoint=request.url.path,
            client_ip=self._get_client_ip(request),
            context={
                "validation_errors": len(exc.errors()) if hasattr(exc, "errors") else 0
            },
        )

        self.error_tracker.track_error(error_event)

        # Format validation errors for user
        formatted_errors = []
        if hasattr(exc, "errors"):
            for error in exc.errors()[:5]:  # Limit to first 5 errors
                formatted_errors.append(
                    {
                        "field": ".".join(str(loc) for loc in error.get("loc", [])),
                        "message": error.get("msg", "Invalid value"),
                        "type": error.get("type", "validation_error"),
                    }
                )

        from fastapi.encoders import jsonable_encoder
        from fastapi.responses import JSONResponse

        class LocalCustomJSONResponse(JSONResponse):
            def render(self, content) -> bytes:
                encoded_content = jsonable_encoder(content)
                return super().render(encoded_content)

        return LocalCustomJSONResponse(
            status_code=422,
            content={
                "error": True,
                "error_id": error_event.error_id,
                "code": "VALIDATION_ERROR",
                "message": "The request data is invalid",
                "validation_errors": formatted_errors,
                "timestamp": error_event.timestamp.isoformat(),
            },
            headers={"X-Error-ID": error_event.error_id},
        )

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return getattr(request.client, "host", "unknown")


# Global exception handler instance
custom_exception_handler = CustomExceptionHandler()


def get_custom_exception_handler() -> CustomExceptionHandler:
    """Get the global custom exception handler"""
    return custom_exception_handler
