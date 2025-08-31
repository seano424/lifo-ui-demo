"""
API dependencies re-export for backward compatibility
"""

# Re-export specific functions from auth dependencies module
from app.auth.dependencies import (
    validate_store_access,
)

# Alias for backward compatibility with restored modules
get_store_access = validate_store_access
