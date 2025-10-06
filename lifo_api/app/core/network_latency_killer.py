"""
Network Latency Killer Persistence

Designed specifically for high-latency environments like WSL→Supabase
where individual requests take 5+ seconds due to network overhead.

Strategy: MAXIMUM concurrency to process all chunks simultaneously.
"""

import asyncio
import time
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class NetworkLatencyKiller:
    """
    Maximum concurrency persistence designed for high-latency networks.
    
    This version processes ALL chunks concurrently to minimize the impact
    of network latency. Perfect for WSL→Supabase scenarios.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.logger = structlog.get_logger().bind(component="network_latency_killer")
        
        # MAXIMUM concurrency settings for high-latency networks
        self.CHUNK_SIZE = 25  # Keep proven size
        self.MAX_RETRIES = 2  # Fast retries
        self.RETRY_DELAY_BASE = 0.05  # Ultra-fast retry
        self.MAX_CONCURRENT_CHUNKS = 999  # NO LIMIT - process all chunks at once
        self.CHUNK_TIMEOUT = 10.0  # Allow for network overhead
    
    async def persist_scoring_results(
        self, 
        results: list[dict[str, Any]], 
        store_id: str
    ) -> dict[str, Any]:
        """
        Persist with MAXIMUM concurrency to kill network latency impact.
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
            "🚀 NETWORK LATENCY KILLER: Maximum concurrency activated",
            total_items=len(results),
            store_id=store_id,
            chunk_size=self.CHUNK_SIZE,
            strategy="all_chunks_concurrent",
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
                "💥 LAUNCHING ALL CHUNKS CONCURRENTLY",
                total_chunks=total_chunks,
                chunk_size=self.CHUNK_SIZE,
                max_concurrent="UNLIMITED",
                network_strategy="latency_killer"
            )
            
            # Create ALL tasks at once - maximum concurrency
            all_tasks = []
            for chunk, chunk_num in chunks:
                task = self._process_chunk_max_speed(
                    admin_client, chunk, chunk_num, total_chunks, store_id
                )
                all_tasks.append(task)
            
            # Execute ALL chunks concurrently - this is the magic!
            concurrent_start = time.perf_counter()
            all_results = await asyncio.gather(*all_tasks, return_exceptions=True)
            concurrent_time = (time.perf_counter() - concurrent_start) * 1000
            
            # Process results
            successful = 0
            failed = 0
            errors = []
            
            for i, result in enumerate(all_results):
                chunk, chunk_num = chunks[i]
                
                if isinstance(result, Exception):
                    failed += len(chunk)
                    errors.append(f"Chunk {chunk_num}: {str(result)}")
                    self.logger.warning(
                        f"Chunk {chunk_num} failed with exception",
                        error=str(result)
                    )
                elif result and result.get("success"):
                    successful += result["processed"]
                else:
                    failed += len(chunk)
                    if result and result.get("errors"):
                        errors.extend(result["errors"])
            
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            # Calculate performance metrics
            items_per_second = len(results) / (processing_time_ms / 1000) if processing_time_ms > 0 else 0
            
            result = {
                "success": failed == 0,
                "total_items": len(results),
                "successful": successful,
                "failed": failed,
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": errors[:5],  # Limit errors
                "performance": {
                    "mode": "network_latency_killer",
                    "chunk_size": self.CHUNK_SIZE,
                    "total_chunks": total_chunks,
                    "concurrent_chunks": total_chunks,  # All chunks at once!
                    "concurrent_processing_ms": round(concurrent_time, 2),
                    "items_per_second": round(items_per_second, 1),
                    "success_rate_percent": round(successful / len(results) * 100, 1) if len(results) > 0 else 100,
                    "latency_strategy": "maximum_concurrency"
                }
            }
            
            # Performance evaluation
            if processing_time_ms < 30000:  # 30 seconds
                performance_rating = "🚀 NETWORK LATENCY DESTROYED!"
            elif processing_time_ms < 60000:  # 60 seconds  
                performance_rating = "💥 LATENCY SIGNIFICANTLY REDUCED!"
            elif processing_time_ms < 120000:  # 2 minutes
                performance_rating = "⚡ GOOD LATENCY IMPROVEMENT"
            else:
                performance_rating = "⏳ STILL FIGHTING LATENCY"
            
            self.logger.info(
                f"{performance_rating}",
                **result["performance"],
                total_errors=len(errors)
            )
            
            return result
            
        except Exception as e:
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            self.logger.error(
                "💥 NETWORK LATENCY KILLER FAILED",
                error=str(e),
                processing_time_ms=processing_time_ms
            )
            
            return {
                "success": False,
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": [f"Latency killer failed: {str(e)}"]
            }
    
    async def _process_chunk_max_speed(
        self, 
        admin_client, 
        chunk: list[dict], 
        chunk_num: int, 
        total_chunks: int,
        store_id: str
    ) -> dict[str, Any]:
        """
        Process chunk optimized for maximum speed in high-latency environment.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Prepare data with minimal overhead
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
                        "reason": str(item.get("reason", "Auto"))[:150],  # Shorter for speed
                        "ml_enhanced": bool(item.get("ml_enhanced", True)),
                        "confidence_level": float(item.get("confidence_level", 0.85)),
                        "calculated_at": (
                            item["calculated_at"].isoformat()
                            if hasattr(item.get("calculated_at"), "isoformat")
                            else datetime.utcnow().isoformat()
                        )
                    })
                
                # Execute with timeout allowing for network latency
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
                    raise Exception("Upsert failed")
                    
            except asyncio.TimeoutError:
                if attempt < self.MAX_RETRIES - 1:
                    # Very fast retry for network issues
                    await asyncio.sleep(self.RETRY_DELAY_BASE)
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Network timeout after {self.MAX_RETRIES} attempts"]
                    }
                    
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY_BASE)
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Failed: {str(e)[:80]}"]
                    }
        
        return {
            "success": False,
            "processed": 0,
            "errors": ["Retry logic failed"]
        }
    
    async def _execute_supabase_upsert_fast(self, admin_client, upsert_data: list[dict]) -> bool:
        """
        Execute Supabase upsert optimized for speed.
        """
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(upsert_data, on_conflict="batch_id")
                .execute()
            )
            
            return result and hasattr(result, 'data') and result.data is not None
            
        except Exception:
            return False


def get_network_latency_killer(session: AsyncSession) -> NetworkLatencyKiller:
    """Factory function for network latency killer."""
    return NetworkLatencyKiller(session)