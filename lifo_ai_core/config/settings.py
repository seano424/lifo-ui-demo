"""Configuration settings for LIFO AI Core"""

import os
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_url: str = ""
    supabase_db_url: Optional[str] = None
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Scoring
    default_expiry_weight: float = 0.5
    default_velocity_weight: float = 0.3
    default_margin_weight: float = 0.2
    enable_ml_scoring: bool = False

    # ETL
    max_csv_rows: int = 10000
    csv_chunk_size: int = 1000

    # Logging
    log_level: str = "INFO"
    debug: bool = False

    # Environment
    environment: str = "development"

    # File paths
    model_path: str = "models/"
    data_path: str = "data/"
    log_path: str = "logs/"

    @field_validator("database_url")
    @classmethod
    def database_url_must_be_set(cls, v: str) -> str:
        if not v:
            # Try to get from environment
            v = os.getenv("DATABASE_URL", "")
        if not v:
            # For development, allow empty database_url
            if os.getenv("ENVIRONMENT", "development") == "development":
                return ""
            raise ValueError("database_url must be set")
        return v

    @field_validator("log_level")
    @classmethod
    def log_level_must_be_valid(cls, v: str) -> str:
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()

    class Config:
        env_file = ".env"
        env_prefix = "LIFO_"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
