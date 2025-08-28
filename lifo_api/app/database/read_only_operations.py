"""
Secure read-only database operations for AI features only
Part of hybrid architecture security remediation
"""

import uuid
from datetime import date, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class SecureReadOnlyOperations:
    """
    Secure read-only database operations for AI features only
    No CRUD operations - only data retrieval for scoring and analytics
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.logger = structlog.get_logger().bind(component="read_only_ops")

    async def get_store_inventory_for_scoring(
        self, store_id: str
    ) -> list[dict[str, Any]]:
        """
        Get inventory data for scoring calculations only
        Uses read-only view to prevent SQL injection
        """
        try:
            # Convert to UUID if string
            if isinstance(store_id, str):
                try:
                    store_uuid = uuid.UUID(store_id)
                except ValueError:
                    self.logger.error("Invalid store_id format", store_id=store_id)
                    return []
            else:
                store_uuid = store_id

            # Use parameterized query with read-only view
            query = text("""
                SELECT
                    batch_id,
                    product_id,
                    sku,
                    category,
                    current_quantity,
                    expiry_date,
                    selling_price,
                    cost_price,
                    days_to_expiry,
                    typical_shelf_life_days
                FROM inventory_view_for_scoring
                WHERE store_id = :store_id
                AND current_quantity > 0
                ORDER BY days_to_expiry ASC
            """)

            result = await self.db.execute(query, {"store_id": store_uuid})
            rows = result.fetchall()

            inventory_data = []
            for row in rows:
                inventory_data.append(
                    {
                        "batch_id": str(row.batch_id),
                        "product_id": str(row.product_id),
                        "sku": row.sku,
                        "category": row.category,
                        "current_quantity": float(row.current_quantity),
                        "expiry_date": row.expiry_date,
                        "selling_price": float(row.selling_price),
                        "cost_price": float(row.cost_price),
                        "days_to_expiry": int(row.days_to_expiry),
                        "typical_shelf_life_days": int(row.typical_shelf_life_days)
                        if row.typical_shelf_life_days
                        else 30,
                    }
                )

            self.logger.info(
                "Inventory data retrieved for scoring",
                store_id=store_id,
                items_count=len(inventory_data),
            )

            return inventory_data

        except Exception as e:
            self.logger.error(
                "Failed to get inventory for scoring", store_id=store_id, error=str(e)
            )
            return []

    async def get_batch_for_scoring(self, batch_id: str) -> dict[str, Any] | None:
        """
        Get single batch data for scoring
        Uses parameterized query to prevent SQL injection
        """
        try:
            # Convert to UUID if string
            if isinstance(batch_id, str):
                try:
                    batch_uuid = uuid.UUID(batch_id)
                except ValueError:
                    self.logger.error("Invalid batch_id format", batch_id=batch_id)
                    return None
            else:
                batch_uuid = batch_id

            # Use parameterized query with read-only view
            query = text("""
                SELECT
                    batch_id,
                    product_id,
                    store_id,
                    sku,
                    category,
                    current_quantity,
                    expiry_date,
                    selling_price,
                    cost_price,
                    days_to_expiry,
                    typical_shelf_life_days
                FROM inventory_view_for_scoring
                WHERE batch_id = :batch_id
            """)

            result = await self.db.execute(query, {"batch_id": batch_uuid})
            row = result.first()

            if not row:
                return None

            batch_data = {
                "batch_id": str(row.batch_id),
                "product_id": str(row.product_id),
                "store_id": str(row.store_id),
                "sku": row.sku,
                "category": row.category,
                "current_quantity": float(row.current_quantity),
                "expiry_date": row.expiry_date,
                "selling_price": float(row.selling_price),
                "cost_price": float(row.cost_price),
                "days_to_expiry": int(row.days_to_expiry),
                "typical_shelf_life_days": int(row.typical_shelf_life_days)
                if row.typical_shelf_life_days
                else 30,
            }

            self.logger.info("Batch data retrieved for scoring", batch_id=batch_id)

            return batch_data

        except Exception as e:
            self.logger.error(
                "Failed to get batch for scoring", batch_id=batch_id, error=str(e)
            )
            return None

    async def get_sales_velocity_data(
        self, store_id: str, product_id: str = None, days: int = 30
    ) -> dict[str, float]:
        """
        Get sales velocity data for scoring calculations
        Uses parameterized query to prevent SQL injection
        """
        try:
            # Convert to UUID if string
            if isinstance(store_id, str):
                try:
                    store_uuid = uuid.UUID(store_id)
                except ValueError:
                    self.logger.error("Invalid store_id format", store_id=store_id)
                    return {}
            else:
                store_uuid = store_id

            # Build parameterized query
            if product_id:
                if isinstance(product_id, str):
                    try:
                        product_uuid = uuid.UUID(product_id)
                    except ValueError:
                        self.logger.error(
                            "Invalid product_id format", product_id=product_id
                        )
                        return {}
                else:
                    product_uuid = product_id

                query = text("""
                    SELECT
                        AVG(quantity_sold) as avg_daily_sales,
                        COUNT(*) as sales_events
                    FROM sales_events_view
                    WHERE store_id = :store_id
                    AND product_id = :product_id
                    AND sale_date >= :start_date
                """)

                params = {
                    "store_id": store_uuid,
                    "product_id": product_uuid,
                    "start_date": date.today() - timedelta(days=days),
                }
            else:
                query = text("""
                    SELECT
                        AVG(quantity_sold) as avg_daily_sales,
                        COUNT(*) as sales_events
                    FROM sales_events_view
                    WHERE store_id = :store_id
                    AND sale_date >= :start_date
                """)

                params = {
                    "store_id": store_uuid,
                    "start_date": date.today() - timedelta(days=days),
                }

            result = await self.db.execute(query, params)
            row = result.first()

            if row and row.avg_daily_sales:
                return {
                    "avg_daily_sales": float(row.avg_daily_sales),
                    "sales_events": int(row.sales_events),
                }

            # Return fallback data
            return {
                "avg_daily_sales": 1.0,  # Conservative fallback
                "sales_events": 0,
            }

        except Exception as e:
            self.logger.error(
                "Failed to get sales velocity data",
                store_id=store_id,
                product_id=product_id,
                error=str(e),
            )
            return {"avg_daily_sales": 1.0, "sales_events": 0}

    async def get_category_weights(self, category: str) -> dict[str, float]:
        """
        Get category-specific scoring weights
        Uses standardized category mappings with fallback to defaults
        """
        try:
            # Standardized category weights for new category system
            standardized_weights = {
                "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
                "dairy_eggs": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
                "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
                "fresh_meat_fish": {"expiry": 0.7, "velocity": 0.2, "margin": 0.1},
                "frozen_foods": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
                "deli_prepared": {"expiry": 0.65, "velocity": 0.25, "margin": 0.1},
                "chilled_packaged": {"expiry": 0.4, "velocity": 0.4, "margin": 0.2},
                "canned_jarred": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
                "dry_goods": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
                "beverages": {"expiry": 0.25, "velocity": 0.45, "margin": 0.3},
                "spices_condiments": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
                "pantry_staples": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
                "household_other": {"expiry": 0.3, "velocity": 0.4, "margin": 0.3},
                "specialty_items": {"expiry": 0.4, "velocity": 0.3, "margin": 0.3},
                "bulk_items": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
            }
            
            # Try to get weights for the specific category
            if category in standardized_weights:
                return standardized_weights[category]
            
            # Legacy category mapping fallback
            legacy_mapping = {
                "dairy": "dairy_eggs",
                "frozen": "frozen_foods", 
                "bakery": "bakery_fresh",
                "produce": "fresh_produce",
                "meat": "fresh_meat_fish",
                "general": "household_other",
            }
            
            mapped_category = legacy_mapping.get(category.lower())
            if mapped_category and mapped_category in standardized_weights:
                return standardized_weights[mapped_category]

            # Return default weights if not found
            return {"expiry": 0.5, "velocity": 0.3, "margin": 0.2}

        except Exception as e:
            self.logger.error(
                "Failed to get category weights", category=category, error=str(e)
            )
            return {"expiry": 0.5, "velocity": 0.3, "margin": 0.2}

    async def store_score_results(self, scores: list[dict[str, Any]]) -> bool:
        """
        Store scoring results - ONLY operation that writes to database
        Uses parameterized insert to prevent SQL injection
        """
        try:
            if not scores:
                return True

            # Prepare batch insert
            insert_query = text("""
                INSERT INTO scoring.product_scores (
                    batch_id, store_id, expiry_score, velocity_score, margin_score,
                    composite_score, recommendation, urgency_level, discount_percent,
                    reason, ml_enhanced, confidence_level, calculated_at
                ) VALUES (
                    :batch_id, :store_id, :expiry_score, :velocity_score, :margin_score,
                    :composite_score, :recommendation, :urgency_level, :discount_percent,
                    :reason, :ml_enhanced, :confidence_level, :calculated_at
                )
                ON CONFLICT (batch_id) DO UPDATE SET
                    expiry_score = EXCLUDED.expiry_score,
                    velocity_score = EXCLUDED.velocity_score,
                    margin_score = EXCLUDED.margin_score,
                    composite_score = EXCLUDED.composite_score,
                    recommendation = EXCLUDED.recommendation,
                    urgency_level = EXCLUDED.urgency_level,
                    discount_percent = EXCLUDED.discount_percent,
                    reason = EXCLUDED.reason,
                    ml_enhanced = EXCLUDED.ml_enhanced,
                    confidence_level = EXCLUDED.confidence_level,
                    calculated_at = EXCLUDED.calculated_at
            """)

            # Execute batch insert
            await self.db.execute(insert_query, scores)
            await self.db.commit()

            self.logger.info("Score results stored", scores_count=len(scores))

            return True

        except Exception as e:
            await self.db.rollback()
            self.logger.error(
                "Failed to store score results", scores_count=len(scores), error=str(e)
            )
            return False

    async def get_store_analytics(
        self, store_id: str, days: int = 30
    ) -> dict[str, Any]:
        """
        Get store analytics data for API endpoints
        Uses parameterized query to prevent SQL injection
        """
        return await self.get_analytics_data(store_id, days)

    async def get_analytics_data(self, store_id: str, days: int = 30) -> dict[str, Any]:
        """
        Get analytics data for dashboard
        Uses parameterized query to prevent SQL injection
        """
        try:
            # Convert to UUID if string
            if isinstance(store_id, str):
                try:
                    store_uuid = uuid.UUID(store_id)
                except ValueError:
                    self.logger.error("Invalid store_id format", store_id=store_id)
                    return {}
            else:
                store_uuid = store_id

            # Get analytics data directly from batches table
            query = text("""
                SELECT
                    COUNT(b.batch_id) as total_batches,
                    COALESCE(SUM(b.current_quantity), 0) as total_quantity,
                    COALESCE(SUM(b.current_quantity * b.selling_price), 0) as total_value,
                    COUNT(CASE WHEN b.expiry_date < CURRENT_DATE THEN 1 END) as expired_count,
                    COUNT(CASE WHEN b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_soon_count,
                    COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '1 day' THEN 1 END) as critical_items,
                    COUNT(CASE WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '3 days' THEN 1 END) as high_urgency_items,
                    COUNT(CASE WHEN b.expiry_date BETWEEN CURRENT_DATE + INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as medium_urgency_items,
                    COUNT(CASE WHEN b.expiry_date > CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as low_urgency_items
                FROM inventory.batches b
                WHERE b.store_id = :store_id
                AND b.status = 'active'
                AND b.current_quantity > 0
            """)

            params = {
                "store_id": store_uuid,
                "start_date": date.today() - timedelta(days=days),
            }

            result = await self.db.execute(query, params)
            row = result.first()

            if row:
                return {
                    "total_batches": int(row.total_batches),
                    "total_quantity": float(row.total_quantity),
                    "total_value": float(row.total_value),
                    "expired_count": int(row.expired_count),
                    "expiring_soon_count": int(row.expiring_soon_count),
                    "critical_items": int(row.critical_items),
                    "high_urgency_items": int(row.high_urgency_items),
                    "medium_urgency_items": int(row.medium_urgency_items),
                    "low_urgency_items": int(row.low_urgency_items),
                    "generated_at": datetime.utcnow().isoformat(),
                }

            # Return empty analytics if no data
            return {
                "total_batches": 0,
                "total_quantity": 0.0,
                "total_value": 0.0,
                "expired_count": 0,
                "expiring_soon_count": 0,
                "critical_items": 0,
                "high_urgency_items": 0,
                "medium_urgency_items": 0,
                "low_urgency_items": 0,
                "generated_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(
                "Failed to get analytics data", store_id=store_id, error=str(e)
            )
            return {}


# Factory function for dependency injection
def get_read_only_operations(db: AsyncSession) -> SecureReadOnlyOperations:
    """Get secure read-only operations instance"""
    return SecureReadOnlyOperations(db)
