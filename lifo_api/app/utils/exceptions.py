"""
Exception handling utilities for LIFO AI Engine
Provides custom exception handlers and error responses
"""

import uuid
from datetime import datetime

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = structlog.get_logger()


class LifoAPIException(Exception):
    """Base exception class for LIFO API"""

    def __init__(self, message: str, status_code: int = 500, details: str = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class ScoringException(LifoAPIException):
    """Exception for scoring-related errors"""

    def __init__(self, message: str, details: str = None):
        super().__init__(message, 422, details)


class AuthenticationException(LifoAPIException):
    """Exception for authentication-related errors"""

    def __init__(self, message: str = "Authentication failed", details: str = None):
        super().__init__(message, 401, details)


class AuthorizationException(LifoAPIException):
    """Exception for authorization-related errors"""

    def __init__(self, message: str = "Access denied", details: str = None):
        super().__init__(message, 403, details)


class DatabaseException(LifoAPIException):
    """Exception for database-related errors"""

    def __init__(self, message: str = "Database operation failed", details: str = None):
        super().__init__(message, 500, details)


class ValidationException(LifoAPIException):
    """Exception for validation errors"""

    def __init__(self, message: str, details: str = None):
        super().__init__(message, 400, details)


def setup_exception_handlers(app: FastAPI):
    """
    Setup custom exception handlers for the FastAPI app
    """

    @app.exception_handler(LifoAPIException)
    async def lifo_exception_handler(request: Request, exc: LifoAPIException):
        """Handle custom LIFO API exceptions"""
        logger.error(
            "LIFO API Exception",
            error=exc.message,
            status_code=exc.status_code,
            details=exc.details,
            path=request.url.path,
            method=request.method,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "details": exc.details,
                "error_code": exc.__class__.__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handle HTTP exceptions"""
        logger.error(
            "HTTP Exception",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
            method=request.method,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.detail,
                "error_code": "HTTPException",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle request validation errors"""
        logger.error(
            "Validation Error",
            errors=exc.errors(),
            path=request.url.path,
            method=request.method,
        )

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "Validation failed",
                "details": exc.errors(),
                "error_code": "ValidationError",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions with secure error messages"""

        # Generate unique error ID for tracking
        error_id = str(uuid.uuid4())[:8]

        # Log detailed error internally (for debugging)
        logger.error(
            "Unhandled Exception",
            error_id=error_id,
            error=str(exc),
            exception_type=type(exc).__name__,
            path=request.url.path,
            method=request.method,
            client_ip=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        # Check if this is a development environment
        from app.core.config import settings

        is_development = settings.environment == "development"

        # Return sanitized error response
        error_response = {
            "success": False,
            "error": "Internal server error",
            "error_code": "InternalServerError",
            "error_id": error_id,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Only include detailed error in development
        if is_development:
            error_response["debug_info"] = {
                "exception_type": type(exc).__name__,
                "path": request.url.path,
                "message": "Check logs for details",
            }

        return JSONResponse(status_code=500, content=error_response)
