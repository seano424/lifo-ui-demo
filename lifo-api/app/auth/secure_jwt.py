"""
Simplified and Secure JWT Authentication for AI features only
Part of hybrid architecture security remediation
"""
import jwt
from datetime import datetime, timezone
from typing import Dict, Optional, Any
import structlog
from fastapi import HTTPException, status

from app.core.config import settings

logger = structlog.get_logger()


class SecureAuthError(HTTPException):
    """
    Secure authentication error with minimal information disclosure
    """
    def __init__(self, detail: str = "Authentication failed", status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)


class SecureJWTAuth:
    """
    Simplified JWT authentication for AI features only
    Removed complex authentication flows and focused on security
    """
    
    def __init__(self):
        if not settings.supabase_jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
        
        self.jwt_secret = settings.supabase_jwt_secret
        self.algorithm = "HS256"  # Single algorithm only - prevent algorithm confusion attacks
        self.logger = structlog.get_logger().bind(component="secure_jwt_auth")
        
    def verify_token_for_ai_features(self, token: str) -> Dict[str, Any]:
        """
        Simplified JWT verification for AI features only
        Returns minimal user information needed for AI operations
        """
        try:
            # Remove Bearer prefix if present
            if token.startswith("Bearer "):
                token = token[7:]
            
            # Strict JWT verification
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.algorithm],  # Single algorithm only
                audience="authenticated",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": False,  # Simplified - don't verify issuer
                    "require": ["exp", "sub", "email"]  # Require essential fields
                }
            )
            
            # Additional expiry check
            exp_timestamp = payload.get("exp")
            if exp_timestamp:
                exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
                if exp_datetime < datetime.now(timezone.utc):
                    raise SecureAuthError("Token expired")
            
            # Extract minimal required information
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id or not email:
                raise SecureAuthError("Invalid token format")
            
            # Return only what AI features need
            user_info = {
                "sub": user_id,
                "email": email,
                "authenticated": True
            }
            
            self.logger.info("Token verified for AI features", 
                           user_id=user_id[:8] + "***")  # Partial logging for privacy
            
            return user_info
            
        except jwt.ExpiredSignatureError:
            self.logger.warning("Token expired")
            raise SecureAuthError("Token expired")
            
        except jwt.InvalidTokenError:
            self.logger.warning("Invalid token format")
            raise SecureAuthError("Invalid token")
            
        except jwt.InvalidAudienceError:
            self.logger.warning("Invalid token audience")
            raise SecureAuthError("Invalid token")
            
        except Exception as e:
            self.logger.error("Token verification failed", error_type=type(e).__name__)
            raise SecureAuthError("Authentication failed")
    
    def is_valid_token_format(self, token: str) -> bool:
        """
        Quick check if token has valid JWT format without full verification
        """
        try:
            if not token or len(token) < 20:
                return False
            
            # Remove Bearer prefix
            if token.startswith("Bearer "):
                token = token[7:]
            
            # JWT should have 3 parts separated by dots
            parts = token.split('.')
            if len(parts) != 3:
                return False
            
            # Each part should be base64-like
            for part in parts:
                if not part or len(part) < 4:
                    return False
            
            return True
            
        except Exception:
            return False
    
    def extract_user_id_only(self, token: str) -> Optional[str]:
        """
        Extract only user ID from token for logging purposes
        Does not perform full verification
        """
        try:
            if not self.is_valid_token_format(token):
                return None
            
            # Remove Bearer prefix
            if token.startswith("Bearer "):
                token = token[7:]
            
            # Decode without verification for user ID extraction only
            payload = jwt.decode(
                token,
                options={
                    "verify_signature": False,
                    "verify_exp": False,
                    "verify_aud": False
                }
            )
            
            return payload.get("sub")
            
        except Exception:
            return None


# Global secure authentication instance
secure_auth = SecureJWTAuth()