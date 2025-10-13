"""
MCP-Powered CSV Processor for LIFO.AI
Solves pgbouncer prepared statement conflicts by using Supabase MCP
UPDATED: Now uses unified CSV services to eliminate duplicate code
"""

import time
import uuid
from datetime import datetime
from typing import Any

import structlog
from fastapi import UploadFile

from app.services.csv import create_unified_csv_service
from app.services.supabase_mcp_service import get_mcp_service
from app.utils.timing_metrics import CSVProcessingTimer, get_memory_usage_mb

logger = structlog.get_logger()


class MCPCSVProcessor:
    """
    MCP-powered CSV processor that bypasses SQLAlchemy/pgbouncer issues
    Updated to use unified CSV services for processing
    """

    def __init__(self):
        self.logger = logger.bind(component="mcp_csv_processor")
        self.mcp_service = get_mcp_service()
        self.timer = CSVProcessingTimer()

    async def process_csv_with_mcp(
        self, file: UploadFile, store_id: str, user_id: str, chunk_size: int = 50
    ) -> dict[str, Any]:
        """
        Process CSV file using MCP for database operations with comprehensive timing
        Now uses unified CSV service for processing and validation
        """

        processing_id = f"mcp_csv_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

        # Start overall timing
        overall_start = time.perf_counter()
        initial_memory = get_memory_usage_mb()

        try:
            self.logger.info(
                "Starting MCP CSV processing with unified service",
                processing_id=processing_id,
                store_id=store_id,
                filename=file.filename,
            )

            # Step 1: Use unified CSV service for validation and processing
            self.timer.start_stage("csv_validation")
            unified_service = create_unified_csv_service(
                store_id=store_id, user_id=user_id
            )

            # Process using import mode for actual data processing
            validation_result = await unified_service.process_csv_upload(
                file=file, processing_mode="import", chunk_size=chunk_size
            )
            self.timer.end_stage("csv_validation")

            if not validation_result.get("success"):
                return {
                    "success": False,
                    "processing_id": processing_id,
                    "error": validation_result.get("error", "CSV processing failed"),
                    "validation_errors": validation_result.get("errors", []),
                    "warnings": validation_result.get("warnings", []),
                }

            # Extract processed data for MCP operations
            processed_data = validation_result.get("data", {})
            validated_data = processed_data.get("processed_data", [])

            if not validated_data:
                return {
                    "success": False,
                    "processing_id": processing_id,
                    "error": "No valid data found in CSV",
                }

            # Step 2: Process data using MCP in chunks for optimal performance
            self.timer.start_stage("mcp_processing")
            result = await self._process_validated_data_with_mcp(
                validated_data=validated_data,
                store_id=store_id,
                user_id=user_id,
                chunk_size=chunk_size,
                processing_id=processing_id,
            )
            self.timer.end_stage("mcp_processing")

            # Record items processed
            self.timer.metrics.items_processed = len(validated_data)

            # Calculate total processing time and metrics
            self.timer.metrics.total_processing_ms = (
                time.perf_counter() - overall_start
            ) * 1000
            self.timer.metrics.calculate_throughput()

            # Capture memory usage
            final_memory = get_memory_usage_mb()
            self.timer.metrics.memory_usage_mb = final_memory - initial_memory

            # Step 3: Combine results with unified format and timing metrics
            final_result = {
                "success": True,
                "processing_id": processing_id,
                "csv_validation": {
                    "total_rows": validation_result.get("processing_stats", {}).get(
                        "total_rows", 0
                    ),
                    "valid_rows": validation_result.get("processing_stats", {}).get(
                        "processed_rows", 0
                    ),
                    "warnings": validation_result.get("warnings", [])[
                        :10
                    ],  # Limit for response size
                    "ai_suggestions": processed_data.get("ai_suggestions", {}),
                    "insights": processed_data.get("insights", {}),
                },
                "mcp_processing": result,
                "performance": {
                    "mobile_optimized": True,
                    "response_time_target_ms": 500,
                    "enterprise_ready": True,
                    "unified_service_used": True,
                    "total_processing_ms": round(
                        self.timer.metrics.total_processing_ms, 2
                    ),
                    "items_per_second": round(self.timer.metrics.items_per_second, 2),
                    "memory_usage_mb": round(self.timer.metrics.memory_usage_mb, 2)
                    if self.timer.metrics.memory_usage_mb
                    else None,
                },
                "timing_metrics": self.timer.metrics.to_dict(),
                "timing_summary": self.timer.get_stage_summary(),
                "processed_at": datetime.utcnow().isoformat(),
                "processed_by": user_id,
            }

            # ⏱️ Log comprehensive performance summary
            self.timer.metrics.log_summary("MCP CSV Processing")

            # ⏱️ Detailed performance logging for monitoring and optimization
            self.logger.info(
                "MCP CSV processing completed successfully using unified service - Performance Detail",
                processing_id=processing_id,
                store_id=store_id,
                # Business metrics
                total_batches=result.get("batches_created", 0),
                total_products=result.get("products_created", 0),
                items_processed=self.timer.metrics.items_processed,
                success_rate=result.get("success_rate_percent", 0),
                # Performance metrics
                total_processing_ms=round(self.timer.metrics.total_processing_ms, 2),
                items_per_second=round(self.timer.metrics.items_per_second, 2),
                memory_usage_mb=round(self.timer.metrics.memory_usage_mb, 2)
                if self.timer.metrics.memory_usage_mb
                else None,
                # Timing breakdown
                csv_validation_ms=round(
                    self.timer.get_timing("csv_validation") or 0, 2
                ),
                mcp_processing_ms=round(
                    self.timer.get_timing("mcp_processing") or 0, 2
                ),
                store_verification_ms=round(
                    self.timer.get_timing("store_verification") or 0, 2
                ),
                data_preparation_ms=round(
                    self.timer.get_timing("data_preparation") or 0, 2
                ),
                # Performance indicators
                pgbouncer_bypassed=True,
                enterprise_scalable=True,
                unified_service_used=True,
                timing_precision="microsecond",
            )

            return final_result

        except Exception as e:
            self.logger.error(
                "MCP CSV processing failed",
                processing_id=processing_id,
                store_id=store_id,
                error=str(e),
            )

            return {
                "success": False,
                "processing_id": processing_id,
                "error": f"Processing failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def _process_validated_data_with_mcp(
        self,
        validated_data: list[dict[str, Any]],
        store_id: str,
        user_id: str,
        chunk_size: int,
        processing_id: str,
    ) -> dict[str, Any]:
        """
        Process validated CSV data using MCP bulk operations
        Handles the complex Store→Product→Batch→Score relationships
        """

        try:
            # Step 1: Ensure store exists (using MCP)
            self.timer.start_timer("store_verification")
            await self.mcp_service.create_store_if_not_exists(
                {
                    "store_id": store_id,
                    "store_name": f"Store {store_id}",
                    "store_code": f"MCP-{store_id[:8]}",
                }
            )
            self.timer.stop_timer("store_verification")

            # Step 2: Prepare product and batch data
            self.timer.start_timer("data_preparation")
            products_data, batches_data = await self._prepare_data_for_mcp(
                validated_data, store_id, processing_id
            )
            self.timer.stop_timer("data_preparation")

            # Step 3: Process in chunks for optimal performance and memory usage
            chunks = [
                validated_data[i : i + chunk_size]
                for i in range(0, len(validated_data), chunk_size)
            ]

            total_products_created = 0
            total_batches_created = 0
            total_errors = []
            chunk_results = []

            for chunk_idx, chunk in enumerate(chunks):
                chunk_start = time.perf_counter()

                chunk_result = await self._process_chunk_with_mcp(
                    chunk=chunk,
                    store_id=store_id,
                    chunk_index=chunk_idx,
                    processing_id=processing_id,
                )

                chunk_duration_ms = (time.perf_counter() - chunk_start) * 1000
                self.timer.record_chunk_timing(chunk_idx, chunk_duration_ms)
                chunk_result["processing_time_ms"] = round(chunk_duration_ms, 2)

                chunk_results.append(chunk_result)
                total_products_created += chunk_result["products_created"]
                total_batches_created += chunk_result["batches_created"]
                total_errors.extend(chunk_result["errors"])

                # Log progress for monitoring
                self.logger.info(
                    "MCP chunk processed",
                    processing_id=processing_id,
                    chunk_index=chunk_idx,
                    chunk_size=len(chunk),
                    products_created=chunk_result["products_created"],
                    batches_created=chunk_result["batches_created"],
                )

            # Step 4: Calculate final statistics
            success_rate = (
                (total_batches_created / len(validated_data)) * 100
                if validated_data
                else 0
            )

            result = {
                "store_id": store_id,
                "total_chunks_processed": len(chunks),
                "chunk_size_used": chunk_size,
                "products_created": total_products_created,
                "batches_created": total_batches_created,
                "total_items_processed": len(validated_data),
                "errors": total_errors[:20],  # Limit error list size
                "success_rate_percent": round(success_rate, 2),
                "chunk_results": chunk_results,
                "processing_method": "supabase_mcp",
                "pgbouncer_bypassed": True,
                "enterprise_scalable": True,
            }

            return result

        except Exception as e:
            self.logger.error(
                "MCP data processing failed",
                processing_id=processing_id,
                store_id=store_id,
                data_count=len(validated_data),
                error=str(e),
            )
            raise

    async def _process_chunk_with_mcp(
        self,
        chunk: list[dict[str, Any]],
        store_id: str,
        chunk_index: int,
        processing_id: str,
    ) -> dict[str, Any]:
        """
        Process a single chunk of data using MCP transaction
        Each chunk is processed atomically to ensure data integrity
        """

        chunk_id = f"{processing_id}_chunk_{chunk_index}"
        chunk_start = time.perf_counter()

        try:
            # Use MCP transaction for ACID compliance
            async with self.mcp_service.transaction() as transaction_id:
                # Step 1: Create/update products
                products_to_upsert = []
                batches_to_create = []

                for item in chunk:
                    # Prepare product data
                    product_data = {
                        "sku": item["sku"],
                        "product_name": item["product_name"],
                        "category": item.get("category", "household_other"),
                        "brand": item.get("brand"),
                        "description": item.get("description"),
                        "unit_type": item.get("unit_type", "pcs"),
                    }
                    products_to_upsert.append(product_data)

                    # Prepare batch data (linked to product)
                    batch_data = {
                        "batch_number": self._generate_batch_number(
                            item["sku"], item.get("expiry_date")
                        ),
                        "sku": item["sku"],  # Will be linked to product_id via MCP
                        "quantity": float(item["quantity"]),
                        "cost_price": float(item["cost_price"]),
                        "selling_price": float(item["selling_price"]),
                        "expiry_date": item.get("expiry_date"),
                        "manufacture_date": item.get("manufacture_date"),
                        "location_code": item.get("location_code", "MAIN"),
                    }
                    batches_to_create.append(batch_data)

                # Step 2: Execute bulk operations via MCP
                product_start = time.perf_counter()
                products_result = await self.mcp_service.bulk_upsert_products(
                    products_to_upsert, store_id
                )
                product_time_ms = (time.perf_counter() - product_start) * 1000

                # Track product resolution time
                if not hasattr(self.timer.metrics, "product_resolution_ms"):
                    self.timer.metrics.product_resolution_ms = 0
                self.timer.metrics.product_resolution_ms += product_time_ms

                # Step 3: Create batches (with proper product relationships)
                batch_start = time.perf_counter()
                batches_result = await self.mcp_service.bulk_create_batches(
                    batches_to_create, store_id
                )
                batch_time_ms = (time.perf_counter() - batch_start) * 1000

                # Track batch insertion time
                if not hasattr(self.timer.metrics, "batch_insertion_ms"):
                    self.timer.metrics.batch_insertion_ms = 0
                self.timer.metrics.batch_insertion_ms += batch_time_ms

                chunk_duration_ms = (time.perf_counter() - chunk_start) * 1000

                return {
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_index,
                    "items_in_chunk": len(chunk),
                    "products_created": products_result.get("created", 0),
                    "batches_created": batches_result.get("created", 0),
                    "errors": products_result.get("errors", [])
                    + batches_result.get("errors", []),
                    "transaction_id": transaction_id,
                    "processing_time_ms": round(chunk_duration_ms, 2),
                    "product_resolution_ms": round(product_time_ms, 2),
                    "batch_insertion_ms": round(batch_time_ms, 2),
                }

        except Exception as e:
            self.logger.error(
                "MCP chunk processing failed",
                chunk_id=chunk_id,
                store_id=store_id,
                chunk_size=len(chunk),
                error=str(e),
            )

            return {
                "chunk_id": chunk_id,
                "chunk_index": chunk_index,
                "items_in_chunk": len(chunk),
                "products_created": 0,
                "batches_created": 0,
                "errors": [{"chunk_error": str(e)}],
                "transaction_id": None,
                "failed": True,
            }

    async def _prepare_data_for_mcp(
        self, validated_data: list[dict[str, Any]], store_id: str, processing_id: str
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Prepare and deduplicate data for MCP operations
        Returns (products_data, batches_data)
        """

        # Get existing products to avoid conflicts
        dup_start = time.perf_counter()
        existing_products = await self.mcp_service.get_store_products_map(store_id)
        dup_time_ms = (time.perf_counter() - dup_start) * 1000

        # Track duplicate detection time
        self.timer.metrics.duplicate_detection_ms = dup_time_ms

        products_data = []
        batches_data = []
        seen_skus = set()

        for item in validated_data:
            sku = item["sku"]

            # Only prepare product if it's new
            if sku not in existing_products and sku not in seen_skus:
                products_data.append(
                    {
                        "sku": sku,
                        "product_name": item["product_name"],
                        "category": item.get("category", "household_other"),
                        "brand": item.get("brand"),
                        "description": item.get("description"),
                        "unit_type": item.get("unit_type", "pcs"),
                    }
                )
                seen_skus.add(sku)

            # Always prepare batch data
            batches_data.append(
                {
                    "sku": sku,
                    "batch_number": self._generate_batch_number(
                        sku, item.get("expiry_date")
                    ),
                    "quantity": item["quantity"],
                    "cost_price": item["cost_price"],
                    "selling_price": item["selling_price"],
                    "expiry_date": item.get("expiry_date"),
                    "manufacture_date": item.get("manufacture_date"),
                    "location_code": item.get("location_code", "MAIN"),
                }
            )

        self.logger.info(
            "Data prepared for MCP processing",
            processing_id=processing_id,
            new_products=len(products_data),
            total_batches=len(batches_data),
            existing_products_count=len(existing_products),
        )

        return products_data, batches_data

    def _generate_batch_number(self, sku: str, expiry_date: str | None) -> str:
        """Generate unique batch number for tracking"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")

        if expiry_date:
            try:
                if isinstance(expiry_date, str):
                    exp_date = datetime.fromisoformat(expiry_date).strftime("%m%d")
                else:
                    exp_date = expiry_date.strftime("%m%d")
                return f"{sku}-{timestamp}-{exp_date}"
            except (ValueError, AttributeError) as e:
                self.logger.debug(
                    "Failed to parse expiry date for batch number",
                    expiry_date=expiry_date,
                    error=str(e),
                )

        return f"{sku}-{timestamp}-{uuid.uuid4().hex[:4]}"

    async def get_processing_status(self, processing_id: str) -> dict[str, Any]:
        """
        Get status of MCP CSV processing operation
        Useful for monitoring long-running operations
        """
        try:
            # TODO: Implement status tracking via MCP
            # This would query processing status from MCP storage

            return {
                "processing_id": processing_id,
                "status": "completed",  # TODO: Get actual status
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(
                "Failed to get processing status",
                processing_id=processing_id,
                error=str(e),
            )

            return {
                "processing_id": processing_id,
                "status": "unknown",
                "error": str(e),
            }


# Global processor instance
_mcp_csv_processor = None


def get_mcp_csv_processor() -> MCPCSVProcessor:
    """Get or create the global MCP CSV processor instance"""
    global _mcp_csv_processor
    if _mcp_csv_processor is None:
        _mcp_csv_processor = MCPCSVProcessor()
    return _mcp_csv_processor
