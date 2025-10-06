"""
Write Cache Optimizer for Backend-Centric Architecture
Advanced caching strategies specifically designed for write-heavy operations
"""

import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.monitoring.metrics import get_metrics_collector

logger = structlog.get_logger()
metrics = get_metrics_collector()


class WriteCache:
    """
    High-performance cache specifically designed for write operations
    Supports write-through, write-behind, and invalidation strategies
    """
    
    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self.cache = {}
        self.access_times = {}
        self.write_times = {}
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        self.hit_count = 0
        self.miss_count = 0
        self.write_count = 0
        
    def _generate_key(self, prefix: str, identifier: str) -> str:
        """Generate cache key with prefix and hash"""
        return f"{prefix}:{hashlib.md5(identifier.encode()).hexdigest()[:12]}"
    
    def _is_expired(self, key: str) -> bool:
        """Check if cache entry is expired"""
        if key not in self.write_times:
            return True
        return datetime.utcnow() - self.write_times[key] > self.ttl
    
    def _evict_if_needed(self):
        """Evict oldest entries if cache is full"""
        if len(self.cache) >= self.max_size:
            # Remove 10% of oldest entries
            entries_to_remove = int(self.max_size * 0.1)
            oldest_keys = sorted(
                self.access_times.keys(),
                key=lambda k: self.access_times[k]
            )[:entries_to_remove]
            
            for key in oldest_keys:
                self.invalidate(key)
    
    def get(self, prefix: str, identifier: str) -> Any | None:
        """Get value from cache"""
        key = self._generate_key(prefix, identifier)
        
        if key in self.cache and not self._is_expired(key):
            self.access_times[key] = datetime.utcnow()
            self.hit_count += 1
            metrics.record_cache_operation("hit", f"write_cache_{prefix}")
            return self.cache[key]
        else:
            if key in self.cache:
                self.invalidate(key)  # Remove expired entry
            self.miss_count += 1
            metrics.record_cache_operation("miss", f"write_cache_{prefix}")
            return None
    
    def put(self, prefix: str, identifier: str, value: Any) -> None:
        """Put value in cache"""
        key = self._generate_key(prefix, identifier)
        
        self._evict_if_needed()
        
        self.cache[key] = value
        self.access_times[key] = datetime.utcnow()
        self.write_times[key] = datetime.utcnow()
        self.write_count += 1
        
        metrics.record_cache_operation("set", f"write_cache_{prefix}")
    
    def invalidate(self, key: str = None, prefix: str = None) -> int:
        """Invalidate cache entries"""
        if key:
            # Invalidate specific key
            if key in self.cache:
                del self.cache[key]
                del self.access_times[key]
                del self.write_times[key]
                metrics.record_cache_operation("evict", "write_cache")
                return 1
            return 0
        elif prefix:
            # Invalidate all keys with prefix
            keys_to_remove = [k for k in self.cache.keys() if k.startswith(f"{prefix}:")]
            for key in keys_to_remove:
                del self.cache[key]
                del self.access_times[key]
                del self.write_times[key]
            metrics.record_cache_operation("evict", f"write_cache_{prefix}")
            return len(keys_to_remove)
        return 0
    
    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hit_count + self.miss_count
        hit_ratio = self.hit_count / total_requests if total_requests > 0 else 0
        
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_ratio": hit_ratio,
            "write_count": self.write_count,
            "utilization": len(self.cache) / self.max_size
        }


class WriteBehindProcessor:
    """
    Processes write-behind operations asynchronously
    Batches and optimizes delayed writes for better performance
    """
    
    def __init__(self):
        self.write_queue = []
        self.batch_size = 50
        self.max_delay_seconds = 30
        self.processing = False
        
    async def queue_write(self, operation: dict[str, Any]) -> str:
        """Queue a write operation for batch processing"""
        operation_id = str(uuid.uuid4())
        operation.update({
            "operation_id": operation_id,
            "queued_at": datetime.utcnow()
        })
        
        self.write_queue.append(operation)
        
        # Start processing if not already running
        if not self.processing and (
            len(self.write_queue) >= self.batch_size or
            self._has_old_operations()
        ):
            asyncio.create_task(self._process_write_queue())
        
        return operation_id
    
    def _has_old_operations(self) -> bool:
        """Check if queue has operations older than max delay"""
        if not self.write_queue:
            return False
        
        oldest_operation = min(self.write_queue, key=lambda x: x["queued_at"])
        age = datetime.utcnow() - oldest_operation["queued_at"]
        return age.total_seconds() > self.max_delay_seconds
    
    async def _process_write_queue(self):
        """Process queued write operations in batches"""
        if self.processing:
            return
        
        self.processing = True
        
        try:
            while self.write_queue:
                # Take a batch of operations
                batch = self.write_queue[:self.batch_size]
                self.write_queue = self.write_queue[self.batch_size:]
                
                if batch:
                    await self._process_write_batch(batch)
                    
        except Exception as e:
            logger.error("Write-behind processing failed", error=str(e))
        finally:
            self.processing = False
    
    async def _process_write_batch(self, batch: list[dict[str, Any]]):
        """Process a batch of write operations"""
        async with async_session()() as session:
            try:
                # Group operations by type and table
                operations_by_type = {}
                for operation in batch:
                    op_key = f"{operation['operation_type']}_{operation['table_name']}"
                    if op_key not in operations_by_type:
                        operations_by_type[op_key] = []
                    operations_by_type[op_key].append(operation)
                
                # Process each group optimally
                for op_type, operations in operations_by_type.items():
                    await self._process_operation_group(session, operations)
                
                await session.commit()
                
                logger.info(
                    "Write-behind batch processed",
                    batch_size=len(batch),
                    operation_types=len(operations_by_type)
                )
                
            except Exception as e:
                await session.rollback()
                logger.error(
                    "Write-behind batch failed",
                    batch_size=len(batch),
                    error=str(e)
                )
                raise
    
    async def _process_operation_group(
        self,
        session: AsyncSession,
        operations: list[dict[str, Any]]
    ):
        """Process a group of similar operations"""
        if not operations:
            return
        
        operation_type = operations[0]["operation_type"]
        table_name = operations[0]["table_name"]
        
        if operation_type == "bulk_insert":
            await self._process_bulk_inserts(session, table_name, operations)
        elif operation_type == "bulk_update":
            await self._process_bulk_updates(session, table_name, operations)
        elif operation_type == "bulk_upsert":
            await self._process_bulk_upserts(session, table_name, operations)
        else:
            logger.warning(
                "Unknown write-behind operation type",
                operation_type=operation_type
            )
    
    async def _process_bulk_inserts(
        self,
        session: AsyncSession,
        table_name: str,
        operations: list[dict[str, Any]]
    ):
        """Process bulk insert operations"""
        all_records = []
        for operation in operations:
            all_records.extend(operation.get("records", []))
        
        if all_records:
            # Use bulk insert optimization
            from app.services.advanced_write_optimizer import BulkWriteOptimizer
            bulk_optimizer = BulkWriteOptimizer(session)
            
            await bulk_optimizer.bulk_insert_ignore_duplicates(
                table_name, all_records
            )
    
    async def _process_bulk_updates(
        self,
        session: AsyncSession,
        table_name: str,
        operations: list[dict[str, Any]]
    ):
        """Process bulk update operations"""
        all_updates = []
        for operation in operations:
            all_updates.extend(operation.get("updates", []))
        
        if all_updates:
            # Use bulk update optimization
            from app.services.advanced_write_optimizer import BulkWriteOptimizer
            bulk_optimizer = BulkWriteOptimizer(session)
            
            await bulk_optimizer.bulk_update_optimized(
                table_name, all_updates, operation.get("id_column", "id")
            )
    
    async def _process_bulk_upserts(
        self,
        session: AsyncSession,
        table_name: str,
        operations: list[dict[str, Any]]
    ):
        """Process bulk upsert operations"""
        all_records = []
        conflict_columns = operations[0].get("conflict_columns", ["id"])
        update_columns = operations[0].get("update_columns", [])
        
        for operation in operations:
            all_records.extend(operation.get("records", []))
        
        if all_records:
            # Use bulk upsert optimization
            from app.services.advanced_write_optimizer import BulkWriteOptimizer
            bulk_optimizer = BulkWriteOptimizer(session)
            
            await bulk_optimizer.bulk_upsert_with_conflict_resolution(
                table_name, all_records, conflict_columns, update_columns
            )


class WriteCacheOptimizer:
    """
    Main write cache optimization service
    Coordinates caching strategies for write-heavy operations
    """
    
    def __init__(self):
        # Different cache types for different use cases
        self.product_cache = WriteCache(max_size=5000, ttl_seconds=600)  # 10 minutes
        self.batch_cache = WriteCache(max_size=10000, ttl_seconds=300)   # 5 minutes
        self.score_cache = WriteCache(max_size=8000, ttl_seconds=180)    # 3 minutes
        self.store_cache = WriteCache(max_size=1000, ttl_seconds=1800)   # 30 minutes
        
        self.write_behind_processor = WriteBehindProcessor()
        self.session_factory = async_session()
        
        # Cache warming strategies
        self.warming_enabled = True
        self.last_warming = {}
        
    async def get_cached_products(
        self,
        store_id: str,
        barcodes: list[str]
    ) -> tuple[dict[str, str], list[str]]:
        """
        Get products from cache, return found products and missing barcodes
        """
        cache_key = f"products_{store_id}_{hash(tuple(sorted(barcodes)))}"
        
        # Check cache first
        cached_products = self.product_cache.get("products", cache_key)
        if cached_products:
            missing_barcodes = [bc for bc in barcodes if bc not in cached_products]
            return cached_products, missing_barcodes
        
        # Cache miss - need to fetch from database
        return {}, barcodes
    
    async def cache_products(
        self,
        store_id: str,
        products: dict[str, str]
    ) -> None:
        """Cache product data for future lookups"""
        if not products:
            return
        
        # Create cache key based on store and barcode set
        barcodes = sorted(products.keys())
        cache_key = f"products_{store_id}_{hash(tuple(barcodes))}"
        
        self.product_cache.put("products", cache_key, products)
        
        logger.debug(
            "Products cached",
            store_id=store_id,
            product_count=len(products),
            cache_key=cache_key
        )
    
    async def get_cached_batch_data(
        self,
        store_id: str,
        batch_ids: list[str]
    ) -> tuple[dict[str, dict[str, Any]], list[str]]:
        """Get batch data from cache"""
        found_batches = {}
        missing_batch_ids = []
        
        for batch_id in batch_ids:
            cache_key = f"batch_{store_id}_{batch_id}"
            cached_batch = self.batch_cache.get("batches", cache_key)
            
            if cached_batch:
                found_batches[batch_id] = cached_batch
            else:
                missing_batch_ids.append(batch_id)
        
        return found_batches, missing_batch_ids
    
    async def cache_batch_data(
        self,
        store_id: str,
        batch_id: str,
        batch_data: dict[str, Any]
    ) -> None:
        """Cache batch data"""
        cache_key = f"batch_{store_id}_{batch_id}"
        self.batch_cache.put("batches", cache_key, batch_data)
    
    async def invalidate_batch_cache(
        self,
        store_id: str,
        batch_ids: list[str] = None
    ) -> int:
        """Invalidate batch cache entries"""
        if batch_ids:
            invalidated = 0
            for batch_id in batch_ids:
                cache_key = f"batch_{store_id}_{batch_id}"
                key = self.batch_cache._generate_key("batches", cache_key)
                invalidated += self.batch_cache.invalidate(key)
            return invalidated
        else:
            # Invalidate all batches for store
            return self.batch_cache.invalidate(prefix=f"batches:batch_{store_id}")
    
    async def cache_store_metadata(
        self,
        store_id: str,
        metadata: dict[str, Any]
    ) -> None:
        """Cache store metadata for write operations"""
        self.store_cache.put("store_metadata", store_id, metadata)
    
    async def get_cached_store_metadata(self, store_id: str) -> dict[str, Any] | None:
        """Get cached store metadata"""
        return self.store_cache.get("store_metadata", store_id)
    
    async def warm_product_cache(self, store_id: str) -> dict[str, Any]:
        """
        Warm the product cache with frequently accessed products
        """
        cache_key = f"products_warming_{store_id}"
        
        # Check if warming was done recently
        if cache_key in self.last_warming:
            time_since_warming = datetime.utcnow() - self.last_warming[cache_key]
            if time_since_warming < timedelta(hours=1):
                return {"status": "recently_warmed", "skipped": True}
        
        async with self.session_factory() as session:
            try:
                # Get frequently accessed products for this store
                frequent_products_query = text("""
                    SELECT p.barcode, p.product_id::text
                    FROM inventory.products p
                    JOIN inventory.store_products sp ON p.product_id = sp.product_id
                    JOIN inventory.batches b ON p.product_id = b.product_id
                    WHERE sp.store_id = :store_id
                      AND sp.is_active = true
                      AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY p.barcode, p.product_id
                    ORDER BY COUNT(b.batch_id) DESC
                    LIMIT 1000
                """)
                
                result = await session.execute(frequent_products_query, {"store_id": store_id})
                
                products = {}
                for row in result:
                    products[row.barcode] = row.product_id
                
                if products:
                    await self.cache_products(store_id, products)
                    self.last_warming[cache_key] = datetime.utcnow()
                
                logger.info(
                    "Product cache warmed",
                    store_id=store_id,
                    products_cached=len(products)
                )
                
                return {
                    "status": "warmed",
                    "products_cached": len(products),
                    "store_id": store_id
                }
                
            except Exception as e:
                logger.error(
                    "Product cache warming failed",
                    store_id=store_id,
                    error=str(e)
                )
                return {"status": "failed", "error": str(e)}
    
    async def schedule_write_behind(
        self,
        operation_type: str,
        table_name: str,
        data: dict[str, Any]
    ) -> str:
        """
        Schedule a write-behind operation for batch processing
        """
        operation = {
            "operation_type": operation_type,
            "table_name": table_name,
            **data
        }
        
        return await self.write_behind_processor.queue_write(operation)
    
    async def optimize_write_caching(
        self,
        operation_type: str,
        store_id: str,
        data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Apply optimal caching strategy for specific write operation
        """
        optimization_result = {
            "cache_strategy": "none",
            "cache_hits": 0,
            "cache_misses": 0,
            "write_behind_scheduled": False
        }
        
        if operation_type == "batch_creation":
            # Optimize for batch creation operations
            barcodes = data.get("barcodes", [])
            if barcodes:
                products, missing_barcodes = await self.get_cached_products(store_id, barcodes)
                optimization_result.update({
                    "cache_strategy": "product_lookup_cache",
                    "cache_hits": len(products),
                    "cache_misses": len(missing_barcodes),
                    "cached_products": products
                })
        
        elif operation_type == "bulk_scoring":
            # Cache scoring results for quick access
            batch_ids = data.get("batch_ids", [])
            if len(batch_ids) > 10:  # Only for bulk operations
                operation_id = await self.schedule_write_behind(
                    "bulk_upsert",
                    "inventory.product_scores",
                    {
                        "records": data.get("score_records", []),
                        "conflict_columns": ["batch_id", "store_id"],
                        "update_columns": ["urgency_score", "recommendation", "calculated_at"]
                    }
                )
                optimization_result.update({
                    "cache_strategy": "write_behind",
                    "write_behind_scheduled": True,
                    "operation_id": operation_id
                })
        
        elif operation_type == "mobile_sync":
            # Optimize mobile sync with aggressive caching
            if "batch_updates" in data and len(data["batch_updates"]) > 5:
                # Invalidate affected batch cache entries
                batch_ids = [update.get("batch_id") for update in data["batch_updates"]]
                invalidated = await self.invalidate_batch_cache(store_id, batch_ids)
                optimization_result.update({
                    "cache_strategy": "invalidation",
                    "cache_entries_invalidated": invalidated
                })
        
        return optimization_result
    
    async def get_cache_performance_report(self) -> dict[str, Any]:
        """Get comprehensive cache performance report"""
        return {
            "product_cache": self.product_cache.get_stats(),
            "batch_cache": self.batch_cache.get_stats(),
            "score_cache": self.score_cache.get_stats(),
            "store_cache": self.store_cache.get_stats(),
            "write_behind_queue_size": len(self.write_behind_processor.write_queue),
            "cache_warming": {
                "enabled": self.warming_enabled,
                "last_warming_times": {
                    key: time.isoformat() for key, time in self.last_warming.items()
                }
            },
            "overall_metrics": {
                "total_cache_entries": (
                    len(self.product_cache.cache) +
                    len(self.batch_cache.cache) +
                    len(self.score_cache.cache) +
                    len(self.store_cache.cache)
                ),
                "average_hit_ratio": sum([
                    cache.hit_count / (cache.hit_count + cache.miss_count)
                    for cache in [self.product_cache, self.batch_cache, self.score_cache, self.store_cache]
                    if (cache.hit_count + cache.miss_count) > 0
                ]) / 4
            }
        }
    
    async def cleanup_expired_cache_entries(self) -> dict[str, int]:
        """Clean up expired cache entries across all caches"""
        cleanup_stats = {}
        
        for cache_name, cache in [
            ("product_cache", self.product_cache),
            ("batch_cache", self.batch_cache),
            ("score_cache", self.score_cache),
            ("store_cache", self.store_cache)
        ]:
            initial_size = len(cache.cache)
            
            # Find expired keys
            expired_keys = []
            for key in list(cache.cache.keys()):
                if cache._is_expired(key):
                    expired_keys.append(key)
            
            # Remove expired keys
            for key in expired_keys:
                cache.invalidate(key)
            
            cleanup_stats[cache_name] = {
                "initial_size": initial_size,
                "expired_entries": len(expired_keys),
                "final_size": len(cache.cache)
            }
        
        logger.info("Cache cleanup completed", cleanup_stats=cleanup_stats)
        return cleanup_stats


# Global instance
_write_cache_optimizer = None


def get_write_cache_optimizer() -> WriteCacheOptimizer:
    """Get the global write cache optimizer instance"""
    global _write_cache_optimizer
    if _write_cache_optimizer is None:
        _write_cache_optimizer = WriteCacheOptimizer()
    return _write_cache_optimizer