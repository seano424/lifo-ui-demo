"""
Rate limiting middleware for AI endpoints
Part of hybrid architecture security remediation
"""

import time

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = structlog.get_logger()

# Rate limiter configuration with security-focused settings
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/hour", "20/minute"],  # More restrictive default limits
    storage_uri="memory://",  # In-memory storage for development
    strategy="moving-window",  # More accurate rate limiting
)


# Custom rate limit handler with security logging
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Custom rate limit exceeded handler with security logging"""

    # Log rate limit violation for security monitoring
    client_ip = get_remote_address(request)
    logger.warning(
        "Rate limit exceeded - potential abuse",
        client_ip=client_ip,
        endpoint=str(request.url.path),
        method=request.method,
        user_agent=request.headers.get("user-agent", "unknown"),
        limit=exc.detail,
        retry_after=getattr(exc, "retry_after", 60),
    )

    response = JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": getattr(exc, "retry_after", 60),
            "endpoint": str(request.url.path),
        },
    )

    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(exc.detail)
    response.headers["X-RateLimit-Remaining"] = "0"
    response.headers["X-RateLimit-Reset"] = str(
        int(time.time()) + getattr(exc, "retry_after", 60)
    )
    response.headers["Retry-After"] = str(getattr(exc, "retry_after", 60))

    logger.warning(
        "Rate limit exceeded",
        client_ip=get_remote_address(request),
        endpoint=request.url.path,
        limit=exc.detail,
        user_agent=request.headers.get("user-agent", "unknown"),
    )

    return response


# AI-specific rate limiting decorators
def ai_endpoint_rate_limit(rate: str = "30/minute"):
    """Rate limit decorator for AI endpoints"""
    return limiter.limit(rate)


def csv_processing_rate_limit(rate: str = "5/hour"):
    """Rate limit decorator for CSV processing (resource intensive)"""
    return limiter.limit(rate)


def scoring_rate_limit(rate: str = "20/minute"):
    """Rate limit decorator for scoring endpoints"""
    return limiter.limit(rate)


def analytics_rate_limit(rate: str = "40/minute"):
    """Rate limit decorator for analytics endpoints"""
    return limiter.limit(rate)


# Advanced rate limiting for different user types
def get_user_rate_limit_key(request: Request) -> str:
    """Get rate limit key based on user authentication"""
    # Try to get user ID from JWT token (case-insensitive)
    try:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization") or ""
        
        # Ensure header is a string (handle potential bytes issues)
        if isinstance(auth_header, bytes):
            auth_header = auth_header.decode('utf-8')
            
        if auth_header.startswith("Bearer "):
            # In production, would decode JWT to get user ID
            # For now, use IP + user agent combination
            return f"{get_remote_address(request)}:{hash(request.headers.get('user-agent', ''))}"
    except Exception:
        # User extraction failed, falling back to IP address
        logger.debug(
            "Failed to extract user context for rate limiting, using IP fallback"
        )

    # Fallback to IP address
    return get_remote_address(request)


# User-aware limiter
user_limiter = Limiter(
    key_func=get_user_rate_limit_key,
    default_limits=["100/minute"],  # Higher limits for authenticated users
)


# Endpoint-specific rate limiting functions
def apply_ai_rate_limits():
    """Apply rate limits to AI endpoints"""
    return {
        "scoring": scoring_rate_limit(),
        "csv_processing": csv_processing_rate_limit(),
        "analytics": analytics_rate_limit(),
        "general_ai": ai_endpoint_rate_limit(),
    }


# Security-focused rate limiting
class SecurityRateLimiter:
    """Advanced rate limiter with security features"""

    def __init__(self):
        self.failed_attempts = {}  # Track failed attempts
        self.blocked_ips = set()  # Temporarily blocked IPs
        self.logger = logger.bind(component="security_rate_limiter")

    def is_blocked(self, client_ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        return client_ip in self.blocked_ips

    def record_failed_attempt(self, client_ip: str, endpoint: str):
        """Record failed authentication/validation attempt"""
        if client_ip not in self.failed_attempts:
            self.failed_attempts[client_ip] = []

        self.failed_attempts[client_ip].append(
            {"endpoint": endpoint, "timestamp": time.time()}
        )

        # Clean old attempts (older than 1 hour)
        cutoff = time.time() - 3600
        self.failed_attempts[client_ip] = [
            attempt
            for attempt in self.failed_attempts[client_ip]
            if attempt["timestamp"] > cutoff
        ]

        # Block IP if too many failed attempts
        if len(self.failed_attempts[client_ip]) >= 10:
            self.blocked_ips.add(client_ip)
            self.logger.warning(
                "IP temporarily blocked due to repeated failures",
                client_ip=client_ip,
                failed_attempts=len(self.failed_attempts[client_ip]),
            )

    def clear_failed_attempts(self, client_ip: str):
        """Clear failed attempts for successful authentication"""
        if client_ip in self.failed_attempts:
            del self.failed_attempts[client_ip]

    def unblock_ip(self, client_ip: str):
        """Unblock IP (for admin use)"""
        self.blocked_ips.discard(client_ip)
        if client_ip in self.failed_attempts:
            del self.failed_attempts[client_ip]


# Global security rate limiter instance
security_limiter = SecurityRateLimiter()


# Middleware to check blocked IPs
async def check_blocked_ip(request: Request, call_next):
    """Middleware to check if IP is blocked"""
    client_ip = get_remote_address(request)

    if security_limiter.is_blocked(client_ip):
        logger.warning(
            "Blocked IP attempted access",
            client_ip=client_ip,
            endpoint=request.url.path,
        )
        return JSONResponse(
            status_code=403,
            content={
                "error": "Access forbidden",
                "message": "IP temporarily blocked due to security violations",
            },
        )

    return await call_next(request)


# Rate limiting configuration for production
PRODUCTION_RATE_LIMITS = {
    "csv_upload": "3/hour",  # CSV uploads are resource intensive
    "scoring_batch": "15/minute",  # Batch scoring operations
    "analytics_dashboard": "30/minute",  # Dashboard analytics
    "ai_suggestions": "20/minute",  # AI-powered suggestions
    "template_download": "10/minute",  # Template downloads
    "file_validation": "10/minute",  # File validation
}

# Development rate limits (more permissive)
DEVELOPMENT_RATE_LIMITS = {
    "csv_upload": "10/hour",
    "scoring_batch": "30/minute",
    "analytics_dashboard": "60/minute",
    "ai_suggestions": "40/minute",
    "template_download": "30/minute",
    "file_validation": "20/minute",
}


def get_rate_limits(environment: str = "production") -> dict[str, str]:
    """Get rate limits based on environment"""
    if environment in ["development", "staging"]:
        return DEVELOPMENT_RATE_LIMITS
    return PRODUCTION_RATE_LIMITS
