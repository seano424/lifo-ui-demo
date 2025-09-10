"""
Supabase API Key Authentication for LIFO AI Engine
Modern authentication using Supabase API keys instead of legacy JWT secrets
Implements the new Supabase authentication approach with proper security
"""

import hmac
from datetime import UTC, datetime
from typing import Any

import httpx
import structlog
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict

from app.core.config import settings

logger = structlog.get_logger()


class SupabaseAPIKeyError(HTTPException):
    """Custom exception for Supabase API key authentication errors"""

    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)


class APIKeyUser(BaseModel):
    """User model for API key authentication"""

    user_id: str
    email: str
    role: str = "authenticated"
    app_metadata: dict[str, Any] = {}
    user_metadata: dict[str, Any] = {}
    aud: str = "authenticated"
    authenticated_at: datetime
    expires_at: datetime | None = None

    model_config = ConfigDict(extra="allow")


class SupabaseAPIKeyAuth:
    """
    Supabase API Key authentication handler
    Replaces JWT secret-based authentication with modern API key approach
    """

    def __init__(self):
        self.supabase_url = settings.supabase_url
        self.anon_key = settings.supabase_anon_key
        self.service_role_key = settings.supabase_service_role_key
        self.logger = structlog.get_logger().bind(component="supabase_api_key_auth")

        # Validate required configuration
        if not self.supabase_url:
            raise ValueError("SUPABASE_URL is required for API key authentication")

        if not self.anon_key:
            raise ValueError("SUPABASE_ANON_KEY is required for API key authentication")

    async def verify_user_token(self, access_token: str) -> APIKeyUser:
        """
        Verify user access token using Supabase Auth API

        Args:
            access_token: User's access token from client

        Returns:
            APIKeyUser: Authenticated user information

        Raises:
            SupabaseAPIKeyError: If authentication fails
        """
        try:
            # Remove Bearer prefix if present
            if access_token.startswith("Bearer "):
                access_token = access_token[7:]

            # Call Supabase Auth API to verify token and get user info
            user_info = await self._get_user_from_token(access_token)

            if not user_info:
                raise SupabaseAPIKeyError("Invalid or expired access token")

            # Create authenticated user object
            authenticated_user = APIKeyUser(
                user_id=user_info["id"],
                email=user_info.get("email", ""),
                role=user_info.get("role", "authenticated"),
                app_metadata=user_info.get("app_metadata", {}),
                user_metadata=user_info.get("user_metadata", {}),
                authenticated_at=datetime.now(UTC),
                expires_at=self._parse_token_expiry(user_info),
            )

            self.logger.info(
                "User authenticated successfully",
                user_id=authenticated_user.user_id,
                email=authenticated_user.email,
                role=authenticated_user.role,
            )

            return authenticated_user

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise SupabaseAPIKeyError("Invalid or expired access token") from e
            elif e.response.status_code == 403:
                raise SupabaseAPIKeyError("Access forbidden", status_code=403) from e
            else:
                self.logger.error("Auth API error", status_code=e.response.status_code)
                raise SupabaseAPIKeyError(
                    "Authentication service unavailable", status_code=503
                ) from e

        except Exception as e:
            self.logger.error("Authentication error", error=str(e))
            raise SupabaseAPIKeyError("Authentication failed") from e

    async def _get_user_from_token(self, access_token: str) -> dict[str, Any] | None:
        """
        Get user information from Supabase Auth API using access token
        """
        try:
            auth_url = f"{self.supabase_url}/auth/v1/user"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "apikey": self.anon_key,
                "Content-Type": "application/json",
            }

            self.logger.debug("Calling Supabase Auth API", url=auth_url)

            async with httpx.AsyncClient() as client:
                response = await client.get(auth_url, headers=headers, timeout=10.0)

                response.raise_for_status()
                user_data = response.json()

                self.logger.debug(
                    "Auth API response",
                    user_id=user_data.get("id"),
                    email=user_data.get("email"),
                    role=user_data.get("role"),
                )

                return user_data

        except httpx.TimeoutException as e:
            self.logger.error("Auth API timeout")
            raise SupabaseAPIKeyError(
                "Authentication service timeout", status_code=503
            ) from e

        except httpx.HTTPStatusError:
            # Re-raise HTTP errors to be handled by caller
            raise

        except Exception as e:
            self.logger.error("Auth API request error", error=str(e))
            return None

    def _parse_token_expiry(self, user_info: dict[str, Any]) -> datetime | None:
        """Parse token expiry from user info if available"""
        # Supabase tokens typically expire in 1 hour
        # This is an estimate since the exact expiry isn't always provided
        from datetime import timedelta

        return datetime.now(UTC).replace(microsecond=0) + timedelta(hours=1)

    async def verify_service_key(self, api_key: str) -> bool:
        """
        Verify service role API key for internal/admin operations

        Args:
            api_key: Service role API key

        Returns:
            bool: True if valid service key
        """
        try:
            # Use constant-time comparison to prevent timing attacks
            if hmac.compare_digest(api_key, self.service_role_key):
                self.logger.info("Service role API key verified")
                return True

            return False

        except Exception as e:
            self.logger.warning("Service key verification failed", error=str(e))
            return False

    async def refresh_token(self, refresh_token: str) -> dict[str, str]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: User's refresh token

        Returns:
            Dict containing new access_token and refresh_token

        Raises:
            SupabaseAPIKeyError: If refresh fails
        """
        try:
            refresh_url = f"{self.supabase_url}/auth/v1/token?grant_type=refresh_token"
            headers = {"apikey": self.anon_key, "Content-Type": "application/json"}
            payload = {"refresh_token": refresh_token}

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    refresh_url, headers=headers, json=payload, timeout=10.0
                )

                if response.status_code == 200:
                    token_data = response.json()

                    self.logger.info("Token refreshed successfully")

                    return {
                        "access_token": token_data["access_token"],
                        "refresh_token": token_data["refresh_token"],
                        "expires_in": token_data.get("expires_in", 3600),
                    }
                else:
                    raise SupabaseAPIKeyError("Token refresh failed")

        except httpx.TimeoutException as e:
            raise SupabaseAPIKeyError("Token refresh timeout", status_code=503) from e
        except Exception as e:
            self.logger.error("Token refresh error", error=str(e))
            raise SupabaseAPIKeyError("Token refresh failed") from e

    async def validate_api_request(self, request: Request) -> APIKeyUser:
        """
        Validate API request with proper authentication

        Args:
            request: FastAPI request object

        Returns:
            APIKeyUser: Authenticated user

        Raises:
            SupabaseAPIKeyError: If authentication fails
        """
        # Check for API key header first (for service role operations)
        api_key = request.headers.get("apikey")

        if api_key and await self.verify_service_key(api_key):
            # Service role authentication - apikey header is sufficient
            return APIKeyUser(
                user_id="service_role",
                email="service@lifo.ai",
                role="service_role",
                authenticated_at=datetime.now(UTC),
            )

        # Check for Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization:
            raise SupabaseAPIKeyError("Authorization header or valid apikey required")

        # Extract token from Authorization header
        if authorization.startswith("Bearer "):
            token = authorization[7:]

            # Check if this is a service role key sent as Bearer token
            if await self.verify_service_key(token):
                # Service role authentication via Authorization Bearer header
                return APIKeyUser(
                    user_id="service_role",
                    email="service@lifo.ai",
                    role="service_role",
                    authenticated_at=datetime.now(UTC),
                )

            # Otherwise, treat as user access token
            return await self.verify_user_token(authorization)
        else:
            raise SupabaseAPIKeyError("Authorization header must use Bearer format")

    def get_user_permissions(self, user: APIKeyUser) -> list[str]:
        """
        Get user permissions from app_metadata

        Args:
            user: Authenticated user

        Returns:
            List of user permissions
        """
        permissions = user.app_metadata.get("permissions", [])

        # Add role-based permissions
        if user.role == "service_role":
            permissions.extend(["admin", "read", "write", "delete"])
        elif user.role == "admin":
            permissions.extend(["read", "write", "delete"])
        elif user.role == "manager":
            permissions.extend(["read", "write"])
        elif user.role == "employee":
            permissions.extend(["read"])

        return list(set(permissions))  # Remove duplicates

    def check_permission(self, user: APIKeyUser, required_permission: str) -> bool:
        """
        Check if user has required permission

        Args:
            user: Authenticated user
            required_permission: Permission to check

        Returns:
            bool: True if user has permission
        """
        user_permissions = self.get_user_permissions(user)
        return required_permission in user_permissions


# Global authentication instance
_api_key_auth: SupabaseAPIKeyAuth | None = None


def get_api_key_auth() -> SupabaseAPIKeyAuth:
    """Get or create the global SupabaseAPIKeyAuth instance"""
    global _api_key_auth
    if _api_key_auth is None:
        _api_key_auth = SupabaseAPIKeyAuth()
    return _api_key_auth


# FastAPI dependencies
async def get_current_user(request: Request) -> APIKeyUser:
    """
    FastAPI dependency to get current authenticated user
    """
    auth = get_api_key_auth()
    return await auth.validate_api_request(request)


async def require_permission(permission: str):
    """
    FastAPI dependency factory for permission-based access control

    Usage:
        @app.get("/admin-only")
        async def admin_endpoint(user: APIKeyUser = Depends(require_permission("admin"))):
            return {"message": "Admin access granted"}
    """

    async def permission_checker(
        user: APIKeyUser = Depends(get_current_user),
    ) -> APIKeyUser:
        auth = get_api_key_auth()
        if not auth.check_permission(user, permission):
            raise SupabaseAPIKeyError(
                f"Permission '{permission}' required", status_code=403
            )
        return user

    return permission_checker


# Convenience dependencies
require_admin = require_permission("admin")
require_manager = require_permission("write")
require_employee = require_permission("read")


# Export the instance
api_key_auth = get_api_key_auth()
