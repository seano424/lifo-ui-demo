"""
Deployment-ready authentication configuration
Handles different authentication methods for different environments
"""

import os
from typing import Optional

import structlog

from app.auth.supabase_client import supabase_client
from app.core.config import is_development, is_production, settings

logger = structlog.get_logger()


class DeploymentAuthManager:
    """
    Manages authentication for different deployment environments
    """

    def __init__(self):
        self.environment = settings.environment

    async def get_auth_token_for_environment(self) -> Optional[str]:
        """
        Get appropriate auth token based on environment
        """
        if is_production():
            return await self._get_production_token()
        elif is_development():
            return await self._get_development_token()
        else:
            return await self._get_staging_token()

    async def _get_production_token(self) -> Optional[str]:
        """
        Production authentication - use service role or managed identity
        """
        logger.info("Using production authentication")

        # Option 1: Service role (for server-to-server)
        if hasattr(settings, "supabase_service_role_key") and settings.supabase_service_role_key:
            return settings.supabase_service_role_key

        # Option 2: Machine-to-machine authentication
        # This would integrate with your deployment platform's identity management
        # Examples: AWS IAM roles, Azure Managed Identity, GCP Service Accounts

        # Option 3: Environment-specific service account
        service_email = os.getenv("SUPABASE_SERVICE_EMAIL")
        service_password = os.getenv("SUPABASE_SERVICE_PASSWORD")

        if service_email and service_password:
            session = await supabase_client.authenticate_with_email_password(
                service_email, service_password
            )
            if session:
                return session.get("access_token")

        logger.error("No production authentication method available")
        return None

    async def _get_development_token(self) -> Optional[str]:
        """
        Development authentication - more flexible options
        """
        logger.info("Using development authentication")

        # Option 1: Service role (easiest for development)
        if hasattr(settings, "supabase_service_role_key") and settings.supabase_service_role_key:
            return settings.supabase_service_role_key

        # Option 2: Development user credentials
        dev_email = os.getenv("DEV_USER_EMAIL")
        dev_password = os.getenv("DEV_USER_PASSWORD")

        if dev_email and dev_password:
            session = await supabase_client.authenticate_with_email_password(
                dev_email, dev_password
            )
            if session:
                return session.get("access_token")

        # Option 3: Use manually extracted token (temporary)
        manual_token = os.getenv("MANUAL_ACCESS_TOKEN")
        if manual_token:
            logger.warning("Using manual access token - update for production")
            return manual_token

        logger.error("No development authentication method available")
        return None

    async def _get_staging_token(self) -> Optional[str]:
        """
        Staging authentication - balance between security and flexibility
        """
        logger.info("Using staging authentication")

        # Similar to production but with more logging and flexibility
        if hasattr(settings, "supabase_service_role_key") and settings.supabase_service_role_key:
            return settings.supabase_service_role_key

        # Staging-specific service account
        staging_email = os.getenv("STAGING_USER_EMAIL")
        staging_password = os.getenv("STAGING_USER_PASSWORD")

        if staging_email and staging_password:
            session = await supabase_client.authenticate_with_email_password(
                staging_email, staging_password
            )
            if session:
                return session.get("access_token")

        logger.error("No staging authentication method available")
        return None

    async def create_authenticated_client(self, use_service_role: bool = None):
        """
        Create an authenticated HTTP client for the current environment
        """
        if use_service_role is None:
            # Auto-determine based on environment
            use_service_role = is_production() or is_development()

        if use_service_role:
            return await supabase_client.create_api_client(use_service_role=True)
        else:
            # Use environment-specific token
            token = await self.get_auth_token_for_environment()
            if not token:
                raise ValueError(f"No authentication token available for {self.environment}")

            # Temporarily set the token and create client
            supabase_client.current_session = {"access_token": token}
            return await supabase_client.create_api_client(use_service_role=False)


# Global deployment auth manager
deployment_auth = DeploymentAuthManager()


async def get_deployment_client():
    """
    Convenience function to get an authenticated client for current environment
    """
    return await deployment_auth.create_authenticated_client()
