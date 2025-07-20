"""
Configuration management for LIFO AI Engine
Handles environment variables and application settings
"""
from pydantic import Field
from pydantic_settings import BaseSettings
from typing import List, Dict, Any, Optional
import os


class Settings(BaseSettings):
    """
    Application configuration with environment variable support
    """
    
    # API Configuration
    api_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    debug: bool = False
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_hosts: List[str] = ["*"]
    
    # CORS Configuration
    cors_origins: List[str] = [
        "http://localhost:3000",  # Next.js development
        "http://localhost:3001",  # Alternative dev port
        "https://*.ondigitalocean.app",  # Digital Ocean App Platform
    ]
    
    # Production URLs (set via environment variables)
    frontend_url: Optional[str] = None
    api_url: Optional[str] = None
    
    # Database Configuration
    database_url: str = Field(
        default="", 
        description="Database URL - must be provided via environment variable"
    )
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_recycle: int = 3600
    
    # Authentication
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    
    # JWT Configuration
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="JWT secret key for token signing and verification"
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # json or console
    
    # Scoring Configuration
    default_scoring_weights: Dict[str, float] = {
        "expiry": 0.5,
        "velocity": 0.3,
        "margin": 0.2
    }
    
    # Category-specific weights
    category_weights: Dict[str, Dict[str, float]] = {
        "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
        "dairy": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
        "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
        "meat_fish": {"expiry": 0.65, "velocity": 0.2, "margin": 0.15},
        "frozen": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
    }
    
    # Processing Configuration
    max_file_size_mb: int = 50
    max_concurrent_operations: int = 10
    batch_processing_size: int = 1000
    
    # Cache Configuration
    redis_url: Optional[str] = None
    cache_ttl_seconds: int = 300  # 5 minutes
    
    # External Services
    weather_api_key: Optional[str] = None
    weather_api_url: str = "http://api.openweathermap.org/data/2.5"
    
    # Performance
    async_timeout_seconds: int = 30
    max_request_size_mb: int = 100
    
    # Security
    enable_api_key_auth: bool = False
    api_keys: List[str] = []
    rate_limit_per_minute: int = 100
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins based on environment - SECURE VERSION"""
        if self.environment == "production":
            origins = []
            
            # Add ONLY explicitly configured frontend URL in production
            if self.frontend_url:
                # Validate URL format
                if self.frontend_url.startswith("https://"):
                    origins.append(self.frontend_url)
                    
                    # Add www subdomain only if original doesn't have it
                    if not self.frontend_url.startswith("https://www."):
                        www_url = self.frontend_url.replace("https://", "https://www.")
                        origins.append(www_url)
                else:
                    # In production, only HTTPS is allowed
                    pass
            
            # NO development origins in production
            return origins
        
        elif self.environment == "staging":
            # Staging environment - limited CORS
            origins = []
            if self.frontend_url:
                origins.append(self.frontend_url)
            
            # Limited development origins for staging
            origins.extend([
                "http://localhost:3000",  # Local development
            ])
            return origins
        
        # Development only - use default origins
        return self.cors_origins
    
    def get_allowed_hosts(self) -> List[str]:
        """Get allowed hosts based on environment - SECURE VERSION"""
        if self.environment == "production":
            hosts = []
            
            # Add ONLY explicitly configured hosts in production
            if self.frontend_url:
                host = self.frontend_url.replace("https://", "").replace("http://", "")
                if host and not host.startswith("*"):  # No wildcards in production
                    hosts.append(host)
            
            if self.api_url:
                host = self.api_url.replace("https://", "").replace("http://", "")
                if host and not host.startswith("*"):  # No wildcards in production
                    hosts.append(host)
            
            # Add specific production domains only (no wildcards)
            # Digital Ocean App Platform specific domain if configured
            
            return hosts if hosts else ["127.0.0.1"]  # Fallback to localhost only
        
        elif self.environment == "staging":
            # Staging - limited hosts
            hosts = ["localhost", "127.0.0.1"]
            if self.frontend_url:
                host = self.frontend_url.replace("https://", "").replace("http://", "")
                if host:
                    hosts.append(host)
            return hosts
        
        # Development - use configured hosts
        return self.allowed_hosts
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Create global settings instance
settings = Settings()


def get_database_url() -> str:
    """
    Get properly formatted database URL for async operations
    """
    url = settings.database_url
    
    # Convert sync postgres URL to async if needed
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    return url


def get_supabase_config() -> Dict[str, Any]:
    """
    Get Supabase configuration for authentication
    """
    return {
        "url": settings.supabase_url,
        "jwt_secret": settings.supabase_jwt_secret,
        "service_role_key": settings.supabase_service_role_key
    }


def get_scoring_weights(category: Optional[str] = None) -> Dict[str, float]:
    """
    Get scoring weights for a specific category or default weights
    """
    if category and category in settings.category_weights:
        return settings.category_weights[category]
    return settings.default_scoring_weights


def is_production() -> bool:
    """
    Check if running in production environment
    """
    return settings.environment.lower() in ["production", "prod"]


def is_development() -> bool:
    """
    Check if running in development environment
    """
    return settings.environment.lower() in ["development", "dev", "local"]


# Environment-specific configurations
if is_production():
    # Production overrides
    settings.debug = False
    settings.log_level = "WARNING"
elif is_development():
    # Development overrides
    settings.debug = True
    settings.log_level = "DEBUG"