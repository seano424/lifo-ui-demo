"""
Supabase client for automated authentication
Handles token management, refresh, and service role authentication
"""

from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class SupabaseClient:
    """
    Supabase client for automated authentication and token management
    """

    def __init__(self):
        self.base_url = settings.supabase_url
        self.anon_key = settings.supabase_anon_key
        self.service_role_key = settings.supabase_service_role_key
        self.current_session = None
        self.session_expires_at = None

    async def authenticate_with_email_password(
        self, email: str, password: str
    ) -> Optional[dict[str, Any]]:
        """
        Authenticate with email and password
        Returns session data including access_token
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/auth/v1/token?grant_type=password",
                    json={"email": email, "password": password},
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code == 200:
                    session_data = response.json()
                    self.current_session = session_data
                    self.session_expires_at = datetime.utcnow() + timedelta(
                        seconds=session_data.get("expires_in", 3600)
                    )

                    logger.info(
                        "Authentication successful",
                        user_id=session_data.get("user", {}).get("id"),
                        expires_in=session_data.get("expires_in"),
                    )

                    return session_data
                else:
                    logger.error(
                        "Authentication failed",
                        status_code=response.status_code,
                        error=response.text,
                    )
                    return None

        except Exception as e:
            logger.error("Authentication error", error=str(e))
            return None

    async def refresh_session(self, refresh_token: str) -> Optional[dict[str, Any]]:
        """
        Refresh an existing session using refresh token
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/auth/v1/token?grant_type=refresh_token",
                    json={"refresh_token": refresh_token},
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code == 200:
                    session_data = response.json()
                    self.current_session = session_data
                    self.session_expires_at = datetime.utcnow() + timedelta(
                        seconds=session_data.get("expires_in", 3600)
                    )

                    logger.info("Session refreshed successfully")
                    return session_data
                else:
                    logger.error(
                        "Session refresh failed",
                        status_code=response.status_code,
                        error=response.text,
                    )
                    return None

        except Exception as e:
            logger.error("Session refresh error", error=str(e))
            return None

    async def get_valid_access_token(self) -> Optional[str]:
        """
        Get a valid access token, refreshing if necessary
        """
        if not self.current_session:
            logger.warning("No current session available")
            return None

        # Check if token is still valid (with 5 minute buffer)
        if self.session_expires_at and self.session_expires_at > datetime.utcnow() + timedelta(
            minutes=5
        ):
            return self.current_session.get("access_token")

        # Try to refresh the session
        refresh_token = self.current_session.get("refresh_token")
        if refresh_token:
            refreshed_session = await self.refresh_session(refresh_token)
            if refreshed_session:
                return refreshed_session.get("access_token")

        logger.warning("Unable to get valid access token")
        return None

    def get_service_role_token(self) -> str:
        """
        Get service role token for admin operations
        """
        return self.service_role_key

    async def create_api_client(self, use_service_role: bool = False) -> httpx.AsyncClient:
        """
        Create an HTTP client with proper authentication headers
        """
        if use_service_role:
            token = self.get_service_role_token()
            auth_header = f"Bearer {token}"
        else:
            token = await self.get_valid_access_token()
            if not token:
                raise ValueError("No valid access token available")
            auth_header = f"Bearer {token}"

        return httpx.AsyncClient(
            headers={
                "Authorization": auth_header,
                "apikey": self.anon_key,
                "Content-Type": "application/json",
            }
        )

    async def test_authentication(self, access_token: str) -> bool:
        """
        Test if an access token is valid
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "apikey": self.anon_key,
                    },
                )

                return response.status_code == 200

        except Exception as e:
            logger.error("Token test failed", error=str(e))
            return False


# Global client instance
supabase_client = SupabaseClient()


async def get_authenticated_client(use_service_role: bool = False) -> httpx.AsyncClient:
    """
    Convenience function to get an authenticated HTTP client
    """
    return await supabase_client.create_api_client(use_service_role=use_service_role)


async def authenticate_for_testing(email: str, password: str) -> Optional[str]:
    """
    Convenience function for testing - authenticate and return access token
    """
    session = await supabase_client.authenticate_with_email_password(email, password)
    if session:
        return session.get("access_token")
    return None
