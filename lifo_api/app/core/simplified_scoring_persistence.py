"""
Simplified Scoring Persistence Service

This replaces the complex multi-tier persistence strategy with a unified approach
that focuses on reliability over micro-optimizations.

Key improvements:
1. Single connection strategy (Supabase REST API only)
2. Proper chunking with error isolation
3. Transactional integrity
4. Comprehensive error handling and recovery
5. Performance monitoring without complexity
"""

import asyncio
import time
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class SimplifiedScoringPersistence:
    """
    Unified scoring persistence service focused on reliability.
    
    Strategy:
    - Use only Supabase REST API (most reliable)
    - Process in smaller chunks (50 items) for better error isolation
    - Implement exponential backoff for retries
    - Clear error reporting and recovery
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.logger = structlog.get_logger().bind(component="simplified_scoring_persistence")
        
        # Optimized chunking configuration
        self.CHUNK_SIZE = 50  # Smaller chunks for better reliability
        self.MAX_RETRIES = 3
        self.RETRY_DELAY_BASE = 1.0  # seconds
    
    async def persist_scoring_results(
        self, 
        results: list[dict[str, Any]], 
        store_id: str
    ) -> dict[str, Any]:
        """
        Persist scoring results with reliable chunked approach.
        
        Args:
            results: List of scoring result dictionaries
            store_id: Store identifier
            
        Returns:
            Dictionary with persistence results and metrics
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
            "Starting simplified scoring persistence",
            total_items=len(results),
            store_id=store_id,
            chunk_size=self.CHUNK_SIZE
        )
        
        # Import Supabase service
        from app.database.supabase_service import get_supabase_service
        
        try:
            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()
            
            # Process in chunks with error isolation
            successful = 0
            failed = 0
            errors = []
            
            total_chunks = (len(results) + self.CHUNK_SIZE - 1) // self.CHUNK_SIZE
            
            for chunk_index in range(0, len(results), self.CHUNK_SIZE):
                chunk = results[chunk_index:chunk_index + self.CHUNK_SIZE]
                chunk_num = (chunk_index // self.CHUNK_SIZE) + 1
                
                chunk_success = await self._process_chunk_with_retry(
                    admin_client, chunk, chunk_num, total_chunks, store_id
                )
                
                if chunk_success["success"]:
                    successful += chunk_success["processed"]
                    self.logger.debug(
                        f"Chunk {chunk_num}/{total_chunks} succeeded",
                        processed=chunk_success["processed"]
                    )
                else:
                    failed += len(chunk)
                    errors.extend(chunk_success["errors"])
                    self.logger.warning(
                        f"Chunk {chunk_num}/{total_chunks} failed",
                        errors=chunk_success["errors"]
                    )
            
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            result = {
                "success": failed == 0,  # Success only if all chunks succeeded
                "total_items": len(results),
                "successful": successful,
                "failed": failed,
                "processing_time_ms": round(processing_time_ms, 2),
                "errors": errors,
                "performance": {
                    "chunk_size": self.CHUNK_SIZE,
                    "total_chunks": total_chunks,
                    "items_per_second": round(len(results) / (processing_time_ms / 1000), 2),
                    "avg_chunk_time_ms": round(processing_time_ms / total_chunks, 2)
                }
            }
            
            self.logger.info(
                "Simplified scoring persistence completed",
                **result
            )
            
            return result
            
        except Exception as e:
            processing_time_ms = (time.perf_counter() - start_time) * 1000
            
            self.logger.error(
                "Critical error in simplified scoring persistence",
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
                "errors": [f"Critical persistence failure: {str(e)}"]
            }
    
    async def _process_chunk_with_retry(
        self, 
        admin_client, 
        chunk: list[dict], 
        chunk_num: int, 
        total_chunks: int,
        store_id: str
    ) -> dict[str, Any]:
        """
        Process a single chunk with retry logic.
        """
        for attempt in range(self.MAX_RETRIES):
            try:
                # Prepare data for Supabase
                upsert_data = []
                for item in chunk:
                    score_data = {
                        "batch_id": item["batch_id"],
                        "store_id": store_id,
                        "expiry_score": float(item.get("expiry_score", 0.0)),
                        "velocity_score": float(item.get("velocity_score", 0.0)),
                        "margin_score": float(item.get("margin_score", 0.0)),
                        "composite_score": float(item.get("composite_score", 0.0)),
                        "recommendation": str(item.get("recommendation", "monitor")),
                        "urgency_level": str(item.get("urgency_level", "low")),
                        "discount_percent": int(item.get("discount_percent", 0)),
                        "reason": str(item.get("reason", "Automated scoring")),
                        "ml_enhanced": bool(item.get("ml_enhanced", True)),
                        "confidence_level": float(item.get("confidence_level", 0.85)),
                        "calculated_at": (
                            item["calculated_at"].isoformat()
                            if hasattr(item.get("calculated_at"), "isoformat")
                            else datetime.utcnow().isoformat()
                        )
                    }
                    upsert_data.append(score_data)
                
                # Execute upsert with timeout
                result = await asyncio.wait_for(
                    self._execute_supabase_upsert(admin_client, upsert_data),
                    timeout=30.0  # 30 second timeout per chunk
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
                self.logger.warning(
                    f"Timeout on chunk {chunk_num}/{total_chunks}, attempt {attempt + 1}/{self.MAX_RETRIES}"
                )
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)  # Exponential backoff
                    await asyncio.sleep(delay)
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Timeout after {self.MAX_RETRIES} attempts"]
                    }
                    
            except Exception as e:
                self.logger.warning(
                    f"Error on chunk {chunk_num}/{total_chunks}, attempt {attempt + 1}/{self.MAX_RETRIES}",
                    error=str(e)
                )
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                    await asyncio.sleep(delay)
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
    
    async def _execute_supabase_upsert(self, admin_client, upsert_data: list[dict]) -> bool:
        """
        Execute the actual Supabase upsert operation.
        """
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(upsert_data, on_conflict="batch_id")
                .execute()
            )
            
            return len(result.data) > 0 if result.data else False
            
        except Exception as e:
            self.logger.error(
                "Supabase upsert execution failed",
                error=str(e),
                data_count=len(upsert_data)
            )
            return False


def get_simplified_scoring_persistence(session: AsyncSession) -> SimplifiedScoringPersistence:
    """Factory function for dependency injection."""
    return SimplifiedScoringPersistence(session)