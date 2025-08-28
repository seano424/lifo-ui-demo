"""
API dependencies re-export for backward compatibility
"""

# Re-export specific functions from auth dependencies module
from app.auth.dependencies import (
    get_current_user,
    get_current_user_optional,
    get_service_user,
    validate_store_access,
    require_store_owner,
    require_store_manager,
    get_user_stores,
    require_permission,
    require_role,
)

# Alias for backward compatibility with restored modules
get_store_access = validate_store_access
