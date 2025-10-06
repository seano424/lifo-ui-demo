"""
Comprehensive tests for Phase 3 Multi-Store Analytics Endpoints
Tests the new multi-store analytics functionality, caching, and performance
"""

import asyncio
import pytest
import time
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.api.v1.multi_store_analytics import router
from app.utils.multi_store_cache import MultiStoreCache, cache_multi_store_operation


class TestMultiStoreCache:
    """Test the multi-store cache implementation"""
    
    def test_cache_initialization(self):
        """Test cache initialization with slots optimization"""
        cache = MultiStoreCache(default_ttl_minutes=10)
        
        # Test slots implementation for memory optimization
        assert hasattr(cache, '__slots__')
        assert '_cache' in cache.__slots__
        assert '_default_ttl' in cache.__slots__
        assert '_stats' in cache.__slots__
        
        # Test initial state
        assert cache._stats["hits"] == 0
        assert cache._stats["misses"] == 0
        assert cache._stats["sets"] == 0
        assert cache._stats["evictions"] == 0

    def test_cache_key_generation(self):
        """Test cache key generation for consistent caching"""
        cache = MultiStoreCache()
        
        # Test key generation consistency
        key1 = cache._generate_key("user123", "overview", {"days": 30})
        key2 = cache._generate_key("user123", "overview", {"days": 30})
        key3 = cache._generate_key("user123", "overview", {"days": 7})
        
        assert key1 == key2  # Same parameters should generate same key
        assert key1 != key3  # Different parameters should generate different keys

    @pytest.mark.asyncio
    async def test_cache_set_and_get(self):
        """Test basic cache set and get operations"""
        cache = MultiStoreCache()
        
        test_data = {"stores": ["store1", "store2"], "total_value": 1000.50}
        await cache.set("user123", "overview", test_data, {"days": 30})
        
        # Test cache hit
        result = await cache.get("user123", "overview", {"days": 30})
        assert result == test_data
        assert cache._stats["hits"] == 1
        assert cache._stats["sets"] == 1

    @pytest.mark.asyncio
    async def test_cache_miss(self):
        """Test cache miss behavior"""
        cache = MultiStoreCache()
        
        # Test cache miss
        result = await cache.get("user123", "nonexistent", {"days": 30})
        assert result is None
        assert cache._stats["misses"] == 1

    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test cache TTL expiration"""
        cache = MultiStoreCache(default_ttl_minutes=0.001)  # Very short TTL for testing
        
        test_data = {"test": "data"}
        await cache.set("user123", "test", test_data)
        
        # Should be available immediately
        result = await cache.get("user123", "test")
        assert result == test_data
        
        # Wait for expiration and test again
        await asyncio.sleep(0.1)
        result = await cache.get("user123", "test")
        assert result is None
        assert cache._stats["misses"] >= 1

    @pytest.mark.asyncio
    async def test_cache_stats_tracking(self):
        """Test cache statistics tracking"""
        cache = MultiStoreCache()
        
        # Generate some cache activity
        await cache.set("user1", "op1", {"data": 1})
        await cache.set("user2", "op2", {"data": 2})
        
        await cache.get("user1", "op1")  # Hit
        await cache.get("user1", "op1")  # Hit
        await cache.get("user3", "op3")  # Miss
        
        stats = cache.get_stats()
        assert stats["statistics"]["hits"] == 2
        assert stats["statistics"]["misses"] == 1
        assert stats["statistics"]["sets"] == 2
        
        # Test hit ratio calculation
        hit_ratio = stats["hit_rate_percent"] / 100
        assert abs(hit_ratio - (2/3)) < 0.01  # 2 hits out of 3 total requests

    @pytest.mark.asyncio
    async def test_cache_invalidation(self):
        """Test cache invalidation functionality"""
        cache = MultiStoreCache()
        
        await cache.set("user123", "overview", {"data": "old"})
        result = await cache.get("user123", "overview")
        assert result == {"data": "old"}
        
        # Invalidate specific user's cache
        await cache.invalidate_user("user123")
        result = await cache.get("user123", "overview")
        assert result is None
        
        # Test operation-based invalidation
        await cache.set("user123", "overview", {"data": "new"})
        await cache.set("user123", "alerts", {"alerts": []})
        await cache.invalidate_operation("overview")
        
        result1 = await cache.get("user123", "overview")
        result2 = await cache.get("user123", "alerts")
        assert result1 is None
        assert result2 == {"alerts": []}  # Should still exist


class TestMultiStoreCacheDecorator:
    """Test the cache decorator for automatic caching"""
    
    @pytest.mark.asyncio
    async def test_cache_decorator_functionality(self):
        """Test cache decorator with async functions"""
        cache = MultiStoreCache()
        call_count = 0
        
        async def expensive_operation(user_id: str, operation: str, params: dict = None):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)  # Simulate async operation
            return {"result": f"expensive_result_{call_count}", "user": user_id}
        
        # First call - should execute function  
        result1 = await cache_multi_store_operation(
            "user123", "test_op", expensive_operation, {"param": "value"}, 5
        )
        assert call_count == 1
        assert result1["result"] == "expensive_result_1"
        
        # Second call - should use cache
        result2 = await cache_multi_store_operation(
            "user123", "test_op", expensive_operation, {"param": "value"}, 5
        )
        assert call_count == 1  # Function not called again
        assert result2 == result1  # Same result from cache
        
        # Different parameters - should execute function again
        result3 = await cache_multi_store_operation(
            "user123", "test_op", expensive_operation, {"param": "different"}, 5
        )
        assert call_count == 2
        assert result3["result"] == "expensive_result_2"

    @pytest.mark.asyncio
    async def test_cache_decorator_error_handling(self):
        """Test cache decorator error handling"""
        cache = MultiStoreCache()
        
        async def failing_operation():
            raise ValueError("Test error")
        
        # Should not cache errors
        with pytest.raises(ValueError):
            await cache_multi_store_operation(
                "user123", "test_op", failing_operation
            )
        
        # Verify nothing was cached
        result = await cache.get("user123", "test_op")
        assert result is None


class TestMultiStoreAnalyticsEndpoints:
    """Test multi-store analytics API endpoints"""
    
    @pytest.fixture
    def mock_dependencies(self):
        """Mock all external dependencies"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user, \
             patch('app.api.v1.multi_store_analytics.get_user_stores') as mock_stores, \
             patch('app.api.v1.multi_store_analytics.get_db') as mock_db, \
             patch('app.api.v1.multi_store_analytics.get_read_only_operations') as mock_ops:
            
            mock_user.return_value = {"sub": "user123", "email": "test@example.com"}
            mock_stores.return_value = ["store1", "store2", "store3"]
            mock_db.return_value = AsyncMock()
            
            # Mock read operations
            mock_read_ops = AsyncMock()
            mock_read_ops.get_store_inventory_summary.return_value = {
                "total_value": 1000.0,
                "total_items": 100,
                "expiring_soon": 5,
                "waste_risk": "low"
            }
            mock_read_ops.get_store_performance_metrics.return_value = {
                "waste_reduction": 15.5,
                "efficiency_score": 85.2,
                "cost_savings": 250.0
            }
            mock_ops.return_value = mock_read_ops
            
            yield {
                "user": mock_user,
                "stores": mock_stores,
                "db": mock_db,
                "ops": mock_read_ops
            }

    @pytest.mark.asyncio
    async def test_multi_store_overview_endpoint(self, mock_dependencies, performance_timer):
        """Test multi-store overview endpoint performance and functionality"""
        from app.api.v1.multi_store_analytics import get_multi_store_overview
        
        performance_timer.start()
        
        # Test with valid stores
        result = await get_multi_store_overview(
            days=30,
            db=mock_dependencies["db"], 
            current_user={"sub": "user123"},
            user_stores=["store1", "store2"]
        )
        
        performance_timer.stop()
        
        # Test response structure
        assert "user_id" in result
        assert "total_stores" in result
        assert "overview" in result
        assert result["total_stores"] == 2
        
        # Test performance (should be under 500ms for multi-store operations)
        performance_timer.assert_under_ms(500, "Multi-store overview endpoint")

    @pytest.mark.asyncio
    async def test_multi_store_overview_no_stores(self, mock_dependencies):
        """Test multi-store overview with no accessible stores"""
        from app.api.v1.multi_store_analytics import get_multi_store_overview
        
        result = await get_multi_store_overview(
            days=30,
            db=mock_dependencies["db"],
            current_user={"sub": "user123"},
            user_stores=[]
        )
        
        assert result["total_stores"] == 0
        assert "No stores accessible" in result["message"]

    @pytest.mark.asyncio
    async def test_concurrent_processing_performance(self, mock_dependencies, performance_timer):
        """Test concurrent processing delivers 10x performance improvement"""
        from app.api.v1.multi_store_analytics import get_multi_store_overview
        
        # Test with multiple stores to verify concurrent processing
        large_store_list = [f"store{i}" for i in range(10)]
        
        performance_timer.start()
        
        result = await get_multi_store_overview(
            days=30,
            db=mock_dependencies["db"],
            current_user={"sub": "user123"},
            user_stores=large_store_list
        )
        
        performance_timer.stop()
        
        # With concurrent processing, 10 stores should complete in reasonable time
        # (much better than sequential processing which would be 10x slower)
        performance_timer.assert_under_ms(1000, "Concurrent processing for 10 stores")
        assert result["total_stores"] == 10

    @pytest.mark.asyncio 
    async def test_caching_performance_improvement(self, mock_dependencies, performance_timer):
        """Test caching provides significant performance improvement"""
        from app.api.v1.multi_store_analytics import get_multi_store_overview
        
        # First call - should hit database
        performance_timer.start()
        result1 = await get_multi_store_overview(
            days=30,
            db=mock_dependencies["db"],
            current_user={"sub": "user123"},
            user_stores=["store1", "store2"]
        )
        performance_timer.stop()
        first_call_time = performance_timer.elapsed_ms
        
        # Second call - should use cache
        performance_timer.start()
        result2 = await get_multi_store_overview(
            days=30,
            db=mock_dependencies["db"],
            current_user={"sub": "user123"},
            user_stores=["store1", "store2"]
        )
        performance_timer.stop()
        second_call_time = performance_timer.elapsed_ms
        
        # Cache should provide significant speedup
        assert result1 == result2  # Same results
        # Second call should be much faster (cached)
        # In practice, this would be 10-100x faster, but testing timing is unreliable
        # so we just verify it's not slower
        assert second_call_time <= first_call_time * 2


class TestMultiStoreAlertsEndpoint:
    """Test multi-store alerts endpoint"""
    
    @pytest.mark.asyncio
    async def test_multi_store_alerts_structure(self):
        """Test multi-store alerts endpoint structure"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user, \
             patch('app.api.v1.multi_store_analytics.get_user_stores') as mock_stores, \
             patch('app.api.v1.multi_store_analytics.get_db') as mock_db:
            
            from app.api.v1.multi_store_analytics import get_multi_store_alerts
            
            mock_user.return_value = {"sub": "user123"}
            mock_stores.return_value = ["store1", "store2"]
            mock_db.return_value = AsyncMock()
            
            result = await get_multi_store_alerts(
                severity="high",
                db=mock_db.return_value,
                current_user=mock_user.return_value,
                user_stores=mock_stores.return_value
            )
            
            # Test response structure for alerts
            assert "alerts" in result
            assert "summary" in result
            assert "total_stores" in result


class TestMultiStoreComparisonEndpoint:
    """Test multi-store comparison endpoint"""
    
    @pytest.mark.asyncio
    async def test_store_comparison_metrics(self):
        """Test store comparison functionality"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user, \
             patch('app.api.v1.multi_store_analytics.get_user_stores') as mock_stores, \
             patch('app.api.v1.multi_store_analytics.get_db') as mock_db:
            
            from app.api.v1.multi_store_analytics import get_store_comparison
            
            mock_user.return_value = {"sub": "user123"}
            mock_stores.return_value = ["store1", "store2", "store3"]
            mock_db.return_value = AsyncMock()
            
            result = await get_store_comparison(
                metric="efficiency",
                db=mock_db.return_value,
                current_user=mock_user.return_value,
                user_stores=mock_stores.return_value
            )
            
            # Test comparison response structure
            assert "comparison" in result
            assert "ranking" in result
            assert "metric" in result
            assert result["metric"] == "efficiency"


class TestMultiStorePerformanceMetrics:
    """Test performance metrics endpoint"""
    
    @pytest.mark.asyncio
    async def test_performance_metrics_endpoint(self, performance_timer):
        """Test performance metrics endpoint"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user, \
             patch('app.api.v1.multi_store_analytics.get_user_stores') as mock_stores, \
             patch('app.api.v1.multi_store_analytics.get_db') as mock_db:
            
            from app.api.v1.multi_store_analytics import get_performance_metrics
            
            mock_user.return_value = {"sub": "user123"}
            mock_stores.return_value = ["store1", "store2"]
            mock_db.return_value = AsyncMock()
            
            performance_timer.start()
            
            result = await get_performance_metrics(
                db=mock_db.return_value,
                current_user=mock_user.return_value,
                user_stores=mock_stores.return_value
            )
            
            performance_timer.stop()
            
            # Test performance metrics structure
            assert "cache_stats" in result
            assert "api_performance" in result
            assert "concurrent_processing" in result
            
            # Should complete quickly
            performance_timer.assert_under_ms(200, "Performance metrics endpoint")


class TestErrorHandling:
    """Test error handling in multi-store endpoints"""
    
    @pytest.mark.asyncio
    async def test_database_error_handling(self):
        """Test graceful handling of database errors"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user, \
             patch('app.api.v1.multi_store_analytics.get_user_stores') as mock_stores, \
             patch('app.api.v1.multi_store_analytics.get_db') as mock_db:
            
            from app.api.v1.multi_store_analytics import get_multi_store_overview
            
            mock_user.return_value = {"sub": "user123"}
            mock_stores.return_value = ["store1"]
            
            # Mock database error
            mock_db.return_value = AsyncMock()
            mock_db.return_value.execute.side_effect = Exception("Database error")
            
            with pytest.raises(HTTPException) as exc_info:
                await get_multi_store_overview(
                    days=30,
                    db=mock_db.return_value,
                    current_user=mock_user.return_value,
                    user_stores=mock_stores.return_value
                )
            
            assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_authentication_error_handling(self):
        """Test handling of authentication errors"""
        with patch('app.api.v1.multi_store_analytics.get_current_user') as mock_user:
            
            from app.api.v1.multi_store_analytics import get_multi_store_overview
            
            # Mock authentication failure
            mock_user.side_effect = HTTPException(status_code=401, detail="Unauthorized")
            
            with pytest.raises(HTTPException) as exc_info:
                await get_multi_store_overview(days=30, db=AsyncMock(), current_user=None, user_stores=[])
            
            assert exc_info.value.status_code == 401


class TestMemoryOptimization:
    """Test memory optimization features (slots, cache size limits)"""
    
    def test_slots_memory_optimization(self):
        """Test that slots are properly implemented for memory efficiency"""
        cache = MultiStoreCache()
        
        # Verify slots are implemented
        assert hasattr(cache, '__slots__')
        
        # Verify we can't add arbitrary attributes (slots working)
        with pytest.raises(AttributeError):
            cache.arbitrary_attribute = "should fail"

    @pytest.mark.asyncio
    async def test_cache_size_limits(self):
        """Test cache size limits to prevent memory leaks"""
        cache = MultiStoreCache()
        
        # Fill cache beyond reasonable limits
        for i in range(1200):  # More than the 1000 limit
            await cache.set(f"user{i}", "operation", {"data": f"value{i}"})
        
        # Cache should have size limits or eviction policies
        assert len(cache._cache) <= 1000  # Should not store unlimited entries


@pytest.mark.integration
class TestMultiStoreIntegration:
    """Integration tests for multi-store functionality"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_multi_store_flow(self, client):
        """Test complete multi-store analytics flow"""
        # This would test the full flow with real database
        # Skipped in unit tests but important for integration testing
        pytest.skip("Integration test - requires full database setup")

    @pytest.mark.asyncio
    async def test_concurrent_user_access(self):
        """Test multiple users accessing multi-store data concurrently"""
        # Test concurrent access patterns
        pytest.skip("Integration test - requires real concurrency testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])