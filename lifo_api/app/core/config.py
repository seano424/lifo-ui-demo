"""
Configuration management for LIFO AI Engine
Handles environment variables and application settings
"""

from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


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
    host: str = "0.0.0.0"  # noqa: S104  # Intentional for containerized deployment
    port: int = 8000
    allowed_hosts: list[str] = Field(
        default=["*"], description="Allowed hosts for the server"
    )

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:3000",  # Next.js development
            "http://localhost:3001",  # Alternative dev port
            "http://127.0.0.1:3000",  # IPv4 localhost
        ],
        description="CORS allowed origins",
    )

    # Production URLs (set via environment variables)
    frontend_url: str | None = None
    api_url: str | None = None

    # Database Configuration
    database_url: str = Field(
        default="",
        description="Database URL - must be provided via environment variable",
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
        description="JWT secret key for token signing and verification",
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # json or console

    # Scoring Configuration
    default_scoring_weights: dict[str, float] = {
        "expiry": 0.5,
        "velocity": 0.3,
        "margin": 0.2,
    }

    # Category-specific weights (updated for standardized categories)
    category_weights: dict[str, dict[str, float]] = {
        "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
        "dairy_eggs": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
        "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
        "fresh_meat_fish": {"expiry": 0.65, "velocity": 0.2, "margin": 0.15},
        "frozen_foods": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
        "deli_prepared": {"expiry": 0.65, "velocity": 0.25, "margin": 0.1},
        "chilled_packaged": {"expiry": 0.4, "velocity": 0.4, "margin": 0.2},
        "canned_jarred": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
        "dry_goods": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
        "beverages": {"expiry": 0.25, "velocity": 0.45, "margin": 0.3},
        "spices_condiments": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
        "pantry_staples": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
        "household_other": {"expiry": 0.3, "velocity": 0.4, "margin": 0.3},
        "specialty_items": {"expiry": 0.4, "velocity": 0.3, "margin": 0.3},
        "bulk_items": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
    }

    # Processing Configuration
    max_file_size_mb: int = 50
    max_concurrent_operations: int = 10
    batch_processing_size: int = 1000

    # Cache Configuration
    redis_url: str | None = None
    cache_ttl_seconds: int = 300  # 5 minutes

    # External Services
    weather_api_key: str | None = None
    weather_api_url: str = "http://api.openweathermap.org/data/2.5"

    # Performance
    async_timeout_seconds: int = 30
    max_request_size_mb: int = 100

    # Security
    enable_api_key_auth: bool = False
    api_keys: list[str] = []
    rate_limit_per_minute: int = 100
    rate_limit_enabled: bool = True

    # Performance monitoring settings
    enable_performance_monitoring: bool = Field(
        default=True, description="Enable comprehensive performance monitoring"
    )
    enable_detailed_request_logging: bool = Field(
        default=True, description="Enable detailed request/response logging"
    )
    performance_monitoring_retention_hours: int = Field(
        default=72, description="Hours to retain performance metrics"
    )

    # Mobile performance thresholds
    mobile_response_time_critical_ms: int = Field(
        default=200, description="Critical mobile response time threshold (ms)"
    )
    mobile_response_time_warning_ms: int = Field(
        default=300, description="Warning mobile response time threshold (ms)"
    )
    api_response_time_warning_ms: int = Field(
        default=500, description="General API response time warning threshold (ms)"
    )
    api_response_time_critical_ms: int = Field(
        default=1000, description="General API response time critical threshold (ms)"
    )

    # Alerting settings
    enable_alerting: bool = Field(
        default=True, description="Enable performance alerting"
    )
    alert_cooldown_minutes: int = Field(
        default=10, description="Default alert cooldown period (minutes)"
    )
    alert_escalation_minutes: int = Field(
        default=30, description="Alert escalation time (minutes)"
    )
    max_alerts_per_type_per_hour: int = Field(
        default=10, description="Maximum alerts of same type per hour"
    )

    # System resource monitoring
    memory_usage_warning_percent: int = Field(
        default=80, description="Memory usage warning threshold (%)"
    )
    memory_usage_critical_percent: int = Field(
        default=90, description="Memory usage critical threshold (%)"
    )
    disk_usage_warning_percent: int = Field(
        default=85, description="Disk usage warning threshold (%)"
    )
    cpu_usage_warning_percent: int = Field(
        default=80, description="CPU usage warning threshold (%)"
    )

    @field_validator("cors_origins", "allowed_hosts", "api_keys", mode="before")
    @classmethod
    def parse_list_fields(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return v
        return []

    def get_cors_origins(self) -> list[str]:
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
            origins.extend(
                [
                    "http://localhost:3000",  # Local development
                ]
            )
            return origins

        # Development only - use default origins
        return self.cors_origins

    def get_allowed_hosts(self) -> list[str]:
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
            # Production domains must be explicitly configured via FRONTEND_URL and API_URL

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

    model_config = {
        "env_file": ".env.local",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",  # Ignore extra environment variables not defined in the model
        "env_parse_none_str": "None",
    }


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


def get_supabase_config() -> dict[str, Any]:
    """
    Get Supabase configuration for authentication
    """
    return {
        "url": settings.supabase_url,
        "jwt_secret": settings.supabase_jwt_secret,
        "service_role_key": settings.supabase_service_role_key,
    }


def get_scoring_weights(category: str | None = None) -> dict[str, float]:
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


# Performance monitoring configuration helpers
def get_monitoring_config() -> dict[str, Any]:
    """
    Get performance monitoring configuration
    """
    return {
        "enabled": settings.enable_performance_monitoring,
        "detailed_logging": settings.enable_detailed_request_logging,
        "retention_hours": settings.performance_monitoring_retention_hours,
        "mobile_thresholds": {
            "critical_ms": settings.mobile_response_time_critical_ms,
            "warning_ms": settings.mobile_response_time_warning_ms,
        },
        "api_thresholds": {
            "warning_ms": settings.api_response_time_warning_ms,
            "critical_ms": settings.api_response_time_critical_ms,
        },
        "alerting": {
            "enabled": settings.enable_alerting,
            "cooldown_minutes": settings.alert_cooldown_minutes,
            "escalation_minutes": settings.alert_escalation_minutes,
            "max_per_hour": settings.max_alerts_per_type_per_hour,
        },
        "system_thresholds": {
            "memory_warning": settings.memory_usage_warning_percent,
            "memory_critical": settings.memory_usage_critical_percent,
            "disk_warning": settings.disk_usage_warning_percent,
            "cpu_warning": settings.cpu_usage_warning_percent,
        },
    }


# Environment-specific configurations
if is_production():
    # Production overrides
    settings.debug = False
    settings.log_level = "WARNING"
    # Keep performance monitoring enabled in production
    settings.enable_performance_monitoring = True
    settings.enable_alerting = True
elif is_development():
    # Development overrides
    settings.debug = True
    settings.log_level = "DEBUG"
    # Enable full monitoring in development
    settings.enable_detailed_request_logging = True
