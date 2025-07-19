"""
LIFO.AI Core Library - Demo Version
Embedded version of the core library for demonstration purposes
"""

__version__ = "0.1.0"
__author__ = "LIFO.AI Team"

from .etl.unified_csv_processor import UnifiedCSVProcessor
from .scoring.engine import ScoringEngine
from .utils.logger import setup_logger

__all__ = [
    "UnifiedCSVProcessor",
    "ScoringEngine", 
    "setup_logger"
]