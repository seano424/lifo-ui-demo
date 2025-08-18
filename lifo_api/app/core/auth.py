"""
Authentication and authorization for LIFO API
Provides JWT token validation and role-based access control for all schemas
"""

from datetime import datetime
from typing import Any

import jwt
import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.connection import get_database
from app.database.models import Store, StoreUser

logger = structlog.get_logger()

# Security scheme
security = HTTPBearer()


class AuthError(HTTPException):
    """Custom authentication error"""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationError(HTTPException):
    """Custom authorization error"""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_database),
) -> dict[str, Any]:
    """
    Extract and validate JWT token, return user information
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthError("Token missing user ID")

        # Extract additional claims
        email = payload.get("email")
        role = payload.get("role", "user")
        exp = payload.get("exp")

        # Check token expiration
        if exp and datetime.utcnow().timestamp() > exp:
            raise AuthError("Token has expired")

        # Return user info
        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "token_payload": payload,
        }

    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except jwt.JWTError as e:
        raise AuthError(f"Token validation failed: {e!s}")
    except Exception as e:
        logger.error("Authentication error", error=str(e))
        raise AuthError("Authentication failed")


async def get_current_user_with_store_access(
    store_id: str,
    required_role: str = "staff",
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_database),
) -> dict[str, Any]:
    """
    Get current user and validate store access with required role
    """
    # Get current user
    user = await get_current_user(credentials, db)

    # Check store access
    has_access = await validate_store_access(
        store_id=store_id, user_id=user["user_id"], required_role=required_role, db=db
    )

    if not has_access:
        raise AuthorizationError(f"Insufficient permissions for store {store_id}")

    return user


async def validate_store_access(
    store_id: str,
    user_id: str,
    required_role: str = "staff",
    db: AsyncSession = Depends(get_database),
) -> bool:
    """
    Validate if user has required role access to a specific store
    """
    try:
        # Check if user is store owner
        owner_query = select(Store).where(
            and_(
                Store.store_id == store_id,
                Store.owner_id == user_id,
                Store.is_active,
            )
        )
        owner_result = await db.execute(owner_query)
        if owner_result.scalar_one_or_none():
            return True  # Store owners have all permissions

        # Check store_users table for specific permissions
        user_query = select(StoreUser).where(
            and_(
                StoreUser.store_id == store_id,
                StoreUser.user_id == user_id,
                StoreUser.is_active,
            )
        )
        user_result = await db.execute(user_query)
        store_user = user_result.scalar_one_or_none()

        if not store_user:
            return False

        # Role hierarchy: owner > manager > staff > viewer
        role_hierarchy = {"owner": 4, "manager": 3, "staff": 2, "viewer": 1}

        user_role_level = role_hierarchy.get(store_user.role_in_store, 0)
        required_role_level = role_hierarchy.get(required_role, 0)

        return user_role_level >= required_role_level

    except Exception as e:
        logger.error(
            "Store access validation error",
            store_id=store_id,
            user_id=user_id,
            error=str(e),
        )
        return False


async def validate_global_product_access(
    user_id: str, action: str = "read", db: AsyncSession = Depends(get_database)
) -> bool:
    """
    Validate access to global products schema
    """
    try:
        # For read operations, any authenticated user can access
        if action in ["read", "search"]:
            return True

        # For write operations, check if user has store management permissions
        if action in ["create", "update", "verify"]:
            # Check if user owns any active stores or has manager role
            owner_query = select(Store).where(
                and_(Store.owner_id == user_id, Store.is_active)
            )
            owner_result = await db.execute(owner_query)
            if owner_result.scalar_one_or_none():
                return True

            # Check if user is manager in any store
            manager_query = select(StoreUser).where(
                and_(
                    StoreUser.user_id == user_id,
                    StoreUser.role_in_store.in_(["manager", "owner"]),
                    StoreUser.is_active,
                )
            )
            manager_result = await db.execute(manager_query)
            if manager_result.scalar_one_or_none():
                return True

        return False

    except Exception as e:
        logger.error(
            "Global product access validation error",
            user_id=user_id,
            action=action,
            error=str(e),
        )
        return False


async def validate_donation_access(
    user_id: str,
    store_id: str | None = None,
    action: str = "read",
    db: AsyncSession = Depends(get_database),
) -> bool:
    """
    Validate access to donation schema based on EU compliance requirements
    """
    try:
        # For read operations on donation data
        if action in ["read", "query", "analytics"]:
            # If specific store requested, check store access
            if store_id:
                return await validate_store_access(store_id, user_id, "staff", db)
            else:
                # Global donation analytics - require manager level in any store
                manager_query = select(StoreUser).where(
                    and_(
                        StoreUser.user_id == user_id,
                        StoreUser.role_in_store.in_(["manager", "owner"]),
                        StoreUser.is_active,
                    )
                )
                manager_result = await db.execute(manager_query)
                return manager_result.scalar_one_or_none() is not None

        # For donation management operations
        if action in ["create", "update", "approve", "compliance_check"]:
            if store_id:
                return await validate_store_access(store_id, user_id, "staff", db)
            else:
                return False  # Must specify store for write operations

        # For donation compliance and reporting
        if action in ["compliance_report", "eu_reporting"]:
            # Requires manager level or above
            if store_id:
                return await validate_store_access(store_id, user_id, "manager", db)
            else:
                # Global compliance access for system administrators
                admin_query = select(StoreUser).where(
                    and_(
                        StoreUser.user_id == user_id,
                        StoreUser.role_in_store == "owner",
                        StoreUser.is_active,
                    )
                )
                admin_result = await db.execute(admin_query)
                return admin_result.scalar_one_or_none() is not None

        return False

    except Exception as e:
        logger.error(
            "Donation access validation error",
            user_id=user_id,
            store_id=store_id,
            action=action,
            error=str(e),
        )
        return False


class PermissionChecker:
    """Helper class for permission checking in endpoints"""

    def __init__(self, user: dict[str, Any], db: AsyncSession):
        self.user = user
        self.db = db
        self.user_id = user["user_id"]

    async def check_store_access(
        self, store_id: str, required_role: str = "staff"
    ) -> bool:
        """Check store access with role requirement"""
        return await validate_store_access(
            store_id, self.user_id, required_role, self.db
        )

    async def check_global_product_access(self, action: str = "read") -> bool:
        """Check global product access"""
        return await validate_global_product_access(self.user_id, action, self.db)

    async def check_donation_access(
        self, action: str = "read", store_id: str | None = None
    ) -> bool:
        """Check donation schema access"""
        return await validate_donation_access(self.user_id, store_id, action, self.db)

    def require_store_access(self, store_id: str, required_role: str = "staff"):
        """Raise exception if user lacks store access"""

        async def check():
            if not await self.check_store_access(store_id, required_role):
                raise AuthorizationError(
                    f"Insufficient permissions for store {store_id}"
                )

        return check()

    def require_global_product_access(self, action: str = "read"):
        """Raise exception if user lacks global product access"""

        async def check():
            if not await self.check_global_product_access(action):
                raise AuthorizationError(
                    f"Insufficient permissions for global product {action}"
                )

        return check()

    def require_donation_access(
        self, action: str = "read", store_id: str | None = None
    ):
        """Raise exception if user lacks donation access"""

        async def check():
            if not await self.check_donation_access(action, store_id):
                raise AuthorizationError(
                    f"Insufficient permissions for donation {action}"
                )

        return check()


async def get_permission_checker(
    user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
) -> PermissionChecker:
    """Get permission checker instance for current user"""
    return PermissionChecker(user, db)


# Convenience dependencies for common permission checks
async def require_authenticated_user(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Simple dependency to require authentication"""
    return user


def require_store_permission(store_id: str, required_role: str = "staff"):
    """Dependency factory for store permission requirements"""

    async def permission_check(
        user: dict[str, Any] = Depends(get_current_user),
        db: AsyncSession = Depends(get_database),
    ) -> dict[str, Any]:
        checker = PermissionChecker(user, db)
        await checker.require_store_access(store_id, required_role)
        return user

    return permission_check


def require_global_product_permission(action: str = "read"):
    """Dependency factory for global product permission requirements"""

    async def permission_check(
        user: dict[str, Any] = Depends(get_current_user),
        db: AsyncSession = Depends(get_database),
    ) -> dict[str, Any]:
        checker = PermissionChecker(user, db)
        await checker.require_global_product_access(action)
        return user

    return permission_check


def require_donation_permission(action: str = "read", store_id: str | None = None):
    """Dependency factory for donation permission requirements"""

    async def permission_check(
        user: dict[str, Any] = Depends(get_current_user),
        db: AsyncSession = Depends(get_database),
    ) -> dict[str, Any]:
        checker = PermissionChecker(user, db)
        await checker.require_donation_access(action, store_id)
        return user

    return permission_check
