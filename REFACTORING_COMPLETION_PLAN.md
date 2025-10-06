# LIFO Backend Refactoring - Completion Plan

## Status: 60% Complete

### ✅ Completed
1. **Unified Persistence Module** - Created `app/core/persistence/unified_scoring_persistence.py`
2. **Scoring Models** - Extracted to `app/core/scoring/models.py`
3. **Partial Extraction** - `engine.py` and `services.py` exist (from earlier work)

### ⚠️ Critical Finding
**Line 1342 in scoring.py**: `ScoringService` still uses deprecated `BulkResultPersister`
```python
self.result_persister = result_persister or BulkResultPersister(read_ops)
```

Must be changed to:
```python
from app.core.persistence import get_unified_scoring_persistence
self.result_persister = get_unified_scoring_persistence(db)
```

### 🎯 Remaining Work

#### Step 1: Complete Scoring Module Split
```bash
# Extract PerformanceMonitor (lines 1256-1312)
# → app/core/scoring/monitoring.py

# Extract ScoringService (lines 1314-2171) + factory function
# → app/core/scoring/service.py
# MODIFY: Replace BulkResultPersister with UnifiedScoringPersistence

# Create __init__.py with exports
# → app/core/scoring/__init__.py
```

#### Step 2: Delete Deprecated Files
```bash
rm lifo_api/app/core/high_performance_scoring_persistence.py
rm lifo_api/app/core/simplified_scoring_persistence.py
rm lifo_api/app/core/supabase_safe_persistence.py
rm lifo_api/app/core/network_latency_killer.py
# Note: Keep scoring.py until all imports are updated, then delete
```

#### Step 3: Update All Imports
Search and replace across codebase:
```bash
# Find all files importing from old scoring.py
rg "from app.core.scoring import" -l

# Find all files importing deprecated persistence
rg "BulkResultPersister|high_performance_scoring|simplified_scoring|supabase_safe" -l

# Update to new imports:
# OLD: from app.core.scoring import ScoringService, create_scoring_service
# NEW: from app.core.scoring import ScoringService, create_scoring_service

# OLD: from app.core.scoring import ScoringWeights, ScoringInput, ScoringResult
# NEW: from app.core.scoring.models import ScoringWeights, ScoringInput, ScoringResult
```

#### Step 4: Simplify connection.py
Target: Reduce from 667 lines to ~250 lines
- Remove custom sync asyncpg connection creator (lines 33-67)
- Remove engine event listeners (lines 70-91)  
- Consolidate 3 engine configs into 1 with environment check
- Keep only essential pgBouncer workarounds

#### Step 5: Security & Quality
```bash
# 1. Migrate JWT library
cd lifo_api
uv remove python-jose
uv add pyjwt[crypto]

# Update all JWT imports:
# OLD: from jose import jwt
# NEW: from jwt import decode as jwt_decode, encode as jwt_encode

# 2. Auto-upgrade type hints
ruff check --select UP --fix lifo_api/

# 3. Code quality
ruff check --fix lifo_api/
```

#### Step 6: Database Optimizations
```bash
# Generate RLS fix migration
# Fix 33 policies with auth_rls_initplan warnings
# Replace: auth.uid()
# With: (SELECT auth.uid())
```

#### Step 7: Final Testing
```bash
cd lifo_api

# Type checking
mypy app/

# Run tests
pytest --cov=app --cov-report=html

# Performance tests
pytest tests/performance/ --benchmark-only

# Check for broken imports
python -c "from app.core.scoring import ScoringService; from app.core.persistence import UnifiedScoringPersistence; print('✓ Imports OK')"
```

## Quick Commands

```bash
# Complete scoring split (manual extraction)
# 1. Create monitoring.py
# 2. Create service.py with updated persistence
# 3. Create __init__.py
# 4. Test imports

# Delete deprecated files
find lifo_api/app/core -name "*persistence*.py" ! -path "*/persistence/*" -delete

# Type hints upgrade (1 command!)
ruff check --select UP --fix lifo_api/

# Final commit
git add -A
git commit -m "refactor(backend): Complete consolidation and modernization

- Unified 5 persistence → 1 (UnifiedScoringPersistence)
- Split scoring.py (2,174 lines) → modular package (6 files)
- Deleted 1,500+ lines of duplicate code
- Modernized type hints (Python 3.12+)
- Simplified connection.py (667→250 lines)
- 60x performance improvement on bulk scoring

Performance: 1000 items in 2-5s (was 166s)
Architecture: Clean, maintainable, testable"
```

## Files to Create

### monitoring.py
```python
"""Performance monitoring for scoring operations"""
from datetime import datetime
import structlog

class PerformanceMonitor:
    # Lines 1256-1312 from scoring.py (exact copy)
    ...
```

### service.py
```python
"""Main scoring service with database integration"""
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.persistence import get_unified_scoring_persistence

from .models import ScoringResult
from .engine import InventoryScorer
from .services import (
    BulkDataRetriever,
    VelocityCalculationService,
    CategoryWeightService,
    InMemoryScoringEngine
)
from .monitoring import PerformanceMonitor

class ScoringService:
    def __init__(self, db: AsyncSession, ...):
        # CRITICAL: Use unified persistence
        self.result_persister = get_unified_scoring_persistence(db)
        ...
    
    # Rest of ScoringService (lines 1314-2171)

def create_scoring_service(db: AsyncSession) -> ScoringService:
    # Factory function (line 2172)
    ...
```

### __init__.py
```python
"""
Scoring Package
Modular scoring system for LIFO.AI
"""

from .models import ScoringWeights, ScoringInput, ScoringResult
from .engine import InventoryScorer
from .service import ScoringService, create_scoring_service

__all__ = [
    "ScoringWeights",
    "ScoringInput", 
    "ScoringResult",
    "InventoryScorer",
    "ScoringService",
    "create_scoring_service",
]
```

## Success Criteria
- [ ] All tests pass
- [ ] No import errors
- [ ] Scoring performance maintained (2-5s for 1000 items)
- [ ] Code reduced by ~1,500 lines
- [ ] Type hints modernized
- [ ] Documentation updated
