"""
Security headers middleware for production deployment
Part of hybrid architecture security remediation
"""

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses
    """

    def __init__(self, app):
        super().__init__(app)
        self.environment = settings.environment

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        self._add_security_headers(response)

        return response

    def _add_security_headers(self, response: Response):
        """Add comprehensive security headers"""

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy
        if self.environment == "production":
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            # More permissive CSP for development (allow CDN for Swagger UI)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* cdn.jsdelivr.net unpkg.com; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* cdn.jsdelivr.net unpkg.com; "
                "style-src 'self' 'unsafe-inline' localhost:* cdn.jsdelivr.net unpkg.com; "
                "img-src 'self' data: https: localhost:* cdn.jsdelivr.net unpkg.com fastapi.tiangolo.com; "
                "font-src 'self' localhost:* cdn.jsdelivr.net unpkg.com; "
                "connect-src 'self' localhost:* ws: wss:;"
            )

        # HSTS (only for HTTPS in production)
        if self.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Permissions Policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=(), "
            "accelerometer=(), gyroscope=()"
        )

        # Additional security headers
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"

        # Server header removal/obfuscation
        if "server" in response.headers:
            del response.headers["server"]

        # Custom server header for identification (optional)
        if self.environment != "production":
            response.headers["X-Powered-By"] = "LIFO-AI-Engine"


class ProductionSecurityMiddleware(BaseHTTPMiddleware):
    """
    Additional security middleware for production environment
    """

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Security checks before processing request
        if not self._validate_request_security(request):
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=400, content={"error": "Security validation failed"}
            )

        response = await call_next(request)

        # Additional security processing after response
        self._add_production_headers(response)

        return response

    def _validate_request_security(self, request: Request) -> bool:
        """Validate request for security issues"""

        # Check for suspicious headers
        suspicious_headers = ["x-forwarded-host", "x-original-host", "x-rewrite-url"]

        for header in suspicious_headers:
            if header in request.headers:
                value = request.headers[header]
                if self._is_suspicious_value(value):
                    logger.warning(
                        "Suspicious header detected", header=header, value=value[:50]
                    )  # Log partial value only
                    return False

        # Check for suspicious query parameters
        if request.url.query:
            if self._has_suspicious_query_params(request.url.query):
                logger.warning(
                    "Suspicious query parameters detected",
                    query=request.url.query[:100],
                )
                return False

        return True

    def _is_suspicious_value(self, value: str) -> bool:
        """Check if value contains suspicious patterns"""
        suspicious_patterns = [
            "<script",
            "javascript:",
            "data:",
            "vbscript:",
            "onload=",
            "onerror=",
            "../",
            "\\x",
            "%3c%73%63%72%69%70%74",  # URL encoded <script
        ]

        value_lower = value.lower()
        return any(pattern in value_lower for pattern in suspicious_patterns)

    def _has_suspicious_query_params(self, query: str) -> bool:
        """Check for suspicious query parameters"""
        return self._is_suspicious_value(query)

    def _add_production_headers(self, response: Response):
        """Add production-specific security headers"""

        # Cache control for sensitive endpoints
        if hasattr(response, "status_code") and response.status_code == 200:
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, private"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        # API-specific headers
        response.headers["X-API-Version"] = settings.api_version
        response.headers["X-Environment"] = "production"
