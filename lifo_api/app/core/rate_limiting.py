"""
Rate limiting configuration for FastAPI
Uses slowapi for request rate limiting with Redis backend
"""

import structlog
from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = structlog.get_logger()

# Create rate limiter instance
limiter = Limiter(
    key_func=get_remote_address, default_limits=["100/minute", "1000/hour"]
)

# Export the rate limit exceeded handler
rate_limit_exceeded_handler = _rate_limit_exceeded_handler

__all__ = ["limiter", "rate_limit_exceeded_handler", "RateLimitExceeded"]
