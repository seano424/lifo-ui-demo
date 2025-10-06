"""
Supabase-Safe Persistence Service

This version is specifically designed to work around Supabase's statement timeout issues.
Uses very small chunks with high concurrency to maintain throughput while avoiding timeouts.

Strategy:
- Ultra-small chunks (25 items max)
- High concurrency (8 concurrent chunks)  
- Fast failure detection (5s timeout)
- Aggressive retry logic
"""

import asyncio
import time
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class SupabaseSafePersistence:
    """
    Ultra-conservative persistence service designed specifically for Supabase timeouts.
    
    This version prioritizes reliability over raw speed, using small chunks
    with high concurrency to work around Supabase's statement timeout limitations.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.logger = structlog.get_logger().bind(component="supabase_safe_persistence")
        
        # ULTRA-HIGH CONCURRENCY to overcome WSL→Supabase network latency
        self.CHUNK_SIZE = 25   # Keep small chunks for reliability
        self.MAX_RETRIES = 2   # Fewer retries for speed
        self.RETRY_DELAY_BASE = 0.1  # Ultra-fast retry
        self.MAX_CONCURRENT_CHUNKS = 20  # MASSIVE concurrency for network latency
        self.CHUNK_TIMEOUT = 8.0  # Slightly longer for network overhead
    
    async def persist_scoring_results(
        self, 
        results: list[dict[str, Any]], 
        store_id: str
    ) -> dict[str, Any]:
        """
        Persist scoring results using ultra-safe approach for Supabase.
        """
        start_time = time.perf_counter()
        
        if not results:
            return {
                "success": True,
                "total_items": 0,
                "successful": 0,
                "failed": 0,
                "processing_time_ms": 0,
                "errors": []
            }
        
        self.logger.info(
            "🛡️  SUPABASE-SAFE: Starting ultra-conservative scoring persistence",
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
            
            # Create all chunks (very small)
            chunks = []
            for chunk_index in range(0, len(results), self.CHUNK_SIZE):
                chunk = results[chunk_index:chunk_index + self.CHUNK_SIZE]
                chunk_num = (chunk_index // self.CHUNK_SIZE) + 1
                chunks.append((chunk, chunk_num))
            
            total_chunks = len(chunks)
            
            self.logger.info(
                "📦 Ultra-safe chunk preparation complete",
                total_chunks=total_chunks,
                chunk_size=self.CHUNK_SIZE,
                strategy="avoid_statement_timeout"
            )
            
            # Process chunks in batches with high concurrency
            successful = 0
            failed = 0
            errors = []
            
            for batch_start in range(0, len(chunks), self.MAX_CONCURRENT_CHUNKS):
                batch_end = min(batch_start + self.MAX_CONCURRENT_CHUNKS, len(chunks))
                chunk_batch = chunks[batch_start:batch_end]
                
                batch_start_time = time.perf_counter()
                
                # Create concurrent tasks
                tasks = []
                for chunk, chunk_num in chunk_batch:
                    task = self._process_chunk_ultra_safe(
                        admin_client, chunk, chunk_num, total_chunks, store_id
                    )
                    tasks.append(task)
                
                # Execute all tasks concurrently
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                batch_time = (time.perf_counter() - batch_start_time) * 1000
                
                # Process results
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
                
                # Log progress
                progress = min(batch_end, len(chunks)) / len(chunks) * 100
                throughput = batch_successful / (batch_time / 1000) if batch_time > 0 else 0
                
                self.logger.info(
                    f"🛡️  Safe batch {batch_start//self.MAX_CONCURRENT_CHUNKS + 1} complete: {progress:.0f}%",
                    batch_successful=batch_successful,
                    batch_failed=batch_failed,
                    throughput_items_per_sec=round(throughput, 0),
                    batch_time_ms=round(batch_time, 0)
                )
            
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            result = {
                "success": failed == 0,
                "total_items": len(results),
                "successful": successful,
                "failed": failed,
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": errors[:5],  # Limit errors
                "performance": {
                    "mode": "supabase_safe",
                    "chunk_size": self.CHUNK_SIZE,
                    "total_chunks": total_chunks,
                    "max_concurrent": self.MAX_CONCURRENT_CHUNKS,
                    "items_per_second": round(len(results) / (processing_time_ms / 1000), 1),
                    "success_rate_percent": round(successful / len(results) * 100, 1) if len(results) > 0 else 100
                }
            }
            
            if failed == 0:
                self.logger.info(
                    "🎉 SUPABASE-SAFE: Perfect success with ultra-conservative approach",
                    **result["performance"]
                )
            else:
                self.logger.warning(
                    "⚠️  SUPABASE-SAFE: Some failures despite conservative approach",
                    **result["performance"],
                    failed_items=failed
                )
            
            return result
            
        except Exception as e:
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            self.logger.error(
                "💥 CRITICAL: Even ultra-safe persistence failed",
                error=str(e),
                processing_time_ms=processing_time_ms
            )
            
            return {
                "success": False,
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": [f"Critical failure: {str(e)}"]
            }
    
    async def _process_chunk_ultra_safe(
        self, 
        admin_client, 
        chunk: list[dict], 
        chunk_num: int, 
        total_chunks: int,
        store_id: str
    ) -> dict[str, Any]:
        """
        Process chunk with ultra-conservative approach.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Prepare data with minimal processing time
                upsert_data = []
                for item in chunk:
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
                        "reason": str(item.get("reason", "Automated"))[:200],  # Limit length
                        "ml_enhanced": bool(item.get("ml_enhanced", True)),
                        "confidence_level": float(item.get("confidence_level", 0.85)),
                        "calculated_at": (
                            item["calculated_at"].isoformat()
                            if hasattr(item.get("calculated_at"), "isoformat")
                            else datetime.utcnow().isoformat()
                        )
                    })
                
                # Execute with ultra-fast timeout
                result = await asyncio.wait_for(
                    self._execute_supabase_upsert_safe(admin_client, upsert_data),
                    timeout=self.CHUNK_TIMEOUT
                )
                
                if result:
                    return {
                        "success": True,
                        "processed": len(chunk),
                        "errors": []
                    }
                else:
                    raise Exception("Upsert returned False")
                    
            except asyncio.TimeoutError:
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Timeout after {self.MAX_RETRIES} attempts"]
                    }
                    
            except Exception as e:
                error_msg = str(e)
                if "statement timeout" in error_msg.lower():
                    self.logger.warning(
                        f"Statement timeout on chunk {chunk_num}, attempt {attempt + 1}",
                        chunk_size=len(chunk)
                    )
                
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Failed: {error_msg[:100]}"]
                    }
        
        return {
            "success": False,
            "processed": 0,
            "errors": ["Unexpected retry logic failure"]
        }
    
    async def _execute_supabase_upsert_safe(self, admin_client, upsert_data: list[dict]) -> bool:
        """
        Execute Supabase upsert with minimal overhead.
        """
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(upsert_data, on_conflict="batch_id")
                .execute()
            )
            
            # Quick success check
            return result and hasattr(result, 'data') and result.data is not None
            
        except Exception as e:
            error_msg = str(e)
            if "statement timeout" in error_msg.lower():
                self.logger.debug(
                    "Supabase statement timeout detected",
                    chunk_size=len(upsert_data)
                )
            return False


def get_supabase_safe_persistence(session: AsyncSession) -> SupabaseSafePersistence:
    """Factory function for Supabase-safe persistence."""
    return SupabaseSafePersistence(session)