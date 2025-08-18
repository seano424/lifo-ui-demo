"""
API dependencies re-export for backward compatibility
"""

# Re-export from the auth dependencies module
from app.auth.dependencies import *

# Alias for backward compatibility with restored modules
get_store_access = validate_store_access
