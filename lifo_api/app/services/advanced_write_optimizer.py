"""
Advanced Database Write Optimizer for Backend-Centric Architecture
Optimizes database write operations for maximum performance and scalability
"""

import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.database.inventory_models import (
    Batch,
    Product,
)
from app.monitoring.metrics import get_metrics_collector
from app.utils.query_optimizer import QueryMonitor

logger = structlog.get_logger()
metrics = get_metrics_collector()


class WritePerformanceTracker:
    """
    Advanced performance tracking for write operations
    Provides detailed metrics and query analysis
    """
    
    def __init__(self):
        self.operation_metrics = {}
        self.slow_queries = []
        self.query_monitor = QueryMonitor(slow_query_threshold_ms=100)
        
    def start_operation(self, operation_name: str) -> str:
        """Start tracking a write operation"""
        operation_id = str(uuid.uuid4())
        self.operation_metrics[operation_id] = {
            "operation_name": operation_name,
            "start_time": time.time(),
            "queries_executed": 0,
            "rows_affected": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        return operation_id
        
    def end_operation(self, operation_id: str) -> Dict[str, Any]:
        """End tracking and return performance metrics"""
        if operation_id not in self.operation_metrics:
            return {}
            
        metrics_data = self.operation_metrics[operation_id]
        execution_time = (time.time() - metrics_data["start_time"]) * 1000
        
        performance_report = {
            "operation_name": metrics_data["operation_name"],
            "execution_time_ms": execution_time,
            "queries_executed": metrics_data["queries_executed"],
            "rows_affected": metrics_data["rows_affected"],
            "queries_per_second": metrics_data["queries_executed"] / (execution_time / 1000) if execution_time > 0 else 0,
            "rows_per_second": metrics_data["rows_affected"] / (execution_time / 1000) if execution_time > 0 else 0,
            "cache_hit_ratio": metrics_data["cache_hits"] / (metrics_data["cache_hits"] + metrics_data["cache_misses"]) if (metrics_data["cache_hits"] + metrics_data["cache_misses"]) > 0 else 0
        }
        
        # Record in global metrics
        metrics.record_database_query(
            f"write_operation_{metrics_data['operation_name']}",
            execution_time,
            metrics_data["rows_affected"],
            success=True
        )
        
        # Clean up
        del self.operation_metrics[operation_id]
        
        return performance_report
        
    def record_query(self, operation_id: str, rows_affected: int = 0):
        """Record query execution for an operation"""
        if operation_id in self.operation_metrics:
            self.operation_metrics[operation_id]["queries_executed"] += 1
            self.operation_metrics[operation_id]["rows_affected"] += rows_affected
            
    def record_cache_hit(self, operation_id: str):
        """Record cache hit"""
        if operation_id in self.operation_metrics:
            self.operation_metrics[operation_id]["cache_hits"] += 1
            
    def record_cache_miss(self, operation_id: str):
        """Record cache miss"""
        if operation_id in self.operation_metrics:
            self.operation_metrics[operation_id]["cache_misses"] += 1


class ConnectionPoolOptimizer:
    """
    Advanced connection pool management for write operations
    Optimizes connections for different write patterns
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engines = {}
        self.pool_configs = self._get_pool_configurations()
        
    def _get_pool_configurations(self) -> Dict[str, Dict[str, Any]]:
        """Get optimized pool configurations for different write patterns"""
        return {
            "write_heavy": {
                "pool_size": 20,
                "max_overflow": 15,
                "pool_timeout": 60,
                "pool_recycle": 1800,
                "pool_pre_ping": True,
                "connect_args": {
                    "server_settings": {
                        "jit": "off",  # Disable JIT for write-heavy operations
                        "synchronous_commit": "off",  # Async commit for performance
                        "checkpoint_completion_target": "0.9"
                    }
                }
            },
            "bulk_operations": {
                "pool_size": 15,
                "max_overflow": 10,
                "pool_timeout": 120,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
                "connect_args": {
                    "server_settings": {
                        "work_mem": "256MB",  # Larger work memory for bulk ops
                        "maintenance_work_mem": "512MB",
                        "effective_cache_size": "2GB"
                    }
                }
            },
            "analytics_writes": {
                "pool_size": 8,
                "max_overflow": 5,
                "pool_timeout": 180,
                "pool_recycle": 7200,
                "pool_pre_ping": True,
                "connect_args": {
                    "server_settings": {
                        "random_page_cost": "1.1",  # SSD optimized
                        "effective_io_concurrency": "200"
                    }
                }
            },
            "mobile_sync": {
                "pool_size": 25,
                "max_overflow": 20,
                "pool_timeout": 30,
                "pool_recycle": 900,
                "pool_pre_ping": True,
                "connect_args": {
                    "server_settings": {
                        "statement_timeout": "30s",  # Fast timeout for mobile
                        "lock_timeout": "10s"
                    }
                }
            }
        }
    
    async def get_engine(self, pool_type: str = "write_heavy") -> AsyncEngine:
        """Get or create optimized engine for specific write pattern"""
        if pool_type not in self.engines:
            config = self.pool_configs.get(pool_type, self.pool_configs["write_heavy"])
            
            self.engines[pool_type] = create_async_engine(
                self.database_url,
                **config,
                echo=False  # Disable SQL echo in production
            )
            
            logger.info(
                "Created optimized write engine",
                pool_type=pool_type,
                pool_size=config["pool_size"],
                max_overflow=config["max_overflow"]
            )
            
        return self.engines[pool_type]
    
    async def close_all_engines(self):
        """Close all engines and cleanup"""
        for pool_type, engine in self.engines.items():
            await engine.dispose()
            logger.info("Closed write engine", pool_type=pool_type)
        self.engines.clear()


class AdvancedTransactionManager:
    """
    Advanced transaction management with optimizations for write operations
    Includes savepoints, deadlock handling, and performance monitoring
    """
    
    def __init__(self, session: AsyncSession, operation_name: str = "unknown"):
        self.session = session
        self.operation_name = operation_name
        self.savepoints = []
        self.operation_count = 0
        self.rows_affected = 0
        self.start_time = None
        self.performance_tracker = WritePerformanceTracker()
        self.operation_id = None
        
    async def __aenter__(self):
        self.start_time = time.time()
        self.operation_id = self.performance_tracker.start_operation(self.operation_name)
        
        # Set optimal session parameters for writes
        await self.session.execute(text("SET LOCAL synchronous_commit = OFF"))
        await self.session.execute(text("SET LOCAL checkpoint_completion_target = 0.9"))
        
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = (time.time() - self.start_time) * 1000
        
        if exc_type:
            await self.session.rollback()
            logger.error(
                "Advanced transaction rolled back",
                operation_name=self.operation_name,
                operation_count=self.operation_count,
                execution_time_ms=execution_time,
                exception=str(exc_val)
            )
            return False
        else:
            try:
                await self.session.commit()
                performance_report = self.performance_tracker.end_operation(self.operation_id)
                
                logger.info(
                    "Advanced transaction committed",
                    operation_name=self.operation_name,
                    **performance_report
                )
            except Exception as commit_error:
                await self.session.rollback()
                logger.error(
                    "Transaction commit failed",
                    operation_name=self.operation_name,
                    error=str(commit_error)
                )
                raise
                
    async def create_savepoint(self, name: str):
        """Create a named savepoint for partial rollbacks"""
        savepoint_name = f"sp_{name}_{len(self.savepoints)}"
        await self.session.execute(text(f"SAVEPOINT {savepoint_name}"))
        self.savepoints.append(savepoint_name)
        logger.debug("Created savepoint", name=savepoint_name)
        return savepoint_name
        
    async def rollback_to_savepoint(self, savepoint_name: str):
        """Rollback to a specific savepoint"""
        if savepoint_name in self.savepoints:
            await self.session.execute(text(f"ROLLBACK TO SAVEPOINT {savepoint_name}"))
            # Remove this and later savepoints
            index = self.savepoints.index(savepoint_name)
            self.savepoints = self.savepoints[:index]
            logger.info("Rolled back to savepoint", name=savepoint_name)
        else:
            logger.warning("Savepoint not found", name=savepoint_name)
            
    async def release_savepoint(self, savepoint_name: str):
        """Release a savepoint to free resources"""
        if savepoint_name in self.savepoints:
            await self.session.execute(text(f"RELEASE SAVEPOINT {savepoint_name}"))
            self.savepoints.remove(savepoint_name)
            logger.debug("Released savepoint", name=savepoint_name)
            
    def record_operation(self, rows_affected: int = 0):
        """Record operation metrics"""
        self.operation_count += 1
        self.rows_affected += rows_affected
        if self.operation_id:
            self.performance_tracker.record_query(self.operation_id, rows_affected)


class BulkWriteOptimizer:
    """
    Advanced bulk write operations with prepared statements and batching
    Optimized for high-throughput write scenarios
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.prepared_statements = {}
        
    async def bulk_upsert_with_conflict_resolution(
        self,
        table_name: str,
        records: List[Dict[str, Any]],
        conflict_columns: List[str],
        update_columns: List[str],
        chunk_size: int = 1000
    ) -> int:
        """
        High-performance bulk upsert with conflict resolution
        Uses PostgreSQL's ON CONFLICT for optimal performance
        """
        if not records:
            return 0
            
        total_affected = 0
        columns = list(records[0].keys())
        
        # Create prepared statement if not exists
        stmt_key = f"{table_name}_upsert_{hash(tuple(sorted(columns)))}"
        
        if stmt_key not in self.prepared_statements:
            # Build optimized upsert query
            columns_str = ", ".join(columns)
            values_placeholder = ", ".join([f":{col}" for col in columns])
            conflict_str = ", ".join(conflict_columns)
            update_str = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_columns])
            
            upsert_query = text(f"""
                INSERT INTO {table_name} ({columns_str})
                VALUES ({values_placeholder})
                ON CONFLICT ({conflict_str}) DO UPDATE SET
                {update_str}
            """)
            
            self.prepared_statements[stmt_key] = upsert_query
            
        # Process in optimized chunks
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            
            # Use executemany for better performance
            result = await self.session.execute(
                self.prepared_statements[stmt_key],
                chunk
            )
            
            total_affected += len(chunk)  # PostgreSQL doesn't return affected rows for ON CONFLICT
            
            # Periodic flush for large datasets
            if i % (chunk_size * 5) == 0:
                await self.session.flush()
                
        logger.info(
            "Bulk upsert completed",
            table_name=table_name,
            total_records=len(records),
            total_affected=total_affected,
            chunk_size=chunk_size
        )
        
        return total_affected
        
    async def bulk_insert_ignore_duplicates(
        self,
        table_name: str,
        records: List[Dict[str, Any]],
        chunk_size: int = 1000
    ) -> int:
        """
        High-performance bulk insert ignoring duplicates
        Uses INSERT ... ON CONFLICT DO NOTHING for speed
        """
        if not records:
            return 0
            
        total_inserted = 0
        columns = list(records[0].keys())
        
        # Build optimized insert query
        columns_str = ", ".join(columns)
        values_placeholder = ", ".join([f":{col}" for col in columns])
        
        insert_query = text(f"""
            INSERT INTO {table_name} ({columns_str})
            VALUES ({values_placeholder})
            ON CONFLICT DO NOTHING
        """)
        
        # Process in chunks with batch commits
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            
            await self.session.execute(insert_query, chunk)
            total_inserted += len(chunk)
            
            # Commit every 5 chunks for memory management
            if i % (chunk_size * 5) == 0:
                await self.session.flush()
                
        logger.info(
            "Bulk insert completed",
            table_name=table_name,
            total_records=len(records),
            total_inserted=total_inserted
        )
        
        return total_inserted
        
    async def bulk_update_optimized(
        self,
        table_name: str,
        updates: List[Dict[str, Any]],
        id_column: str = "id",
        chunk_size: int = 500
    ) -> int:
        """
        Optimized bulk updates using VALUES() with JOIN
        More efficient than individual UPDATE statements
        """
        if not updates:
            return 0
            
        total_updated = 0
        
        # Get all columns except ID
        update_columns = [col for col in updates[0].keys() if col != id_column]
        
        for i in range(0, len(updates), chunk_size):
            chunk = updates[i:i + chunk_size]
            
            # Build VALUES clause
            values_clauses = []
            params = {}
            
            for idx, record in enumerate(chunk):
                value_items = []
                for col in [id_column] + update_columns:
                    param_name = f"{col}_{idx}"
                    value_items.append(f":{param_name}")
                    params[param_name] = record[col]
                    
                values_clauses.append(f"({', '.join(value_items)})")
            
            # Build optimized UPDATE with VALUES JOIN
            set_clauses = [f"{col} = v.{col}" for col in update_columns]
            column_list = [id_column] + update_columns
            
            update_query = text(f"""
                UPDATE {table_name} 
                SET {', '.join(set_clauses)}
                FROM (VALUES {', '.join(values_clauses)}) AS v({', '.join(column_list)})
                WHERE {table_name}.{id_column} = v.{id_column}
            """)
            
            result = await self.session.execute(update_query, params)
            total_updated += result.rowcount
            
        logger.info(
            "Bulk update completed",
            table_name=table_name,
            total_records=len(updates),
            total_updated=total_updated
        )
        
        return total_updated


class AdvancedWriteOptimizer:
    """
    Advanced write optimization service for backend-centric architecture
    Provides comprehensive optimization for all write operations
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool_optimizer = ConnectionPoolOptimizer(database_url)
        self.write_cache = {}
        self.cache_ttl = timedelta(minutes=5)
        
    async def get_optimized_session(self, operation_type: str = "write_heavy") -> AsyncSession:
        """Get database session optimized for specific write operation type"""
        engine = await self.pool_optimizer.get_engine(operation_type)
        
        from sqlalchemy.ext.asyncio import AsyncSession as AsyncSessionClass
        return AsyncSessionClass(engine)
        
    @asynccontextmanager
    async def optimized_write_transaction(
        self, 
        operation_type: str = "write_heavy",
        operation_name: str = "write_operation"
    ):
        """Context manager for optimized write transactions"""
        session = await self.get_optimized_session(operation_type)
        
        async with AdvancedTransactionManager(session, operation_name) as tx:
            bulk_optimizer = BulkWriteOptimizer(session)
            yield session, tx, bulk_optimizer
            
        await session.close()
        
    async def unified_inventory_write_optimized(
        self,
        store_id: str,
        user_id: str,
        inventory_operations: List[Dict[str, Any]],
        auto_score: bool = True,
        enable_caching: bool = True
    ) -> Dict[str, Any]:
        """
        OPTIMIZED: Unified inventory write operations with advanced optimizations
        
        Handles multiple inventory operations in a single optimized transaction:
        - Product lookups with caching
        - Batch operations with bulk processing
        - Scoring operations with batching
        - Action tracking with optimization
        """
        operation_name = f"unified_inventory_write_{len(inventory_operations)}_ops"
        
        async with self.optimized_write_transaction("write_heavy", operation_name) as (session, tx, bulk_optimizer):
            try:
                results = {
                    "total_operations": len(inventory_operations),
                    "products_processed": 0,
                    "batches_created": 0,
                    "batches_updated": 0,
                    "scores_calculated": 0,
                    "actions_tracked": 0,
                    "cache_hits": 0,
                    "cache_misses": 0
                }
                
                # Step 1: Bulk process product lookups/creations
                await tx.create_savepoint("products")
                
                product_results = await self._bulk_process_products(
                    session, store_id, user_id, inventory_operations, enable_caching, tx
                )
                results["products_processed"] = len(product_results)
                
                # Step 2: Bulk process batch operations
                await tx.create_savepoint("batches")
                
                batch_results = await self._bulk_process_batches(
                    session, store_id, user_id, inventory_operations, product_results, bulk_optimizer, tx
                )
                results["batches_created"] = batch_results["created"]
                results["batches_updated"] = batch_results["updated"]
                
                # Step 3: Bulk process scoring if enabled
                if auto_score and batch_results["batch_ids"]:
                    await tx.create_savepoint("scoring")
                    
                    scoring_results = await self._bulk_process_scoring(
                        session, store_id, batch_results["batch_ids"], bulk_optimizer, tx
                    )
                    results["scores_calculated"] = scoring_results["scores_written"]
                    
                    # Step 4: Setup action tracking
                    if scoring_results["high_urgency_batches"]:
                        action_results = await self._bulk_setup_action_tracking(
                            session, store_id, user_id, scoring_results["high_urgency_batches"], bulk_optimizer, tx
                        )
                        results["actions_tracked"] = action_results["actions_created"]
                
                return results
                
            except Exception as e:
                logger.error(
                    "Unified inventory write failed",
                    operation_name=operation_name,
                    error=str(e),
                    store_id=store_id
                )
                raise
                
    async def _bulk_process_products(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        operations: List[Dict[str, Any]],
        enable_caching: bool,
        tx: AdvancedTransactionManager
    ) -> Dict[str, str]:
        """Bulk process product lookups and creations with caching"""
        
        # Extract all unique barcodes
        barcodes = list(set(op.get("barcode") for op in operations if op.get("barcode")))
        
        if not barcodes:
            return {}
            
        # Check cache first
        product_map = {}
        cache_key = f"products_{store_id}_{hash(tuple(sorted(barcodes)))}"
        
        if enable_caching and cache_key in self.write_cache:
            cache_data = self.write_cache[cache_key]
            if datetime.utcnow() - cache_data["timestamp"] < self.cache_ttl:
                product_map = cache_data["data"]
                tx.performance_tracker.record_cache_hit(tx.operation_id)
            else:
                del self.write_cache[cache_key]
                tx.performance_tracker.record_cache_miss(tx.operation_id)
        else:
            tx.performance_tracker.record_cache_miss(tx.operation_id)
            
        # Find missing products
        missing_barcodes = [bc for bc in barcodes if bc not in product_map]
        
        if missing_barcodes:
            # Bulk lookup existing products
            existing_products_query = select(Product.barcode, Product.product_id).where(
                Product.barcode.in_(missing_barcodes)
            )
            result = await session.execute(existing_products_query)
            
            for row in result:
                product_map[row.barcode] = str(row.product_id)
                
            tx.record_operation(len(missing_barcodes))
            
            # Create missing products in bulk
            products_to_create = []
            for op in operations:
                barcode = op.get("barcode")
                if barcode and barcode not in product_map:
                    products_to_create.append({
                        "product_id": str(uuid.uuid4()),
                        "sku": f"BULK_{barcode[:10]}_{int(time.time())}",
                        "name": op.get("product_name", "Unknown Product"),
                        "brand": op.get("brand"),
                        "barcode": barcode,
                        "typical_shelf_life_days": 30,
                        "base_cost_price": Decimal(str(op.get("cost_price", 0.01))),
                        "base_selling_price": Decimal(str(op.get("selling_price", 0.01))),
                        "created_by": uuid.UUID(user_id),
                        "is_verified": True
                    })
                    product_map[barcode] = products_to_create[-1]["product_id"]
            
            if products_to_create:
                bulk_optimizer = BulkWriteOptimizer(session)
                await bulk_optimizer.bulk_insert_ignore_duplicates(
                    "inventory.products", 
                    products_to_create
                )
                tx.record_operation(len(products_to_create))
                
        # Update cache
        if enable_caching:
            self.write_cache[cache_key] = {
                "data": product_map,
                "timestamp": datetime.utcnow()
            }
            
        return product_map
        
    async def _bulk_process_batches(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        operations: List[Dict[str, Any]],
        product_map: Dict[str, str],
        bulk_optimizer: BulkWriteOptimizer,
        tx: AdvancedTransactionManager
    ) -> Dict[str, Any]:
        """Bulk process batch operations"""
        
        batches_to_create = []
        batches_to_update = []
        batch_ids = []
        
        for op in operations:
            op_type = op.get("operation_type", "create")
            
            if op_type == "create":
                barcode = op.get("barcode")
                if barcode and barcode in product_map:
                    batch_id = str(uuid.uuid4())
                    batch_ids.append(batch_id)
                    
                    batches_to_create.append({
                        "batch_id": batch_id,
                        "product_id": uuid.UUID(product_map[barcode]),
                        "store_id": uuid.UUID(store_id),
                        "batch_number": op.get("batch_number", f"BULK-{int(time.time())}-{len(batches_to_create)}"),
                        "initial_quantity": Decimal(str(op.get("quantity", 1))),
                        "current_quantity": Decimal(str(op.get("quantity", 1))),
                        "expiry_date": op.get("expiry_date"),
                        "cost_price": Decimal(str(op.get("cost_price", 0))),
                        "selling_price": Decimal(str(op.get("selling_price", 0))),
                        "batch_source": op.get("source", "bulk_api"),
                        "created_by": uuid.UUID(user_id),
                        "status": "active"
                    })
                    
            elif op_type == "update":
                batch_id = op.get("batch_id")
                if batch_id:
                    update_data = {
                        "batch_id": batch_id,
                        **{k: v for k, v in op.items() if k not in ["operation_type", "batch_id"]}
                    }
                    batches_to_update.append(update_data)
        
        # Execute bulk operations
        created = 0
        updated = 0
        
        if batches_to_create:
            created = await bulk_optimizer.bulk_insert_ignore_duplicates(
                "inventory.batches",
                batches_to_create
            )
            tx.record_operation(created)
            
        if batches_to_update:
            updated = await bulk_optimizer.bulk_update_optimized(
                "inventory.batches",
                batches_to_update,
                "batch_id"
            )
            tx.record_operation(updated)
            
        return {
            "created": created,
            "updated": updated,
            "batch_ids": batch_ids
        }
        
    async def _bulk_process_scoring(
        self,
        session: AsyncSession,
        store_id: str,
        batch_ids: List[str],
        bulk_optimizer: BulkWriteOptimizer,
        tx: AdvancedTransactionManager
    ) -> Dict[str, Any]:
        """Bulk process scoring operations"""
        
        if not batch_ids:
            return {"scores_written": 0, "high_urgency_batches": []}
            
        # Get batch data for scoring
        batches_query = select(Batch.batch_id, Batch.expiry_date).where(
            Batch.batch_id.in_([uuid.UUID(bid) for bid in batch_ids])
        )
        result = await session.execute(batches_query)
        
        scores_to_upsert = []
        high_urgency_batches = []
        
        for row in result:
            batch_id = str(row.batch_id)
            days_to_expiry = (row.expiry_date - datetime.now().date()).days
            
            # Simple urgency calculation
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
                
            recommendation = "discount" if urgency_score >= 0.6 else "maintain"
            
            scores_to_upsert.append({
                "batch_id": uuid.UUID(batch_id),
                "store_id": uuid.UUID(store_id),
                "urgency_score": Decimal(str(urgency_score)),
                "recommendation": recommendation,
                "calculated_at": datetime.utcnow(),
                "days_to_expiry": days_to_expiry
            })
            
            if urgency_score >= 0.7:
                high_urgency_batches.append({
                    "batch_id": batch_id,
                    "urgency_score": urgency_score,
                    "recommendation": recommendation
                })
        
        # Bulk upsert scores
        scores_written = 0
        if scores_to_upsert:
            scores_written = await bulk_optimizer.bulk_upsert_with_conflict_resolution(
                "inventory.product_scores",
                scores_to_upsert,
                ["batch_id", "store_id"],
                ["urgency_score", "recommendation", "calculated_at", "days_to_expiry"]
            )
            tx.record_operation(scores_written)
            
        return {
            "scores_written": scores_written,
            "high_urgency_batches": high_urgency_batches
        }
        
    async def _bulk_setup_action_tracking(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        high_urgency_batches: List[Dict[str, Any]],
        bulk_optimizer: BulkWriteOptimizer,
        tx: AdvancedTransactionManager
    ) -> Dict[str, Any]:
        """Bulk setup action tracking for high urgency batches"""
        
        if not high_urgency_batches:
            return {"actions_created": 0}
            
        actions_to_create = []
        
        for batch_data in high_urgency_batches:
            actions_to_create.append({
                "action_id": str(uuid.uuid4()),
                "batch_id": uuid.UUID(batch_data["batch_id"]),
                "store_id": uuid.UUID(store_id),
                "recommended_action": batch_data["recommendation"],
                "actual_action": "maintain",  # Default until user acts
                "ai_score": Decimal(str(batch_data["urgency_score"])),
                "action_date": datetime.utcnow(),
                "performed_by": uuid.UUID(user_id)
            })
        
        actions_created = 0
        if actions_to_create:
            actions_created = await bulk_optimizer.bulk_insert_ignore_duplicates(
                "inventory.batch_actions",
                actions_to_create
            )
            tx.record_operation(actions_created)
            
        return {"actions_created": actions_created}
        
    async def cleanup_cache(self):
        """Cleanup expired cache entries"""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, data in self.write_cache.items()
            if current_time - data["timestamp"] > self.cache_ttl
        ]
        
        for key in expired_keys:
            del self.write_cache[key]
            
        logger.info("Write cache cleaned", expired_entries=len(expired_keys))
        
    async def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        return {
            "cache_stats": {
                "total_entries": len(self.write_cache),
                "cache_size_mb": sum(len(str(data)) for data in self.write_cache.values()) / (1024 * 1024)
            },
            "pool_stats": {
                "active_engines": len(self.pool_optimizer.engines),
                "engine_types": list(self.pool_optimizer.engines.keys())
            }
        }


# Global optimizer instance
_advanced_write_optimizer = None


def get_advanced_write_optimizer() -> AdvancedWriteOptimizer:
    """Get the global advanced write optimizer instance"""
    global _advanced_write_optimizer
    if _advanced_write_optimizer is None:
        from app.core.config import get_settings
        settings = get_settings()
        _advanced_write_optimizer = AdvancedWriteOptimizer(settings.database_url)
    return _advanced_write_optimizer