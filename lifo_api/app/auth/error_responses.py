"""
Standardized authentication error responses for LIFO AI Engine
Provides consistent error messages and HTTP status codes across all endpoints
"""

from typing import Any

from fastapi import HTTPException, status


class StandardAuthErrors:
    """
    Standard authentication error responses with consistent messages
    """

    @staticmethod
    def invalid_token() -> HTTPException:
        """Token is invalid or malformed"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "invalid_token",
                "message": "The provided authentication token is invalid",
                "code": "AUTH_001",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def expired_token() -> HTTPException:
        """Token has expired"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "token_expired",
                "message": "The authentication token has expired",
                "code": "AUTH_002",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def missing_token() -> HTTPException:
        """No authentication token provided"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "missing_token",
                "message": "Authentication token is required",
                "code": "AUTH_003",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def insufficient_permissions(
        required_permission: str | None = None,
    ) -> HTTPException:
        """User lacks required permissions"""
        message = "Insufficient permissions to access this resource"
        if required_permission:
            message += f". Required permission: {required_permission}"

        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "insufficient_permissions",
                "message": message,
                "code": "AUTH_004",
                "required_permission": required_permission,
            },
        )

    @staticmethod
    def service_unavailable() -> HTTPException:
        """Authentication service is temporarily unavailable"""
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "auth_service_unavailable",
                "message": "Authentication service is temporarily unavailable",
                "code": "AUTH_005",
            },
        )

    @staticmethod
    def invalid_service_key() -> HTTPException:
        """Invalid service role key"""
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "invalid_service_key",
                "message": "Invalid service role authentication",
                "code": "AUTH_006",
            },
        )

    @staticmethod
    def rate_limit_exceeded(retry_after: int | None = None) -> HTTPException:
        """Rate limit exceeded for authentication requests"""
        headers = {}
        if retry_after:
            headers["Retry-After"] = str(retry_after)

        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": "Too many authentication attempts. Please try again later.",
                "code": "AUTH_007",
                "retry_after": retry_after,
            },
            headers=headers,
        )

    @staticmethod
    def store_access_denied(store_id: str) -> HTTPException:
        """User doesn't have access to the specified store"""
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "store_access_denied",
                "message": f"Access denied to store {store_id}",
                "code": "AUTH_008",
                "store_id": store_id,
            },
        )

    @staticmethod
    def auth_configuration_error() -> HTTPException:
        """Authentication system configuration error"""
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "auth_config_error",
                "message": "Authentication system configuration error",
                "code": "AUTH_009",
            },
        )


def map_supabase_error(error: Exception) -> HTTPException:
    """
    Map Supabase authentication errors to standardized responses

    Args:
        error: The original Supabase error

    Returns:
        HTTPException: Standardized error response
    """
    error_str = str(error).lower()

    if "expired" in error_str:
        return StandardAuthErrors.expired_token()
    elif "invalid" in error_str or "malformed" in error_str:
        return StandardAuthErrors.invalid_token()
    elif "timeout" in error_str or "unavailable" in error_str:
        return StandardAuthErrors.service_unavailable()
    elif "forbidden" in error_str or "access denied" in error_str:
        return StandardAuthErrors.insufficient_permissions()
    else:
        # Generic authentication failure
        return StandardAuthErrors.invalid_token()


def create_auth_error_response(
    error_type: str, message: str | None = None, status_code: int = 401, **kwargs
) -> dict[str, Any]:
    """
    Create a standardized authentication error response

    Args:
        error_type: Type of error (e.g., 'invalid_token', 'expired_token')
        message: Custom error message (optional)
        status_code: HTTP status code
        **kwargs: Additional fields to include in response

    Returns:
        Dict containing standardized error response
    """
    response = {
        "error": error_type,
        "message": message or "Authentication failed",
        "timestamp": "2025-01-15T10:00:00Z",  # Would be actual timestamp in production
        **kwargs,
    }

    return response


# Error code documentation for API consumers
AUTH_ERROR_CODES = {
    "AUTH_001": "Invalid or malformed authentication token",
    "AUTH_002": "Authentication token has expired",
    "AUTH_003": "Authentication token is missing from request",
    "AUTH_004": "Insufficient permissions for requested operation",
    "AUTH_005": "Authentication service temporarily unavailable",
    "AUTH_006": "Invalid service role authentication key",
    "AUTH_007": "Rate limit exceeded for authentication requests",
    "AUTH_008": "Access denied to specified store resource",
    "AUTH_009": "Authentication system configuration error",
}
