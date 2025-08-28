"""
FastAPI authentication dependencies for LIFO AI Engine
Provides dependency injection for authentication and authorization
"""


import structlog
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase_jwt import SupabaseAuthError, SupabaseUser, supabase_auth
from app.database.connection import get_database

logger = structlog.get_logger()

# Security scheme for bearer token
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> SupabaseUser:
    """
    FastAPI dependency to get current authenticated user

    Args:
        credentials: Authorization credentials from request header

    Returns:
        SupabaseUser: Current authenticated user

    Raises:
        HTTPException: If authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user = supabase_auth.verify_token(credentials.credentials)
        return user
    except SupabaseAuthError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.detail,
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> SupabaseUser | None:
    """
    FastAPI dependency to get current user (optional)
    Returns None if not authenticated instead of raising exception

    Args:
        credentials: Authorization credentials from request header

    Returns:
        Optional[SupabaseUser]: Current user or None if not authenticated
    """
    if not credentials:
        return None

    try:
        user = supabase_auth.verify_token(credentials.credentials)
        return user
    except SupabaseAuthError:
        return None


async def get_service_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> bool:
    """
    FastAPI dependency for service role authentication

    Args:
        credentials: Authorization credentials from request header

    Returns:
        bool: True if valid service role

    Raises:
        HTTPException: If service authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Service role authorization required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_service = supabase_auth.verify_service_role_token(credentials.credentials)
    if not is_service:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid service role token"
        )

    return True


async def validate_store_access(
    store_id: str,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
    required_role: str = "staff",
) -> bool:
    """
    Validate user has access to specific store

    Args:
        store_id: Store ID to check access for
        current_user: Current authenticated user
        db: Database session
        required_role: Minimum role required (staff, manager, owner)

    Returns:
        bool: True if user has access

    Raises:
        HTTPException: If access is denied
    """
    try:
        # Import here to avoid circular imports
        from sqlalchemy import and_, select

        from app.database.models import StoreUser

        # Check if user has access to this store
        result = await db.execute(
            select(StoreUser).where(
                and_(
                    StoreUser.store_id == store_id,
                    StoreUser.user_id == current_user.user_id,
                    StoreUser.is_active,
                )
            )
        )
        store_user = result.scalar_one_or_none()

        if not store_user:
            logger.warning(
                "User access denied - no store association",
                user_id=current_user.user_id,
                store_id=store_id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="No access to this store"
            )

        # Check role hierarchy
        role_hierarchy = {"employee": 1, "staff": 2, "manager": 3, "owner": 4}

        user_role_level = role_hierarchy.get(store_user.role_in_store, 0)
        required_role_level = role_hierarchy.get(required_role, 2)

        if user_role_level < required_role_level:
            logger.warning(
                "User access denied - insufficient role",
                user_id=current_user.user_id,
                store_id=store_id,
                user_role=store_user.role_in_store,
                required_role=required_role,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}",
            )

        logger.info(
            "Store access validated",
            user_id=current_user.user_id,
            store_id=store_id,
            user_role=store_user.role_in_store,
        )

        return True

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Store access validation failed",
            user_id=current_user.user_id,
            store_id=store_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate store access",
        ) from e


async def require_store_owner(
    store_id: str,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
) -> bool:
    """
    Require user to be store owner

    Args:
        store_id: Store ID to check
        current_user: Current authenticated user
        db: Database session

    Returns:
        bool: True if user is owner

    Raises:
        HTTPException: If user is not owner
    """
    return await validate_store_access(store_id, current_user, db, "owner")


async def require_store_manager(
    store_id: str,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
) -> bool:
    """
    Require user to be store manager or above

    Args:
        store_id: Store ID to check
        current_user: Current authenticated user
        db: Database session

    Returns:
        bool: True if user has manager+ access

    Raises:
        HTTPException: If insufficient permissions
    """
    return await validate_store_access(store_id, current_user, db, "manager")


async def get_user_stores(
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
) -> list:
    """
    Get list of stores the current user has access to

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        list: List of store IDs user has access to
    """
    try:
        # Import here to avoid circular imports
        from sqlalchemy import and_, select

        from app.database.models import StoreUser

        result = await db.execute(
            select(StoreUser.store_id).where(
                and_(
                    StoreUser.user_id == current_user.user_id,
                    StoreUser.is_active,
                )
            )
        )

        store_ids = [row[0] for row in result.fetchall()]

        logger.info(
            "Retrieved user stores",
            user_id=current_user.user_id,
            store_count=len(store_ids),
        )

        return store_ids

    except Exception as e:
        logger.error(
            "Failed to get user stores", user_id=current_user.user_id, error=str(e)
        )
        return []


def require_permission(permission: str):
    """
    Decorator factory for permission-based access control

    Args:
        permission: Required permission string

    Returns:
        Dependency function
    """

    async def permission_dependency(
        current_user: SupabaseUser = Depends(get_current_user),
    ) -> bool:
        """Check if user has required permission"""
        has_permission = supabase_auth.check_user_permissions(current_user, permission)

        if not has_permission:
            logger.warning(
                "Permission denied",
                user_id=current_user.user_id,
                required_permission=permission,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )

        return True

    return permission_dependency


def require_role(role: str):
    """
    Decorator factory for role-based access control

    Args:
        role: Required role string

    Returns:
        Dependency function
    """

    async def role_dependency(
        current_user: SupabaseUser = Depends(get_current_user),
    ) -> bool:
        """Check if user has required role"""
        user_role = supabase_auth.get_user_role(current_user)

        if user_role != role and user_role != "admin":
            logger.warning(
                "Role requirement not met",
                user_id=current_user.user_id,
                user_role=user_role,
                required_role=role,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=f"Role required: {role}"
            )

        return True

    return role_dependency


# Common permission dependencies
require_admin = require_role("admin")
require_manager = require_permission("manage_inventory")
require_analyst = require_permission("view_analytics")
require_uploader = require_permission("upload_inventory")
