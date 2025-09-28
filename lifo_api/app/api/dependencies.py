"""
API dependencies re-export for secure authentication
Updated to use modernized authentication system
"""

# Re-export specific functions from secure auth dependencies module
from app.auth.secure_dependencies import (
    validate_store_access,
)

# Alias for backward compatibility with existing endpoints
get_store_access = validate_store_access
