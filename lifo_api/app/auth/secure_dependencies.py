"""
Secure authentication dependencies and validation functions
Provides security-hardened authentication and input validation
"""

import re
import uuid
from datetime import datetime
from typing import Any, Optional

import structlog
from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.supabase_jwt import SupabaseAuthError, get_supabase_auth
from app.core.config import settings
from app.utils.mvp_exceptions import AuthenticationException, AuthorizationException

logger = structlog.get_logger()

# Initialize authentication
# Use lazy initialization instead of creating instance at import time
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """
    Get current authenticated user from JWT token

    Args:
        credentials: Bearer token from request

    Returns:
        Dict containing user information

    Raises:
        AuthenticationException: If authentication fails
    """
    try:
        if not credentials:
            logger.warning("No authentication credentials provided")
            raise AuthenticationException("Authentication required")

        token = credentials.credentials
        if not token:
            logger.warning("Empty authentication token")
            raise AuthenticationException("Invalid authentication token")

        # Verify token with Supabase
        user = await get_supabase_auth().verify_token(token)

        # Log successful authentication (without sensitive data)
        logger.info("User authenticated successfully", user_id=user.user_id, role=user.role)

        return {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role,
            "aud": user.aud,
            "authenticated": True,
            "token": token,  # Include token for further validation
        }

    except SupabaseAuthError as e:
        logger.warning("Supabase authentication failed", error=str(e))
        raise AuthenticationException("Invalid authentication token")
    except Exception as e:
        logger.error("Authentication error", error=str(e))
        raise AuthenticationException("Authentication failed")


async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise
    Used for endpoints that work with or without authentication
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        token = authorization[7:]  # Remove "Bearer " prefix
        user = await get_supabase_auth().verify_token(token)
        return {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role,
            "authenticated": True,
        }
    except Exception:
        return None


async def require_service_role(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """
    Require service role authentication
    Used for admin/internal endpoints
    """
    try:
        token = credentials.credentials
        if not get_supabase_auth().verify_service_role_token(token):
            logger.warning("Service role authentication failed")
            raise AuthorizationException("Service role required")

        logger.info("Service role authenticated")
        return {"role": "service_role", "authenticated": True}

    except Exception as e:
        logger.error("Service role authentication error", error=str(e))
        raise AuthorizationException("Service role authentication failed")


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
    except ValueError:
        logger.warning("Invalid store ID format", store_id=store_id)
        raise HTTPException(status_code=400, detail="Invalid store ID format")


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
    except ValueError:
        logger.warning("Invalid batch ID format", batch_id=batch_id)
        raise HTTPException(status_code=400, detail="Invalid batch ID format")


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
    except ValueError:
        logger.warning("Invalid product ID format", product_id=product_id)
        raise HTTPException(status_code=400, detail="Invalid product ID format")


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
    start_date: Optional[str], end_date: Optional[str]
) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Validate date range parameters
    """
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO 8601")

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO 8601")

    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    # Prevent excessive date ranges (more than 2 years)
    if start_dt and end_dt and (end_dt - start_dt).days > 730:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 2 years")

    return start_dt, end_dt


def sanitize_string_input(value: str, max_length: int = 255, field_name: str = "field") -> str:
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
            logger.warning("Dangerous pattern detected in input", pattern=pattern, field=field_name)
            raise HTTPException(status_code=400, detail=f"Invalid content in {field_name}")

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
        # Try to get user ID from JWT token
        auth_header = request.headers.get("authorization", "")
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
        pass

    # Fall back to IP address
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"

    client_ip = request.client.host if request.client else "unknown"
    return f"ip:{client_ip}"
