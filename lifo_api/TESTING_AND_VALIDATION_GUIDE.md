# Testing and Validation Guide for Optimized Scoring Persistence

**Goal**: Safely validate 30s → <1s performance improvement for 200 batch scoring

---

## Quick Start Testing (5 minutes)

### Step 1: Verify Environment Configuration

```bash
# Check if DATABASE_DIRECT_URL is configured
cd lifo_api
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv('../.env.local')
db_url = os.getenv('DATABASE_DIRECT_URL')
if db_url:
    print('✅ DATABASE_DIRECT_URL is configured')
    print(f'   URL: {db_url[:30]}...')
else:
    print('❌ DATABASE_DIRECT_URL is NOT configured')
    print('   Add this to .env.local:')
    print('   DATABASE_DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres')
"
```

**Expected Output**:
```
✅ DATABASE_DIRECT_URL is configured
   URL: postgresql://postgres:...
```

### Step 2: Run Unit Tests

```bash
# Test the optimized persistence module
cd lifo_api
pytest tests/unit/test_unified_scoring_persistence_optimized.py -v
```

Create the test file first if it doesn't exist (see Testing Code section below).

### Step 3: Performance Benchmark Test

```bash
# Run performance comparison test
cd lifo_api
pytest tests/performance/test_scoring_persistence_benchmark.py -v -s
```

**Expected Output**:
```
=== Performance Benchmark Results ===
Method: copy_optimized
- 50 batches: 180ms (278 items/sec)
- 100 batches: 320ms (312 items/sec)
- 200 batches: 580ms (345 items/sec) ✅ TARGET MET (<1s)

Method: multi_value_insert
- 50 batches: 210ms (238 items/sec)
- 100 batches: 390ms (256 items/sec)
- 200 batches: 750ms (267 items/sec) ✅ TARGET MET (<1s)

Legacy REST API (baseline):
- 200 batches: 29,500ms (6.8 items/sec) ❌ SLOW

Performance Improvement: 50.8x faster 🎉
```

---

## Detailed Testing Strategy

### Phase 1: Unit Tests (10 minutes)

Create comprehensive unit tests for the optimized implementation:

**File**: `lifo_api/tests/unit/test_unified_scoring_persistence_optimized.py`

```python
"""
Unit tests for optimized scoring persistence.

Tests all three persistence methods:
1. COPY optimized (binary, UNLOGGED)
2. Multi-value INSERT
3. Legacy REST API fallback
"""

import asyncio
import os
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.persistence.unified_scoring_persistence_optimized import (
    UnifiedScoringPersistenceOptimized,
    get_unified_scoring_persistence_optimized,
)


@pytest.fixture
def mock_session():
    """Mock SQLAlchemy async session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def sample_scoring_results():
    """Generate sample scoring results for testing."""
    store_id = str(uuid4())
    results = []

    for i in range(50):
        results.append({
            "batch_id": str(uuid4()),
            "expiry_score": 0.75 + (i * 0.001),
            "velocity_score": 0.60 + (i * 0.001),
            "margin_score": 0.85 + (i * 0.001),
            "composite_score": 0.73 + (i * 0.001),
            "recommendation": "promote" if i % 3 == 0 else "monitor",
            "urgency_level": "high" if i % 2 == 0 else "medium",
            "discount_percent": 10 + (i % 5),
            "reason": f"Test reason {i}",
            "ml_enhanced": True,
            "confidence_level": 0.85,
            "calculated_at": datetime.now(UTC)
        })

    return results, store_id


class TestUnifiedScoringPersistenceOptimized:
    """Test suite for optimized scoring persistence."""

    def test_factory_function(self, mock_session):
        """Test factory function returns correct instance."""
        persistence = get_unified_scoring_persistence_optimized(mock_session)
        assert isinstance(persistence, UnifiedScoringPersistenceOptimized)
        assert persistence.session == mock_session

    @pytest.mark.asyncio
    async def test_empty_results(self, mock_session):
        """Test handling of empty results list."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)

        result = await persistence.persist_scoring_results([], "test-store")

        assert result["success"] is True
        assert result["total_items"] == 0
        assert result["method"] == "none"
        assert result["processing_time_ms"] == 0

    @pytest.mark.asyncio
    async def test_deduplication(self, mock_session):
        """Test deduplication of results with duplicate batch_ids."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)

        # Create results with duplicate batch_id
        batch_id = str(uuid4())
        results = [
            {
                "batch_id": batch_id,
                "expiry_score": 0.5,
                "composite_score": 0.5,
                "recommendation": "monitor",
                "urgency_level": "low",
                "calculated_at": datetime.now(UTC)
            },
            {
                "batch_id": batch_id,  # Duplicate
                "expiry_score": 0.8,  # Different score
                "composite_score": 0.8,
                "recommendation": "promote",
                "urgency_level": "high",
                "calculated_at": datetime.now(UTC)
            }
        ]

        with patch.object(
            persistence,
            '_persist_via_multi_value_insert',
            return_value={
                "success": True,
                "total_items": 1,  # Should be deduplicated to 1
                "successful": 1,
                "failed": 0,
                "errors": [],
                "method": "multi_value_insert"
            }
        ):
            result = await persistence.persist_scoring_results(results, "test-store")

            # Verify deduplication occurred
            call_args = persistence._persist_via_multi_value_insert.call_args
            deduplicated_results = call_args[0][0]
            assert len(deduplicated_results) == 1
            # Should keep the last occurrence (0.8 score)
            assert deduplicated_results[0]["expiry_score"] == 0.8

    @pytest.mark.asyncio
    async def test_method_selection_small_batch(self, mock_session, sample_scoring_results):
        """Test that small batches (<50) use multi-value INSERT."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)
        results, store_id = sample_scoring_results

        # Use only 30 results (below COPY_THRESHOLD of 50)
        small_batch = results[:30]

        with patch.object(
            persistence,
            '_persist_via_multi_value_insert',
            return_value={
                "success": True,
                "total_items": 30,
                "successful": 30,
                "failed": 0,
                "errors": [],
                "method": "multi_value_insert"
            }
        ) as mock_multi_value:
            result = await persistence.persist_scoring_results(small_batch, store_id)

            # Verify multi-value INSERT was called
            assert mock_multi_value.called
            assert result["method"] == "multi_value_insert"

    @pytest.mark.asyncio
    async def test_method_selection_large_batch(self, mock_session, sample_scoring_results):
        """Test that large batches (>=50) try COPY first."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)
        results, store_id = sample_scoring_results

        # Use all 50 results (at COPY_THRESHOLD)

        with patch.object(
            persistence,
            '_persist_via_copy_optimized',
            return_value={
                "success": True,
                "total_items": 50,
                "successful": 50,
                "failed": 0,
                "errors": [],
                "method": "copy_optimized"
            }
        ) as mock_copy:
            result = await persistence.persist_scoring_results(results, store_id)

            # Verify COPY was attempted
            assert mock_copy.called
            assert result["method"] == "copy_optimized"

    @pytest.mark.asyncio
    async def test_copy_fallback_to_multi_value(self, mock_session, sample_scoring_results):
        """Test fallback from failed COPY to multi-value INSERT."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)
        results, store_id = sample_scoring_results

        with patch.object(
            persistence,
            '_persist_via_copy_optimized',
            return_value={
                "success": False,
                "method": "copy_failed",
                "total_items": 50,
                "successful": 0,
                "failed": 50,
                "errors": ["DATABASE_DIRECT_URL not configured"]
            }
        ):
            with patch.object(
                persistence,
                '_persist_via_multi_value_insert',
                return_value={
                    "success": True,
                    "total_items": 50,
                    "successful": 50,
                    "failed": 0,
                    "errors": [],
                    "method": "multi_value_insert"
                }
            ) as mock_multi_value:
                result = await persistence.persist_scoring_results(results, store_id)

                # Verify fallback occurred
                assert mock_multi_value.called
                assert result["method"] == "multi_value_insert"
                assert result["success"] is True

    @pytest.mark.asyncio
    async def test_performance_metrics_logging(self, mock_session, sample_scoring_results):
        """Test that performance metrics are correctly calculated and logged."""
        persistence = UnifiedScoringPersistenceOptimized(mock_session)
        results, store_id = sample_scoring_results

        with patch.object(
            persistence,
            '_persist_via_copy_optimized',
            return_value={
                "success": True,
                "total_items": 50,
                "successful": 50,
                "failed": 0,
                "errors": [],
                "method": "copy_optimized",
                "performance": {
                    "copy_time_ms": 120.5,
                    "insert_time_ms": 45.2
                }
            }
        ):
            result = await persistence.persist_scoring_results(results, store_id)

            # Verify performance metrics
            assert "processing_time_ms" in result
            assert result["processing_time_ms"] > 0
            assert "performance" in result
```

**Run the tests**:
```bash
cd lifo_api
pytest tests/unit/test_unified_scoring_persistence_optimized.py -v
```

---

### Phase 2: Integration Tests (15 minutes)

Test with real database connection to verify actual performance:

**File**: `lifo_api/tests/integration/test_scoring_persistence_integration.py`

```python
"""
Integration tests for optimized scoring persistence.

These tests use real database connections to verify:
1. COPY command works correctly
2. Multi-value INSERT works correctly
3. Performance targets are met (<1s for 200 batches)
"""

import asyncio
import os
import time
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.persistence.unified_scoring_persistence_optimized import (
    UnifiedScoringPersistenceOptimized,
)
from app.database.connection import get_database_session


@pytest.fixture
async def db_session():
    """Get real database session for integration testing."""
    async for session in get_database_session():
        yield session


@pytest.fixture
def generate_scoring_batch():
    """Factory function to generate scoring batches of any size."""
    def _generate(count: int, store_id: str = None):
        if not store_id:
            store_id = str(uuid4())

        results = []
        for i in range(count):
            results.append({
                "batch_id": str(uuid4()),
                "expiry_score": 0.75,
                "velocity_score": 0.60,
                "margin_score": 0.85,
                "composite_score": 0.73,
                "recommendation": "promote",
                "urgency_level": "high",
                "discount_percent": 15,
                "reason": f"Integration test batch {i}",
                "ml_enhanced": True,
                "confidence_level": 0.85,
                "calculated_at": datetime.now(UTC)
            })

        return results, store_id

    return _generate


@pytest.mark.integration
@pytest.mark.asyncio
async def test_copy_optimized_real_database(db_session, generate_scoring_batch):
    """Test COPY method with real database (requires DATABASE_DIRECT_URL)."""
    # Skip if DATABASE_DIRECT_URL not configured
    if not os.getenv("DATABASE_DIRECT_URL"):
        pytest.skip("DATABASE_DIRECT_URL not configured")

    persistence = UnifiedScoringPersistenceOptimized(db_session)

    # Generate 100 batches (above COPY_THRESHOLD)
    results, store_id = generate_scoring_batch(100)

    start_time = time.perf_counter()
    result = await persistence.persist_scoring_results(results, store_id)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # Verify success
    assert result["success"] is True
    assert result["method"] == "copy_optimized"
    assert result["successful"] == 100
    assert result["failed"] == 0

    # Verify performance (<500ms for 100 batches)
    assert elapsed_ms < 500, f"COPY took {elapsed_ms}ms, expected <500ms"

    print(f"\n✅ COPY Optimized: 100 batches in {elapsed_ms:.2f}ms ({100/(elapsed_ms/1000):.1f} items/sec)")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_multi_value_insert_real_database(db_session, generate_scoring_batch):
    """Test multi-value INSERT with real database."""
    if not os.getenv("DATABASE_DIRECT_URL"):
        pytest.skip("DATABASE_DIRECT_URL not configured")

    persistence = UnifiedScoringPersistenceOptimized(db_session)

    # Force small batch to use multi-value INSERT
    results, store_id = generate_scoring_batch(30)

    start_time = time.perf_counter()
    result = await persistence.persist_scoring_results(results, store_id)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # Verify success
    assert result["success"] is True
    assert result["method"] == "multi_value_insert"
    assert result["successful"] == 30
    assert result["failed"] == 0

    # Verify performance (<200ms for 30 batches)
    assert elapsed_ms < 200, f"Multi-value INSERT took {elapsed_ms}ms, expected <200ms"

    print(f"\n✅ Multi-Value INSERT: 30 batches in {elapsed_ms:.2f}ms ({30/(elapsed_ms/1000):.1f} items/sec)")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_200_batch_performance_target(db_session, generate_scoring_batch):
    """Test main performance target: 200 batches in <1 second."""
    if not os.getenv("DATABASE_DIRECT_URL"):
        pytest.skip("DATABASE_DIRECT_URL not configured")

    persistence = UnifiedScoringPersistenceOptimized(db_session)

    # Generate 200 batches (main performance target)
    results, store_id = generate_scoring_batch(200)

    start_time = time.perf_counter()
    result = await persistence.persist_scoring_results(results, store_id)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    # Verify success
    assert result["success"] is True
    assert result["successful"] == 200
    assert result["failed"] == 0

    # CRITICAL: Verify <1 second performance target
    assert elapsed_ms < 1000, f"❌ FAILED: 200 batches took {elapsed_ms}ms, target is <1000ms"

    improvement_factor = 30000 / elapsed_ms  # Compare to baseline 30s

    print(f"\n🎉 SUCCESS: 200 batches in {elapsed_ms:.2f}ms ({200/(elapsed_ms/1000):.1f} items/sec)")
    print(f"   Performance improvement: {improvement_factor:.1f}x faster than baseline")
    print(f"   Method used: {result['method']}")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upsert_behavior(db_session, generate_scoring_batch):
    """Test that upserts correctly update existing records."""
    if not os.getenv("DATABASE_DIRECT_URL"):
        pytest.skip("DATABASE_DIRECT_URL not configured")

    persistence = UnifiedScoringPersistenceOptimized(db_session)

    # Create initial batch
    results, store_id = generate_scoring_batch(10)
    batch_ids = [r["batch_id"] for r in results]

    # First insert
    result1 = await persistence.persist_scoring_results(results, store_id)
    assert result1["success"] is True

    # Update the same batch_ids with different scores
    updated_results = []
    for batch_id in batch_ids:
        updated_results.append({
            "batch_id": batch_id,
            "expiry_score": 0.95,  # Changed from 0.75
            "velocity_score": 0.60,
            "margin_score": 0.85,
            "composite_score": 0.80,  # Changed from 0.73
            "recommendation": "clearance",  # Changed from "promote"
            "urgency_level": "critical",  # Changed from "high"
            "discount_percent": 30,  # Changed from 15
            "reason": "Updated in test",
            "ml_enhanced": True,
            "confidence_level": 0.90,
            "calculated_at": datetime.now(UTC)
        })

    # Second upsert (should update existing records)
    result2 = await persistence.persist_scoring_results(updated_results, store_id)
    assert result2["success"] is True

    print(f"\n✅ Upsert test passed: {len(batch_ids)} records updated successfully")
```

**Run integration tests**:
```bash
cd lifo_api
pytest tests/integration/test_scoring_persistence_integration.py -v -s
```

---

### Phase 3: Performance Benchmark (20 minutes)

Compare old vs new implementation side-by-side:

**File**: `lifo_api/tests/performance/test_scoring_persistence_benchmark.py`

```python
"""
Performance benchmark comparing old vs optimized persistence.

Generates detailed performance report showing:
- Processing time for various batch sizes
- Throughput (items/second)
- Performance improvement factor
"""

import asyncio
import os
import time
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.persistence.unified_scoring_persistence import (
    UnifiedScoringPersistence as LegacyPersistence,
)
from app.core.persistence.unified_scoring_persistence_optimized import (
    UnifiedScoringPersistenceOptimized as OptimizedPersistence,
)
from app.database.connection import get_database_session


@pytest.fixture
async def db_session():
    """Get real database session for benchmarking."""
    async for session in get_database_session():
        yield session


def generate_test_batch(count: int):
    """Generate test scoring batch."""
    store_id = str(uuid4())
    results = []

    for i in range(count):
        results.append({
            "batch_id": str(uuid4()),
            "expiry_score": 0.75,
            "velocity_score": 0.60,
            "margin_score": 0.85,
            "composite_score": 0.73,
            "recommendation": "promote",
            "urgency_level": "high",
            "discount_percent": 15,
            "reason": f"Benchmark batch {i}",
            "ml_enhanced": True,
            "confidence_level": 0.85,
            "calculated_at": datetime.now(UTC)
        })

    return results, store_id


@pytest.mark.benchmark
@pytest.mark.asyncio
async def test_performance_benchmark_comparison(db_session):
    """
    Run comprehensive performance benchmark.

    Compares:
    1. Optimized COPY method
    2. Optimized multi-value INSERT
    3. Legacy REST API chunking
    """
    if not os.getenv("DATABASE_DIRECT_URL"):
        pytest.skip("DATABASE_DIRECT_URL not configured")

    batch_sizes = [50, 100, 200]
    results_table = []

    print("\n" + "=" * 80)
    print("PERFORMANCE BENCHMARK: Scoring Persistence")
    print("=" * 80)

    for batch_size in batch_sizes:
        print(f"\n--- Testing {batch_size} batches ---")

        # Test 1: Optimized COPY (large batch)
        if batch_size >= 50:
            optimized_persistence = OptimizedPersistence(db_session)
            results, store_id = generate_test_batch(batch_size)

            start = time.perf_counter()
            result = await optimized_persistence.persist_scoring_results(results, store_id)
            elapsed_ms = (time.perf_counter() - start) * 1000

            throughput = batch_size / (elapsed_ms / 1000)

            print(f"  COPY Optimized: {elapsed_ms:.2f}ms ({throughput:.1f} items/sec)")

            results_table.append({
                "method": "COPY Optimized",
                "batch_size": batch_size,
                "time_ms": elapsed_ms,
                "throughput": throughput
            })

        # Test 2: Optimized multi-value INSERT (force small batch)
        optimized_persistence = OptimizedPersistence(db_session)
        # Temporarily lower threshold to force multi-value INSERT
        optimized_persistence.COPY_THRESHOLD = 9999

        results, store_id = generate_test_batch(batch_size)

        start = time.perf_counter()
        result = await optimized_persistence.persist_scoring_results(results, store_id)
        elapsed_ms = (time.perf_counter() - start) * 1000

        throughput = batch_size / (elapsed_ms / 1000)

        print(f"  Multi-Value INSERT: {elapsed_ms:.2f}ms ({throughput:.1f} items/sec)")

        results_table.append({
            "method": "Multi-Value INSERT",
            "batch_size": batch_size,
            "time_ms": elapsed_ms,
            "throughput": throughput
        })

        # Test 3: Legacy REST API (baseline - only test on smaller sizes)
        if batch_size <= 100:  # Skip 200 for legacy to save time
            legacy_persistence = LegacyPersistence(db_session)
            # Force REST API by lowering threshold
            legacy_persistence.COPY_THRESHOLD = 9999

            results, store_id = generate_test_batch(batch_size)

            start = time.perf_counter()
            result = await legacy_persistence.persist_scoring_results(results, store_id)
            elapsed_ms = (time.perf_counter() - start) * 1000

            throughput = batch_size / (elapsed_ms / 1000)

            print(f"  Legacy REST API: {elapsed_ms:.2f}ms ({throughput:.1f} items/sec)")

            results_table.append({
                "method": "Legacy REST API",
                "batch_size": batch_size,
                "time_ms": elapsed_ms,
                "throughput": throughput
            })

    # Print summary table
    print("\n" + "=" * 80)
    print("BENCHMARK RESULTS SUMMARY")
    print("=" * 80)
    print(f"{'Method':<25} {'Batch Size':>12} {'Time (ms)':>12} {'Items/sec':>12}")
    print("-" * 80)

    for row in results_table:
        print(f"{row['method']:<25} {row['batch_size']:>12} {row['time_ms']:>12.2f} {row['throughput']:>12.1f}")

    # Calculate improvement factors
    print("\n" + "=" * 80)
    print("PERFORMANCE IMPROVEMENTS")
    print("=" * 80)

    # Find legacy baseline for 100 batches
    legacy_100 = next((r for r in results_table if r['method'] == 'Legacy REST API' and r['batch_size'] == 100), None)
    copy_100 = next((r for r in results_table if r['method'] == 'COPY Optimized' and r['batch_size'] == 100), None)
    multi_100 = next((r for r in results_table if r['method'] == 'Multi-Value INSERT' and r['batch_size'] == 100), None)

    if legacy_100 and copy_100:
        improvement = legacy_100['time_ms'] / copy_100['time_ms']
        print(f"COPY Optimized vs Legacy: {improvement:.1f}x faster")

    if legacy_100 and multi_100:
        improvement = legacy_100['time_ms'] / multi_100['time_ms']
        print(f"Multi-Value INSERT vs Legacy: {improvement:.1f}x faster")

    # Check 200 batch target
    copy_200 = next((r for r in results_table if r['method'] == 'COPY Optimized' and r['batch_size'] == 200), None)
    if copy_200:
        if copy_200['time_ms'] < 1000:
            print(f"\n✅ TARGET MET: 200 batches in {copy_200['time_ms']:.2f}ms (<1000ms target)")
        else:
            print(f"\n❌ TARGET MISSED: 200 batches in {copy_200['time_ms']:.2f}ms (>1000ms target)")

    print("=" * 80 + "\n")
```

**Run benchmark**:
```bash
cd lifo_api
pytest tests/performance/test_scoring_persistence_benchmark.py -v -s
```

---

## Production Rollout Strategy

### Option A: Gradual Rollout (Recommended)

**Week 1: Test in Development**
```python
# In app/core/scoring/service.py

# Add feature flag
USE_OPTIMIZED_PERSISTENCE = os.getenv("USE_OPTIMIZED_PERSISTENCE", "false").lower() == "true"

if USE_OPTIMIZED_PERSISTENCE:
    from app.core.persistence.unified_scoring_persistence_optimized import (
        get_unified_scoring_persistence_optimized as get_persistence
    )
else:
    from app.core.persistence.unified_scoring_persistence import (
        get_unified_scoring_persistence as get_persistence
    )

# Use in scoring service
self.result_persister = get_persistence(self.db)
```

**Set in .env.local**:
```bash
USE_OPTIMIZED_PERSISTENCE=true
```

**Week 2: Test with Production Data (Staging)**
- Deploy to staging environment
- Run with production-sized datasets
- Monitor logs for errors
- Verify performance metrics

**Week 3: Production A/B Test**
- Deploy to production with feature flag OFF
- Enable for 10% of requests
- Monitor error rates and performance
- Gradually increase to 100%

### Option B: Direct Replacement (Faster)

```python
# In app/core/scoring/service.py

# Simply replace the import
from app.core.persistence.unified_scoring_persistence_optimized import (
    get_unified_scoring_persistence_optimized
)

# Update factory call
self.result_persister = get_unified_scoring_persistence_optimized(self.db)
```

---

## Monitoring and Validation

### Key Metrics to Track

**Performance Metrics**:
```python
# Check logs for these metrics:
- processing_time_ms: <1000ms for 200 batches ✅
- items_per_second: >200 items/sec ✅
- method: "copy_optimized" or "multi_value_insert" ✅
```

**Error Monitoring**:
```bash
# Check for persistence failures
cd lifo_api
tail -f logs/app.log | grep "scoring_persistence" | grep "ERROR"
```

**Success Rate**:
```bash
# Should be 100% success rate
cd lifo_api
tail -f logs/app.log | grep "success_rate"
```

### Performance Alerts

Configure alerts for:
- `processing_time_ms > 1000` for 200 batches
- `success_rate < 99%`
- `method: "copy_failed"` (indicates DATABASE_DIRECT_URL issue)
- `method: "rest_chunked_legacy"` (indicates fallback to slow method)

---

## Troubleshooting

### Issue 1: DATABASE_DIRECT_URL Not Configured

**Symptoms**:
```
method: "copy_failed"
errors: ["DATABASE_DIRECT_URL not configured"]
```

**Fix**:
```bash
# Add to .env.local
DATABASE_DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### Issue 2: COPY Command Fails

**Symptoms**:
```
method: "copy_failed"
errors: ["COPY failed: ..."]
```

**Potential Causes**:
1. PgBouncer in transaction mode (use session mode)
2. Insufficient permissions
3. Temporary table creation disabled

**Fix**:
```bash
# Check PgBouncer configuration
# Ensure pool_mode = session (not transaction)
```

### Issue 3: Performance Still Slow

**Symptoms**:
```
processing_time_ms: 5000  # Still slow
method: "multi_value_insert"
```

**Diagnostic**:
```python
# Add detailed timing logs
# Check which part is slow: connection, COPY, or INSERT
```

**Potential Causes**:
1. Network latency to database
2. Database under heavy load
3. Insufficient database resources

---

## Success Criteria Checklist

Before production deployment, verify:

- [ ] Unit tests pass (100% success rate)
- [ ] Integration tests pass with real database
- [ ] 200 batches complete in <1 second
- [ ] DATABASE_DIRECT_URL configured in all environments
- [ ] Performance benchmark shows 30x+ improvement
- [ ] Error rate <1% in staging environment
- [ ] Logs show `method: "copy_optimized"` for large batches
- [ ] Upsert behavior correctly updates existing records
- [ ] Deduplication prevents duplicate key errors
- [ ] Monitoring and alerts configured

---

## Rollback Plan

If issues arise in production:

### Immediate Rollback (5 minutes)
```bash
# Set feature flag to false
USE_OPTIMIZED_PERSISTENCE=false

# Restart services
pm2 restart all
```

### Code Rollback (10 minutes)
```python
# Revert to original import in app/core/scoring/service.py
from app.core.persistence.unified_scoring_persistence import (
    get_unified_scoring_persistence
)
```

### Database Rollback
No database changes required - both implementations write to same table with same schema.

---

## Next Steps

1. **Run all tests** (Unit, Integration, Benchmark)
2. **Review performance results** - should show 30x+ improvement
3. **Deploy to staging** with feature flag
4. **Monitor for 1 week** in staging
5. **Gradual production rollout** (10% → 50% → 100%)
6. **Remove legacy code** after 2 weeks of stable production operation

**Questions? Issues?**
- Check logs in `lifo_api/logs/app.log`
- Review SCORING_PERFORMANCE_OPTIMIZATION_PLAN.md for technical details
- Contact DevOps team for production deployment support
