"""
Environment-specific configuration management for LIFO AI Engine
Handles differences between development, staging, and production environments
"""

import os
from enum import Enum
from typing import Any

import structlog

logger = structlog.get_logger()


class Environment(str, Enum):
    """Available environments"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class EnvironmentConfig:
    """Environment-specific configuration manager"""
    
    def __init__(self):
        self.current_env = self._detect_environment()
        logger.info(f"Initialized environment: {self.current_env}")
    
    def _detect_environment(self) -> Environment:
        """Detect current environment from environment variables"""
        env_var = os.getenv("ENVIRONMENT", "development").lower()
        
        # Handle common variations
        if env_var in ["dev", "develop", "development"]:
            return Environment.DEVELOPMENT
        elif env_var in ["stage", "staging"]:
            return Environment.STAGING
        elif env_var in ["prod", "production"]:
            return Environment.PRODUCTION
        else:
            logger.warning(f"Unknown environment '{env_var}', defaulting to development")
            return Environment.DEVELOPMENT
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.current_env == Environment.DEVELOPMENT
    
    @property
    def is_staging(self) -> bool:
        """Check if running in staging environment"""
        return self.current_env == Environment.STAGING
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.current_env == Environment.PRODUCTION
    
    @property
    def is_deployed(self) -> bool:
        """Check if running in a deployed environment (staging or production)"""
        return self.current_env in [Environment.STAGING, Environment.PRODUCTION]
    
    def get_database_pool_config(self) -> dict[str, Any]:
        """Get environment-appropriate database pool configuration"""
        if self.is_production:
            return {
                "pool_size": 20,
                "max_overflow": 30,
                "pool_recycle": 3600,
            }
        elif self.is_staging:
            return {
                "pool_size": 5,
                "max_overflow": 10,
                "pool_recycle": 3600,
            }
        else:  # development
            return {
                "pool_size": 2,
                "max_overflow": 5,
                "pool_recycle": 1800,
            }
    
    def get_worker_config(self) -> dict[str, Any]:
        """Get environment-appropriate worker configuration"""
        if self.is_production:
            return {
                "workers": 2,
                "max_workers": 4,
                "max_requests": 1000,
                "timeout": 120,
            }
        elif self.is_staging:
            return {
                "workers": 1,
                "max_workers": 2,
                "max_requests": 500,
                "timeout": 120,
            }
        else:  # development
            return {
                "workers": 1,
                "max_workers": 1,
                "max_requests": 100,
                "timeout": 60,
            }
    
    def get_logging_config(self) -> dict[str, Any]:
        """Get environment-appropriate logging configuration"""
        if self.is_production:
            return {
                "level": "INFO",
                "enable_sql_logging": False,
                "enable_request_logging": False,
                "enable_performance_logging": True,
            }
        elif self.is_staging:
            return {
                "level": "DEBUG",
                "enable_sql_logging": True,
                "enable_request_logging": True,
                "enable_performance_logging": True,
            }
        else:  # development
            return {
                "level": "DEBUG",
                "enable_sql_logging": True,
                "enable_request_logging": True,
                "enable_performance_logging": True,
            }
    
    def get_cors_config(self) -> dict[str, Any]:
        """Get environment-appropriate CORS configuration"""
        if self.is_production:
            # Production should have specific domains only
            default_origins = os.getenv(
                "BACKEND_CORS_ORIGINS",
                "https://yourdomain.com"
            )
        elif self.is_staging:
            # Staging can be more permissive for testing
            default_origins = os.getenv(
                "BACKEND_CORS_ORIGINS",
                "http://localhost:3000,http://localhost:3001,https://staging-domain.com,https://preview-*.vercel.app"
            )
        else:  # development
            # Development allows localhost
            default_origins = os.getenv(
                "BACKEND_CORS_ORIGINS",
                "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
            )
        
        return {
            "allow_origins": default_origins.split(",") if isinstance(default_origins, str) else default_origins,
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }
    
    def get_feature_flags(self) -> dict[str, bool]:
        """Get environment-specific feature flags"""
        base_flags = {
            "enable_test_endpoints": False,
            "enable_debug_routes": False,
            "enable_experimental_features": False,
            "enable_bulk_operations": True,  # Always enabled (our optimization)
            "enable_performance_monitoring": True,  # Always enabled
            "mock_external_services": False,
        }
        
        if self.is_development:
            base_flags.update({
                "enable_test_endpoints": True,
                "enable_debug_routes": True,
                "enable_experimental_features": True,
            })
        elif self.is_staging:
            base_flags.update({
                "enable_test_endpoints": True,
                "enable_experimental_features": True,
            })
        # Production keeps the base flags (most restrictive)
        
        # Allow override from environment variables
        for flag, default in base_flags.items():
            env_value = os.getenv(flag.upper())
            if env_value is not None:
                base_flags[flag] = env_value.lower() in ("true", "1", "yes", "on")
        
        return base_flags
    
    def get_rate_limit_config(self) -> dict[str, int]:
        """Get environment-appropriate rate limiting configuration"""
        if self.is_production:
            return {
                "requests_per_minute": 100,
                "burst": 20,
            }
        elif self.is_staging:
            return {
                "requests_per_minute": 200,
                "burst": 50,
            }
        else:  # development
            return {
                "requests_per_minute": 1000,  # Very permissive for development
                "burst": 100,
            }
    
    def should_seed_test_data(self) -> bool:
        """Check if test data should be seeded"""
        return (
            self.is_staging and 
            os.getenv("SEED_TEST_DATA", "false").lower() in ("true", "1", "yes", "on")
        )
    
    def get_app_info(self) -> dict[str, Any]:
        """Get application information for health checks and monitoring"""
        return {
            "environment": self.current_env.value,
            "is_deployed": self.is_deployed,
            "features": self.get_feature_flags(),
            "app_name": os.getenv("PROJECT_NAME", "LIFO AI API"),
            "version": os.getenv("APP_VERSION", "1.0.0"),
        }


# Global instance
env_config = EnvironmentConfig()

# Convenience functions
def is_development() -> bool:
    return env_config.is_development

def is_staging() -> bool:
    return env_config.is_staging

def is_production() -> bool:
    return env_config.is_production

def is_deployed() -> bool:
    return env_config.is_deployed

def get_current_environment() -> Environment:
    return env_config.current_env