"""
Supabase JWT Authentication for LIFO AI Engine
Modern authentication using Supabase Auth API instead of legacy JWT secrets
Provides seamless integration with Supabase authentication system
"""

from datetime import UTC, datetime
from typing import Any

import httpx
import structlog
from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.config import settings

logger = structlog.get_logger()


class SupabaseUser(BaseModel):
    """
    Supabase user model with essential fields
    """

    user_id: str
    email: str
    role: str = "authenticated"
    app_metadata: dict[str, Any] = {}
    user_metadata: dict[str, Any] = {}
    aud: str = "authenticated"
    exp: int
    iat: int
    iss: str
    sub: str

    model_config = ConfigDict(extra="allow")


class SupabaseAuthError(HTTPException):
    """
    Custom exception for Supabase authentication errors
    """

    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)


class SupabaseAuth:
    """
    Modern Supabase authentication handler using Auth API
    """

    def __init__(self):
        self.supabase_url = settings.supabase_url or "https://test.supabase.co"
        self.logger = structlog.get_logger().bind(component="supabase_auth")

        # Validate required configuration
        if not settings.supabase_url:
            raise ValueError("SUPABASE_URL is required for authentication")
        
        if not settings.supabase_anon_key and not settings.supabase_service_role_key:
            raise ValueError("Either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required")

    async def verify_token(self, token: str) -> SupabaseUser:
        """
        Verify and decode Supabase JWT token using Auth server verification only

        Args:
            token: JWT token from Authorization header

        Returns:
            SupabaseUser: Decoded user information

        Raises:
            SupabaseAuthError: If token is invalid or expired
        """
        try:
            # Remove Bearer prefix if present
            if token.startswith("Bearer "):
                token = token[7:]

            # Use Auth server verification (modern approach only)
            user_info = await self._verify_with_auth_server(token)
            if user_info:
                return user_info

            # If Auth server verification fails, authentication failed
            raise SupabaseAuthError("Invalid or expired token")

        except SupabaseAuthError:
            # Re-raise SupabaseAuthError as-is
            raise

        except Exception as e:
            self.logger.error(
                "Token verification failed",
                error=str(e),
                error_type=type(e).__name__,
                # Never log token data for security
            )
            # Don't expose internal error details to client
            raise SupabaseAuthError("Authentication failed") from e

    async def _verify_with_auth_server(self, token: str) -> SupabaseUser | None:
        """
        Verify token with Supabase Auth server (modern approach)
        """
        try:
            auth_url = f"{self.supabase_url}/auth/v1/user"
            headers = {
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key
                or settings.supabase_service_role_key,
            }

            self.logger.info(
                "Attempting Auth server verification",
                url=auth_url,
                has_anon_key=bool(settings.supabase_anon_key),
                has_service_key=bool(settings.supabase_service_role_key),
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(auth_url, headers=headers, timeout=10.0)

                # Log detailed response information
                self.logger.info(
                    "Auth server response",
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    response_length=len(response.content),
                )

                if response.status_code == 200:
                    user_data = response.json()
                    self.logger.info(
                        "Auth server returned user data",
                        user_id=user_data.get("id"),
                        email=user_data.get("email"),
                        role=user_data.get("role"),
                        has_app_metadata=bool(user_data.get("app_metadata")),
                        has_user_metadata=bool(user_data.get("user_metadata")),
                    )

                    # Create user object from Auth server response
                    user = SupabaseUser(
                        user_id=user_data.get("id"),
                        email=user_data.get("email", ""),
                        role=user_data.get("role", "authenticated"),
                        app_metadata=user_data.get("app_metadata", {}),
                        user_metadata=user_data.get("user_metadata", {}),
                        aud="authenticated",
                        exp=int(datetime.now(UTC).timestamp())
                        + 3600,  # Estimate expiry
                        iat=int(datetime.now(UTC).timestamp()),
                        iss=f"{self.supabase_url}/auth/v1",
                        sub=user_data.get("id"),
                    )

                    self.logger.info(
                        "Auth server verification successful",
                        user_id=user.user_id,
                        email=user.email,
                    )
                    return user
                else:
                    # Log error response details
                    try:
                        error_data = response.json()
                        self.logger.error(
                            "Auth server verification failed",
                            status_code=response.status_code,
                            error_data=error_data,
                            response_text=response.text[:500],
                        )
                    except Exception:
                        self.logger.error(
                            "Auth server verification failed",
                            status_code=response.status_code,
                            response_text=response.text[:500],
                        )
                    return None

        except httpx.TimeoutException:
            self.logger.error("Auth server verification timeout")
            return None
        except httpx.RequestError as e:
            self.logger.error("Auth server verification request error", error=str(e))
            return None
        except Exception as e:
            self.logger.error(
                "Auth server verification error",
                error=str(e),
                error_type=type(e).__name__,
            )
            return None

    def verify_service_role_token(self, token: str) -> bool:
        """
        Verify service role token for internal API calls using API key only

        Args:
            token: Service role token

        Returns:
            bool: True if valid service role token
        """
        try:
            # Use constant-time comparison to prevent timing attacks
            import hmac

            if hmac.compare_digest(token, settings.supabase_service_role_key):
                self.logger.info("Service role token verified")
                return True

            return False

        except Exception as e:
            self.logger.warning("Service role token verification failed", error=str(e))
            return False

    async def extract_user_claims(self, token: str) -> dict[str, Any]:
        """
        Extract custom claims from VERIFIED token using Auth server
        SECURITY: This method verifies the token again to ensure security

        Args:
            token: JWT token

        Returns:
            Dict: Custom claims from token
        """
        try:
            # Always verify token through Auth server first
            user_info = await self._verify_with_auth_server(token)
            if not user_info:
                return {}

            return {
                "user_metadata": user_info.user_metadata or {},
                "app_metadata": user_info.app_metadata or {},
                "custom_claims": {},  # Custom claims would be in app_metadata
            }

        except Exception as e:
            self.logger.error("Failed to extract claims", error=str(e))
            return {}

    def get_user_role(self, user: SupabaseUser) -> str:
        """
        Get user role with fallback logic

        Args:
            user: Supabase user object

        Returns:
            str: User role
        """
        # Check app_metadata for role first
        if "role" in user.app_metadata:
            return user.app_metadata["role"]

        # Fallback to main role field
        return user.role

    def check_user_permissions(
        self, user: SupabaseUser, required_permission: str
    ) -> bool:
        """
        Check if user has required permission

        Args:
            user: Supabase user object
            required_permission: Permission to check

        Returns:
            bool: True if user has permission
        """
        try:
            # Get permissions from app_metadata
            permissions = user.app_metadata.get("permissions", [])

            # Check if user has the required permission
            if required_permission in permissions:
                return True

            # Check for admin role
            role = self.get_user_role(user)
            if role == "admin":
                return True

            return False

        except Exception as e:
            self.logger.error(
                "Permission check failed",
                user_id=user.user_id,
                permission=required_permission,
                error=str(e),
            )
            return False


# Global authentication instance (lazy initialization)
_supabase_auth: SupabaseAuth | None = None


def get_supabase_auth() -> SupabaseAuth:
    """Get or create the global SupabaseAuth instance"""
    global _supabase_auth
    if _supabase_auth is None:
        _supabase_auth = SupabaseAuth()
    return _supabase_auth


# Export the instance for backward compatibility
supabase_auth = get_supabase_auth()
