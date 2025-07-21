"""
LIFO AI Core - Data Processing and ETL Pipeline for Food Waste Reduction

This package contains the core data processing, ETL pipelines, and utilities
for the LIFO.AI platform.

Main components:
- etl: CSV processing and data pipelines
- config: Configuration management
- utils: Utilities and helpers

Note: The scoring engine has been moved to lifo-api/app/core/scoring.py
"""

__version__ = "0.1.0"
__author__ = "LIFO.AI Team"

# Import main classes for easy access
from .config.settings import Settings, get_settings
from .etl.processor import CSVProcessor
from .etl.unified_csv_processor import UnifiedCSVProcessor
from .utils.logger import StructuredLogger, get_logger

__all__ = [
    "CSVProcessor",
    "Settings",
    "StructuredLogger",
    "UnifiedCSVProcessor",
    "get_logger",
    "get_settings",
]
