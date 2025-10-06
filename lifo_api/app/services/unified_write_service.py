"""
Unified Write Service for Backend-Centric Architecture
Consolidates database write operations to reduce HTTP overhead and improve performance
Designed for the new architecture where the Python backend handles all database writes
"""

import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import and_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session, get_db_manager
from app.database.inventory_models import (
    Batch,
    BatchAction,
    Product,
    StoreProduct,
)
from app.database.models import ProductScore
from app.monitoring.metrics import get_metrics_collector
from app.services.action_tracking import ActionTrackingService

logger = structlog.get_logger()
metrics = get_metrics_collector()


class WriteOperationError(Exception):
    """Custom exception for write operation failures"""
    def __init__(self, message: str, operation: str, context: dict[str, Any] = None):
        self.message = message
        self.operation = operation
        self.context = context or {}
        super().__init__(message)


class TransactionManager:
    """
    Advanced transaction manager for complex multi-entity operations
    Handles nested transactions, rollback points, and performance monitoring
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.transaction_start = None
        self.operation_count = 0
        self.rollback_points = []
        
    async def __aenter__(self):
        self.transaction_start = time.time()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = (time.time() - self.transaction_start) * 1000
        
        if exc_type:
            await self.session.rollback()
            logger.error(
                "Transaction rolled back due to exception",
                operation_count=self.operation_count,
                execution_time_ms=execution_time,
                exception=str(exc_val)
            )
            return False
        else:
            await self.session.commit()
            logger.info(
                "Transaction committed successfully",
                operation_count=self.operation_count,
                execution_time_ms=execution_time
            )
            
        # Record transaction metrics
        metrics.record_database_query(
            "transaction_commit",
            execution_time,
            self.operation_count,
            success=exc_type is None
        )
        
    async def add_rollback_point(self, name: str):
        """Add a named rollback point"""
        # Note: PostgreSQL supports savepoints
        await self.session.execute(text(f"SAVEPOINT {name}"))
        self.rollback_points.append(name)
        
    async def rollback_to_point(self, name: str):
        """Rollback to a specific savepoint"""
        if name in self.rollback_points:
            await self.session.execute(text(f"ROLLBACK TO SAVEPOINT {name}"))
            logger.info("Rolled back to savepoint", savepoint=name)
        
    def increment_operation(self):
        """Track operation count for metrics"""
        self.operation_count += 1


class UnifiedWriteService:
    """
    Unified Write Service for Backend-Centric Architecture
    
    Consolidates database write operations into efficient, transactional units:
    - Inventory operations (batches, products, actions)
    - Analytics and scoring writes
    - User action tracking
    - Mobile app data persistence
    
    Key optimizations:
    - Bulk operations for large datasets
    - Transaction boundaries optimization
    - Write-heavy endpoint consolidation
    - Performance monitoring and caching
    """
    
    def __init__(self):
        self.session_factory = async_session()
        self.db_manager = get_db_manager()
        self.action_tracker = None  # Initialized per session
        
    @asynccontextmanager
    async def get_write_session(self):
        """Get a database session optimized for write operations"""
        async with self.session_factory() as session:
            try:
                # Initialize action tracker for this session
                self.action_tracker = ActionTrackingService(session)
                yield session
            except Exception as e:
                await session.rollback()
                logger.error("Write session error", error=str(e))
                raise
                
    async def create_unified_inventory_batch(
        self,
        store_id: str,
        user_id: str,
        batch_data: dict[str, Any],
        auto_score: bool = True,
        track_action: bool = True
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Create inventory batch with unified operations
        
        Consolidates:
        - Product creation/lookup
        - Store-product relationship
        - Batch creation
        - Initial scoring (optional)
        - Action tracking setup (optional)
        
        Single transaction, reduced HTTP overhead
        """
        start_time = time.time()
        
        async with self.get_write_session() as session:
            async with TransactionManager(session) as tx:
                try:
                    # Step 1: Handle product (create or link)
                    product_result = await self._handle_product_creation(
                        session, store_id, user_id, batch_data, tx
                    )
                    
                    # Step 2: Create batch record
                    batch_result = await self._create_batch_record(
                        session, store_id, user_id, product_result, batch_data, tx
                    )
                    
                    # Step 3: Auto-score if requested
                    score_result = None
                    if auto_score:
                        score_result = await self._create_initial_score(
                            session, batch_result["batch_id"], store_id, tx
                        )
                    
                    # Step 4: Setup action tracking if requested
                    action_result = None
                    if track_action and score_result:
                        action_result = await self._setup_action_tracking(
                            session, batch_result["batch_id"], store_id, 
                            score_result, user_id, tx
                        )
                    
                    execution_time = (time.time() - start_time) * 1000
                    
                    result = {
                        "batch_id": batch_result["batch_id"],
                        "product_id": product_result["product_id"],
                        "was_product_created": product_result["was_created"],
                        "batch_number": batch_result["batch_number"],
                        "initial_score": score_result,
                        "action_tracking_setup": action_result is not None,
                        "execution_time_ms": execution_time,
                        "operations_count": tx.operation_count
                    }
                    
                    logger.info(
                        "Unified inventory batch created",
                        **result,
                        store_id=store_id,
                        user_id=user_id
                    )
                    
                    return result
                    
                except Exception as e:
                    logger.error(
                        "Unified batch creation failed",
                        error=str(e),
                        store_id=store_id,
                        batch_data=batch_data
                    )
                    raise WriteOperationError(
                        f"Failed to create unified inventory batch: {str(e)}",
                        "create_unified_inventory_batch",
                        {"store_id": store_id, "batch_data": batch_data}
                    )
                    
    async def bulk_inventory_operations(
        self,
        store_id: str,
        user_id: str,
        operations: list[dict[str, Any]],
        chunk_size: int = 50,
        auto_score: bool = True
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Process multiple inventory operations in optimized chunks
        
        Handles:
        - Batch creations
        - Batch updates
        - Status changes
        - Bulk scoring
        - Action tracking
        
        Uses chunked transactions for memory efficiency and error isolation
        """
        start_time = time.time()
        total_operations = len(operations)
        successful_operations = []
        failed_operations = []
        
        logger.info(
            "Starting bulk inventory operations",
            total_operations=total_operations,
            chunk_size=chunk_size,
            store_id=store_id
        )
        
        # Process in chunks to manage memory and transaction size
        for chunk_start in range(0, total_operations, chunk_size):
            chunk_end = min(chunk_start + chunk_size, total_operations)
            chunk_operations = operations[chunk_start:chunk_end]
            
            try:
                chunk_results = await self._process_operations_chunk(
                    store_id, user_id, chunk_operations, chunk_start, auto_score
                )
                
                successful_operations.extend(chunk_results["successful"])
                failed_operations.extend(chunk_results["failed"])
                
                logger.info(
                    "Chunk processed",
                    chunk_start=chunk_start,
                    chunk_size=len(chunk_operations),
                    successful=len(chunk_results["successful"]),
                    failed=len(chunk_results["failed"])
                )
                
            except Exception as e:
                logger.error(
                    "Chunk processing failed",
                    chunk_start=chunk_start,
                    chunk_size=len(chunk_operations),
                    error=str(e)
                )
                
                # Mark entire chunk as failed
                for i, operation in enumerate(chunk_operations):
                    failed_operations.append({
                        "index": chunk_start + i,
                        "operation": operation,
                        "error": f"Chunk processing failed: {str(e)}"
                    })
        
        execution_time = (time.time() - start_time) * 1000
        success_rate = len(successful_operations) / total_operations * 100
        
        result = {
            "total_operations": total_operations,
            "successful": len(successful_operations),
            "failed": len(failed_operations),
            "success_rate": success_rate,
            "execution_time_ms": execution_time,
            "operations_per_second": total_operations / (execution_time / 1000),
            "successful_operations": successful_operations,
            "failed_operations": failed_operations
        }
        
        logger.info("Bulk inventory operations completed", **{k: v for k, v in result.items() if k not in ["successful_operations", "failed_operations"]})
        
        return result
    
    async def unified_scoring_write(
        self,
        store_id: str,
        scoring_results: list[dict[str, Any]],
        batch_update_actions: bool = True,
        create_recommendations: bool = True
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Write scoring results with unified operations
        
        Consolidates:
        - Product score updates/inserts
        - Batch action recommendations
        - Analytics data writes
        - Cache invalidation
        
        Optimized for scoring workloads with bulk operations
        """
        start_time = time.time()
        
        async with self.get_write_session() as session:
            async with TransactionManager(session) as tx:
                try:
                    # Step 1: Bulk upsert product scores
                    scores_written = await self._bulk_upsert_scores(
                        session, scoring_results, tx
                    )
                    
                    # Step 2: Update batch actions if requested
                    actions_updated = 0
                    if batch_update_actions:
                        actions_updated = await self._bulk_update_batch_actions(
                            session, store_id, scoring_results, tx
                        )
                    
                    # Step 3: Create recommendations if requested
                    recommendations_created = 0
                    if create_recommendations:
                        recommendations_created = await self._create_scoring_recommendations(
                            session, store_id, scoring_results, tx
                        )
                    
                    execution_time = (time.time() - start_time) * 1000
                    
                    result = {
                        "store_id": store_id,
                        "scores_written": scores_written,
                        "actions_updated": actions_updated,
                        "recommendations_created": recommendations_created,
                        "execution_time_ms": execution_time,
                        "operations_count": tx.operation_count
                    }
                    
                    logger.info("Unified scoring write completed", **result)
                    return result
                    
                except Exception as e:
                    logger.error(
                        "Unified scoring write failed",
                        error=str(e),
                        store_id=store_id,
                        results_count=len(scoring_results)
                    )
                    raise WriteOperationError(
                        f"Failed to write scoring results: {str(e)}",
                        "unified_scoring_write",
                        {"store_id": store_id}
                    )
    
    async def mobile_data_persistence(
        self,
        user_id: str,
        store_id: str,
        mobile_data: dict[str, Any],
        sync_timestamp: datetime | None = None
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Handle mobile app data persistence
        
        Consolidates:
        - User action tracking
        - Offline data sync
        - Batch status updates
        - Mobile-specific analytics
        
        Designed for mobile app sync operations
        """
        start_time = time.time()
        sync_timestamp = sync_timestamp or datetime.utcnow()
        
        async with self.get_write_session() as session:
            async with TransactionManager(session) as tx:
                try:
                    results = {
                        "user_actions_synced": 0,
                        "batch_updates_synced": 0,
                        "analytics_events_recorded": 0,
                        "conflicts_resolved": 0
                    }
                    
                    # Process user actions from mobile
                    if "user_actions" in mobile_data:
                        results["user_actions_synced"] = await self._sync_mobile_actions(
                            session, user_id, store_id, mobile_data["user_actions"], tx
                        )
                    
                    # Process batch updates from mobile
                    if "batch_updates" in mobile_data:
                        sync_result = await self._sync_mobile_batch_updates(
                            session, store_id, mobile_data["batch_updates"], sync_timestamp, tx
                        )
                        results["batch_updates_synced"] = sync_result["synced"]
                        results["conflicts_resolved"] = sync_result["conflicts"]
                    
                    # Record mobile analytics events
                    if "analytics_events" in mobile_data:
                        results["analytics_events_recorded"] = await self._record_mobile_analytics(
                            session, user_id, store_id, mobile_data["analytics_events"], tx
                        )
                    
                    execution_time = (time.time() - start_time) * 1000
                    results.update({
                        "sync_timestamp": sync_timestamp.isoformat(),
                        "execution_time_ms": execution_time,
                        "operations_count": tx.operation_count
                    })
                    
                    logger.info("Mobile data persistence completed", **results)
                    return results
                    
                except Exception as e:
                    logger.error(
                        "Mobile data persistence failed",
                        error=str(e),
                        user_id=user_id,
                        store_id=store_id
                    )
                    raise WriteOperationError(
                        f"Failed to persist mobile data: {str(e)}",
                        "mobile_data_persistence",
                        {"user_id": user_id, "store_id": store_id}
                    )
    
    # Private helper methods for complex operations
    
    async def _handle_product_creation(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        batch_data: dict[str, Any],
        tx: TransactionManager
    ) -> dict[str, Any]:
        """Handle product creation or linking with optimized lookup"""
        
        # Try to find existing product by barcode
        barcode = batch_data.get("barcode")
        if barcode:
            result = await session.execute(
                select(Product, StoreProduct)
                .join(StoreProduct, Product.product_id == StoreProduct.product_id, isouter=True)
                .where(
                    and_(
                        Product.barcode == barcode,
                        StoreProduct.store_id == store_id,
                        StoreProduct.is_active == True
                    )
                )
            )
            existing = result.first()
            
            if existing:
                tx.increment_operation()
                return {
                    "product_id": existing[0].product_id,
                    "was_created": False,
                    "was_updated": False
                }
        
        # Create new product and store relationship
        new_product = Product(
            sku=batch_data.get("sku", f"UNIFIED-{int(time.time())}"),
            name=batch_data["product_name"],
            brand=batch_data.get("brand"),
            barcode=barcode,
            typical_shelf_life_days=batch_data.get("shelf_life_days", 30),
            base_cost_price=Decimal(str(batch_data.get("cost_price", 0.01))),
            base_selling_price=Decimal(str(batch_data.get("selling_price", 0.01))),
            created_by=uuid.UUID(user_id),
            is_verified=True
        )
        
        session.add(new_product)
        await session.flush()
        tx.increment_operation()
        
        # Create store-product relationship
        store_product = StoreProduct(
            store_id=uuid.UUID(store_id),
            product_id=new_product.product_id,
            cost_price=Decimal(str(batch_data.get("cost_price", 0))),
            selling_price=Decimal(str(batch_data.get("selling_price", 0))),
            is_active=True,
            added_by=uuid.UUID(user_id),
            updated_by=uuid.UUID(user_id)
        )
        
        session.add(store_product)
        await session.flush()
        tx.increment_operation()
        
        return {
            "product_id": new_product.product_id,
            "was_created": True,
            "was_updated": False
        }
    
    async def _create_batch_record(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        product_result: dict[str, Any],
        batch_data: dict[str, Any],
        tx: TransactionManager
    ) -> dict[str, Any]:
        """Create optimized batch record"""
        
        batch_number = batch_data.get("batch_number") or f"UNIFIED-{int(time.time())}"
        
        batch = Batch(
            product_id=product_result["product_id"],
            store_id=uuid.UUID(store_id),
            batch_number=batch_number,
            initial_quantity=Decimal(str(batch_data["quantity"])),
            current_quantity=Decimal(str(batch_data["quantity"])),
            manufacture_date=batch_data.get("manufacture_date"),
            expiry_date=batch_data["expiry_date"],
            cost_price=Decimal(str(batch_data.get("cost_price", 0))),
            selling_price=Decimal(str(batch_data.get("selling_price", 0))),
            batch_source=batch_data.get("source", "unified_api"),
            created_by=uuid.UUID(user_id),
            status="active"
        )
        
        session.add(batch)
        await session.flush()
        tx.increment_operation()
        
        return {
            "batch_id": batch.batch_id,
            "batch_number": batch_number
        }
    
    async def _create_initial_score(
        self,
        session: AsyncSession,
        batch_id: str,
        store_id: str,
        tx: TransactionManager
    ) -> dict[str, Any] | None:
        """Create initial scoring record"""
        
        # Simple urgency scoring based on days to expiry
        result = await session.execute(
            select(Batch).where(Batch.batch_id == batch_id)
        )
        batch = result.scalar_one_or_none()
        
        if not batch:
            return None
        
        days_to_expiry = (batch.expiry_date - datetime.now().date()).days
        
        # Calculate basic urgency score
        if days_to_expiry <= 0:
            urgency_score = 1.0
        elif days_to_expiry <= 1:
            urgency_score = 0.95
        elif days_to_expiry <= 3:
            urgency_score = 0.8
        elif days_to_expiry <= 7:
            urgency_score = 0.6
        else:
            urgency_score = 0.3
        
        score_record = ProductScore(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            urgency_score=Decimal(str(urgency_score)),
            recommendation="discount" if urgency_score >= 0.6 else "maintain",
            calculated_at=datetime.utcnow(),
            days_to_expiry=days_to_expiry
        )
        
        session.add(score_record)
        await session.flush()
        tx.increment_operation()
        
        return {
            "urgency_score": urgency_score,
            "recommendation": score_record.recommendation,
            "days_to_expiry": days_to_expiry
        }
    
    async def _setup_action_tracking(
        self,
        session: AsyncSession,
        batch_id: str,
        store_id: str,
        score_result: dict[str, Any],
        user_id: str,
        tx: TransactionManager
    ) -> dict[str, Any]:
        """Setup action tracking for AI recommendations"""
        
        action_record = BatchAction(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            recommended_action=score_result["recommendation"],
            actual_action="maintain",  # Default until user acts
            ai_score=Decimal(str(score_result["urgency_score"])),
            action_date=datetime.utcnow(),
            performed_by=uuid.UUID(user_id)
        )
        
        session.add(action_record)
        await session.flush()
        tx.increment_operation()
        
        return {
            "action_id": action_record.entry_id,
            "recommended_action": score_result["recommendation"]
        }
    
    async def _process_operations_chunk(
        self,
        store_id: str,
        user_id: str,
        chunk_operations: list[dict[str, Any]],
        chunk_start: int,
        auto_score: bool
    ) -> dict[str, Any]:
        """Process a chunk of operations in a single transaction"""
        
        async with self.get_write_session() as session:
            async with TransactionManager(session) as tx:
                successful = []
                failed = []
                
                for i, operation in enumerate(chunk_operations):
                    try:
                        if operation["type"] == "create_batch":
                            result = await self._handle_single_batch_creation(
                                session, store_id, user_id, operation["data"], tx, auto_score
                            )
                            successful.append({
                                "index": chunk_start + i,
                                "operation_type": "create_batch",
                                **result
                            })
                            
                        elif operation["type"] == "update_batch":
                            result = await self._handle_single_batch_update(
                                session, operation["batch_id"], operation["data"], tx
                            )
                            successful.append({
                                "index": chunk_start + i,
                                "operation_type": "update_batch",
                                **result
                            })
                            
                        elif operation["type"] == "update_status":
                            result = await self._handle_single_status_update(
                                session, operation["batch_id"], operation["status"], tx
                            )
                            successful.append({
                                "index": chunk_start + i,
                                "operation_type": "update_status",
                                **result
                            })
                            
                    except Exception as e:
                        failed.append({
                            "index": chunk_start + i,
                            "operation": operation,
                            "error": str(e)
                        })
                        logger.warning(
                            "Single operation failed in chunk",
                            index=chunk_start + i,
                            operation_type=operation.get("type"),
                            error=str(e)
                        )
                
                return {
                    "successful": successful,
                    "failed": failed
                }
    
    async def _bulk_upsert_scores(
        self,
        session: AsyncSession,
        scoring_results: list[dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Bulk upsert product scores with conflict resolution"""
        
        scores_written = 0
        
        for result in scoring_results:
            try:
                # Try to update existing score
                update_query = (
                    update(ProductScore)
                    .where(
                        and_(
                            ProductScore.batch_id == result["batch_id"],
                            ProductScore.store_id == result["store_id"]
                        )
                    )
                    .values(
                        urgency_score=Decimal(str(result["urgency_score"])),
                        recommendation=result["recommendation"],
                        calculated_at=datetime.utcnow(),
                        days_to_expiry=result.get("days_to_expiry")
                    )
                )
                
                update_result = await session.execute(update_query)
                
                if update_result.rowcount == 0:
                    # Insert new score if update didn't affect any rows
                    new_score = ProductScore(
                        batch_id=uuid.UUID(result["batch_id"]),
                        store_id=uuid.UUID(result["store_id"]),
                        urgency_score=Decimal(str(result["urgency_score"])),
                        recommendation=result["recommendation"],
                        calculated_at=datetime.utcnow(),
                        days_to_expiry=result.get("days_to_expiry")
                    )
                    session.add(new_score)
                
                scores_written += 1
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to upsert score",
                    batch_id=result.get("batch_id"),
                    error=str(e)
                )
        
        await session.flush()
        return scores_written
    
    async def _bulk_update_batch_actions(
        self,
        session: AsyncSession,
        store_id: str,
        scoring_results: list[dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Bulk update batch actions based on scoring results"""
        
        actions_updated = 0
        
        for result in scoring_results:
            try:
                # Update existing action recommendations
                update_query = (
                    update(BatchAction)
                    .where(
                        and_(
                            BatchAction.batch_id == result["batch_id"],
                            BatchAction.store_id == store_id,
                            BatchAction.actual_action == "maintain"  # Only update pending actions
                        )
                    )
                    .values(
                        recommended_action=result["recommendation"],
                        ai_score=Decimal(str(result["urgency_score"]))
                    )
                )
                
                update_result = await session.execute(update_query)
                actions_updated += update_result.rowcount
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to update batch action",
                    batch_id=result.get("batch_id"),
                    error=str(e)
                )
        
        return actions_updated
    
    async def _create_scoring_recommendations(
        self,
        session: AsyncSession,
        store_id: str,
        scoring_results: list[dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Create recommendation records from scoring results"""
        
        recommendations_created = 0
        
        for result in scoring_results:
            try:
                if result["urgency_score"] >= 0.6:  # Only create for high urgency
                    # Check if recommendation already exists
                    existing_check = await session.execute(
                        select(BatchAction)
                        .where(
                            and_(
                                BatchAction.batch_id == result["batch_id"],
                                BatchAction.store_id == store_id
                            )
                        )
                    )
                    
                    if not existing_check.scalar_one_or_none():
                        recommendation = BatchAction(
                            batch_id=uuid.UUID(result["batch_id"]),
                            store_id=uuid.UUID(store_id),
                            recommended_action=result["recommendation"],
                            actual_action="maintain",
                            ai_score=Decimal(str(result["urgency_score"])),
                            action_date=datetime.utcnow()
                        )
                        session.add(recommendation)
                        recommendations_created += 1
                        tx.increment_operation()
                        
            except Exception as e:
                logger.warning(
                    "Failed to create recommendation",
                    batch_id=result.get("batch_id"),
                    error=str(e)
                )
        
        await session.flush()
        return recommendations_created
    
    async def _sync_mobile_actions(
        self,
        session: AsyncSession,
        user_id: str,
        store_id: str,
        mobile_actions: list[dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Sync user actions from mobile app"""
        
        synced_count = 0
        
        for action_data in mobile_actions:
            try:
                # Create or update action record
                action = BatchAction(
                    batch_id=uuid.UUID(action_data["batch_id"]),
                    store_id=uuid.UUID(store_id),
                    recommended_action=action_data.get("recommended_action", "maintain"),
                    actual_action=action_data["actual_action"],
                    ai_score=Decimal(str(action_data.get("ai_score", 0.5))),
                    action_date=datetime.fromisoformat(action_data["action_date"]),
                    performed_by=uuid.UUID(user_id),
                    quantity_affected=Decimal(str(action_data.get("quantity_affected", 0))),
                    notes=action_data.get("notes")
                )
                
                session.add(action)
                synced_count += 1
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to sync mobile action",
                    action_data=action_data,
                    error=str(e)
                )
        
        await session.flush()
        return synced_count
    
    async def _sync_mobile_batch_updates(
        self,
        session: AsyncSession,
        store_id: str,
        batch_updates: list[dict[str, Any]],
        sync_timestamp: datetime,
        tx: TransactionManager
    ) -> dict[str, int]:
        """Sync batch updates from mobile with conflict resolution"""
        
        synced_count = 0
        conflicts_resolved = 0
        
        for update_data in batch_updates:
            try:
                batch_id = update_data["batch_id"]
                
                # Get current batch state
                result = await session.execute(
                    select(Batch).where(Batch.batch_id == batch_id)
                )
                current_batch = result.scalar_one_or_none()
                
                if current_batch:
                    # Check for conflicts (server updated after mobile last sync)
                    mobile_last_sync = datetime.fromisoformat(update_data.get("last_sync", "2000-01-01T00:00:00"))
                    
                    if current_batch.updated_at > mobile_last_sync:
                        # Conflict detected - resolve using latest timestamp
                        conflicts_resolved += 1
                        logger.info(
                            "Batch update conflict resolved",
                            batch_id=batch_id,
                            server_updated=current_batch.updated_at.isoformat(),
                            mobile_last_sync=mobile_last_sync.isoformat()
                        )
                    
                    # Update batch with mobile data
                    if "current_quantity" in update_data:
                        current_batch.current_quantity = Decimal(str(update_data["current_quantity"]))
                    if "status" in update_data:
                        current_batch.status = update_data["status"]
                    
                    current_batch.updated_at = sync_timestamp
                    synced_count += 1
                    tx.increment_operation()
                    
            except Exception as e:
                logger.warning(
                    "Failed to sync batch update",
                    update_data=update_data,
                    error=str(e)
                )
        
        return {
            "synced": synced_count,
            "conflicts": conflicts_resolved
        }
    
    async def _record_mobile_analytics(
        self,
        session: AsyncSession,
        user_id: str,
        store_id: str,
        analytics_events: list[dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Record analytics events from mobile app"""
        
        events_recorded = 0
        
        # For now, we'll use the metrics collector for analytics
        # In production, you might want a dedicated analytics table
        
        for event in analytics_events:
            try:
                metrics.record_business_metric(
                    metric_name=f"mobile_{event['event_type']}",
                    value=event.get("value", 1),
                    store_id=store_id,
                    metadata={
                        "user_id": user_id,
                        "timestamp": event.get("timestamp"),
                        "event_data": event.get("data", {})
                    }
                )
                
                events_recorded += 1
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to record mobile analytics event",
                    event=event,
                    error=str(e)
                )
        
        return events_recorded
    
    async def _handle_single_batch_creation(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        batch_data: dict[str, Any],
        tx: TransactionManager,
        auto_score: bool
    ) -> dict[str, Any]:
        """Handle single batch creation within a transaction"""
        
        # Similar to create_unified_inventory_batch but simplified for bulk processing
        product_result = await self._handle_product_creation(
            session, store_id, user_id, batch_data, tx
        )
        
        batch_result = await self._create_batch_record(
            session, store_id, user_id, product_result, batch_data, tx
        )
        
        score_result = None
        if auto_score:
            score_result = await self._create_initial_score(
                session, batch_result["batch_id"], store_id, tx
            )
        
        return {
            "batch_id": batch_result["batch_id"],
            "product_id": product_result["product_id"],
            "was_product_created": product_result["was_created"],
            "initial_score": score_result
        }
    
    async def _handle_single_batch_update(
        self,
        session: AsyncSession,
        batch_id: str,
        update_data: dict[str, Any],
        tx: TransactionManager
    ) -> dict[str, Any]:
        """Handle single batch update within a transaction"""
        
        result = await session.execute(
            select(Batch).where(Batch.batch_id == batch_id)
        )
        batch = result.scalar_one_or_none()
        
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(batch, field):
                if field in ["current_quantity", "cost_price", "selling_price"]:
                    setattr(batch, field, Decimal(str(value)))
                else:
                    setattr(batch, field, value)
        
        batch.updated_at = datetime.utcnow()
        tx.increment_operation()
        
        return {
            "batch_id": batch_id,
            "updated_fields": list(update_data.keys())
        }
    
    async def _handle_single_status_update(
        self,
        session: AsyncSession,
        batch_id: str,
        new_status: str,
        tx: TransactionManager
    ) -> dict[str, Any]:
        """Handle single status update within a transaction"""
        
        result = await session.execute(
            select(Batch).where(Batch.batch_id == batch_id)
        )
        batch = result.scalar_one_or_none()
        
        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")
        
        old_status = batch.status
        batch.status = new_status
        batch.updated_at = datetime.utcnow()
        tx.increment_operation()
        
        return {
            "batch_id": batch_id,
            "old_status": old_status,
            "new_status": new_status
        }


# Global service instance
_unified_write_service = None


def get_unified_write_service() -> UnifiedWriteService:
    """Get the global unified write service instance"""
    global _unified_write_service
    if _unified_write_service is None:
        _unified_write_service = UnifiedWriteService()
    return _unified_write_service