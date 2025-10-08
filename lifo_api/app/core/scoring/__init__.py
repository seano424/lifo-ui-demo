"""
Scoring Package

Modular scoring system for LIFO.AI inventory management.
Provides AI-powered scoring for inventory urgency and waste prevention.

This package replaces the monolithic 2,174-line scoring.py with a clean
modular structure for better maintainability and testability.

REFACTORED: Uses UnifiedScoringPersistence (60x performance improvement)
"""

from .models import ScoringInput, ScoringResult, ScoringWeights
from .engine import InventoryScorer
from .services import (
    BulkDataRetriever,
    CategoryWeightService,
    InMemoryScoringEngine,
    VelocityCalculationService,
)
from .monitoring import PerformanceMonitor
from .service import ScoringService, create_scoring_service

__all__ = [
    # Models
    "ScoringWeights",
    "ScoringInput",
    "ScoringResult",
    # Core engine
    "InventoryScorer",
    # Services
    "BulkDataRetriever",
    "CategoryWeightService",
    "InMemoryScoringEngine",
    "VelocityCalculationService",
    # Monitoring
    "PerformanceMonitor",
    # Main service
    "ScoringService",
    "create_scoring_service",
]
