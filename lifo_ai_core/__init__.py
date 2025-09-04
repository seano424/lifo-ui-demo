"""
LIFO AI Core - Data Processing and ETL Pipeline for Food Waste Reduction

This package contains the core data processing, ETL pipelines, and utilities
for the LIFO.AI platform.

Main components:
- etl: CSV processing and data pipelines
- config: Configuration management
- utils: Utilities and helpers

Note: The scoring engine has been moved to lifo_api/app/core/scoring.py
"""

__version__ = "0.1.0"
__author__ = "LIFO.AI Team"

# Import main classes for easy access
from .config.settings import Settings, get_settings
from .etl.processor import CSVProcessor

try:
    from .etl.unified_csv_processor import UnifiedCSVProcessor
except ImportError:
    UnifiedCSVProcessor = None  # type: ignore

try:
    from .database.operations import InventoryOperations, create_inventory_operations
except ImportError:
    InventoryOperations = None  # type: ignore
    create_inventory_operations = None  # type: ignore

try:
    from .utils.logger import StructuredLogger, get_logger
except ImportError:
    # Fallback logger
    import logging

    def get_logger(service_name: str = "lifo_ai_core", log_level: str = "INFO"):  # type: ignore[misc]
        return logging.getLogger(service_name)

    StructuredLogger = None  # type: ignore

__all__ = [
    "CSVProcessor",
    "Settings",
    "get_logger",
    "get_settings",
]

# Add optional exports if available
if UnifiedCSVProcessor is not None:
    __all__.append("UnifiedCSVProcessor")
if InventoryOperations is not None:
    __all__.extend(["InventoryOperations", "create_inventory_operations"])
if StructuredLogger is not None:
    __all__.append("StructuredLogger")
