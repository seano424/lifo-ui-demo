"""
Supporting services for bulk scoring operations
Handles data retrieval, velocity calculations, and category weights
"""

from datetime import datetime
from typing import Any

import structlog

from app.utils.recommendation_migration import migrate_recommendation

from .engine import InventoryScorer
from .models import ScoringResult

logger = structlog.get_logger()


class BulkDataRetriever:
    """
    Service responsible for bulk inventory data retrieval and preparation
    Optimizes database queries for bulk scoring operations
    """

    def __init__(self, read_ops):
        self.read_ops = read_ops
        self.logger = structlog.get_logger().bind(component="bulk_data_retriever")

    async def get_store_inventory_data(self, store_id: str) -> list[dict[str, Any]]:
        """Get all inventory data for a store in a single optimized query"""
        try:
            inventory_data = await self.read_ops.get_store_inventory_for_scoring(store_id)

            if not inventory_data:
                self.logger.warning("No inventory data found for store", store_id=store_id)
                return []

            self.logger.info(
                "Retrieved inventory data for bulk scoring",
                store_id=store_id,
                item_count=len(inventory_data)
            )

            return inventory_data

        except Exception as e:
            self.logger.error(
                "Failed to retrieve inventory data",
                store_id=store_id,
                error=str(e)
            )
            return []

    def extract_product_ids(self, inventory_data: list[dict[str, Any]]) -> list[str]:
        """Extract unique product IDs from inventory data"""
        return list({item["product_id"] for item in inventory_data})

    def extract_categories(self, inventory_data: list[dict[str, Any]]) -> list[str]:
        """Extract unique categories from inventory data"""
        return list({
            item.get("category")
            for item in inventory_data
            if item.get("category")
        })


class VelocityCalculationService:
    """
    Service responsible for sales velocity data collection and processing
    Handles bulk velocity calculations with caching
    """

    def __init__(self, read_ops):
        self.read_ops = read_ops
        self.logger = structlog.get_logger().bind(component="velocity_calculation_service")

    async def get_bulk_velocity_data(
        self, store_id: str, product_ids: list[str], days: int = 30
    ) -> dict[str, dict[str, float]]:
        """Get sales velocity data for multiple products in bulk"""
        try:
            velocity_data = await self.read_ops.get_bulk_sales_velocity_data(
                store_id, product_ids, days=days
            )

            self.logger.debug(
                "Retrieved bulk velocity data",
                store_id=store_id,
                product_count=len(product_ids),
                days=days,
                results_count=len(velocity_data)
            )

            return velocity_data

        except Exception as e:
            self.logger.error(
                "Failed to retrieve bulk velocity data",
                store_id=store_id,
                error=str(e)
            )
            return {}

    def get_velocity_for_product(
        self, product_id: str, velocity_data_bulk: dict[str, dict[str, float]]
    ) -> float:
        """Extract velocity for a specific product from bulk data"""
        return velocity_data_bulk.get(product_id, {}).get("avg_daily_sales", 1.0)


class CategoryWeightService:
    """
    Service responsible for category weights lookup and caching
    Handles bulk category weight retrieval
    """

    def __init__(self, read_ops):
        self.read_ops = read_ops
        self.logger = structlog.get_logger().bind(component="category_weight_service")

    async def get_bulk_category_weights(
        self, categories: list[str]
    ) -> dict[str, dict[str, float]]:
        """Get category weights for multiple categories in bulk"""
        try:
            category_weights = await self.read_ops.get_bulk_category_weights(categories)

            self.logger.debug(
                "Retrieved bulk category weights",
                category_count=len(categories),
                results_count=len(category_weights)
            )

            return category_weights

        except Exception as e:
            self.logger.error(
                "Failed to retrieve bulk category weights",
                error=str(e)
            )
            return {}

    def get_weights_for_category(
        self, category: str, category_weights_bulk: dict[str, dict[str, float]]
    ) -> dict[str, float]:
        """Extract weights for a specific category from bulk data"""
        return category_weights_bulk.get(category, {})


class InMemoryScoringEngine:
    """
    Service responsible for in-memory scoring calculations for all batches
    Handles bulk scoring without database calls during computation
    """

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="inmemory_scoring_engine")

    def score_batch_in_memory(
        self,
        batch_data: dict[str, Any],
        daily_sales: float,
        category_weights: dict[str, float],
        store_id: str
    ) -> ScoringResult | None:
        """Score a single batch using in-memory calculations only"""
        try:
            # Create scorer with category-specific weights
            scorer = InventoryScorer(category=batch_data.get("category"))

            # Calculate all scores in memory (no DB calls)
            days_to_expiry = batch_data["days_to_expiry"]

            expiry_score = scorer.calculate_expiry_score(
                days_to_expiry, batch_data.get("typical_shelf_life_days", 30)
            )

            velocity_score = scorer.calculate_velocity_score(
                batch_data["current_quantity"],
                daily_sales,
                days_to_expiry,
                batch_data.get("category"),
            )

            margin_percent = 0
            if batch_data["selling_price"] > 0:
                margin_percent = (
                    (batch_data["selling_price"] - batch_data["cost_price"])
                    / batch_data["selling_price"]
                ) * 100

            margin_score = scorer.calculate_margin_score(
                batch_data["cost_price"],
                batch_data["selling_price"],
                days_to_expiry,
                batch_data.get("category"),
            )

            # Calculate composite score
            composite_score = scorer.calculate_composite_score(
                expiry_score, velocity_score, margin_score, category_weights
            )

            # Generate recommendation
            recommendation = scorer.generate_recommendation(
                composite_score,
                days_to_expiry,
                margin_percent,
                batch_data["current_quantity"],
            )

            # Determine urgency level
            urgency_level = self._get_urgency_level(days_to_expiry, composite_score)

            # Create scoring result
            score_result = ScoringResult(
                store_id=store_id,
                batch_id=batch_data["batch_id"],
                sku=batch_data.get("batch_number", batch_data["batch_id"]),
                product_name=batch_data.get("product_name", "Unknown Product"),
                category=batch_data.get("category", "general"),
                expiry_score=expiry_score,
                velocity_score=velocity_score,
                margin_score=margin_score,
                composite_score=composite_score,
                recommendation=migrate_recommendation(
                    recommendation.get("action", "maintain")
                ),
                urgency_level=urgency_level,
                discount_percent=recommendation.get("discount_percent", 0),
                reason=recommendation.get(
                    "reason",
                    f"Score: {composite_score:.2f}. Automated scoring based on expiry, velocity, and margin factors.",
                ),
                confidence_level=0.85,
                ml_enhanced=True,
                calculated_at=datetime.utcnow(),
                days_to_expiry=days_to_expiry,
                current_quantity=batch_data["current_quantity"],
                potential_loss=batch_data["current_quantity"]
                * batch_data.get("selling_price", 0),
                margin_percent=margin_percent,
            )

            return score_result

        except Exception as e:
            self.logger.error(
                "Failed to score batch in memory",
                batch_id=batch_data.get("batch_id"),
                error=str(e),
            )
            return None

    def score_all_batches(
        self,
        inventory_data: list[dict[str, Any]],
        velocity_data_bulk: dict[str, dict[str, float]],
        category_weights_bulk: dict[str, dict[str, float]],
        store_id: str
    ) -> tuple[list[ScoringResult], list[str], int]:
        """Score all batches using in-memory calculations"""
        results = []
        errors = []
        high_priority_count = 0

        self.logger.info(
            "Starting bulk in-memory scoring",
            total_batches=len(inventory_data),
            store_id=store_id
        )

        for batch_data in inventory_data:
            try:
                # Get pre-fetched data
                daily_sales = velocity_data_bulk.get(
                    batch_data["product_id"], {}
                ).get("avg_daily_sales", 1.0)
                category_weights = category_weights_bulk.get(
                    batch_data.get("category"), {}
                )

                # Score batch in memory
                score_result = self.score_batch_in_memory(
                    batch_data, daily_sales, category_weights, store_id
                )

                if score_result:
                    results.append(score_result)
                    if score_result.composite_score >= 0.6:
                        high_priority_count += 1
                else:
                    errors.append(f"Failed to score batch {batch_data.get('batch_id')}")

            except Exception as e:
                self.logger.error(
                    "Failed to score batch in bulk operation",
                    batch_id=batch_data.get("batch_id"),
                    error=str(e),
                )
                errors.append(
                    f"Failed to score batch {batch_data.get('batch_id')}: {str(e)}"
                )

        self.logger.info(
            "Completed bulk in-memory scoring",
            total_batches=len(inventory_data),
            successful=len(results),
            high_priority=high_priority_count,
            errors=len(errors)
        )

        return results, errors, high_priority_count

    def _get_urgency_level(self, days_to_expiry: int, composite_score: float) -> str:
        """Determine urgency level based on days to expiry and score"""
        if days_to_expiry <= 0 or composite_score >= 0.9:
            return "critical"
        elif days_to_expiry <= 1 or composite_score >= 0.8:
            return "high"
        elif days_to_expiry <= 3 or composite_score >= 0.6:
            return "medium"
        elif days_to_expiry <= 7 or composite_score >= 0.4:
            return "low"
        else:
            return "none"
