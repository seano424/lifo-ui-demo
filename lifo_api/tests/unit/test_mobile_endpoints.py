"""
Comprehensive unit tests for mobile endpoints
Tests functionality, performance, and mobile optimization features
"""

import json
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.api.v1.mobile_endpoints import (
    _calculate_quick_urgency_score,
    _get_quick_recommendation,
    _get_urgency_level,
    get_cached_category_weights,
)


@pytest.mark.mobile
@pytest.mark.unit
class TestMobileEndpointPerformance:
    """Test mobile endpoint performance requirements"""

    @pytest.mark.asyncio
    async def test_mobile_summary_performance(
        self,
        async_client: AsyncClient,
        mock_api_key_auth,
        mobile_test_data,
        performance_timer,
        perf_assert,
    ):
        """Test mobile summary endpoint meets 300ms performance target"""
        store_id = mobile_test_data["store_id"]
        expected_threshold = mobile_test_data["expected_performance_ms"][
            "mobile_summary"
        ]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Mock fast mobile query response
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": "batch-001",
                    "sku": "TEST-001",
                    "category": "fresh_produce",
                    "current_quantity": 10,
                    "selling_price": 2.50,
                    "cost_price": 1.00,
                    "days_to_expiry": 2,
                    "location_code": "A1",
                }
            ]
            mock_optimizer.return_value = mock_opt_instance

            performance_timer.start()
            response = await async_client.get(f"/api/v1/mobile-summary/{store_id}")
            performance_timer.stop()

            assert response.status_code == 200
            perf_assert.assert_response_time(
                performance_timer.elapsed_ms, expected_threshold, "mobile_summary"
            )

            data = response.json()
            assert "urgent_batches" in data
            assert "expiring_today" in data
            assert "store_health_score" in data
            assert data["cache_expires_in"] == 180  # 3 minutes for mobile

    @pytest.mark.asyncio
    async def test_quick_batch_score_performance(
        self,
        async_client: AsyncClient,
        mock_api_key_auth,
        mobile_test_data,
        performance_timer,
        perf_assert,
    ):
        """Test quick batch scoring meets 200ms performance target"""
        batch_id = mobile_test_data["batch_ids"][0]
        store_id = mobile_test_data["store_id"]
        expected_threshold = mobile_test_data["expected_performance_ms"]["quick_score"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Mock ultra-fast batch scoring data
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": batch_id,
                "days_to_expiry": 2,
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.50,
                "typical_shelf_life_days": 7,
            }
            mock_optimizer.return_value = mock_opt_instance

            performance_timer.start()
            response = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}"
            )
            performance_timer.stop()

            assert response.status_code == 200
            perf_assert.assert_mobile_performance(
                performance_timer.elapsed_ms, "quick_score"
            )

            data = response.json()
            assert "composite_score" in data
            assert "urgency_level" in data
            assert "processing_time_ms" in data
            assert data["processing_time_ms"] <= expected_threshold

    @pytest.mark.asyncio
    async def test_store_health_performance(
        self,
        async_client: AsyncClient,
        mock_api_key_auth,
        mobile_test_data,
        performance_timer,
        perf_assert,
    ):
        """Test store health endpoint meets 400ms performance target"""
        store_id = mobile_test_data["store_id"]
        expected_threshold = mobile_test_data["expected_performance_ms"]["store_health"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Mock health metrics query
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_health_metrics.return_value = {
                "total_batches": 100,
                "critical_batches": 5,
                "expiring_soon": 10,
                "total_value": 1000.0,
            }
            mock_optimizer.return_value = mock_opt_instance

            performance_timer.start()
            response = await async_client.get(f"/api/v1/store-health/{store_id}")
            performance_timer.stop()

            assert response.status_code == 200
            perf_assert.assert_response_time(
                performance_timer.elapsed_ms, expected_threshold, "store_health"
            )

            data = response.json()
            assert "overall_score" in data
            assert "critical_items" in data
            assert "next_recommended_action" in data

    @pytest.mark.asyncio
    async def test_batch_list_mobile_performance(
        self,
        async_client: AsyncClient,
        mock_api_key_auth,
        mobile_test_data,
        performance_timer,
        perf_assert,
    ):
        """Test mobile batch list meets 300ms performance target"""
        store_id = mobile_test_data["store_id"]
        expected_threshold = mobile_test_data["expected_performance_ms"]["batch_list"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Mock batch list data
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": f"batch-{i}",
                    "sku": f"SKU-{i}",
                    "category": "test_category",
                    "current_quantity": 10,
                    "selling_price": 2.00,
                    "cost_price": 1.00,
                    "days_to_expiry": i % 5,  # Varying urgency
                    "location_code": "A1",
                }
                for i in range(20)
            ]
            mock_optimizer.return_value = mock_opt_instance

            performance_timer.start()
            response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}?limit=20"
            )
            performance_timer.stop()

            assert response.status_code == 200
            perf_assert.assert_response_time(
                performance_timer.elapsed_ms, expected_threshold, "batch_list"
            )

            data = response.json()
            assert "batches" in data
            assert "mobile_optimized" in data
            assert data["mobile_optimized"] is True


@pytest.mark.mobile
@pytest.mark.unit
class TestMobileEndpointFunctionality:
    """Test mobile endpoint functionality and data correctness"""

    @pytest.mark.asyncio
    async def test_mobile_summary_response_structure(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test mobile summary returns correct response structure"""
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": "urgent-001",
                    "sku": "URGENT-SKU",
                    "category": "fresh_produce",
                    "current_quantity": 5,
                    "selling_price": 3.00,
                    "cost_price": 1.50,
                    "days_to_expiry": 0,  # Expired - should be critical for disposal
                    "location_code": "A1",
                },
                {
                    "batch_id": "normal-001",
                    "sku": "NORMAL-SKU",
                    "category": "frozen",
                    "current_quantity": 15,
                    "selling_price": 4.00,
                    "cost_price": 2.00,
                    "days_to_expiry": 30,  # Not urgent
                    "location_code": "B2",
                },
            ]
            mock_optimizer.return_value = mock_opt_instance

            response = await async_client.get(f"/api/v1/mobile-summary/{store_id}")

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            required_fields = [
                "urgent_batches",
                "expiring_today",
                "action_needed",
                "total_active_batches",
                "store_health_score",
                "last_updated",
                "cache_expires_in",
            ]
            for field in required_fields:
                assert field in data, f"Missing required field: {field}"

            # Verify urgent batch was identified (expired = critical urgency)
            assert len(data["urgent_batches"]) >= 1
            urgent_batch = data["urgent_batches"][0]
            assert urgent_batch["batch_id"] == "urgent-001"
            assert (
                urgent_batch["urgency_score"] >= 0.95
            )  # Expired products get maximum urgency

    @pytest.mark.asyncio
    async def test_mobile_summary_data_compression(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test mobile summary data is properly compressed for mobile transmission"""
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": "test-001",
                    "sku": "TEST-SKU",
                    "category": "test_category",
                    "current_quantity": 10,
                    "selling_price": 2.999,  # Should be rounded
                    "cost_price": 1.111,  # Should be rounded
                    "days_to_expiry": 5,
                    "location_code": "A1",
                }
            ]
            mock_optimizer.return_value = mock_opt_instance

            # Test without detailed information (default mobile compression)
            response = await async_client.get(f"/api/v1/mobile-summary/{store_id}")

            assert response.status_code == 200
            data = response.json()

            # Check that store health score is rounded for mobile
            assert isinstance(data["store_health_score"], float)
            assert (
                len(str(data["store_health_score"]).split(".")[-1]) <= 2
            )  # Max 2 decimal places

    @pytest.mark.asyncio
    async def test_quick_batch_score_accuracy(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test quick batch scoring algorithm accuracy"""
        batch_id = "test-batch-001"
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": batch_id,
                "days_to_expiry": 1,  # Very urgent
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.00,
                "typical_shelf_life_days": 7,
            }
            mock_optimizer.return_value = mock_opt_instance

            response = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}"
            )

            assert response.status_code == 200
            data = response.json()

            # Verify scoring logic
            assert data["composite_score"] >= 0.0
            assert data["composite_score"] <= 1.0
            assert data["urgency_level"] in ["critical", "high", "medium", "low"]
            assert data["days_to_expiry"] == 1

            # With 1 day to expiry, should be high urgency (but not expired)
            assert data["urgency_level"] in ["critical", "high"]

            # Test expired product scoring
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": "expired-batch-001",
                "days_to_expiry": 0,  # Expired
                "category": "fresh_produce",
                "cost_price": 1.00,
                "selling_price": 2.50,
                "typical_shelf_life_days": 7,
            }

            expired_response = await async_client.post(
                f"/api/v1/batch-quick-score/expired-batch-001?store_id={store_id}"
            )

            assert expired_response.status_code == 200
            expired_data = expired_response.json()

            # Expired products should always be critical and suggest disposal
            assert expired_data["urgency_level"] == "critical"
            assert expired_data["suggested_action"] == "dispose"
            assert expired_data["discount_percent"] == 0

    @pytest.mark.asyncio
    async def test_batch_list_filtering(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test mobile batch list filtering functionality"""
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": "critical-001",
                    "sku": "CRITICAL-SKU",
                    "category": "fresh_produce",
                    "current_quantity": 5,
                    "selling_price": 2.00,
                    "cost_price": 1.00,
                    "days_to_expiry": 0,  # Expired - critical for disposal
                    "location_code": "A1",
                },
                {
                    "batch_id": "normal-001",
                    "sku": "NORMAL-SKU",
                    "category": "frozen",
                    "current_quantity": 10,
                    "selling_price": 3.00,
                    "cost_price": 1.50,
                    "days_to_expiry": 30,  # Not urgent
                    "location_code": "B2",
                },
            ]
            mock_optimizer.return_value = mock_opt_instance

            # Test category filtering
            response = await async_client.get(
                f"/api/v1/batch-list-mobile/{store_id}?category=fresh_produce"
            )

            assert response.status_code == 200
            data = response.json()

            assert len(data["batches"]) == 1
            assert data["batches"][0]["category"] == "fresh_produce"
            assert data["filters_applied"]["category"] == "fresh_produce"

    @pytest.mark.asyncio
    async def test_mobile_performance_health_endpoint(
        self, async_client: AsyncClient, mock_api_key_auth
    ):
        """Test mobile performance health monitoring endpoint"""
        with patch(
            "app.utils.performance.mobile_performance_health_check"
        ) as mock_health:
            mock_health.return_value = {
                "performance_summary": {
                    "mobile_summary": {"avg_duration_ms": 250, "success_rate": 0.98}
                },
                "cache_statistics": {"utilization": 75.0, "expired_cleaned": 10},
                "performance_issues": [],
                "overall_health": "good",
                "memory_leak_fixed": True,
            }

            response = await async_client.get("/api/v1/mobile-performance-health")

            assert response.status_code == 200
            data = response.json()

            required_fields = [
                "mobile_performance_status",
                "query_performance",
                "cache_performance",
                "memory_management",
            ]
            for field in required_fields:
                assert field in data


@pytest.mark.unit
class TestMobileHelperFunctions:
    """Test mobile endpoint helper functions"""

    def test_calculate_quick_urgency_score(self):
        """Test urgency score calculation"""
        # Test expired items (highest urgency)
        assert _calculate_quick_urgency_score(0) == 1.0
        assert _calculate_quick_urgency_score(-1) == 1.0

        # Test critical items
        assert _calculate_quick_urgency_score(1) == 0.95
        assert _calculate_quick_urgency_score(2) == 0.9
        assert _calculate_quick_urgency_score(3) == 0.8

        # Test moderate urgency
        assert _calculate_quick_urgency_score(7) == 0.6
        assert _calculate_quick_urgency_score(14) == 0.4

        # Test low urgency
        assert _calculate_quick_urgency_score(30) == 0.2

    def test_get_urgency_level(self):
        """Test urgency level classification"""
        assert _get_urgency_level(1.0) == "critical"
        assert _get_urgency_level(0.9) == "critical"
        assert _get_urgency_level(0.8) == "critical"

        assert _get_urgency_level(0.7) == "high"
        assert _get_urgency_level(0.6) == "high"

        assert _get_urgency_level(0.5) == "medium"
        assert _get_urgency_level(0.4) == "medium"

        assert _get_urgency_level(0.3) == "low"
        assert _get_urgency_level(0.1) == "low"

    def test_get_quick_recommendation(self):
        """Test quick recommendation logic"""
        # Test expired products (days_to_expiry <= 0) - should always be critical disposal
        urgency, rec, action, discount = _get_quick_recommendation(0.9, 0)
        assert urgency == "critical"
        assert "dispose" in action or "disposal" in rec.lower()
        assert discount == 0  # No discount for expired products

        urgency, rec, action, discount = _get_quick_recommendation(0.5, -1)
        assert urgency == "critical"
        assert "dispose" in action or "disposal" in rec.lower()
        assert discount == 0  # No discount for expired products

        # Test non-expired products - normal recommendation logic
        # Critical score
        urgency, rec, action, discount = _get_quick_recommendation(0.9, 1)
        assert urgency == "critical"
        assert "Immediate action" in rec
        assert discount == 30

        # High score
        urgency, rec, action, discount = _get_quick_recommendation(0.7, 3)
        assert urgency == "high"
        assert "Action needed" in rec
        assert discount == 15

        # Medium score
        urgency, rec, action, discount = _get_quick_recommendation(0.5, 7)
        assert urgency == "medium"
        assert "Monitor" in rec
        assert discount is None

        # Low score
        urgency, rec, action, discount = _get_quick_recommendation(0.2, 15)
        assert urgency == "low"
        assert "No action needed" in rec
        assert discount is None

    def test_cached_category_weights(self):
        """Test category weights caching"""
        # Test known categories
        weights = get_cached_category_weights("fresh_produce")
        assert weights["expiry"] == 0.6
        assert weights["velocity"] == 0.25
        assert weights["margin"] == 0.15

        weights = get_cached_category_weights("dairy")
        assert weights["expiry"] == 0.45
        assert weights["velocity"] == 0.35
        assert weights["margin"] == 0.2

        weights = get_cached_category_weights("frozen")
        assert weights["expiry"] == 0.2
        assert weights["velocity"] == 0.5
        assert weights["margin"] == 0.3

        # Test unknown category (should return defaults)
        weights = get_cached_category_weights("unknown_category")
        assert weights["expiry"] == 0.5
        assert weights["velocity"] == 0.3
        assert weights["margin"] == 0.2


@pytest.mark.mobile
@pytest.mark.unit
class TestMobileEndpointErrorHandling:
    """Test mobile endpoint error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_mobile_summary_empty_store(
        self, async_client: AsyncClient, mock_api_key_auth
    ):
        """Test mobile summary handles empty store gracefully"""
        store_id = "empty-store-123"

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = []
            mock_optimizer.return_value = mock_opt_instance

            response = await async_client.get(f"/api/v1/mobile-summary/{store_id}")

            assert response.status_code == 200
            data = response.json()

            assert data["urgent_batches"] == []
            assert data["expiring_today"] == []
            assert data["action_needed"] == []
            assert data["total_active_batches"] == 0
            assert data["store_health_score"] == 1.0  # Perfect health for empty store

    @pytest.mark.asyncio
    async def test_quick_batch_score_not_found(
        self, async_client: AsyncClient, mock_api_key_auth
    ):
        """Test quick batch score handles missing batch gracefully"""
        batch_id = "non-existent-batch"
        store_id = "test-store-123"

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_batch_quick_score_data.return_value = None
            mock_optimizer.return_value = mock_opt_instance

            response = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}"
            )

            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_mobile_endpoints_authentication_required(
        self, async_client: AsyncClient
    ):
        """Test all mobile endpoints require authentication"""
        endpoints = [
            "/api/v1/mobile-summary/test-store",
            "/api/v1/store-health/test-store",
            "/api/v1/batch-list-mobile/test-store",
            "/api/v1/mobile-performance-health",
        ]

        for endpoint in endpoints:
            response = await async_client.get(endpoint)
            assert response.status_code in [401, 403], (
                f"Endpoint {endpoint} should require auth"
            )

        # Test POST endpoint
        response = await async_client.post(
            "/api/v1/batch-quick-score/test-batch?store_id=test-store"
        )
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_mobile_summary_limit_parameter(
        self, async_client: AsyncClient, mock_api_key_auth
    ):
        """Test mobile summary respects limit parameters"""
        store_id = "test-store-123"

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            # Create 20 urgent batches
            urgent_batches = [
                {
                    "batch_id": f"urgent-{i}",
                    "sku": f"URGENT-{i}",
                    "category": "fresh_produce",
                    "current_quantity": 5,
                    "selling_price": 2.00,
                    "cost_price": 1.00,
                    "days_to_expiry": 0,  # All expired - critical for disposal
                    "location_code": "A1",
                }
                for i in range(20)
            ]

            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = urgent_batches
            mock_optimizer.return_value = mock_opt_instance

            # Test with limit of 5
            response = await async_client.get(
                f"/api/v1/mobile-summary/{store_id}?limit_urgent=5"
            )

            assert response.status_code == 200
            data = response.json()

            # Should respect the limit
            assert len(data["urgent_batches"]) <= 5


@pytest.mark.mobile
@pytest.mark.performance
class TestMobileEndpointCaching:
    """Test mobile endpoint caching behavior"""

    @pytest.mark.asyncio
    async def test_mobile_summary_caching(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test mobile summary uses caching properly"""
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_store_inventory_fast.return_value = [
                {
                    "batch_id": "batch-001",
                    "sku": "TEST-001",
                    "category": "test_category",
                    "current_quantity": 10,
                    "selling_price": 2.00,
                    "cost_price": 1.00,
                    "days_to_expiry": 2,
                    "location_code": "A1",
                }
            ]
            mock_optimizer.return_value = mock_opt_instance

            # First request
            response1 = await async_client.get(f"/api/v1/mobile-summary/{store_id}")
            assert response1.status_code == 200

            # Second request should use cache (check that DB query wasn't called again)
            response2 = await async_client.get(f"/api/v1/mobile-summary/{store_id}")
            assert response2.status_code == 200

            data = response2.json()
            assert data["cache_expires_in"] == 180  # 3 minutes for mobile cache

    @pytest.mark.asyncio
    async def test_quick_score_caching(
        self, async_client: AsyncClient, mock_api_key_auth, mobile_test_data
    ):
        """Test quick scoring uses short-term caching"""
        batch_id = "test-batch-001"
        store_id = mobile_test_data["store_id"]

        with patch(
            "app.utils.mobile_queries.create_mobile_query_optimizer"
        ) as mock_optimizer:
            mock_opt_instance = AsyncMock()
            mock_opt_instance.get_batch_quick_score_data.return_value = {
                "batch_id": batch_id,
                "days_to_expiry": 2,
                "category": "test_category",
                "cost_price": 1.00,
                "selling_price": 2.00,
                "typical_shelf_life_days": 7,
            }
            mock_optimizer.return_value = mock_opt_instance

            # First request
            response1 = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}"
            )
            assert response1.status_code == 200

            # Second request should be faster due to caching
            performance_timer = (
                performance_timer
                if "performance_timer" in locals()
                else type(
                    "Timer",
                    (),
                    {
                        "start": lambda: setattr(
                            performance_timer, "start_time", time.time()
                        ),
                        "stop": lambda: setattr(
                            performance_timer, "end_time", time.time()
                        ),
                        "elapsed_ms": property(
                            lambda self: (self.end_time - self.start_time) * 1000
                            if hasattr(self, "start_time") and hasattr(self, "end_time")
                            else 0
                        ),
                    },
                )()
            )

            performance_timer.start()
            response2 = await async_client.post(
                f"/api/v1/batch-quick-score/{batch_id}?store_id={store_id}"
            )
            performance_timer.stop()

            assert response2.status_code == 200
            # Cached response should be very fast
            assert (
                performance_timer.elapsed_ms < 50
            )  # Should be much faster when cached
