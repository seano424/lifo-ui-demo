"""
High-Performance Scoring Persistence Service

Optimized for large datasets (10k+ items) with aggressive concurrency and batching.
This version prioritizes speed over individual error isolation.

Performance targets:
- 10,000 items in <30 seconds
- 20,000 items in <60 seconds
"""

import asyncio
import time
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class HighPerformanceScoringPersistence:
    """
    Ultra-fast scoring persistence for large datasets.
    
    Optimizations:
    - Large chunk sizes (500 items)
    - High concurrency (5 concurrent chunks)
    - Aggressive timeouts
    - Minimal logging during processing
    - Batch error handling
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.logger = structlog.get_logger().bind(component="high_perf_scoring_persistence")
        
        # Aggressive performance configuration
        self.CHUNK_SIZE = 500  # Large chunks for maximum throughput
        self.MAX_RETRIES = 2   # Fewer retries for speed
        self.RETRY_DELAY_BASE = 0.2  # Very fast retry
        self.MAX_CONCURRENT_CHUNKS = 5  # High concurrency
        self.CHUNK_TIMEOUT = 20.0  # Generous timeout for large chunks
    
    async def persist_scoring_results(
        self, 
        results: list[dict[str, Any]], 
        store_id: str
    ) -> dict[str, Any]:
        """
        Ultra-fast persistence with aggressive concurrency.
        """
        start_time = time.perf_counter()
        
        if not results:
            return {
                "success": True,
                "total_items": 0,
                "successful": 0,
                "failed": 0,
                "processing_time_ms": 0,
                "errors": [],
                "performance_mode": "high_performance"
            }
        
        self.logger.info(
            "🚀 HIGH-PERFORMANCE: Starting ultra-fast scoring persistence",
            total_items=len(results),
            store_id=store_id,
            chunk_size=self.CHUNK_SIZE,
            max_concurrent=self.MAX_CONCURRENT_CHUNKS,
            estimated_chunks=(len(results) + self.CHUNK_SIZE - 1) // self.CHUNK_SIZE
        )
        
        try:
            from app.database.supabase_service import get_supabase_service
            
            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()
            
            # Create all chunks
            chunks = []
            for chunk_index in range(0, len(results), self.CHUNK_SIZE):
                chunk = results[chunk_index:chunk_index + self.CHUNK_SIZE]
                chunk_num = (chunk_index // self.CHUNK_SIZE) + 1
                chunks.append((chunk, chunk_num))
            
            total_chunks = len(chunks)
            
            self.logger.info(
                "📦 Chunk preparation complete",
                total_chunks=total_chunks,
                average_chunk_size=len(results) // total_chunks if total_chunks > 0 else 0
            )
            
            # Process all chunks with maximum concurrency
            successful = 0
            failed = 0
            errors = []
            
            # Process chunks in concurrent batches
            for batch_start in range(0, len(chunks), self.MAX_CONCURRENT_CHUNKS):
                batch_end = min(batch_start + self.MAX_CONCURRENT_CHUNKS, len(chunks))
                chunk_batch = chunks[batch_start:batch_end]
                
                batch_start_time = time.perf_counter()
                
                # Create all tasks for this batch
                tasks = []
                for chunk, chunk_num in chunk_batch:
                    task = self._process_chunk_ultra_fast(
                        admin_client, chunk, chunk_num, total_chunks, store_id
                    )
                    tasks.append(task)
                
                # Execute all tasks concurrently
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                batch_time = (time.perf_counter() - batch_start_time) * 1000
                
                # Process results quickly
                batch_successful = 0
                batch_failed = 0
                for i, result in enumerate(batch_results):
                    chunk, chunk_num = chunk_batch[i]
                    
                    if isinstance(result, Exception):
                        batch_failed += len(chunk)
                        failed += len(chunk)
                        errors.append(f"Chunk {chunk_num}: {str(result)}")
                    elif result and result.get("success"):
                        batch_successful += result["processed"]
                        successful += result["processed"]
                    else:
                        batch_failed += len(chunk)
                        failed += len(chunk)
                        if result and result.get("errors"):
                            errors.extend(result["errors"])
                
                # Log batch completion with performance metrics
                progress = min(batch_end, len(chunks)) / len(chunks) * 100
                throughput = batch_successful / (batch_time / 1000) if batch_time > 0 else 0
                
                self.logger.info(
                    f"⚡ Batch {batch_start//self.MAX_CONCURRENT_CHUNKS + 1} complete: {progress:.1f}%",
                    batch_time_ms=round(batch_time, 1),
                    batch_successful=batch_successful,
                    batch_failed=batch_failed,
                    throughput_items_per_sec=round(throughput, 1),
                    progress_percent=round(progress, 1)
                )
            
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            # Calculate final performance metrics
            items_per_second = len(results) / (processing_time_ms / 1000) if processing_time_ms > 0 else 0
            success_rate = successful / len(results) * 100 if len(results) > 0 else 0
            
            result = {
                "success": failed == 0,
                "total_items": len(results),
                "successful": successful,
                "failed": failed,
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": errors[:10],  # Limit errors for response size
                "performance": {
                    "mode": "high_performance",
                    "chunk_size": self.CHUNK_SIZE,
                    "total_chunks": total_chunks,
                    "max_concurrent": self.MAX_CONCURRENT_CHUNKS,
                    "items_per_second": round(items_per_second, 1),
                    "success_rate_percent": round(success_rate, 1),
                    "avg_chunk_time_ms": round(processing_time_ms / total_chunks, 1),
                    "performance_target": "10k items in <30s"
                }
            }
            
            # Performance evaluation
            if processing_time_ms < 30000:  # 30 seconds
                performance_rating = "🚀 EXCELLENT"
            elif processing_time_ms < 60000:  # 60 seconds
                performance_rating = "✅ GOOD"
            elif processing_time_ms < 120000:  # 2 minutes
                performance_rating = "⚠️ ACCEPTABLE"
            else:
                performance_rating = "❌ SLOW"
            
            self.logger.info(
                f"{performance_rating}: High-performance persistence completed",
                **result["performance"],
                total_errors=len(errors)
            )
            
            return result
            
        except Exception as e:
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            self.logger.error(
                "💥 CRITICAL: High-performance persistence failed",
                error=str(e),
                error_type=type(e).__name__,
                processing_time_ms=processing_time_ms,
                total_items=len(results)
            )
            
            return {
                "success": False,
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": [f"Critical failure: {str(e)}"],
                "performance": {
                    "mode": "high_performance_failed",
                    "error_type": type(e).__name__
                }
            }
    
    async def _process_chunk_ultra_fast(
        self, 
        admin_client, 
        chunk: list[dict], 
        chunk_num: int, 
        total_chunks: int,
        store_id: str
    ) -> dict[str, Any]:
        """
        Process chunk with minimal overhead and fast failure detection.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Prepare data as quickly as possible
                upsert_data = []
                for item in chunk:
                    # Minimal validation for speed
                    upsert_data.append({
                        "batch_id": item["batch_id"],
                        "store_id": store_id,
                        "expiry_score": float(item.get("expiry_score", 0.0)),
                        "velocity_score": float(item.get("velocity_score", 0.0)),
                        "margin_score": float(item.get("margin_score", 0.0)),
                        "composite_score": float(item.get("composite_score", 0.0)),
                        "recommendation": str(item.get("recommendation", "monitor")),
                        "urgency_level": str(item.get("urgency_level", "low")),
                        "discount_percent": int(item.get("discount_percent", 0)),
                        "reason": str(item.get("reason", "Automated scoring"))[:500],  # Limit length
                        "ml_enhanced": bool(item.get("ml_enhanced", True)),
                        "confidence_level": float(item.get("confidence_level", 0.85)),
                        "calculated_at": (
                            item["calculated_at"].isoformat()
                            if hasattr(item.get("calculated_at"), "isoformat")
                            else datetime.utcnow().isoformat()
                        )
                    })
                
                # Execute with aggressive timeout
                result = await asyncio.wait_for(
                    self._execute_supabase_upsert_fast(admin_client, upsert_data),
                    timeout=self.CHUNK_TIMEOUT
                )
                
                if result:
                    return {
                        "success": True,
                        "processed": len(chunk),
                        "errors": []
                    }
                else:
                    raise Exception("Supabase upsert returned False")
                    
            except asyncio.TimeoutError:
                if attempt < self.MAX_RETRIES - 1:
                    # Very fast retry
                    await asyncio.sleep(self.RETRY_DELAY_BASE * (attempt + 1))
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Timeout after {self.MAX_RETRIES} attempts"]
                    }
                    
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY_BASE * (attempt + 1))
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Failed after {self.MAX_RETRIES} attempts: {str(e)}"]
                    }
        
        return {
            "success": False,
            "processed": 0,
            "errors": ["Unexpected error in retry logic"]
        }
    
    async def _execute_supabase_upsert_fast(self, admin_client, upsert_data: list[dict]) -> bool:
        """
        Ultra-fast Supabase upsert with minimal error handling.
        """
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(upsert_data, on_conflict="batch_id")
                .execute()
            )
            
            # Fast success check
            return result and hasattr(result, 'data') and len(result.data) > 0
            
        except Exception as e:
            # Minimal error logging for speed
            self.logger.debug(
                "Fast upsert failed",
                error_type=type(e).__name__,
                data_count=len(upsert_data)
            )
            return False


def get_high_performance_scoring_persistence(session: AsyncSession) -> HighPerformanceScoringPersistence:
    """Factory function for high-performance persistence."""
    return HighPerformanceScoringPersistence(session)