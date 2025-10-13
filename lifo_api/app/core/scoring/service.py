"""
Scoring Service Module

Main scoring service with database integration and orchestration.
Extracted from the original monolithic scoring.py for better modularity.

REFACTORED: Uses UnifiedScoringPersistence instead of deprecated BulkResultPersister
"""

from datetime import date, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from app.core.config import get_scoring_weights
from app.core.scoring.engine import InventoryScorer
from app.utils.recommendation_migration import migrate_recommendation
from .models import ScoringResult
from .services import (
    BulkDataRetriever,
    CategoryWeightService,
    InMemoryScoringEngine,
    VelocityCalculationService,
)
from .monitoring import PerformanceMonitor

logger = structlog.get_logger()


class ScoringService:
    """
    Async service for batch scoring operations with database integration
    Enhanced with better error handling and performance optimizations
    Refactored to use specialized services following SOLID principles
    """

    def __init__(
        self,
        db: AsyncSession,
        bulk_data_retriever: BulkDataRetriever | None = None,
        velocity_service: VelocityCalculationService | None = None,
        category_weight_service: CategoryWeightService | None = None,
        scoring_engine: InMemoryScoringEngine | None = None,
        result_persister: Any | None = None,
        performance_monitor: PerformanceMonitor | None = None,
    ):
        self.db = db
        self.logger = structlog.get_logger().bind(component="scoring_service")

        # Initialize services with dependency injection
        from app.database.read_only_operations import get_read_only_operations

        read_ops = get_read_only_operations(db)

        self.bulk_data_retriever = bulk_data_retriever or BulkDataRetriever(read_ops)
        self.velocity_service = velocity_service or VelocityCalculationService(read_ops)
        self.category_weight_service = category_weight_service or CategoryWeightService(
            read_ops
        )
        self.scoring_engine = scoring_engine or InMemoryScoringEngine()
        # REFACTORED: Use UnifiedScoringPersistence (60x performance improvement)
        from app.core.persistence import get_unified_scoring_persistence

        self.result_persister = result_persister or get_unified_scoring_persistence(db)
        self.performance_monitor = performance_monitor or PerformanceMonitor()

    async def get_category_weights(self, category: str) -> dict[str, float]:
        """Get category-specific weights from database with fallback"""
        try:
            # Import models here to avoid circular imports
            from app.database.models import CategoryWeight

            result = await self.db.execute(
                select(CategoryWeight).where(
                    and_(
                        CategoryWeight.category == category,
                        CategoryWeight.is_active,
                    )
                )
            )
            category_weight = result.scalar_one_or_none()

            if category_weight:
                return {
                    "expiry": float(category_weight.spoilage_risk_weight),
                    "velocity": float(category_weight.turnover_speed_weight),
                    "margin": float(category_weight.value_impact_weight),
                }
            else:
                # Return default weights from config
                return get_scoring_weights(category)

        except Exception as e:
            self.logger.error(
                "Error getting category weights", category=category, error=str(e)
            )
            return get_scoring_weights()  # Fallback to default

    async def calculate_days_to_expiry(self, expiry_date: date) -> int:
        """Calculate days until expiry"""
        if isinstance(expiry_date, str):
            expiry_date = datetime.fromisoformat(expiry_date).date()
        elif isinstance(expiry_date, datetime):
            expiry_date = expiry_date.date()

        today = date.today()
        delta = expiry_date - today
        return delta.days

    async def estimate_daily_sales(
        self, product_id: str, category: str, store_id: str, batch_id: str | None = None
    ) -> float:
        """
        Enhanced daily sales estimation with proper product relationship queries
        Fixed: Use actual product category relationships instead of SKU string matching
        """
        try:
            # Import models here to avoid circular imports
            from app.database.inventory_models import Batch, Category, Product
            from app.database.models import SalesEvent

            # Try to get actual sales data for this specific batch
            if batch_id:
                result = await self.db.execute(
                    select(func.avg(SalesEvent.quantity_sold)).where(
                        and_(
                            SalesEvent.batch_id == batch_id,
                            SalesEvent.sale_timestamp
                            >= datetime.utcnow() - timedelta(days=30),
                        )
                    )
                )
                avg_sales = result.scalar()
                if avg_sales and avg_sales > 0:
                    return float(avg_sales)

            # Try to get sales data for similar products in the same category
            # FIX: Use proper JOIN with Products table instead of SKU string matching
            result = await self.db.execute(
                select(func.avg(SalesEvent.quantity_sold))
                .select_from(SalesEvent.join(Batch).join(Product).join(Category))
                .where(
                    and_(
                        SalesEvent.store_id == store_id,
                        Category.category_code == category,
                        SalesEvent.sale_timestamp
                        >= datetime.utcnow() - timedelta(days=30),
                    )
                )
            )
            avg_sales = result.scalar()
            if avg_sales and avg_sales > 0:
                return float(avg_sales)

            # If no batch-level data, try product-level sales for same category
            result = await self.db.execute(
                select(func.avg(SalesEvent.quantity_sold))
                .select_from(SalesEvent.join(Batch).join(Product).join(Category))
                .where(
                    and_(
                        SalesEvent.store_id == store_id,
                        Category.category_code == category,
                        SalesEvent.sale_timestamp
                        >= datetime.utcnow() - timedelta(days=90),  # Wider time window
                    )
                )
            )
            avg_sales = result.scalar()
            if avg_sales and avg_sales > 0:
                return float(avg_sales)

            # Fallback to category-based estimates using standardized category codes
            category_velocities = {
                "fresh_produce": 4.0,
                "dairy_eggs": 2.5,  # Updated from "dairy"
                "bakery_fresh": 3.0,
                "fresh_meat_fish": 1.5,
                "frozen_foods": 1.0,  # Updated from "frozen"
                "canned_jarred": 0.5,
                "dry_goods": 0.8,
                "beverages": 2.0,
                "deli_prepared": 2.5,
                "spices_condiments": 0.3,
                "chilled_packaged": 2.0,
                "pantry_staples": 0.8,
                "household_other": 0.5,
                "specialty_items": 1.2,
                "bulk_items": 0.6,
                # Legacy fallbacks
                "dairy": 2.5,
                "frozen": 1.0,
            }

            return category_velocities.get(category, 1.0)

        except Exception as e:
            self.logger.error(
                "Error estimating daily sales",
                product_id=product_id,
                category=category,
                error=str(e),
            )
            return 1.0  # Conservative fallback

    async def score_batch(
        self,
        batch_id: str,
        category_weights: dict[str, float] | None = None,
        track_recommendation: bool = True,
    ) -> ScoringResult | None:
        """Score a single batch with enhanced error handling - SECURE READ-ONLY VERSION"""
        try:
            # Import secure read-only operations
            from app.database.read_only_operations import get_read_only_operations

            # Get read-only operations instance
            read_ops = get_read_only_operations(self.db)

            # Get batch data using secure read-only view
            batch_data = await read_ops.get_batch_for_scoring(batch_id)

            if not batch_data:
                self.logger.error("Batch not found", batch_id=batch_id)
                return None

            # Calculate days to expiry from batch data
            days_to_expiry = batch_data["days_to_expiry"]

            # Get category weights (use provided or fetch from DB)
            if not category_weights:
                category_weights = await read_ops.get_category_weights(
                    batch_data["category"]
                )

            # Create scorer with category-specific weights
            scorer = InventoryScorer(category=batch_data["category"])

            # Get sales velocity data
            velocity_data = await read_ops.get_sales_velocity_data(
                batch_data["store_id"], batch_data["product_id"], days=30
            )
            daily_sales = velocity_data.get("avg_daily_sales", 1.0)

            # Calculate individual scores
            expiry_score = scorer.calculate_expiry_score(
                days_to_expiry, batch_data["typical_shelf_life_days"]
            )

            velocity_score = scorer.calculate_velocity_score(
                batch_data["current_quantity"],
                daily_sales,
                days_to_expiry,
                batch_data["category"],
            )

            margin_percent = (
                (batch_data["selling_price"] - batch_data["cost_price"])
                / batch_data["selling_price"]
            ) * 100
            margin_score = scorer.calculate_margin_score(
                batch_data["cost_price"],
                batch_data["selling_price"],
                days_to_expiry,
                batch_data["category"],
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
                float(batch_data["current_quantity"]),
            )

            # Determine urgency level
            urgency_level = self._get_urgency_level(days_to_expiry, composite_score)

            # Create result
            result = ScoringResult(
                store_id=batch_data["store_id"],
                batch_id=batch_data["batch_id"],
                sku=batch_data["sku"],
                product_name=batch_data.get("product_name", "Unknown"),
                category=batch_data["category"],
                expiry_score=expiry_score,
                velocity_score=velocity_score,
                margin_score=margin_score,
                composite_score=composite_score,
                recommendation=migrate_recommendation(recommendation["action"]),
                urgency_level=urgency_level,
                discount_percent=recommendation.get("discount_percent", 0),
                reason=recommendation.get(
                    "reason",
                    f"Scored {composite_score:.2f} based on {urgency_level} urgency",
                ),
                confidence_level=1.0,  # Rule-based scoring has high confidence
                ml_enhanced=False,
                calculated_at=datetime.utcnow(),
                days_to_expiry=days_to_expiry,
                current_quantity=batch_data["current_quantity"],
                potential_loss=batch_data["current_quantity"]
                * batch_data["selling_price"],
                margin_percent=margin_percent,
            )

            # Track AI recommendation in database for analytics
            if track_recommendation:
                try:
                    await self._track_recommendation_isolated(
                        result, batch_data.get("store_id")
                    )
                except Exception as e:
                    self.logger.warning("Failed to track recommendation", error=str(e))

            return result

        except Exception as e:
            self.logger.error("Error scoring batch", batch_id=batch_id, error=str(e))
            return None

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

    async def score_store_inventory_bulk(
        self, store_id: str, recalculate_all: bool = False
    ) -> dict[str, Any]:
        """
        REFACTORED: Score all active batches for a store using specialized services
        Maintains <500ms performance while improving maintainability and testability
        """
        # Start performance monitoring
        self.performance_monitor.start_operation(
            "bulk_scoring", store_id=store_id, recalculate_all=recalculate_all
        )

        try:
            # STEP 1: Bulk data retrieval
            self.performance_monitor.log_milestone("data_retrieval_start")
            inventory_data = await self.bulk_data_retriever.get_store_inventory_data(
                store_id
            )

            if not inventory_data:
                processing_time_ms = self.performance_monitor.complete_operation(
                    store_id=store_id, total_items=0
                )
                return {
                    "store_id": store_id,
                    "total_items": 0,
                    "processed": 0,
                    "high_priority_count": 0,
                    "results": [],
                    "errors": [],
                    "processing_time_ms": processing_time_ms,
                }

            # STEP 2: Extract IDs and prepare bulk queries
            product_ids = self.bulk_data_retriever.extract_product_ids(inventory_data)
            categories = self.bulk_data_retriever.extract_categories(inventory_data)

            self.performance_monitor.log_milestone(
                "data_preparation_complete",
                inventory_count=len(inventory_data),
                unique_products=len(product_ids),
                unique_categories=len(categories),
            )

            # STEP 3: Bulk velocity data collection
            velocity_data_bulk = await self.velocity_service.get_bulk_velocity_data(
                store_id, product_ids, days=30
            )

            self.performance_monitor.log_milestone(
                "velocity_data_retrieved", velocity_results=len(velocity_data_bulk)
            )

            # STEP 4: Bulk category weights retrieval
            category_weights_bulk = (
                await self.category_weight_service.get_bulk_category_weights(categories)
            )

            self.performance_monitor.log_milestone(
                "category_weights_retrieved", weight_results=len(category_weights_bulk)
            )

            # STEP 5: In-memory scoring for all batches
            results, errors, high_priority_count = (
                self.scoring_engine.score_all_batches(
                    inventory_data, velocity_data_bulk, category_weights_bulk, store_id
                )
            )

            self.performance_monitor.log_milestone(
                "scoring_complete",
                results_count=len(results),
                high_priority_count=high_priority_count,
                errors_count=len(errors),
            )

            # STEP 6: Bulk result persistence using COPY (60x faster than REST API)
            database_successful, database_failed = 0, 0
            if results:
                # Use BulkResultPersister with DATABASE_DIRECT_URL for COPY commands
                # This is 60x faster than REST API chunking (1-3s vs 3+ minutes)
                # Convert Pydantic models to dictionaries for persistence layer
                results_dicts = [result.model_dump() for result in results]
                metrics = await self.result_persister.persist_scoring_results(
                    results_dicts, store_id
                )
                database_successful = metrics.get("successful", 0)
                database_failed = metrics.get("failed", 0)

                self.performance_monitor.log_milestone(
                    "persistence_complete",
                    database_successful=database_successful,
                    database_failed=database_failed,
                )

            # STEP 7: Complete monitoring and prepare response
            processing_time_ms = self.performance_monitor.complete_operation(
                store_id=store_id,
                total_batches=len(inventory_data),
                processed=len(results),
                high_priority_count=high_priority_count,
                database_successful=database_successful,
                database_failed=database_failed,
            )

            # Track overall performance metrics
            self.performance_monitor.track_performance_metrics(
                "bulk_scoring_complete", processing_time_ms
            )

            # Serialize results for JSON response
            serialized_results = self._serialize_results(results)

            return {
                "store_id": store_id,
                "total_items": len(inventory_data),
                "processed": len(results),
                "high_priority_count": high_priority_count,
                "results": serialized_results,
                "errors": errors,
                "processing_time_ms": processing_time_ms,
                "database_operations": {
                    "successful": database_successful,
                    "failed": database_failed,
                    "total": len(results),
                },
            }

        except Exception as e:
            import traceback

            processing_time_ms = self.performance_monitor.complete_operation(
                store_id=store_id, error=str(e)
            )

            self.logger.error(
                "Bulk scoring failed",
                store_id=store_id,
                error=str(e),
                traceback=traceback.format_exc(),
            )

            # Track error metrics
            self.performance_monitor.track_performance_metrics(
                "bulk_scoring_error", processing_time_ms, status_code=500
            )

            return {
                "store_id": store_id,
                "total_items": 0,
                "processed": 0,
                "high_priority_count": 0,
                "results": [],
                "errors": [f"Bulk scoring failed: {str(e)}"],
                "processing_time_ms": processing_time_ms,
            }

    def _serialize_results(self, results: list[ScoringResult]) -> list[dict]:
        """Serialize scoring results to JSON-compatible format"""
        serialized_results = []
        for result in results:
            if hasattr(result, "__dict__"):
                # Convert Pydantic model to dict
                result_dict = (
                    result.dict() if hasattr(result, "dict") else result.__dict__
                )
                # Convert datetime objects to ISO strings
                if "calculated_at" in result_dict and hasattr(
                    result_dict["calculated_at"], "isoformat"
                ):
                    result_dict["calculated_at"] = result_dict[
                        "calculated_at"
                    ].isoformat()
                serialized_results.append(result_dict)
            else:
                serialized_results.append(result)
        return serialized_results

    async def score_store_inventory(
        self,
        store_id: str,
        recalculate_all: bool = False,
        store_donation_config: dict | None = None,
        include_donation_rationale: bool = False,
    ) -> dict[str, Any]:
        """Score all active batches for a store and save results to database with proper transaction isolation"""
        start_time = datetime.utcnow()

        # Initialize tracking variables
        results = []
        errors = []
        high_priority_count = 0
        batch_ids = []
        database_operations_successful = 0
        database_operations_failed = 0

        try:
            # Import secure read-only operations
            from app.database.read_only_operations import get_read_only_operations

            # Get read-only operations instance with fresh session for reads
            read_ops = get_read_only_operations(self.db)

            # Get inventory data for scoring using secure read-only view
            # fetch_all=True ensures we score ALL batches, not just 1000
            inventory_data = await read_ops.get_store_inventory_for_scoring(
                store_id, fetch_all=True
            )

            if not inventory_data:
                self.logger.warning(
                    "No inventory data found for store", store_id=store_id
                )
                return {
                    "store_id": store_id,
                    "total_items": 0,
                    "processed": 0,
                    "high_priority_count": 0,
                    "results": [],
                    "errors": [],
                    "processing_time_ms": 0,
                }

            # Filter for batches that need scoring (if not recalculating all)
            batch_ids = [item["batch_id"] for item in inventory_data]

            self.logger.info(
                "Starting batch scoring with transaction isolation",
                store_id=store_id,
                total_batches=len(batch_ids),
                recalculate_all=recalculate_all,
            )

            # Score each batch - computation doesn't require database session
            for batch_id in batch_ids:
                try:
                    score_result = await self.score_batch(batch_id)
                    if score_result:
                        results.append(score_result)
                        if score_result.composite_score >= 0.6:
                            high_priority_count += 1
                    else:
                        errors.append(f"Failed to score batch {batch_id}")
                except Exception as e:
                    self.logger.error(
                        "Scoring computation failed for batch",
                        batch_id=batch_id,
                        error=str(e),
                    )
                    errors.append(f"Failed to score batch {batch_id}: {str(e)}")

            # Save results using individual isolated transactions to prevent cascade failures
            if results:
                self.logger.info(
                    "Saving score results with individual transaction isolation",
                    results_count=len(results),
                )

                # Process each result in its own isolated transaction
                for result in results:
                    success = await self._save_score_result_isolated(result, store_id)
                    if success:
                        database_operations_successful += 1
                    else:
                        database_operations_failed += 1
                        errors.append(
                            f"Failed to save score for batch {result.batch_id}"
                        )

                self.logger.info(
                    "Database operations completed",
                    successful=database_operations_successful,
                    failed=database_operations_failed,
                    total_results=len(results),
                )

            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            self.logger.info(
                "Store inventory scoring completed with transaction isolation",
                store_id=store_id,
                total_batches=len(batch_ids),
                processed=len(results),
                high_priority=high_priority_count,
                database_successful=database_operations_successful,
                database_failed=database_operations_failed,
                processing_time_ms=processing_time,
            )

            return {
                "store_id": store_id,
                "total_items": len(batch_ids),
                "processed": len(results),
                "high_priority_count": high_priority_count,
                "results": results,
                "errors": errors,
                "processing_time_ms": processing_time,
                "database_operations": {
                    "successful": database_operations_successful,
                    "failed": database_operations_failed,
                    "total": len(results),
                },
            }

        except Exception as e:
            # Log the error but don't fail the entire operation
            self.logger.error(
                "Error in store inventory scoring - returning partial results",
                store_id=store_id,
                error=str(e),
                results_computed=len(results),
                database_successful=database_operations_successful,
                database_failed=database_operations_failed,
            )

            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return {
                "store_id": store_id,
                "total_items": len(batch_ids),
                "processed": len(results),
                "high_priority_count": high_priority_count,
                "results": results,
                "errors": errors + [f"Partial failure: {str(e)}"],
                "processing_time_ms": processing_time,
                "database_operations": {
                    "successful": database_operations_successful,
                    "failed": database_operations_failed,
                    "total": len(results),
                },
            }

    async def _save_score_result(self, result: ScoringResult):
        """Save scoring result to database"""
        try:
            from app.database.models import ProductScore

            # Delete existing score for this batch
            await self.db.execute(
                ProductScore.__table__.delete().where(
                    ProductScore.batch_id == result.batch_id
                )
            )

            # Insert new score
            score = ProductScore(
                batch_id=result.batch_id,
                store_id=result.store_id,
                expiry_score=Decimal(str(result.expiry_score)),
                velocity_score=Decimal(str(result.velocity_score)),
                margin_score=Decimal(str(result.margin_score)),
                composite_score=Decimal(str(result.composite_score)),
                recommendation=result.recommendation,
                urgency_level=result.urgency_level,
                discount_percent=result.discount_percent,
                reason=result.reason,
                ml_enhanced=result.ml_enhanced,
                confidence_level=Decimal(str(result.confidence_level)),
                calculated_at=result.calculated_at,
            )

            self.db.add(score)

        except Exception as e:
            self.logger.error(
                "Error saving score result", batch_id=result.batch_id, error=str(e)
            )
            raise

    async def _save_score_result_isolated(
        self, result: ScoringResult, store_id: str
    ) -> bool:
        """
        Save scoring result using isolated transaction with advanced retry logic and health monitoring
        Returns True if successful, False if failed (but doesn't raise exception)
        """
        from app.utils.database_health import create_fresh_session, execute_with_retry

        async def save_operation():
            # Create a fresh, health-checked database session for this operation
            isolated_session = await create_fresh_session()

            try:
                # Use raw SQL to avoid prepared statement conflicts with PgBouncer
                import os
                import uuid
                from decimal import Decimal

                from sqlalchemy import text

                schema_prefix = (
                    "scoring." if os.getenv("ENVIRONMENT") != "testing" else ""
                )
                table_name = f"{schema_prefix}product_scores"

                # Delete existing score for this batch using raw SQL
                delete_sql = f"DELETE FROM {table_name} WHERE batch_id = :batch_id"
                await isolated_session.execute(
                    text(delete_sql), {"batch_id": result.batch_id}
                )

                # Insert new score using raw SQL to avoid ORM prepared statements
                insert_sql = f"""
                INSERT INTO {table_name} (
                    score_id, batch_id, store_id, expiry_score, velocity_score, margin_score,
                    composite_score, recommendation, urgency_level, discount_percent, reason,
                    ml_enhanced, confidence_level, calculated_at
                ) VALUES (
                    :score_id, :batch_id, :store_id, :expiry_score, :velocity_score, :margin_score,
                    :composite_score, :recommendation, :urgency_level, :discount_percent, :reason,
                    :ml_enhanced, :confidence_level, :calculated_at
                )
                """

                score_data = {
                    "score_id": uuid.uuid4(),
                    "batch_id": result.batch_id,
                    "store_id": result.store_id,
                    "expiry_score": Decimal(str(result.expiry_score)),
                    "velocity_score": Decimal(str(result.velocity_score)),
                    "margin_score": Decimal(str(result.margin_score)),
                    "composite_score": Decimal(str(result.composite_score)),
                    "recommendation": result.recommendation,
                    "urgency_level": result.urgency_level,
                    "discount_percent": result.discount_percent,
                    "reason": result.reason,
                    "ml_enhanced": result.ml_enhanced,
                    "confidence_level": Decimal(str(result.confidence_level)),
                    "calculated_at": result.calculated_at,
                }

                await isolated_session.execute(text(insert_sql), score_data)

                # Commit this individual transaction
                await isolated_session.commit()

                self.logger.debug(
                    "Successfully saved score result in isolated transaction",
                    batch_id=result.batch_id,
                )

                return True

            except Exception as e:
                # Rollback this individual transaction
                await isolated_session.rollback()
                self.logger.warning(
                    "Failed to save score result in isolated transaction",
                    batch_id=result.batch_id,
                    error=str(e),
                )
                raise
            finally:
                await isolated_session.close()

        # Execute with automatic retry logic and health monitoring
        success, result_data, error = await execute_with_retry(
            f"save_score_result_{result.batch_id}", save_operation, max_retries=3
        )

        if success:
            # Track recommendation in separate isolated transaction (don't let this failure affect score saving)
            await self._track_recommendation_isolated(result, store_id)
            return True
        else:
            self.logger.error(
                "Final failure to save score result after all retries with health monitoring",
                batch_id=result.batch_id,
                error=str(error) if error else "Unknown error",
            )
            return False

    async def _track_recommendation_isolated(
        self, result: ScoringResult, store_id: str | None = None
    ) -> bool:
        """Track AI recommendation using isolated transaction with health monitoring and error handling"""
        from app.utils.database_health import create_fresh_session, execute_with_retry

        async def track_operation():
            # Create a fresh, health-checked database session for this operation
            isolated_session = await create_fresh_session()

            try:
                from app.services.action_tracking import ActionTrackingService

                # Create tracker with isolated session
                tracker = ActionTrackingService(isolated_session)

                # Map scoring recommendation to database enum
                db_action = tracker.map_scoring_action_to_enum(result.recommendation)

                # Create recommendation record
                await tracker.create_recommendation_record(
                    batch_id=result.batch_id,
                    store_id=store_id or result.store_id,
                    ai_recommendation=db_action,
                    ai_score=result.composite_score,
                    user_id=None,  # System-generated recommendation
                    # discount_percent=result.discount_percent,
                    # reasoning=result.reason
                )

                # Commit the tracking transaction
                await isolated_session.commit()
                return True

            except Exception as e:
                await isolated_session.rollback()
                self.logger.warning(
                    "Failed to track AI recommendation in isolated transaction",
                    batch_id=result.batch_id,
                    error=str(e),
                )
                raise
            finally:
                await isolated_session.close()

        # Execute with retry logic - but don't let tracking failures affect main operation
        try:
            success, _, error = await execute_with_retry(
                f"track_recommendation_{result.batch_id}",
                track_operation,
                max_retries=2,  # Lower retries for tracking since it's non-critical
            )

            if not success:
                self.logger.warning(
                    "Failed to track AI recommendation after retries",
                    batch_id=result.batch_id,
                    error=str(error) if error else "Unknown error",
                )

            return success

        except Exception as e:
            # Don't let tracking errors break the scoring - just log them
            self.logger.warning(
                "Tracking operation failed completely",
                batch_id=result.batch_id,
                error=str(e),
            )
            return False

    async def _track_recommendation(
        self, result: ScoringResult, store_id: str | None = None
    ):
        """Track AI recommendation for analytics"""
        try:
            from app.services.action_tracking import ActionTrackingService

            tracker = ActionTrackingService(self.db)

            # Map scoring recommendation to database enum
            db_action = tracker.map_scoring_action_to_enum(result.recommendation)

            # Create recommendation record
            await tracker.create_recommendation_record(
                batch_id=result.batch_id,
                store_id=store_id or result.store_id,
                ai_recommendation=db_action,
                ai_score=result.composite_score,
                user_id=None,  # System-generated recommendation
            )

        except Exception as e:
            # Don't let tracking errors break the scoring
            self.logger.warning("Failed to track AI recommendation", error=str(e))


# Factory function for easy instantiation
def create_scoring_service(db: AsyncSession) -> ScoringService:
    """Create a scoring service instance"""
    return ScoringService(db)
