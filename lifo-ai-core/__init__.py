"""
LIFO AI Core - Business Logic and ML Pipeline for Food Waste Reduction

This package contains the core business logic, scoring algorithms, and data processing
pipelines for the LIFO.AI platform.

Main components:
- database: Database operations and models
- scoring: Inventory scoring algorithms
- etl: CSV processing and data pipelines
- ml: Machine learning models (future)
- utils: Utilities and helpers
"""

__version__ = "0.1.0"
__author__ = "LIFO.AI Team"

# Import main classes for easy access
from .scoring.engine import InventoryScorer, ScoringService
from .etl.processor import CSVProcessor
from .database.operations import InventoryOperations

__all__ = [
    "InventoryScorer",
    "ScoringService", 
    "CSVProcessor",
    "InventoryOperations"
]