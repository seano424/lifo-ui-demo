"""
Secure authentication dependencies and validation functions
Provides security-hardened authentication and input validation
"""

import re
import uuid
from datetime import datetime
from typing import Any

import structlog
from fastapi import HTTPException, Request

from lifo_api.app.auth.error_responses import StandardAuthErrors, map_supabase_error
from lifo_api.app.auth.monitoring import (
    record_login_failure,
    record_login_success,
)
from lifo_api.app.auth.supabase_api_key_auth import (
    SupabaseAPIKeyError,
    get_api_key_auth,
)
from lifo_api.app.core.config import settings
from lifo_api.app.utils.mvp_exceptions import AuthorizationException

logger = structlog.get_logger()

# Initialize authentication using new API key system
# No need for HTTPBearer since we handle requests directly


async def get_current_user(
    request: Request,
) -> dict[str, Any]:
    """
    Get current authenticated user using Supabase API key authentication

    Args:
        request: FastAPI request object

    Returns:
        Dict containing user information

    Raises:
        AuthenticationException: If authentication fails
    """
    import time
    start_time = time.time()
    client_ip = getattr(request.client, 'host', None) if hasattr(request, 'client') else None

    try:
        # Use the new API key authentication system
        auth = get_api_key_auth()
        user = await auth.validate_api_request(request)

        # Calculate response time
        response_time_ms = (time.time() - start_time) * 1000

        # Record successful authentication
        record_login_success(
            user_id=user.user_id,
            ip_address=client_ip,
            response_time_ms=response_time_ms
        )

        # Log successful authentication (without sensitive data)
        logger.info(
            "User authenticated successfully",
            user_id=user.user_id,
            role=user.role,
            response_time_ms=response_time_ms
        )

        return {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role,
            "aud": user.aud,
            "authenticated": True,
            "permissions": auth.get_user_permissions(user),
        }

    except SupabaseAPIKeyError as e:
        logger.warning("Supabase API key authentication failed", error=str(e))

        # Record authentication failure
        record_login_failure(
            ip_address=client_ip,
            error_code=str(getattr(e, 'status_code', 401))
        )

        # Map to standardized error response
        raise map_supabase_error(e) from e
    except Exception as e:
        logger.error("Authentication error", error=str(e))

        # Record authentication failure
        record_login_failure(
            ip_address=client_ip,
            error_code="AUTH_009"
        )

        raise StandardAuthErrors.auth_configuration_error() from e


async def get_optional_user(
    request: Request,
) -> dict[str, Any] | None:
    """
    Get current user if authenticated, None otherwise
    Used for endpoints that work with or without authentication
    """
    try:
        # Check if Authorization header exists (case-insensitive)
        authorization = request.headers.get("Authorization") or request.headers.get("authorization")
        if not authorization:
            return None

        # Use the new API key authentication system
        auth = get_api_key_auth()
        user = await auth.validate_api_request(request)

        return {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role,
            "authenticated": True,
            "permissions": auth.get_user_permissions(user),
        }
    except Exception:
        return None


async def require_service_role(
    request: Request,
) -> dict[str, Any]:
    """
    Require service role authentication
    Used for admin/internal endpoints
    """
    try:
        # Use the new API key authentication system
        auth = get_api_key_auth()
        user = await auth.validate_api_request(request)

        # Check if user has service role
        if user.role != "service_role":
            logger.warning(
                "Service role required but user has different role", role=user.role
            )
            raise StandardAuthErrors.insufficient_permissions("service_role")

        logger.info("Service role authenticated")
        return {"role": "service_role", "authenticated": True, "user_id": user.user_id}

    except SupabaseAPIKeyError as e:
        logger.error("Service role authentication error", error=str(e))
        raise StandardAuthErrors.invalid_service_key() from e
    except Exception as e:
        logger.error("Service role authentication error", error=str(e))
        raise StandardAuthErrors.auth_configuration_error() from e


# Input Validation Functions


def validate_store_id_format(store_id: str) -> str:
    """
    Validate store ID format and return sanitized value

    Args:
        store_id: Store identifier to validate

    Returns:
        str: Validated store ID

    Raises:
        HTTPException: If store ID format is invalid
    """
    if not store_id:
        raise HTTPException(status_code=400, detail="Store ID is required")

    # Remove any whitespace
    store_id = store_id.strip()

    # Validate UUID format
    try:
        uuid_obj = uuid.UUID(store_id)
        # Return canonical string representation
        return str(uuid_obj)
    except ValueError as e:
        logger.warning("Invalid store ID format", store_id=store_id)
        raise HTTPException(status_code=400, detail="Invalid store ID format") from e


def validate_batch_id_format(batch_id: str) -> str:
    """
    Validate batch ID format and return sanitized value

    Args:
        batch_id: Batch identifier to validate

    Returns:
        str: Validated batch ID

    Raises:
        HTTPException: If batch ID format is invalid
    """
    if not batch_id:
        raise HTTPException(status_code=400, detail="Batch ID is required")

    # Remove any whitespace
    batch_id = batch_id.strip()

    # Validate UUID format
    try:
        uuid_obj = uuid.UUID(batch_id)
        # Return canonical string representation
        return str(uuid_obj)
    except ValueError as e:
        logger.warning("Invalid batch ID format", batch_id=batch_id)
        raise HTTPException(status_code=400, detail="Invalid batch ID format") from e


def validate_product_id_format(product_id: str) -> str:
    """
    Validate product ID format and return sanitized value
    """
    if not product_id:
        raise HTTPException(status_code=400, detail="Product ID is required")

    product_id = product_id.strip()

    try:
        uuid_obj = uuid.UUID(product_id)
        return str(uuid_obj)
    except ValueError as e:
        logger.warning("Invalid product ID format", product_id=product_id)
        raise HTTPException(status_code=400, detail="Invalid product ID format") from e


def validate_sku_format(sku: str) -> str:
    """
    Validate SKU format and return sanitized value
    """
    if not sku:
        raise HTTPException(status_code=400, detail="SKU is required")

    sku = sku.strip().upper()

    # SKU should contain only alphanumeric characters, hyphens, and underscores
    if not re.match(r"^[A-Z0-9\-_]{2,50}$", sku):
        raise HTTPException(
            status_code=400,
            detail="SKU must be 2-50 characters and contain only letters, numbers, hyphens, and underscores",
        )

    return sku


def validate_pagination_params(offset: int = 0, limit: int = 20) -> tuple[int, int]:
    """
    Validate and sanitize pagination parameters
    """
    # Validate offset
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative")
    if offset > 100000:  # Prevent excessive offsets
        raise HTTPException(status_code=400, detail="Offset too large")

    # Validate limit
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")
    if limit > 1000:  # Prevent excessive data retrieval
        raise HTTPException(status_code=400, detail="Limit cannot exceed 1000")

    return offset, limit


def validate_date_range(
    start_date: str | None, end_date: str | None
) -> tuple[datetime | None, datetime | None]:
    """
    Validate date range parameters
    """
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail="Invalid start_date format. Use ISO 8601"
            ) from e

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail="Invalid end_date format. Use ISO 8601"
            ) from e

    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(
            status_code=400, detail="start_date must be before end_date"
        )

    # Prevent excessive date ranges (more than 2 years)
    if start_dt and end_dt and (end_dt - start_dt).days > 730:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 2 years")

    return start_dt, end_dt


def sanitize_string_input(
    value: str, max_length: int = 255, field_name: str = "field"
) -> str:
    """
    Sanitize string input to prevent injection attacks
    """
    if not value:
        return ""

    # Remove leading/trailing whitespace
    value = value.strip()

    # Check length
    if len(value) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} cannot exceed {max_length} characters",
        )

    # Remove control characters except newlines and tabs
    value = "".join(char for char in value if ord(char) >= 32 or char in "\n\t")

    # Check for dangerous patterns
    dangerous_patterns = [
        r"<script",
        r"javascript:",
        r"vbscript:",
        r"onload=",
        r"onerror=",
        r"<iframe",
        r"<object",
        r"<embed",
        r"<link",
        r"<meta",
        r"eval\(",
        r"expression\(",
        r"url\(",
        r"@import",
    ]

    value_lower = value.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, value_lower):
            logger.warning(
                "Dangerous pattern detected in input", pattern=pattern, field=field_name
            )
            raise HTTPException(
                status_code=400, detail=f"Invalid content in {field_name}"
            )

    return value


async def validate_store_access(store_id: str, current_user: dict[str, Any]) -> bool:
    """
    Validate that current user has access to the specified store

    Args:
        store_id: Store ID to check access for
        current_user: Current authenticated user

    Returns:
        bool: True if user has access

    Raises:
        AuthorizationException: If user doesn't have access
    """
    # For now, implement basic validation
    # In production, this would check database for user-store relationships

    # Service role has access to all stores
    if current_user.get("role") == "service_role":
        return True

    # For regular users, we would check store_users table
    # This is a placeholder that should be implemented with actual database checks

    user_id = current_user.get("sub")
    if not user_id:
        logger.warning("User ID not found in token")
        raise AuthorizationException("Invalid user token")

    # TODO: Implement actual store access validation with database
    # For now, allow access (this should be fixed in production)
    logger.warning(
        "Store access validation not fully implemented",
        store_id=store_id,
        user_id=user_id,
    )

    return True


def validate_api_key(api_key: str) -> bool:
    """
    Validate API key for service-to-service communication
    """
    if not api_key:
        return False

    # Check against configured API keys
    valid_keys = settings.api_keys if hasattr(settings, "api_keys") else []

    # Use constant-time comparison to prevent timing attacks
    import hmac

    for valid_key in valid_keys:
        if hmac.compare_digest(api_key, valid_key):
            return True

    return False


def rate_limit_key_func(request: Request) -> str:
    """
    Generate rate limiting key based on user or IP
    """
    try:
        # Try to get user ID from JWT token (case-insensitive)
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization") or ""

        # Ensure header is a string (handle potential bytes issues)
        if isinstance(auth_header, bytes):
            auth_header = auth_header.decode('utf-8')

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # For rate limiting, we'll decode without verification for speed
            # This is safe because we're only using it for rate limiting keys
            import jwt

            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
    except Exception:
        # Token extraction failed, fall back to IP address
        logger.debug("Failed to extract user ID from token, using IP address fallback")

    # Fall back to IP address
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"

    client_ip = request.client.host if request.client else "unknown"
    return f"ip:{client_ip}"
