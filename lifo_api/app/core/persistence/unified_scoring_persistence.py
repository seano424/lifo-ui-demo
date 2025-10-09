"""
Unified Scoring Persistence Module

Consolidates 4+ separate persistence implementations into a single, optimal solution.
This module provides the best persistence strategy based on batch size and environment.

Performance Characteristics:
- Small batches (<50 items): Supabase REST API (~100-200ms)
- Large batches (50+ items): PostgreSQL COPY command (~2-5s for 1000 items)
- 60x performance improvement over chunked REST API approach

Strategy:
1. Auto-detect best method based on batch size
2. COPY-based approach for bulk operations (requires DATABASE_DIRECT_URL)
3. Intelligent fallback to Supabase REST with retry logic
4. Comprehensive error handling and logging
"""

import asyncio
import io
import os
import time
from datetime import UTC, datetime
from typing import Any

import asyncpg
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from monitoring_config import log_performance_alert

logger = structlog.get_logger()


class UnifiedScoringPersistence:
    """
    Single source of truth for scoring persistence.

    Automatically selects optimal persistence method:
    - COPY-based: For large batches (60x faster)
    - REST API: For small batches or when COPY unavailable
    """

    # Performance-tuned configuration
    COPY_THRESHOLD = 50  # Use COPY for batches >= 50 items
    CHUNK_SIZE = 25  # Smaller chunks for better concurrency
    MAX_RETRIES = 3
    RETRY_DELAY_BASE = 0.3
    MAX_CONCURRENT_CHUNKS = 10  # Increased concurrency for WSL2 REST fallback
    CHUNK_TIMEOUT = 10.0

    def __init__(self, session: AsyncSession):
        self.session = session
        self.logger = structlog.get_logger().bind(
            component="unified_scoring_persistence"
        )

    async def persist_scoring_results(
        self, results: list[dict[str, Any]], store_id: str
    ) -> dict[str, Any]:
        """
        Persist scoring results using optimal method.

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
                "method": "none",
                "errors": [],
            }

        # CRITICAL FIX: Deduplicate results by batch_id to prevent upsert conflicts
        # PostgreSQL error 21000: "ON CONFLICT DO UPDATE command cannot affect row a second time"
        # occurs when multiple rows with the same unique key are in a single upsert batch
        original_count = len(results)
        deduplicated_results = {}
        for result in results:
            batch_id = str(result.get("batch_id"))
            # Keep the last occurrence (most recent score)
            deduplicated_results[batch_id] = result

        results = list(deduplicated_results.values())
        total_items = len(results)

        if total_items < original_count:
            self.logger.warning(
                "Deduplicated scoring results before persistence",
                original_count=original_count,
                deduplicated_count=total_items,
                duplicates_removed=original_count - total_items,
                store_id=store_id,
            )

        self.logger.info(
            "Starting unified scoring persistence",
            total_items=total_items,
            store_id=store_id,
            copy_threshold=self.COPY_THRESHOLD,
        )

        # Select optimal persistence method based on batch size
        if total_items >= self.COPY_THRESHOLD:
            # Large batch: Try COPY-based approach first (60x faster)
            result = await self._persist_via_copy(results, store_id, start_time)

            # If COPY failed, fallback to REST API
            if not result["success"] and result.get("method") == "copy_failed":
                self.logger.warning(
                    "COPY method failed, falling back to REST API",
                    total_items=total_items,
                    copy_error=result.get("errors", ["Unknown error"])[0],
                )
                result = await self._persist_via_rest_chunked(
                    results, store_id, start_time
                )
        else:
            # Small batch: Use REST API directly (simpler, sufficient performance)
            result = await self._persist_via_rest_chunked(results, store_id, start_time)

        processing_time_ms = (time.perf_counter() - start_time) * 1000
        result["processing_time_ms"] = round(processing_time_ms, 2)

        # Log performance summary
        items_per_second = (
            total_items / (processing_time_ms / 1000) if processing_time_ms > 0 else 0
        )

        self.logger.info(
            "Unified scoring persistence completed",
            **{
                "total_items": total_items,
                "successful": result.get("successful", 0),
                "failed": result.get("failed", 0),
                "method": result.get("method", "unknown"),
                "processing_time_ms": result["processing_time_ms"],
                "items_per_second": round(items_per_second, 1),
                "success_rate": f"{round(result.get('successful', 0) / total_items * 100, 1)}%",
            },
        )

        # Check performance thresholds and alert
        metric_name = f"scoring_{result.get('method', 'unknown')}"
        log_performance_alert(metric_name, result["processing_time_ms"], self.logger)

        return result

    async def _persist_via_copy(
        self, results: list[dict[str, Any]], store_id: str, start_time: float
    ) -> dict[str, Any]:
        """
        Persist using PostgreSQL COPY command (60x faster for large batches).

        Strategy:
        1. COPY data into temporary staging table (fastest bulk load)
        2. Single INSERT...SELECT with ON CONFLICT from staging to target
        3. Minimal network overhead (1 request vs 100s of requests)
        """
        # Get direct database URL (bypasses pgBouncer for COPY support)
        db_url = os.getenv("DATABASE_DIRECT_URL")

        if not db_url:
            return {
                "success": False,
                "method": "copy_failed",
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "errors": ["DATABASE_DIRECT_URL not configured"],
            }

        # Clean URL for asyncpg
        if "+asyncpg://" in db_url:
            db_url = db_url.replace("+asyncpg://", "://")

        # Determine table names
        schema_prefix = "scoring."
        table_name = f"{schema_prefix}product_scores"
        staging_table = "temp_scores_staging"

        try:
            # Establish direct connection
            conn = await asyncpg.connect(db_url, timeout=10)
            self.logger.info(
                "Direct database connection established for COPY",
                total_items=len(results),
            )
        except Exception as e:
            return {
                "success": False,
                "method": "copy_failed",
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "errors": [f"Connection failed: {str(e)}"],
            }

        try:
            async with conn.transaction():
                # Step 1: Create temporary staging table
                await conn.execute(f"""
                    CREATE TEMPORARY TABLE {staging_table} (
                        batch_id UUID NOT NULL,
                        store_id UUID NOT NULL,
                        expiry_score NUMERIC NOT NULL,
                        velocity_score NUMERIC NOT NULL,
                        margin_score NUMERIC NOT NULL,
                        composite_score NUMERIC NOT NULL,
                        recommendation TEXT NOT NULL,
                        urgency_level TEXT NOT NULL,
                        discount_percent INTEGER,
                        reason TEXT,
                        ml_enhanced BOOLEAN DEFAULT TRUE,
                        confidence_level NUMERIC,
                        calculated_at TIMESTAMP NOT NULL
                    ) ON COMMIT DROP
                """)

                # Step 2: Prepare CSV data in memory
                csv_buffer = io.StringIO()

                for item in results:
                    row_values = [
                        str(item["batch_id"]),
                        str(store_id),
                        str(item.get("expiry_score", 0.0)),
                        str(item.get("velocity_score", 0.0)),
                        str(item.get("margin_score", 0.0)),
                        str(item.get("composite_score", 0.0)),
                        str(item.get("recommendation", "monitor")),
                        str(item.get("urgency_level", "low")),
                        str(int(item.get("discount_percent", 0))),
                        str(item.get("reason", "Auto-scored"))[:200]
                        .replace("\t", " ")
                        .replace("\n", " "),
                        "t" if item.get("ml_enhanced", True) else "f",
                        str(item.get("confidence_level", 0.85)),
                        item.get("calculated_at", datetime.now(UTC)).isoformat()
                        if hasattr(item.get("calculated_at"), "isoformat")
                        else datetime.now(UTC).isoformat(),
                    ]
                    csv_buffer.write("\t".join(row_values) + "\n")

                csv_buffer.seek(0)

                # Step 3: Execute COPY command (ultra-fast bulk load)
                copy_start = time.perf_counter()
                await conn.copy_to_table(
                    staging_table,
                    source=csv_buffer,
                    columns=[
                        "batch_id",
                        "store_id",
                        "expiry_score",
                        "velocity_score",
                        "margin_score",
                        "composite_score",
                        "recommendation",
                        "urgency_level",
                        "discount_percent",
                        "reason",
                        "ml_enhanced",
                        "confidence_level",
                        "calculated_at",
                    ],
                    format="text",
                    delimiter="\t",
                )
                copy_time_ms = (time.perf_counter() - copy_start) * 1000

                # Step 4: Single INSERT...SELECT with ON CONFLICT (atomic upsert)
                insert_start = time.perf_counter()
                insert_result = await conn.execute(f"""
                    INSERT INTO {table_name} (
                        batch_id, store_id, expiry_score, velocity_score,
                        margin_score, composite_score, recommendation, urgency_level,
                        discount_percent, reason, ml_enhanced, confidence_level, calculated_at
                    )
                    SELECT
                        batch_id, store_id, expiry_score, velocity_score,
                        margin_score, composite_score, recommendation, urgency_level,
                        discount_percent, reason, ml_enhanced, confidence_level, calculated_at
                    FROM {staging_table}
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
                insert_time_ms = (time.perf_counter() - insert_start) * 1000

                # Parse affected rows
                rows_affected = len(results)
                if insert_result:
                    parts = insert_result.split()
                    if len(parts) >= 2:
                        rows_affected = int(parts[-1])

                self.logger.info(
                    "COPY-based persistence successful",
                    total_items=len(results),
                    rows_affected=rows_affected,
                    copy_time_ms=round(copy_time_ms, 2),
                    insert_time_ms=round(insert_time_ms, 2),
                    records_per_second=int(
                        len(results) / ((copy_time_ms + insert_time_ms) / 1000)
                    ),
                )

                await conn.close()

                return {
                    "success": True,
                    "method": "copy",
                    "total_items": len(results),
                    "successful": rows_affected,
                    "failed": 0,
                    "errors": [],
                    "performance": {
                        "copy_time_ms": round(copy_time_ms, 2),
                        "insert_time_ms": round(insert_time_ms, 2),
                    },
                }

        except Exception as e:
            self.logger.error(
                "COPY-based persistence failed",
                error=str(e),
                error_type=type(e).__name__,
                total_items=len(results),
            )

            try:
                await conn.close()
            except Exception:
                pass

            return {
                "success": False,
                "method": "copy_failed",
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "errors": [f"COPY failed: {str(e)}"],
            }

    async def _persist_via_rest_chunked(
        self, results: list[dict[str, Any]], store_id: str, start_time: float
    ) -> dict[str, Any]:
        """
        Persist using Supabase REST API with chunking and concurrency.

        Used for small batches or as fallback when COPY is unavailable.
        """
        from app.database.supabase_service import get_supabase_service

        try:
            supabase_service = get_supabase_service()
            admin_client = supabase_service.get_admin_client()

            # Create chunks
            chunks = []
            for i in range(0, len(results), self.CHUNK_SIZE):
                chunk = results[i : i + self.CHUNK_SIZE]
                chunks.append((chunk, i // self.CHUNK_SIZE + 1))

            total_chunks = len(chunks)

            self.logger.info(
                "REST API chunked persistence started",
                total_items=len(results),
                total_chunks=total_chunks,
                chunk_size=self.CHUNK_SIZE,
                max_concurrent=self.MAX_CONCURRENT_CHUNKS,
            )

            # Process chunks with controlled concurrency
            successful = 0
            failed = 0
            errors = []

            # Create semaphore for concurrency control
            semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_CHUNKS)

            async def process_chunk_with_semaphore(chunk_data, chunk_num):
                async with semaphore:
                    return await self._process_rest_chunk(
                        admin_client, chunk_data, chunk_num, total_chunks, store_id
                    )

            # Process all chunks concurrently (with semaphore limiting)
            tasks = [
                process_chunk_with_semaphore(chunk, chunk_num)
                for chunk, chunk_num in chunks
            ]

            results_list = await asyncio.gather(*tasks, return_exceptions=True)

            # Aggregate results
            for i, result in enumerate(results_list):
                chunk, chunk_num = chunks[i]

                if isinstance(result, Exception):
                    failed += len(chunk)
                    error_msg = f"Chunk {chunk_num}: {str(result)}"
                    errors.append(error_msg)
                    self.logger.error(
                        "Chunk processing exception",
                        chunk_num=chunk_num,
                        error=str(result),
                    )
                elif result and result.get("success"):
                    successful += result["processed"]
                else:
                    failed += len(chunk)
                    if result and result.get("errors"):
                        errors.extend(result["errors"])
                        self.logger.error(
                            "Chunk processing failed",
                            chunk_num=chunk_num,
                            errors=result.get("errors"),
                        )

            return {
                "success": failed == 0,
                "method": "rest_chunked",
                "total_items": len(results),
                "successful": successful,
                "failed": failed,
                "errors": errors[:5],  # Limit error messages
                "performance": {
                    "chunk_size": self.CHUNK_SIZE,
                    "total_chunks": total_chunks,
                    "max_concurrent": self.MAX_CONCURRENT_CHUNKS,
                },
            }

        except Exception as e:
            self.logger.error(
                "REST chunked persistence failed",
                error=str(e),
                total_items=len(results),
            )

            return {
                "success": False,
                "method": "rest_failed",
                "total_items": len(results),
                "successful": 0,
                "failed": len(results),
                "errors": [f"REST API failed: {str(e)}"],
            }

    async def _process_rest_chunk(
        self,
        admin_client,
        chunk: list[dict],
        chunk_num: int,
        total_chunks: int,
        store_id: str,
    ) -> dict[str, Any]:
        """Process a single chunk via Supabase REST API with retry logic."""

        for attempt in range(self.MAX_RETRIES):
            try:
                # Prepare upsert data
                upsert_data = []
                for item in chunk:
                    upsert_data.append(
                        {
                            "batch_id": str(item["batch_id"]),
                            "store_id": store_id,
                            "expiry_score": float(item.get("expiry_score", 0.0)),
                            "velocity_score": float(item.get("velocity_score", 0.0)),
                            "margin_score": float(item.get("margin_score", 0.0)),
                            "composite_score": float(item.get("composite_score", 0.0)),
                            "recommendation": str(
                                item.get("recommendation", "monitor")
                            ),
                            "urgency_level": str(item.get("urgency_level", "low")),
                            "discount_percent": int(item.get("discount_percent", 0)),
                            "reason": str(item.get("reason", "Auto-scored"))[:200],
                            "ml_enhanced": bool(item.get("ml_enhanced", True)),
                            "confidence_level": float(
                                item.get("confidence_level", 0.85)
                            ),
                            "calculated_at": (
                                item.get("calculated_at").isoformat()
                                if hasattr(item.get("calculated_at"), "isoformat")
                                else datetime.now(UTC).isoformat()
                            ),
                        }
                    )

                # Execute upsert with timeout
                result = await asyncio.wait_for(
                    self._execute_supabase_upsert(admin_client, upsert_data),
                    timeout=self.CHUNK_TIMEOUT,
                )

                if result:
                    return {"success": True, "processed": len(chunk), "errors": []}
                else:
                    raise Exception("Upsert returned no result")

            except TimeoutError:
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY_BASE * (attempt + 1))
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Timeout after {self.MAX_RETRIES} attempts"],
                    }

            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY_BASE * (attempt + 1))
                    continue
                else:
                    return {
                        "success": False,
                        "processed": 0,
                        "errors": [f"Failed: {str(e)[:100]}"],
                    }

        return {"success": False, "processed": 0, "errors": ["All retries exhausted"]}

    async def _execute_supabase_upsert(
        self, admin_client, upsert_data: list[dict]
    ) -> bool:
        """Execute Supabase upsert operation."""
        try:
            result = (
                admin_client.schema("scoring")
                .table("product_scores")
                .upsert(upsert_data, on_conflict="batch_id")
                .execute()
            )

            return result and hasattr(result, "data") and result.data is not None

        except Exception as e:
            self.logger.error(
                "Supabase upsert error", error=str(e), error_type=type(e).__name__
            )
            return False


def get_unified_scoring_persistence(session: AsyncSession) -> UnifiedScoringPersistence:
    """Factory function for unified scoring persistence."""
    return UnifiedScoringPersistence(session)
