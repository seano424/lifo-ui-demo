"""
Persistence Package

Unified persistence layer for LIFO.AI scoring results.
"""

from app.core.persistence.unified_scoring_persistence import (
    UnifiedScoringPersistence,
    get_unified_scoring_persistence,
)

__all__ = [
    "UnifiedScoringPersistence",
    "get_unified_scoring_persistence",
]
