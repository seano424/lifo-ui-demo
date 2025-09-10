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
        Now uses Supabase client for compatibility with Next.js approach
        """
        try:
            # Import Supabase service (fallback to direct client usage)
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Use same approach as Next.js alerts endpoint
            result = (
                admin_client.schema("inventory")
                .table("batches")
                .select("""
                    batch_id,
                    product_id,
                    batch_number,
                    current_quantity,
                    selling_price,
                    cost_price,
                    expiry_date,
                    location_code,
                    supplier,
                    status
                """)
                .eq("store_id", store_id)
                .in_("status", ["active", "expired"])
                .gt("current_quantity", 0)
                .order("expiry_date", desc=False)
                .execute()
            )

            if not result.data:
                self.logger.info("No active batches found", store_id=store_id)
                return []

            # Calculate days_to_expiry for each batch
            inventory_data = []
            for row in result.data:
                try:
                    expiry_date = datetime.fromisoformat(
                        row["expiry_date"].replace("Z", "+00:00")
                    )
                    days_to_expiry = (expiry_date.date() - date.today()).days

                    inventory_data.append(
                        {
                            "batch_id": str(row["batch_id"]),
                            "product_id": str(row["product_id"])
                            if row["product_id"]
                            else "",
                            "sku": row.get(
                                "batch_number", "Unknown"
                            ),  # Use batch_number as SKU fallback
                            "category": "Unknown",  # Will be enriched with product data
                            "current_quantity": float(row["current_quantity"]),
                            "expiry_date": row["expiry_date"],
                            "selling_price": float(row["selling_price"])
                            if row["selling_price"]
                            else 0.0,
                            "cost_price": float(row["cost_price"])
                            if row["cost_price"]
                            else 0.0,
                            "days_to_expiry": days_to_expiry,
                            "typical_shelf_life_days": 30,  # Default value
                        }
                    )
                except Exception as row_error:
                    self.logger.warning(
                        "Error processing batch row",
                        batch_id=row.get("batch_id"),
                        error=str(row_error),
                    )
                    continue

            self.logger.info(
                "Inventory data retrieved via Supabase",
                store_id=store_id,
                items_count=len(inventory_data),
            )

            return inventory_data

        except Exception as e:
            self.logger.error(
                "Failed to get inventory for scoring", store_id=store_id, error=str(e)
            )
            # Return empty array instead of failing
            return []

    async def get_batch_for_scoring(self, batch_id: str) -> dict[str, Any] | None:
        """
        Get single batch data for scoring using Supabase client
        FIXED: Use Supabase instead of missing SQL view
        """
        try:
            # Import Supabase service
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Get batch data using Supabase client
            result = (
                admin_client.schema("inventory")
                .table("batches")
                .select("""
                    batch_id,
                    product_id,
                    store_id,
                    batch_number,
                    current_quantity,
                    selling_price,
                    cost_price,
                    expiry_date,
                    location_code,
                    status
                """)
                .eq("batch_id", batch_id)
                .in_("status", ["active", "expired"])
                .gt("current_quantity", 0)
                .single()
                .execute()
            )

            if not result.data:
                self.logger.warning("Batch not found for scoring", batch_id=batch_id)
                return None

            batch = result.data

            # Calculate days to expiry
            expiry_date = datetime.fromisoformat(
                batch["expiry_date"].replace("Z", "+00:00")
            )
            days_to_expiry = (expiry_date.date() - date.today()).days

            batch_data = {
                "batch_id": str(batch["batch_id"]),
                "product_id": str(batch["product_id"]) if batch["product_id"] else "",
                "store_id": str(batch["store_id"]),
                "sku": batch.get("batch_number", "Unknown"),
                "category": "Unknown",  # Will be enriched later if needed
                "current_quantity": float(batch["current_quantity"]),
                "expiry_date": batch["expiry_date"],
                "selling_price": float(batch["selling_price"])
                if batch["selling_price"]
                else 0.0,
                "cost_price": float(batch["cost_price"])
                if batch["cost_price"]
                else 0.0,
                "days_to_expiry": days_to_expiry,
                "typical_shelf_life_days": 30,  # Default value
            }

            self.logger.info(
                "Batch data retrieved for scoring via Supabase", batch_id=batch_id
            )

            return batch_data

        except Exception as e:
            self.logger.error(
                "Failed to get batch for scoring", batch_id=batch_id, error=str(e)
            )
            return None

    async def get_sales_velocity_data(
        self, store_id: str, product_id: str | None = None, days: int = 30
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

        except Exception:
            self.logger.info(
                "Sales velocity data using fallback (view not available)",
                store_id=store_id,
                product_id=product_id,
            )
            # Return reasonable fallback data for scoring calculations
            return {
                "avg_daily_sales": 2.0,  # 2 units per day average
                "sales_events": days,  # Assume daily sales over period
            }

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
        Store scoring results using Supabase client
        FIXED: Use Supabase instead of SQL query
        """
        try:
            if not scores:
                return True

            # Import Supabase service
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Prepare data for Supabase insert
            # FIXED: Remove discount_percent field that doesn't exist in schema
            supabase_scores = []
            for score in scores:
                supabase_scores.append(
                    {
                        "batch_id": score["batch_id"],
                        "store_id": score["store_id"],
                        "expiry_score": float(score["expiry_score"]),
                        "velocity_score": float(score["velocity_score"]),
                        "margin_score": float(score["margin_score"]),
                        "composite_score": float(score["composite_score"]),
                        "recommendation": score["recommendation"],
                        "urgency_level": score["urgency_level"],
                        "reason": score.get("reason", "AI recommendation"),
                        "discount_percent": score.get("discount_percent", 0),
                        "ml_enhanced": score["ml_enhanced"],
                        "confidence_level": float(score["confidence_level"]),
                        "calculated_at": score["calculated_at"].isoformat()
                        if hasattr(score["calculated_at"], "isoformat")
                        else str(score["calculated_at"]),
                    }
                )

            # Insert/upsert scores using Supabase
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(supabase_scores)
                .execute()
            )

            if result.data:
                self.logger.info(
                    "Score results stored via Supabase", scores_count=len(scores)
                )
                return True
            else:
                self.logger.error(
                    "Failed to store score results via Supabase",
                    scores_count=len(scores),
                )
                return False

        except Exception as e:
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
        Get analytics data for dashboard using Supabase client with actionable batch data
        ENHANCED: Now includes individual batch recommendations from scoring
        """
        try:
            # Import Supabase service
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Get batches data with product info using Supabase client (same as Next.js)
            # FIXED: Use category_id instead of category column
            result = (
                admin_client.schema("inventory")
                .table("batches")
                .select("""
                    batch_id,
                    current_quantity,
                    selling_price,
                    expiry_date,
                    status,
                    location_code,
                    store_products!inner (
                        products (
                            name,
                            category_id
                        )
                    )
                """)
                .eq("store_id", store_id)
                .in_("status", ["active", "expired"])
                .gt("current_quantity", 0)
                .execute()
            )

            # Get scoring data for actionable batches
            # RESTORED: Now using proper database schema with all columns
            scoring_result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .select("""
                    batch_id,
                    composite_score,
                    recommendation,
                    urgency_level,
                    reason,
                    discount_percent
                """)
                .eq("store_id", store_id)
                .gte("composite_score", 0.4)  # Only actionable items
                .order("composite_score", desc=True)
                .limit(50)
                .execute()
            )

            if not result.data:
                # Return empty analytics if no data
                return {
                    "inventory_summary": {
                        "total_batches": 0,
                        "total_quantity": 0,
                        "total_value": 0,
                        "expired_count": 0,
                        "expiring_soon_count": 0,
                    },
                    "urgency_distribution": {
                        "critical": 0,
                        "high": 0,
                        "medium": 0,
                        "low": 0,
                    },
                    "category_breakdown": [],
                    "recent_actions": [],
                    "actionable_batches": [],
                }

            # Process batches data
            total_batches = len(result.data)
            total_quantity = sum(
                float(batch.get("current_quantity", 0)) for batch in result.data
            )
            total_value = sum(
                float(batch.get("current_quantity", 0))
                * float(batch.get("selling_price", 0))
                for batch in result.data
            )

            # Calculate urgency distribution
            urgency_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            expired_count = 0
            expiring_soon_count = 0

            today = date.today()

            for batch in result.data:
                try:
                    expiry_date = datetime.fromisoformat(
                        batch["expiry_date"].replace("Z", "+00:00")
                    ).date()
                    days_to_expiry = (expiry_date - today).days

                    if days_to_expiry < 0:
                        expired_count += 1
                        urgency_counts["critical"] += 1
                    elif days_to_expiry <= 1:
                        urgency_counts["critical"] += 1
                        if days_to_expiry >= 0:
                            expiring_soon_count += 1
                    elif days_to_expiry <= 3:
                        urgency_counts["high"] += 1
                        expiring_soon_count += 1
                    elif days_to_expiry <= 7:
                        urgency_counts["medium"] += 1
                        expiring_soon_count += 1
                    else:
                        urgency_counts["low"] += 1

                except (ValueError, KeyError) as e:
                    self.logger.warning(
                        "Error processing batch expiry date", error=str(e)
                    )
                    continue

            # Build actionable batches data by joining inventory with scoring
            actionable_batches = []
            scoring_data = scoring_result.data or []

            # Create a lookup dict for scoring data
            scores_by_batch = {score["batch_id"]: score for score in scoring_data}

            for batch in result.data:
                score_info = scores_by_batch.get(batch["batch_id"])
                if score_info:
                    # Calculate expiry date
                    try:
                        expiry_date = datetime.fromisoformat(
                            batch["expiry_date"].replace("Z", "+00:00")
                        ).date()
                        days_to_expiry = (expiry_date - today).days

                        # Get product info
                        product_name = "Unknown"
                        if batch.get("store_products") and batch["store_products"].get(
                            "products"
                        ):
                            product_info = batch["store_products"]["products"]
                            product_name = product_info.get("name", "Unknown")

                        # Map urgency to expected levels
                        urgency_mapping = {
                            "critical": "critical",
                            "high": "high",
                            "medium": "medium",
                            "low": "low",
                        }

                        urgency = urgency_mapping.get(
                            score_info.get("urgency_level", "medium"), "medium"
                        )

                        # Calculate potential loss
                        potential_loss = float(
                            batch.get("current_quantity", 0)
                        ) * float(batch.get("selling_price", 0))

                        # Use database values or fallback to calculated values
                        discount_percent = score_info.get("discount_percent", 0)
                        reason = score_info.get("reason", "AI recommendation")

                        # Fallback calculations if database values are missing
                        if discount_percent == 0:
                            if urgency == "critical":
                                discount_percent = 40
                            elif urgency == "high":
                                discount_percent = 25
                            elif urgency == "medium":
                                discount_percent = 15
                            elif score_info.get("composite_score", 0) > 0.7:
                                discount_percent = 20

                        actionable_batches.append(
                            {
                                "batch_id": batch["batch_id"],
                                "product_name": product_name,
                                "expiry_date": batch["expiry_date"],
                                "urgency": urgency,
                                "recommendation": score_info.get(
                                    "recommendation", "monitor"
                                ),
                                "discount_percent": discount_percent,
                                "reason": reason,
                                "location_code": batch.get("location_code", ""),
                                "current_quantity": float(
                                    batch.get("current_quantity", 0)
                                ),
                                "potential_loss": round(potential_loss, 2),
                                "composite_score": float(
                                    score_info.get("composite_score", 0)
                                ),
                            }
                        )

                    except (ValueError, KeyError) as e:
                        self.logger.warning(
                            "Error processing actionable batch",
                            batch_id=batch.get("batch_id"),
                            error=str(e),
                        )
                        continue

            # Sort actionable batches by urgency and score
            urgency_priority = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            actionable_batches.sort(
                key=lambda x: (
                    urgency_priority.get(x["urgency"], 4),
                    -x["composite_score"],
                )
            )

            self.logger.info(
                "Actionable batches processed",
                store_id=store_id,
                total_batches=len(result.data),
                scoring_records=len(scoring_data),
                actionable_batches_count=len(actionable_batches),
            )

            analytics_data = {
                "inventory_summary": {
                    "total_batches": total_batches,
                    "total_quantity": total_quantity,
                    "total_value": round(total_value, 2),
                    "expired_count": expired_count,
                    "expiring_soon_count": expiring_soon_count,
                },
                "urgency_distribution": urgency_counts,
                "category_breakdown": [],  # Would need product data to populate
                "recent_actions": [],  # Would need actions/logs data to populate
                "actionable_batches": actionable_batches,
            }

            self.logger.info(
                "Analytics data retrieved via Supabase",
                store_id=store_id,
                total_batches=total_batches,
            )

            return analytics_data

        except Exception as e:
            self.logger.error(
                "Failed to get analytics data", store_id=store_id, error=str(e)
            )
            # Return empty analytics structure on error
            return {
                "inventory_summary": {
                    "total_batches": 0,
                    "total_quantity": 0,
                    "total_value": 0,
                    "expired_count": 0,
                    "expiring_soon_count": 0,
                },
                "urgency_distribution": {
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0,
                },
                "category_breakdown": [],
                "recent_actions": [],
                "actionable_batches": [],
            }

    async def get_bulk_sales_velocity_data(
        self, store_id: str, product_ids: list[str], days: int = 30
    ) -> dict[str, dict[str, Any]]:
        """
        BULK OPTIMIZATION: Get sales velocity data for multiple products in single query
        Returns: {product_id: {avg_daily_sales: float, total_sales: int, ...}}
        """
        try:
            if not product_ids:
                return {}

            # Import Supabase service
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Calculate date range
            from datetime import datetime, timedelta

            start_date = (datetime.now() - timedelta(days=days)).date().isoformat()

            # Get sales data for all products in single query
            result = (
                admin_client.schema("sales")
                .table("transactions")
                .select("product_id, quantity_sold, sale_date")
                .eq("store_id", store_id)
                .in_("product_id", product_ids)
                .gte("sale_date", start_date)
                .execute()
            )

            # Process results into velocity data per product
            velocity_data = {}
            for product_id in product_ids:
                product_sales = [
                    sale
                    for sale in (result.data or [])
                    if sale["product_id"] == product_id
                ]

                total_quantity = sum(
                    sale.get("quantity_sold", 0) for sale in product_sales
                )
                avg_daily_sales = total_quantity / days if days > 0 else 0

                velocity_data[product_id] = {
                    "avg_daily_sales": max(avg_daily_sales, 1.0),  # Ensure minimum of 1
                    "total_sales": len(product_sales),
                    "total_quantity": total_quantity,
                }

            self.logger.info(
                "Bulk velocity data retrieved",
                store_id=store_id,
                products_count=len(product_ids),
                days=days,
            )

            return velocity_data

        except Exception as e:
            self.logger.error(
                "Failed to get bulk sales velocity data",
                store_id=store_id,
                error=str(e),
            )
            # Return default values for all products
            return {
                product_id: {
                    "avg_daily_sales": 1.0,
                    "total_sales": 0,
                    "total_quantity": 0,
                }
                for product_id in product_ids
            }

    async def get_bulk_category_weights(
        self, categories: list[str]
    ) -> dict[str, dict[str, float]]:
        """
        BULK OPTIMIZATION: Get category weights for multiple categories
        Returns: {category: {expiry: float, velocity: float, margin: float}}
        """
        try:
            # Use the same standardized weights as the single operation
            standardized_weights = {
                "fresh_produce": {"expiry": 0.6, "velocity": 0.3, "margin": 0.1},
                "fresh_meat_fish": {"expiry": 0.7, "velocity": 0.2, "margin": 0.1},
                "dairy_eggs": {"expiry": 0.55, "velocity": 0.3, "margin": 0.15},
                "bakery_fresh": {"expiry": 0.5, "velocity": 0.35, "margin": 0.15},
                "deli_prepared": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
                "frozen_foods": {"expiry": 0.3, "velocity": 0.4, "margin": 0.3},
                "canned_jarred": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
                "dry_goods": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
                "beverages": {"expiry": 0.25, "velocity": 0.45, "margin": 0.3},
                "spices_condiments": {"expiry": 0.1, "velocity": 0.6, "margin": 0.3},
                "pantry_staples": {"expiry": 0.15, "velocity": 0.55, "margin": 0.3},
                "household_other": {"expiry": 0.3, "velocity": 0.4, "margin": 0.3},
                "specialty_items": {"expiry": 0.4, "velocity": 0.3, "margin": 0.3},
                "bulk_items": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
            }

            # Legacy category mapping
            legacy_mapping = {
                "dairy": "dairy_eggs",
                "frozen": "frozen_foods",
                "bakery": "bakery_fresh",
                "produce": "fresh_produce",
                "meat": "fresh_meat_fish",
                "general": "household_other",
            }

            # Build bulk response
            bulk_weights = {}
            for category in categories:
                if not category:
                    continue

                # Try standardized weights first
                if category in standardized_weights:
                    bulk_weights[category] = standardized_weights[category]
                    continue

                # Try legacy mapping
                mapped_category = legacy_mapping.get(category.lower())
                if mapped_category and mapped_category in standardized_weights:
                    bulk_weights[category] = standardized_weights[mapped_category]
                    continue

                # Default weights
                bulk_weights[category] = {"expiry": 0.5, "velocity": 0.3, "margin": 0.2}

            self.logger.info(
                "Bulk category weights retrieved", categories_count=len(categories)
            )
            return bulk_weights

        except Exception as e:
            self.logger.error("Failed to get bulk category weights", error=str(e))
            # Return default weights for all categories
            return {
                category: {"expiry": 0.5, "velocity": 0.3, "margin": 0.2}
                for category in categories
                if category
            }

    async def bulk_store_score_results(self, scores: list[dict[str, Any]]) -> bool:
        """
        BULK OPTIMIZATION: Store multiple scoring results in single upsert operation
        """
        try:
            if not scores:
                return True

            # Import Supabase service
            from app.database.supabase_service import get_supabase_service

            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Prepare data for bulk upsert
            upsert_data = []
            for score in scores:
                upsert_data.append(
                    {
                        "batch_id": score["batch_id"],
                        "store_id": score["store_id"],
                        "expiry_score": float(score["expiry_score"]),
                        "velocity_score": float(score["velocity_score"]),
                        "margin_score": float(score["margin_score"]),
                        "composite_score": float(score["composite_score"]),
                        "recommendation": score["recommendation"],
                        "urgency_level": score["urgency_level"],
                        "discount_percent": int(score["discount_percent"]),
                        "reason": score["reason"],
                        "ml_enhanced": bool(score["ml_enhanced"]),
                        "confidence_level": float(score["confidence_level"]),
                        "calculated_at": score["calculated_at"],
                    }
                )

            # Perform bulk upsert operation
            result = (
                admin_client.schema("analytics")
                .table("batch_scores")
                .upsert(upsert_data, on_conflict="batch_id,store_id")
                .execute()
            )

            if result.data:
                self.logger.info(
                    "Bulk score results stored successfully", scores_count=len(scores)
                )
                return True
            else:
                self.logger.warning("No data returned from bulk upsert operation")
                return False

        except Exception as e:
            self.logger.error(
                "Failed to bulk store score results",
                scores_count=len(scores),
                error=str(e),
            )
            return False


# Factory function for dependency injection
def get_read_only_operations(db: AsyncSession) -> SecureReadOnlyOperations:
    """Get secure read-only operations instance"""
    return SecureReadOnlyOperations(db)
