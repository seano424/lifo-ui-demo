"""
Mobile Endpoint Helper Functions
Extracted from large mobile endpoint functions for better maintainability
"""

import time
from functools import lru_cache
from typing import Any, Dict, List, Tuple

import structlog

from app.models.scan_models import MobileBatchSummary, MobileStoreHealth
from app.utils.mobile_queries import mobile_query_monitor
from app.utils.performance import compress_for_mobile

logger = structlog.get_logger()


class MobileUrgencyCalculator:
    """Handles urgency calculations optimized for mobile"""

    @staticmethod
    def calculate_quick_urgency_score(days_to_expiry: int) -> float:
        """Quick urgency calculation optimized for mobile"""
        if days_to_expiry <= 0:
            return 1.0
        elif days_to_expiry <= 1:
            return 0.95
        elif days_to_expiry <= 2:
            return 0.9
        elif days_to_expiry <= 3:
            return 0.8
        elif days_to_expiry <= 7:
            return 0.6
        elif days_to_expiry <= 14:
            return 0.4
        else:
            return 0.2

    @staticmethod
    def get_urgency_level(urgency_score: float) -> str:
        """Convert urgency score to level"""
        if urgency_score >= 0.8:
            return "critical"
        elif urgency_score >= 0.6:
            return "high"
        elif urgency_score >= 0.4:
            return "medium"
        else:
            return "low"


class MobileItemProcessor:
    """Processes inventory items for mobile display"""

    def __init__(self, include_details: bool = False):
        self.include_details = include_details
        self.urgency_calculator = MobileUrgencyCalculator()

    def create_mobile_item(self, item: dict[str, Any]) -> dict[str, Any]:
        """Create mobile-optimized item representation"""
        days_to_expiry = item["days_to_expiry"]
        urgency_score = self.urgency_calculator.calculate_quick_urgency_score(days_to_expiry)

        mobile_item = {
            "batch_id": item["batch_id"],
            "sku": item["sku"],
            "days_to_expiry": days_to_expiry,
            "urgency_score": urgency_score,
            "quantity": item["current_quantity"],
        }

        # Only include essential details for mobile
        if self.include_details:
            mobile_item.update({
                "category": item["category"],
                "estimated_value": item["current_quantity"] * item["selling_price"],
            })

        return mobile_item


class MobileBatchCategorizer:
    """Categorizes batches for mobile display"""

    def __init__(self, limit_urgent: int = 10):
        self.limit_urgent = limit_urgent
        self.item_processor = MobileItemProcessor()

    def categorize_inventory(
        self, inventory_data: list[dict[str, Any]], include_details: bool = False
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], float]:
        """
        Categorize inventory for mobile display

        Returns:
            Tuple of (urgent_batches, expiring_today, action_needed, total_value_at_risk)
        """
        urgent_batches = []
        expiring_today = []
        action_needed = []
        total_value_at_risk = 0.0

        self.item_processor.include_details = include_details

        # Mobile data is already optimized and limited
        for item in inventory_data:
            mobile_item = self.item_processor.create_mobile_item(item)
            urgency_score = mobile_item["urgency_score"]
            days_to_expiry = mobile_item["days_to_expiry"]

            # Categorize for mobile display
            if urgency_score >= 0.8:
                urgent_batches.append(mobile_item)
                if include_details:
                    total_value_at_risk += mobile_item.get("estimated_value", 0)
            elif days_to_expiry <= 0:
                expiring_today.append(mobile_item)
                if include_details:
                    total_value_at_risk += mobile_item.get("estimated_value", 0) * 0.5
            elif urgency_score >= 0.6:
                action_needed.append(mobile_item)

        # Limit results for mobile performance
        urgent_batches = sorted(
            urgent_batches, key=lambda x: x["urgency_score"], reverse=True
        )[: self.limit_urgent]
        expiring_today = sorted(expiring_today, key=lambda x: x["days_to_expiry"])[
            : self.limit_urgent
        ]
        action_needed = sorted(
            action_needed, key=lambda x: x["urgency_score"], reverse=True
        )[: self.limit_urgent]

        return urgent_batches, expiring_today, action_needed, total_value_at_risk


class MobileHealthCalculator:
    """Calculates store health scores for mobile"""

    @staticmethod
    def calculate_store_health_score(
        total_items: int, urgent_count: int, expiring_count: int
    ) -> float:
        """Calculate store health score (simplified for mobile)"""
        if total_items == 0:
            return 1.0

        health_score = max(
            0.0, 1.0 - ((urgent_count + expiring_count) / total_items) * 2
        )
        return round(health_score, 2)


class MobileResponseBuilder:
    """Builds mobile-optimized responses"""

    @staticmethod
    def build_mobile_summary_response(
        urgent_batches: list[dict[str, Any]],
        expiring_today: list[dict[str, Any]],
        action_needed: list[dict[str, Any]],
        health_score: float,
        total_items: int,
    ) -> MobileBatchSummary:
        """Build mobile batch summary response"""
        return MobileBatchSummary(
            urgent_batches=compress_for_mobile(urgent_batches, "standard"),
            expiring_today=compress_for_mobile(expiring_today, "standard"),
            action_needed=compress_for_mobile(action_needed, "standard"),
            total_active_batches=total_items,
            store_health_score=health_score,
            cache_expires_in=180,  # 3 minutes cache for mobile
        )

    @staticmethod
    def build_empty_mobile_summary() -> MobileBatchSummary:
        """Build empty mobile summary response"""
        return MobileBatchSummary(
            urgent_batches=[],
            expiring_today=[],
            action_needed=[],
            total_active_batches=0,
            store_health_score=1.0,
            cache_expires_in=300,
        )


class MobileBatchSummaryProcessor:
    """Main processor for mobile batch summary"""

    def __init__(self):
        self.categorizer = MobileBatchCategorizer()
        self.health_calculator = MobileHealthCalculator()
        self.response_builder = MobileResponseBuilder()

    async def process_mobile_summary(
        self,
        store_id: str,
        inventory_data: list[dict[str, Any]] | None,
        include_details: bool = False,
        limit_urgent: int = 10,
    ) -> tuple[MobileBatchSummary, float]:
        """
        Process mobile batch summary

        Returns:
            Tuple of (mobile_response, processing_time_ms)
        """
        start_time = time.time()

        if not inventory_data:
            processing_time_ms = (time.time() - start_time) * 1000
            return self.response_builder.build_empty_mobile_summary(), processing_time_ms

        # Update categorizer limit
        self.categorizer.limit_urgent = limit_urgent

        # Categorize inventory for mobile display
        urgent_batches, expiring_today, action_needed, _total_value_at_risk = (
            self.categorizer.categorize_inventory(inventory_data, include_details)
        )

        # Calculate store health score
        total_items = len(inventory_data)
        urgent_count = len(urgent_batches)
        expiring_count = len(expiring_today)

        health_score = self.health_calculator.calculate_store_health_score(
            total_items, urgent_count, expiring_count
        )

        processing_time_ms = (time.time() - start_time) * 1000

        # MOBILE PERFORMANCE: Record metrics for optimization
        mobile_query_monitor.record_query(
            "mobile_summary",
            processing_time_ms,
            len(urgent_batches) + len(expiring_today) + len(action_needed),
        )

        # Build response
        mobile_response = self.response_builder.build_mobile_summary_response(
            urgent_batches, expiring_today, action_needed, health_score, total_items
        )

        return mobile_response, processing_time_ms


class MobileStoreHealthProcessor:
    """Processor for mobile store health"""

    @staticmethod
    def process_store_health(analytics_data: dict[str, Any] | None) -> MobileStoreHealth:
        """Process store health data for mobile"""
        if not analytics_data:
            return MobileStoreHealth(
                overall_score=1.0,
                critical_items=0,
                expiring_soon=0,
                total_value_at_risk=0.0,
                trends={},
                last_action_taken=None,
                next_recommended_action=None,
            )

        # Mobile-optimized metrics from single query
        total_items = analytics_data.get("total_batches", 0)
        critical_items = analytics_data.get("critical_batches", 0)
        expiring_soon = analytics_data.get("expiring_soon", 0)

        # Overall health score
        overall_score = 1.0
        if total_items > 0:
            risk_ratio = (critical_items + expiring_soon) / total_items
            overall_score = max(0.0, 1.0 - risk_ratio * 1.5)

        # Simplified trends for mobile (numeric values for mobile display)
        trends: dict[str, float] = {
            "waste_reduction_score": 0.8,  # Numeric score 0-1 instead of string
            "efficiency_score": 0.85,
            "action_rate": 0.7,
        }

        # Next recommended action
        next_action = None
        if critical_items > 0:
            next_action = (
                f"Review {critical_items} critical items requiring immediate attention"
            )
        elif expiring_soon > 0:
            next_action = f"Monitor {expiring_soon} items expiring soon"
        else:
            next_action = "Continue monitoring - store performing well"

        return MobileStoreHealth(
            overall_score=round(overall_score, 2),
            critical_items=critical_items,
            expiring_soon=expiring_soon,
            total_value_at_risk=analytics_data.get("total_value", 0) * 0.1,  # Estimated risk
            trends=trends,
            last_action_taken="Recent discount applied",  # Would come from action log
            next_recommended_action=next_action,
        )


class MobileBatchListProcessor:
    """Processor for mobile batch lists"""

    def __init__(self):
        self.urgency_calculator = MobileUrgencyCalculator()

    def process_batch_list(
        self,
        inventory_data: list[dict[str, Any]],
        category: str | None = None,
        urgency_filter: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int, bool]:
        """
        Process batch list for mobile

        Returns:
            Tuple of (paginated_batches, total_count, has_more)
        """
        # Apply remaining filters
        filtered_batches = []

        for item in inventory_data:
            # Category filter
            if category and item["category"] != category:
                continue

            # Urgency filter
            urgency_score = self.urgency_calculator.calculate_quick_urgency_score(
                item["days_to_expiry"]
            )
            urgency_level = self.urgency_calculator.get_urgency_level(urgency_score)

            if urgency_filter and urgency_level != urgency_filter:
                continue

            # Create mobile-optimized item
            mobile_item = {
                "batch_id": item["batch_id"],
                "sku": item["sku"],
                "category": item["category"],
                "quantity": item["current_quantity"],
                "days_to_expiry": item["days_to_expiry"],
                "urgency_score": round(urgency_score, 2),
                "urgency_level": urgency_level,
                "location": item.get("location_code", "MAIN"),
                "estimated_value": round(
                    item["current_quantity"] * item["selling_price"], 2
                ),
            }

            filtered_batches.append(mobile_item)

        # Sort by urgency (highest first)
        filtered_batches.sort(key=lambda x: x["urgency_score"], reverse=True)

        # Pagination
        total_count = len(filtered_batches)
        paginated_batches = filtered_batches[offset : offset + limit]
        has_more = offset + limit < total_count

        return paginated_batches, total_count, has_more


@lru_cache(maxsize=100)
def get_cached_category_weights(category: str) -> dict[str, float]:
    """Cache category weights for faster mobile scoring"""
    # Default weights - in production this would cache from database
    weights_map = {
        "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
        "dairy": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
        "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
        "fresh_meat_fish": {"expiry": 0.65, "velocity": 0.2, "margin": 0.15},
        "frozen": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
    }
    return weights_map.get(category, {"expiry": 0.5, "velocity": 0.3, "margin": 0.2})


class MobileQuickScoreCalculator:
    """Calculates quick scores for mobile scanning"""

    def calculate_quick_expiry_score(
        self, days_to_expiry: int, shelf_life_days: int
    ) -> float:
        """Quick expiry score for mobile performance"""
        if days_to_expiry <= 0:
            return 1.0
        elif days_to_expiry <= 1:
            return 0.95
        elif days_to_expiry <= 3:
            return 0.8
        elif days_to_expiry <= 7:
            return 0.6
        else:
            # Simplified ratio calculation
            if shelf_life_days > 0:
                ratio = days_to_expiry / shelf_life_days
                if ratio <= 0.2:
                    return 0.5
            return 0.2

    def calculate_quick_margin_score(self, cost_price: float, selling_price: float) -> float:
        """Quick margin score for mobile performance"""
        if not cost_price or not selling_price or selling_price <= cost_price:
            return 1.0

        margin_percent = ((selling_price - cost_price) / selling_price) * 100

        if margin_percent < 10:
            return 1.0
        elif margin_percent < 25:
            return 0.7
        elif margin_percent < 50:
            return 0.4
        else:
            return 0.1

    def get_quick_recommendation(
        self, composite_score: float, days_to_expiry: int
    ) -> tuple[str, str, str, int | None]:
        """Get quick recommendation for mobile display"""
        if composite_score >= 0.8:
            return "critical", "Immediate action required", "Apply discount", 30
        elif composite_score >= 0.6:
            return "high", "Action needed soon", "Monitor closely", 15
        elif composite_score >= 0.4:
            return "medium", "Monitor for changes", "Regular check", None
        else:
            return "low", "No action needed", "Continue monitoring", None