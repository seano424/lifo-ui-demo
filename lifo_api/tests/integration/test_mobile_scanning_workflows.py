"""
End-to-end integration tests for mobile scanning workflows
Tests complete mobile scanning scenarios with realistic data flows
"""

import json
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.integration
@pytest.mark.mobile
class TestCompleteMobileScanningWorkflow:
    """Test complete mobile scanning workflow integration"""

    @pytest.mark.asyncio
    async def test_complete_store_scanning_workflow(
        self, async_client, mock_api_key_auth, test_data_factory, performance_timer
    ):
        """Test complete store scanning workflow from login to action"""
        
        store_id = "integration-store-123"
        
        # Create realistic test data
        urgent_batches = test_data_factory.create_urgent_batch_list(count=5)
        normal_batches = [
            test_data_factory.create_inventory_batch(
                batch_id=f"normal-batch-{i}",
                days_to_expiry=10 + i,
                category="frozen"
            )
            for i in range(10)
        ]
        
        all_batches = urgent_batches + normal_batches
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = all_batches
            mock_opt_instance.get_store_health_metrics.return_value = {
                "total_batches": len(all_batches),
                "critical_batches": len(urgent_batches),
                "expiring_soon": 2,
                "total_value": 5000.0
            }
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer integration-test-key"}
            
            # Step 1: Get mobile summary (store overview)
            performance_timer.start()
            summary_response = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            performance_timer.stop()
            
            assert summary_response.status_code == 200
            assert performance_timer.elapsed_ms < 300  # Mobile performance target
            
            summary_data = summary_response.json()
            assert len(summary_data["urgent_batches"]) > 0
            assert summary_data["store_health_score"] < 1.0  # Should reflect urgent items
            
            # Step 2: Get detailed batch list for urgent items
            batch_list_response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}?urgency_filter=critical&limit=10",
                headers=headers
            )
            
            assert batch_list_response.status_code == 200
            batch_data = batch_list_response.json()
            
            assert len(batch_data["batches"]) > 0
            assert batch_data["mobile_optimized"] is True
            
            # Step 3: Quick score individual urgent batches
            urgent_batch_id = batch_data["batches"][0]["batch_id"]
            
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": urgent_batch_id,
                "days_to_expiry": 0,  # Expired - should trigger disposal
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.50,
                "typical_shelf_life_days": 7
            }
            
            performance_timer.start()
            score_response = await async_client.post(
                f"/api/v1/batch-quick-score/{urgent_batch_id}?store_id={store_id}",
                headers=headers
            )
            performance_timer.stop()
            
            assert score_response.status_code == 200
            assert performance_timer.elapsed_ms < 200  # Scoring performance target
            
            score_data = score_response.json()
            # Expired products should always be critical and require disposal
            assert score_data["urgency_level"] == "critical"
            assert score_data["suggested_action"] == "dispose"
            assert score_data["discount_percent"] == 0  # No discounts on expired products
            
            # Step 4: Check store health after scanning
            health_response = await async_client.get(
                f"/api/v1/store-health/{store_id}",
                headers=headers
            )
            
            assert health_response.status_code == 200
            health_data = health_response.json()
            
            assert health_data["critical_items"] > 0
            assert health_data["next_recommended_action"] is not None

    @pytest.mark.asyncio
    async def test_mobile_scanning_with_cache_optimization(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test mobile scanning workflow with cache optimization"""
        
        store_id = "cache-test-store-456"
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                test_data_factory.create_inventory_batch(
                    batch_id=f"cache-batch-{i}",
                    days_to_expiry=i % 3,  # Mix of urgencies
                    category="dairy"
                )
                for i in range(20)
            ]
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer cache-test-key"}
            
            # First request - should be slow (cache miss)
            start_time = time.time()
            response1 = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            first_request_time = (time.time() - start_time) * 1000
            
            assert response1.status_code == 200
            
            # Second request - should be faster (cache hit)
            start_time = time.time()
            response2 = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            second_request_time = (time.time() - start_time) * 1000
            
            assert response2.status_code == 200
            
            # Verify cache effectiveness
            cache_improvement = first_request_time / max(second_request_time, 1)
            assert cache_improvement > 2, f"Cache should provide >2x improvement, got {cache_improvement:.1f}x"
            
            # Verify data consistency
            assert response1.json() == response2.json()

    @pytest.mark.asyncio
    async def test_multi_store_scanning_workflow(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test scanning workflow across multiple stores"""
        
        stores = ["multi-store-1", "multi-store-2", "multi-store-3"]
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            def get_store_data(store_id):
                # Different urgency profiles per store
                urgency_map = {
                    "multi-store-1": [0, 1, 2],  # Very urgent
                    "multi-store-2": [5, 10, 15],  # Medium urgency
                    "multi-store-3": [20, 25, 30]  # Low urgency
                }
                
                return [
                    test_data_factory.create_inventory_batch(
                        batch_id=f"{store_id}-batch-{i}",
                        days_to_expiry=urgency_map[store_id][i % 3],
                        category="test_category"
                    )
                    for i in range(10)
                ]
            
            mock_opt_instance = AsyncMock()
            
            def mock_get_inventory(store_id, **kwargs):
                return get_store_data(store_id)
            
            mock_opt_instance.get_store_inventory_fast.side_effect = mock_get_inventory
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer multi-store-key"}
            
            store_results = {}
            
            # Scan all stores
            for store_id in stores:
                response = await async_client.get(
                    f"/api/v1/mobile-summary/{store_id}",
                    headers=headers
                )
                
                assert response.status_code == 200
                store_results[store_id] = response.json()
            
            # Verify different urgency profiles
            store1_urgent = len(store_results["multi-store-1"]["urgent_batches"])
            store2_urgent = len(store_results["multi-store-2"]["urgent_batches"])  
            store3_urgent = len(store_results["multi-store-3"]["urgent_batches"])
            
            # Store 1 should have most urgent items
            assert store1_urgent >= store2_urgent >= store3_urgent
            
            # Health scores should reflect urgency
            health1 = store_results["multi-store-1"]["store_health_score"]
            health2 = store_results["multi-store-2"]["store_health_score"]
            health3 = store_results["multi-store-3"]["store_health_score"]
            
            assert health1 <= health2 <= health3  # More urgent = lower health score

    @pytest.mark.asyncio
    async def test_mobile_scanning_error_recovery(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test mobile scanning workflow error recovery"""
        
        store_id = "error-recovery-store"
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            
            # Simulate database error on first call, success on retry
            call_count = 0
            def mock_get_inventory(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    raise Exception("Database connection error")
                return [
                    test_data_factory.create_inventory_batch(
                        batch_id=f"recovery-batch-{i}",
                        days_to_expiry=2,
                        category="test_category"
                    )
                    for i in range(5)
                ]
            
            mock_opt_instance.get_store_inventory_fast.side_effect = mock_get_inventory
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer error-recovery-key"}
            
            # First request should fail
            response1 = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            assert response1.status_code == 500
            
            # Second request should succeed (error recovery)
            response2 = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            assert response2.status_code == 200
            
            data = response2.json()
            assert len(data["urgent_batches"]) > 0


@pytest.mark.integration
@pytest.mark.mobile
class TestMobileScanningPerformanceIntegration:
    """Test mobile scanning performance in integrated scenarios"""

    @pytest.mark.asyncio
    async def test_high_volume_store_scanning(
        self, async_client, mock_api_key_auth, test_data_factory, memory_tracker
    ):
        """Test scanning workflow with high volume store data"""
        
        memory_tracker.start()
        store_id = "high-volume-store"
        
        # Create large dataset
        large_inventory = []
        for i in range(1000):  # 1000 items
            batch = test_data_factory.create_inventory_batch(
                batch_id=f"hv-batch-{i:04d}",
                days_to_expiry=i % 30,  # Various expiry dates
                category=["fresh_produce", "dairy", "frozen", "bakery"][i % 4]
            )
            large_inventory.append(batch)
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = large_inventory[:200]  # Mobile limit
            mock_opt_instance.get_store_health_metrics.return_value = {
                "total_batches": 1000,
                "critical_batches": 50,
                "expiring_soon": 75,
                "total_value": 25000.0
            }
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer high-volume-key"}
            
            # Test mobile summary with large dataset
            start_time = time.time()
            response = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            processing_time = (time.time() - start_time) * 1000
            
            memory_tracker.update_peak()
            
            assert response.status_code == 200
            assert processing_time < 500  # Should still meet mobile targets
            
            data = response.json()
            assert data["total_active_batches"] <= 200  # Should be limited for mobile
            
            # Memory usage should be reasonable
            memory_tracker.assert_no_significant_leak(threshold_mb=20)

    @pytest.mark.asyncio
    async def test_concurrent_mobile_scanning(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test concurrent mobile scanning requests performance"""
        
        import asyncio
        
        stores = [f"concurrent-store-{i}" for i in range(10)]
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            
            def get_concurrent_data(store_id, **kwargs):
                return [
                    test_data_factory.create_inventory_batch(
                        batch_id=f"{store_id}-batch-{i}",
                        days_to_expiry=i % 5,
                        category="concurrent_test"
                    )
                    for i in range(20)
                ]
            
            mock_opt_instance.get_store_inventory_fast.side_effect = get_concurrent_data
            mock_opt_instance.get_store_health_metrics.side_effect = lambda store_id: {
                "total_batches": 20,
                "critical_batches": 4,
                "expiring_soon": 6,
                "total_value": 1000.0
            }
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer concurrent-test-key"}
            
            # Create concurrent requests
            async def scan_store(store_id):
                return await async_client.get(
                    f"/api/v1/mobile-summary/{store_id}",
                    headers=headers
                )
            
            start_time = time.time()
            responses = await asyncio.gather(*[scan_store(store_id) for store_id in stores])
            total_time = (time.time() - start_time) * 1000
            
            # All requests should succeed
            for response in responses:
                assert response.status_code == 200
            
            # Concurrent processing should be efficient
            avg_time_per_request = total_time / len(stores)
            assert avg_time_per_request < 400, f"Concurrent requests too slow: {avg_time_per_request:.1f}ms avg"

    @pytest.mark.asyncio
    async def test_mobile_scanning_memory_efficiency(
        self, async_client, mock_api_key_auth, test_data_factory, memory_tracker
    ):
        """Test mobile scanning memory efficiency over time"""
        
        memory_tracker.start()
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                test_data_factory.create_inventory_batch(
                    batch_id=f"memory-batch-{i}",
                    days_to_expiry=i % 10,
                    category="memory_test"
                )
                for i in range(100)
            ]
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer memory-test-key"}
            
            # Perform many requests over time
            for cycle in range(20):  # 20 cycles
                for store_num in range(5):  # 5 stores per cycle
                    store_id = f"memory-store-{store_num}"
                    
                    response = await async_client.get(
                        f"/api/v1/mobile-summary/{store_id}",
                        headers=headers
                    )
                    assert response.status_code == 200
                    
                    # Also test batch scoring
                    batch_id = f"memory-batch-{cycle}"
                    mock_opt_instance.get_batch_quick_score_data.return_value = {
                        "batch_id": batch_id,
                        "days_to_expiry": 2,
                        "category": "memory_test",
                        "cost_price": 1.00,
                        "selling_price": 2.00,
                        "typical_shelf_life_days": 7
                    }
                    
                    score_response = await async_client.post(
                        f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}",
                        headers=headers
                    )
                    assert score_response.status_code == 200
                
                # Check memory every few cycles
                if cycle % 5 == 0:
                    memory_tracker.update_peak()
            
            # Memory should not have leaked significantly
            memory_tracker.assert_no_significant_leak(threshold_mb=30)


@pytest.mark.integration
@pytest.mark.mobile
class TestMobileScanningDataIntegrity:
    """Test mobile scanning data integrity and consistency"""

    @pytest.mark.asyncio
    async def test_mobile_data_consistency_across_endpoints(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test data consistency between mobile endpoints"""
        
        store_id = "consistency-store"
        
        # Create consistent test data
        test_batches = [
            test_data_factory.create_inventory_batch(
                batch_id=f"consistent-batch-{i}",
                days_to_expiry=i,  # 0 to 4 days
                category="fresh_produce",
                current_quantity=10,
                selling_price=2.50
            )
            for i in range(5)
        ]
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = test_batches
            mock_opt_instance.get_store_health_metrics.return_value = {
                "total_batches": 5,
                "critical_batches": 2,  # batches with 0-1 days
                "expiring_soon": 1,     # batch with 2 days
                "total_value": 125.0    # 5 * 10 * 2.50
            }
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer consistency-test-key"}
            
            # Get mobile summary
            summary_response = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            assert summary_response.status_code == 200
            summary_data = summary_response.json()
            
            # Get batch list
            batch_list_response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}",
                headers=headers
            )
            assert batch_list_response.status_code == 200
            batch_list_data = batch_list_response.json()
            
            # Get store health
            health_response = await async_client.get(
                f"/api/v1/store-health/{store_id}",
                headers=headers
            )
            assert health_response.status_code == 200
            health_data = health_response.json()
            
            # Verify consistency between endpoints
            
            # Total batches should be consistent
            assert summary_data["total_active_batches"] == len(batch_list_data["batches"])
            assert health_data["critical_items"] <= summary_data["total_active_batches"]
            
            # Urgent batches should be consistent
            summary_urgent_count = len(summary_data["urgent_batches"])
            batch_list_urgent_count = len([
                b for b in batch_list_data["batches"] 
                if b.get("urgency_level") == "critical"
            ])
            
            # Should be approximately consistent (allowing for filtering differences)
            assert abs(summary_urgent_count - batch_list_urgent_count) <= 1

    @pytest.mark.asyncio
    async def test_mobile_scoring_consistency(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test scoring consistency between summary and individual scoring"""
        
        store_id = "scoring-consistency-store"
        batch_id = "consistency-batch-001"
        
        # Test batch data
        batch_data = test_data_factory.create_inventory_batch(
            batch_id=batch_id,
            days_to_expiry=1,  # Should be high urgency (but not expired)
            category="fresh_produce",
            cost_price=1.00,
            selling_price=2.50
        )
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [batch_data]
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": batch_id,
                "days_to_expiry": 1,
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.50,
                "typical_shelf_life_days": 7
            }
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer scoring-consistency-key"}
            
            # Get urgency from mobile summary
            summary_response = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}",
                headers=headers
            )
            assert summary_response.status_code == 200
            summary_data = summary_response.json()
            
            # Find our batch in urgent batches
            our_batch = None
            for batch in summary_data["urgent_batches"]:
                if batch["batch_id"] == batch_id:
                    our_batch = batch
                    break
            
            assert our_batch is not None, "Batch should be in urgent list"
            summary_urgency = our_batch["urgency_score"]
            
            # Get individual batch score
            score_response = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}",
                headers=headers
            )
            assert score_response.status_code == 200
            score_data = score_response.json()
            
            # Urgency levels should be consistent
            assert score_data["urgency_level"] in ["critical", "high"]
            
            # Urgency scores should be similar (allowing for algorithm differences)
            # Both should indicate high urgency for 1-day expiry
            assert summary_urgency >= 0.8, f"Summary urgency too low: {summary_urgency}"
            
            # Test with expired product to verify disposal recommendation
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": "expired-test-batch",
                "days_to_expiry": 0,  # Expired
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.50,
                "typical_shelf_life_days": 7
            }
            
            expired_score_response = await async_client.post(
                f"/api/v1/batch-quick-score/expired-test-batch?store_id={store_id}",
                headers=headers
            )
            assert expired_score_response.status_code == 200
            expired_score_data = expired_score_response.json()
            
            # Expired products must always be critical disposal
            assert expired_score_data["urgency_level"] == "critical"
            assert expired_score_data["suggested_action"] == "dispose"
            assert expired_score_data["discount_percent"] == 0

    @pytest.mark.asyncio
    async def test_mobile_filtering_accuracy(
        self, async_client, mock_api_key_auth, test_data_factory
    ):
        """Test mobile filtering accuracy and completeness"""
        
        store_id = "filtering-test-store"
        
        # Create diverse test data
        categories = ["fresh_produce", "dairy", "frozen", "bakery"]
        test_batches = []
        
        for i in range(20):
            batch = test_data_factory.create_inventory_batch(
                batch_id=f"filter-batch-{i:02d}",
                days_to_expiry=i % 5,  # 0-4 days expiry
                category=categories[i % 4],
                current_quantity=10 + (i % 5)
            )
            test_batches.append(batch)
        
        with patch('app.utils.mobile_queries.create_mobile_query_optimizer') as mock_optimizer:
            mock_opt_instance = AsyncMock()
            
            def filter_batches(store_id, limit=None, urgency_filter=None, **kwargs):
                filtered = test_batches
                
                if urgency_filter == "critical":
                    # Filter to only expired/critical items (0-1 days)
                    filtered = [b for b in filtered if b["days_to_expiry"] <= 1]
                
                return filtered[:limit] if limit else filtered
            
            mock_opt_instance.get_store_inventory_fast.side_effect = filter_batches
            mock_optimizer.return_value = mock_opt_instance
            
            headers = {"Authorization": "Bearer filtering-test-key"}
            
            # Test category filter
            for category in categories:
                response = await async_client.get(
                    f"/api/v1/batch-list-mobile/{store_id}?category={category}",
                    headers=headers
                )
                assert response.status_code == 200
                data = response.json()
                
                # All returned batches should match the category
                for batch in data["batches"]:
                    assert batch["category"] == category
                
                # Should have the expected count (5 per category)
                expected_count = len([b for b in test_batches if b["category"] == category])
                assert len(data["batches"]) == expected_count
            
            # Test urgency filter
            response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}?urgency_filter=critical",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            
            # All returned batches should be critical urgency
            for batch in data["batches"]:
                assert batch["urgency_level"] == "critical"
            
            # Test limit parameter
            response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}?limit=5",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            
            # Should respect the limit
            assert len(data["batches"]) <= 5
            assert data["total_count"] == 20  # But total count should be accurate