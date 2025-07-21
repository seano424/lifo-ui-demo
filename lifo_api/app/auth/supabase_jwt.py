"""
Supabase JWT Authentication for LIFO AI Engine
Provides seamless integration with existing Supabase authentication
Updated to use modern JWKS-based verification instead of legacy JWT secret
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
import jwt
import structlog
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings

logger = structlog.get_logger()


class SupabaseUser(BaseModel):
    """
    Supabase user model with essential fields
    """

    user_id: str
    email: str
    role: str = "authenticated"
    app_metadata: Dict[str, Any] = {}
    user_metadata: Dict[str, Any] = {}
    aud: str = "authenticated"
    exp: int
    iat: int
    iss: str
    sub: str

    class Config:
        extra = "allow"


class SupabaseAuthError(HTTPException):
    """
    Custom exception for Supabase authentication errors
    """

    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)


class SupabaseAuth:
    """
    Supabase JWT authentication handler
    """

    def __init__(self):
        if not settings.supabase_jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")

        self.jwt_secret = settings.supabase_jwt_secret
        self.supabase_url = settings.supabase_url
        self.logger = structlog.get_logger().bind(component="supabase_auth")

        # JWT algorithm - enforce HS256 only for security
        self.algorithms = ["HS256"]

    async def verify_token(self, token: str) -> SupabaseUser:
        """
        Verify and decode Supabase JWT token using Auth server verification

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

            # Use Auth server verification (recommended approach)
            user_info = await self._verify_with_auth_server(token)
            if user_info:
                return user_info

            # Fallback to legacy JWT secret verification
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=self.algorithms,
                audience="authenticated",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                    "require": ["exp", "iat", "sub"],
                },
            )

            # Extract user information
            user_id = payload.get("sub")
            if not user_id:
                raise SupabaseAuthError("Token missing user ID")

            email = payload.get("email")
            if not email:
                raise SupabaseAuthError("Token missing email")

            # Create user object
            user = SupabaseUser(
                user_id=user_id,
                email=email,
                role=payload.get("role", "authenticated"),
                app_metadata=payload.get("app_metadata", {}),
                user_metadata=payload.get("user_metadata", {}),
                aud=payload.get("aud", "authenticated"),
                exp=payload.get("exp", 0),
                iat=payload.get("iat", 0),
                iss=payload.get("iss", ""),
                sub=user_id,
            )

            self.logger.info(
                "Token verified successfully", user_id=user_id, email=email
            )

            return user

        except jwt.ExpiredSignatureError:
            self.logger.warning("Token expired")
            raise SupabaseAuthError("Token has expired")

        except jwt.InvalidTokenError as e:
            self.logger.warning("Invalid token", error=str(e))
            raise SupabaseAuthError(f"Invalid token: {e!s}")

        except jwt.InvalidAudienceError:
            self.logger.warning("Invalid token audience")
            raise SupabaseAuthError("Invalid token audience")

        except Exception as e:
            self.logger.error(
                "Token verification failed",
                error=str(e),
                token_preview=token[:20] + "..." if len(token) > 20 else token,
            )
            raise SupabaseAuthError(f"Authentication failed: {e!s}")

    async def _verify_with_auth_server(self, token: str) -> Optional[SupabaseUser]:
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
                        exp=int(datetime.now(timezone.utc).timestamp())
                        + 3600,  # Estimate expiry
                        iat=int(datetime.now(timezone.utc).timestamp()),
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
                    except:
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
        Verify service role token for internal API calls

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

            # Also try JWT verification for service role tokens
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=self.algorithms,
                options={
                    "verify_signature": True,  # Always verify signature
                    "verify_exp": True,  # Always verify expiration
                    "verify_aud": False,  # Service role tokens may have different audience
                },
            )

            # Check if this is a service role token
            role = payload.get("role")
            if role == "service_role":
                self.logger.info("Service role JWT verified")
                return True

            return False

        except Exception as e:
            self.logger.warning("Service role token verification failed", error=str(e))
            return False

    def extract_user_claims(self, token: str) -> Dict[str, Any]:
        """
        Extract custom claims from VERIFIED token only
        SECURITY: Only call this after token has been verified with verify_token()

        Args:
            token: JWT token (must be already verified)

        Returns:
            Dict: Custom claims from token
        """
        try:
            # SECURITY: Always verify token completely
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=self.algorithms,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                },
            )

            return {
                "user_metadata": payload.get("user_metadata", {}),
                "app_metadata": payload.get("app_metadata", {}),
                "custom_claims": payload.get("custom_claims", {}),
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


# Global authentication instance
supabase_auth = SupabaseAuth()
