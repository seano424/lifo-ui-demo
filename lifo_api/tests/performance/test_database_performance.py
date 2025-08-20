"""
Comprehensive performance tests for database operations and caching
Tests mobile query optimization, cache effectiveness, and memory management
"""

import asyncio
import time
from unittest.mock import AsyncMock, patch

import pytest

from app.utils.performance import (
    BoundedCache,
    PerformanceMonitor,
    cached_mobile_response,
    mobile_cache,
    mobile_performance_health_check,
)


@pytest.mark.performance
@pytest.mark.unit
class TestBoundedCachePerformance:
    """Test bounded cache performance and memory safety"""

    @pytest.mark.asyncio
    async def test_cache_memory_bounds(self, memory_tracker):
        """Test cache respects memory bounds and prevents leaks"""
        memory_tracker.start()

        # Create cache with small bounds for testing
        cache = BoundedCache(max_size=100, default_ttl=60)

        # Fill cache beyond capacity
        for i in range(200):  # Double the max size
            await cache.set(f"key_{i}", f"value_{i}_{'x' * 1000}")  # 1KB values
            memory_tracker.update_peak()

        # Cache size should be bounded
        assert cache.cache_size() <= 100

        # Memory usage should be reasonable
        memory_tracker.assert_no_significant_leak(threshold_mb=10)

    @pytest.mark.asyncio
    async def test_cache_performance_under_load(self, performance_timer):
        """Test cache performance under concurrent load"""
        cache = BoundedCache(max_size=1000, default_ttl=300)

        async def cache_operations():
            # Mix of set and get operations
            for i in range(100):
                await cache.set(f"load_key_{i}", f"load_value_{i}")
                retrieved = await cache.get(f"load_key_{i}")
                assert retrieved == f"load_value_{i}"

        performance_timer.start()

        # Run concurrent cache operations
        await asyncio.gather(*[cache_operations() for _ in range(10)])

        performance_timer.stop()

        # Should complete within reasonable time
        performance_timer.assert_under_ms(5000, "Cache operations under load")

        # Verify cache integrity
        assert cache.cache_size() <= 1000

    @pytest.mark.asyncio
    async def test_cache_lru_eviction_performance(self):
        """Test LRU eviction performance doesn't degrade"""
        cache = BoundedCache(max_size=50, default_ttl=300)

        # Fill cache to capacity
        for i in range(50):
            await cache.set(f"key_{i}", f"value_{i}")

        # Measure eviction performance
        eviction_times = []

        for i in range(50, 100):  # Trigger 50 evictions
            start_time = time.time()
            await cache.set(f"key_{i}", f"value_{i}")
            eviction_time = (time.time() - start_time) * 1000
            eviction_times.append(eviction_time)

        # Eviction times should remain consistent (not degrade)
        avg_eviction_time = sum(eviction_times) / len(eviction_times)
        max_eviction_time = max(eviction_times)

        assert avg_eviction_time < 10, (
            f"Average eviction too slow: {avg_eviction_time:.1f}ms"
        )
        assert max_eviction_time < 50, (
            f"Max eviction too slow: {max_eviction_time:.1f}ms"
        )

    @pytest.mark.asyncio
    async def test_cache_ttl_cleanup_performance(self):
        """Test TTL cleanup performance"""
        cache = BoundedCache(max_size=100, default_ttl=1)  # 1 second TTL

        # Fill cache with short-lived items
        for i in range(50):
            await cache.set(f"short_key_{i}", f"short_value_{i}", ttl=1)

        # Wait for items to expire
        await asyncio.sleep(2)

        # Measure cleanup performance
        start_time = time.time()
        cleaned_count = await cache.cleanup_expired()
        cleanup_time = (time.time() - start_time) * 1000

        assert cleaned_count == 50, "Should have cleaned all expired items"
        assert cleanup_time < 100, f"Cleanup too slow: {cleanup_time:.1f}ms"

    @pytest.mark.asyncio
    async def test_cache_stats_accuracy(self):
        """Test cache statistics accuracy under various operations"""
        cache = BoundedCache(max_size=100, default_ttl=300)

        # Initial stats
        stats = cache.get_stats()
        assert stats["current_size"] == 0
        assert stats["utilization"] == 0.0

        # Add items and check stats
        for i in range(25):
            await cache.set(f"stats_key_{i}", f"stats_value_{i}")

        stats = cache.get_stats()
        assert stats["current_size"] == 25
        assert stats["utilization"] == 25.0

        # Clear prefix and check stats
        await cache.clear_prefix("stats_key_1")  # Should clear keys 1, 10-19
        stats = cache.get_stats()
        assert stats["current_size"] < 25  # Should have fewer items


@pytest.mark.performance
@pytest.mark.unit
class TestPerformanceMonitoring:
    """Test performance monitoring functionality"""

    def test_performance_monitor_accuracy(self):
        """Test performance monitor records accurate metrics"""
        monitor = PerformanceMonitor()

        # Record some operations
        monitor.record_operation("test_op", 150.0, True)  # Fast success
        monitor.record_operation("test_op", 600.0, True)  # Slow success
        monitor.record_operation("test_op", 200.0, False)  # Fast failure

        summary = monitor.get_summary()
        assert "test_op" in summary

        stats = summary["test_op"]
        assert stats["total_calls"] == 3
        assert stats["success_rate"] == 2 / 3  # 2 successes out of 3
        assert stats["slow_call_rate"] == 1 / 3  # 1 slow call out of 3
        assert abs(stats["avg_duration_ms"] - 316.67) < 1  # (150+600+200)/3
        assert stats["fastest_ms"] == 150.0
        assert stats["slowest_ms"] == 600.0

    def test_performance_monitor_threshold_detection(self):
        """Test performance monitor correctly identifies slow operations"""
        monitor = PerformanceMonitor()
        monitor.slow_threshold_ms = 300  # Set threshold

        # Record operations around threshold
        monitor.record_operation("border_op", 299.0, True)  # Just under
        monitor.record_operation("border_op", 301.0, True)  # Just over
        monitor.record_operation("border_op", 500.0, True)  # Well over

        summary = monitor.get_summary()
        stats = summary["border_op"]

        assert stats["slow_call_rate"] == 2 / 3  # 2 calls over 300ms threshold

    def test_performance_monitor_memory_efficiency(self, memory_tracker):
        """Test performance monitor doesn't leak memory with many operations"""
        memory_tracker.start()

        monitor = PerformanceMonitor()

        # Record many operations
        for i in range(10000):
            operation_name = f"op_{i % 100}"  # 100 different operation names
            monitor.record_operation(operation_name, 100.0 + (i % 50), True)

            if i % 1000 == 0:
                memory_tracker.update_peak()

        # Should not leak significant memory
        memory_tracker.assert_no_significant_leak(threshold_mb=5)

        # Should have reasonable number of operations tracked
        summary = monitor.get_summary()
        assert len(summary) == 100  # 100 different operation names


@pytest.mark.performance
@pytest.mark.integration
class TestMobileQueryOptimization:
    """Test mobile query optimization performance"""

    @pytest.mark.asyncio
    async def test_mobile_cache_decorator_performance(self):
        """Test mobile cache decorator performance impact"""

        @cached_mobile_response(ttl=60, prefix="test")
        async def mock_expensive_operation(store_id: str, complexity: int):
            # Simulate expensive operation
            await asyncio.sleep(0.1 * complexity)  # 100ms per complexity unit
            return {"store_id": store_id, "data": f"result_{complexity}"}

        store_id = "perf-test-store"

        # First call - should be slow (cache miss)
        start_time = time.time()
        result1 = await mock_expensive_operation(store_id, 3)  # 300ms simulated work
        first_call_time = (time.time() - start_time) * 1000

        # Second call - should be fast (cache hit)
        start_time = time.time()
        result2 = await mock_expensive_operation(store_id, 3)  # Same parameters
        second_call_time = (time.time() - start_time) * 1000

        # Verify results are identical
        assert result1 == result2

        # Verify caching performance improvement
        assert first_call_time > 250  # Should include the simulated delay
        assert second_call_time < 50  # Should be much faster (cached)

        performance_improvement = first_call_time / second_call_time
        assert performance_improvement > 5, (
            f"Cache should provide >5x improvement, got {performance_improvement:.1f}x"
        )

    @pytest.mark.asyncio
    async def test_mobile_cache_memory_efficiency(self, memory_tracker):
        """Test mobile cache doesn't cause memory leaks"""
        memory_tracker.start()

        @cached_mobile_response(ttl=60, prefix="memory_test")
        async def cached_operation(item_id: int):
            # Return varying size data
            return {"id": item_id, "data": "x" * (item_id % 1000)}

        # Perform many cached operations
        for i in range(1000):
            await cached_operation(i % 100)  # Reuse some keys to test cache efficiency

            if i % 100 == 0:
                memory_tracker.update_peak()

        # Should not leak significant memory
        memory_tracker.assert_no_significant_leak(threshold_mb=10)

    @pytest.mark.asyncio
    async def test_concurrent_cache_access(self):
        """Test cache performance under concurrent access"""

        @cached_mobile_response(ttl=300, prefix="concurrent")
        async def concurrent_operation(operation_id: int):
            await asyncio.sleep(0.01)  # Small delay
            return {"operation_id": operation_id, "timestamp": time.time()}

        # Run many concurrent operations
        start_time = time.time()

        tasks = []
        for i in range(100):
            # Some operations use same IDs (should hit cache)
            operation_id = i % 20  # 20 unique operations, 5 calls each
            tasks.append(concurrent_operation(operation_id))

        results = await asyncio.gather(*tasks)
        total_time = (time.time() - start_time) * 1000

        # Should complete reasonably quickly due to caching
        assert total_time < 500, f"Concurrent operations too slow: {total_time:.1f}ms"

        # Verify cache effectiveness - operations with same ID should return same timestamp
        results_by_id = {}
        for result in results:
            op_id = result["operation_id"]
            if op_id not in results_by_id:
                results_by_id[op_id] = []
            results_by_id[op_id].append(result["timestamp"])

        # Each operation ID should have the same timestamp (cached result)
        for op_id, timestamps in results_by_id.items():
            assert len(set(timestamps)) == 1, (
                f"Operation {op_id} timestamps not cached: {timestamps}"
            )


@pytest.mark.performance
@pytest.mark.integration
class TestMobileEndpointPerformanceIntegration:
    """Test mobile endpoint performance in integrated scenarios"""

    @pytest.mark.asyncio
    async def test_mobile_summary_database_optimization(
        self, async_client, mock_api_key_auth, performance_timer
    ):
        """Test mobile summary endpoint database query optimization"""

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Mock optimized query that returns quickly
            mock_opt_instance = AsyncMock()

            # Simulate database optimization - fast response
            async def fast_inventory_query(*args, **kwargs):
                await asyncio.sleep(0.05)  # 50ms simulated DB query
                return [
                    {
                        "batch_id": f"batch-{i}",
                        "sku": f"SKU-{i:03d}",
                        "category": "fresh_produce",
                        "current_quantity": 10,
                        "selling_price": 2.50,
                        "cost_price": 1.00,
                        "days_to_expiry": i % 5,
                        "location_code": "A1",
                    }
                    for i in range(50)  # Reasonable dataset size
                ]

            mock_opt_instance.get_store_inventory_fast.side_effect = (
                fast_inventory_query
            )
            mock_optimizer.return_value = mock_opt_instance

            # Test multiple requests to verify consistent performance
            response_times = []

            for _ in range(5):
                performance_timer.start()
                response = await async_client.get(
                    "/api/v1/mobile-summary/test-store-123"
                )
                performance_timer.stop()

                assert response.status_code == 200
                response_times.append(performance_timer.elapsed_ms)

            # All responses should meet mobile performance targets
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)

            assert avg_response_time < 200, (
                f"Average response time too slow: {avg_response_time:.1f}ms"
            )
            assert max_response_time < 300, (
                f"Max response time too slow: {max_response_time:.1f}ms"
            )

            # Performance should be consistent (low variance)
            response_variance = sum(
                (t - avg_response_time) ** 2 for t in response_times
            ) / len(response_times)
            assert response_variance < 10000, (
                f"Response time too variable: {response_variance:.1f}"
            )

    @pytest.mark.asyncio
    async def test_batch_scoring_performance_optimization(
        self, async_client, mock_api_key_auth, performance_timer
    ):
        """Test batch scoring performance optimization"""

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()

            # Ultra-fast scoring query
            async def fast_score_query(batch_id):
                await asyncio.sleep(0.01)  # 10ms simulated query
                return {
                    "batch_id": batch_id,
                    "days_to_expiry": 2,
                    "category": "fresh_produce",
                    "cost_price": 1.00,
                    "selling_price": 2.50,
                    "typical_shelf_life_days": 7,
                }

            mock_opt_instance.get_batch_quick_score_data.side_effect = fast_score_query
            mock_optimizer.return_value = mock_opt_instance

            # Test rapid successive scoring requests
            batch_ids = [f"batch-{i:03d}" for i in range(10)]

            performance_timer.start()

            tasks = []
            for batch_id in batch_ids:
                task = async_client.post(
                    f"/api/v1/batch-quick-score/{batch_id}?store_id=test-store-123"
                )
                tasks.append(task)

            responses = await asyncio.gather(*tasks)
            performance_timer.stop()

            # All requests should succeed
            for response in responses:
                assert response.status_code == 200

            # Total time for 10 concurrent requests should be reasonable
            total_time = performance_timer.elapsed_ms
            avg_time_per_request = total_time / len(batch_ids)

            assert total_time < 1000, f"Concurrent scoring too slow: {total_time:.1f}ms"
            assert avg_time_per_request < 200, (
                f"Average scoring too slow: {avg_time_per_request:.1f}ms"
            )

    @pytest.mark.asyncio
    async def test_cache_warming_performance(self):
        """Test cache warming performance and effectiveness"""

        with patch("app.utils.performance.warm_mobile_cache") as mock_warm_cache:

            async def simulate_cache_warming(store_id, read_ops):
                # Simulate cache warming operations
                await asyncio.sleep(0.1)  # 100ms to warm cache

                # Populate test cache
                await mobile_cache.set(
                    f"mobile_summary_{store_id}", {"cached": True}, ttl=300
                )
                await mobile_cache.set(
                    f"store_health_{store_id}", {"health": 0.95}, ttl=300
                )

            mock_warm_cache.side_effect = simulate_cache_warming

            store_id = "test-store-warming"

            # Measure cache warming time
            start_time = time.time()
            await mock_warm_cache(store_id, None)
            warming_time = (time.time() - start_time) * 1000

            assert warming_time < 500, f"Cache warming too slow: {warming_time:.1f}ms"

            # Verify cache was populated
            cached_summary = await mobile_cache.get(f"mobile_summary_{store_id}")
            cached_health = await mobile_cache.get(f"store_health_{store_id}")

            assert cached_summary is not None
            assert cached_health is not None


@pytest.mark.performance
@pytest.mark.integration
class TestSystemPerformanceHealth:
    """Test overall system performance health monitoring"""

    @pytest.mark.asyncio
    async def test_mobile_performance_health_check(self):
        """Test mobile performance health check comprehensive monitoring"""

        with patch("app.utils.performance.performance_monitor") as mock_monitor:
            # Mock performance data
            mock_monitor.get_summary.return_value = {
                "mobile_summary": {
                    "avg_duration_ms": 250,
                    "success_rate": 0.98,
                    "slow_call_rate": 0.05,
                    "total_calls": 1000,
                },
                "quick_score": {
                    "avg_duration_ms": 150,
                    "success_rate": 0.99,
                    "slow_call_rate": 0.02,
                    "total_calls": 2000,
                },
            }

            health_report = await mobile_performance_health_check()

            # Verify health report structure
            required_fields = [
                "performance_summary",
                "cache_statistics",
                "performance_issues",
                "overall_health",
                "memory_leak_fixed",
            ]
            for field in required_fields:
                assert field in health_report

            # Verify health assessment logic
            assert health_report["overall_health"] in ["good", "needs_attention"]
            assert isinstance(health_report["performance_issues"], list)
            assert health_report["memory_leak_fixed"] is True

    @pytest.mark.asyncio
    async def test_performance_degradation_detection(self):
        """Test detection of performance degradation"""

        monitor = PerformanceMonitor()

        # Record initially good performance
        for _ in range(100):
            monitor.record_operation("test_endpoint", 200.0, True)

        # Simulate performance degradation
        for _ in range(50):
            monitor.record_operation("test_endpoint", 800.0, True)  # Much slower

        summary = monitor.get_summary()
        stats = summary["test_endpoint"]

        # Should detect degradation
        assert stats["avg_duration_ms"] > 400  # Average should reflect degradation
        assert stats["slow_call_rate"] > 0.25  # Should have high slow call rate

    @pytest.mark.asyncio
    async def test_memory_leak_prevention_verification(self, memory_tracker):
        """Test that memory leak prevention measures are effective"""
        memory_tracker.start()

        # Simulate heavy cache usage that previously caused leaks
        cache = BoundedCache(max_size=500, default_ttl=60)

        # Perform operations that could cause memory leaks
        for cycle in range(10):  # 10 cycles of cache filling
            for i in range(1000):  # Try to add 1000 items each cycle
                key = f"cycle_{cycle}_item_{i}"
                value = {"data": "x" * 1000, "cycle": cycle, "item": i}  # 1KB objects
                await cache.set(key, value)

                if i % 100 == 0:
                    memory_tracker.update_peak()

            # Force cleanup
            await cache.cleanup_expired()

        # Memory should be bounded due to cache size limits and cleanup
        memory_tracker.assert_no_significant_leak(threshold_mb=25)

        # Cache should maintain size bounds
        assert cache.cache_size() <= 500

    @pytest.mark.asyncio
    async def test_concurrent_performance_monitoring(self):
        """Test performance monitoring under concurrent load"""

        monitor = PerformanceMonitor()

        async def concurrent_operations():
            for i in range(100):
                operation_name = f"concurrent_op_{i % 10}"
                duration = 100 + (i % 50)  # Varying durations
                success = i % 20 != 0  # Occasional failures
                monitor.record_operation(operation_name, duration, success)

        # Run concurrent monitoring
        await asyncio.gather(*[concurrent_operations() for _ in range(10)])

        summary = monitor.get_summary()

        # Should have recorded all operations accurately
        total_calls = sum(stats["total_calls"] for stats in summary.values())
        assert total_calls == 1000  # 10 concurrent * 100 operations each

        # Should have 10 different operation names
        assert len(summary) == 10

        # All operations should have reasonable statistics
        for op_name, stats in summary.items():
            assert stats["total_calls"] == 100  # Each operation called 100 times
            assert 0 <= stats["success_rate"] <= 1
            assert stats["avg_duration_ms"] > 0
