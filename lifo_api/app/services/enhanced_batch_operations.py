"""
Enhanced Batch Operations Service
Integrates with Unified Write Service for optimized inventory operations
Designed for backend-centric architecture with consolidated write operations
"""

import time
from datetime import datetime
from typing import Any

import structlog

from app.services.batch_creation_service import (
    BatchCreationService,
    BatchFromScanRequest,
)
from app.services.unified_write_service import get_unified_write_service
from app.utils.csv_to_batch_adapter import CSVToBatchAdapter

logger = structlog.get_logger()


class EnhancedBatchOperations:
    """
    Enhanced batch operations that leverage the unified write service
    for optimized performance in backend-centric architecture
    """

    def __init__(self):
        self.batch_service = BatchCreationService()
        self.unified_service = get_unified_write_service()
        self.csv_adapter = CSVToBatchAdapter()

    async def create_batches_from_scans_optimized(
        self,
        store_id: str,
        user_id: str,
        batch_requests: list[BatchFromScanRequest],
        auto_score: bool = True,
        track_actions: bool = True,
        use_unified_service: bool = True,
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Create batches from scan data with automatic service selection

        Uses unified write service for better performance when available,
        falls back to traditional service for compatibility
        """
        if use_unified_service and len(batch_requests) > 10:
            # Use unified service for bulk operations (>10 items)
            return await self._create_batches_unified(
                store_id, user_id, batch_requests, auto_score, track_actions
            )
        else:
            # Use traditional service for small operations or when unified is disabled
            return await self._create_batches_traditional(
                store_id, user_id, batch_requests
            )

    async def create_batches_from_csv_optimized(
        self,
        store_id: str,
        user_id: str,
        csv_data: list[dict[str, Any]],
        auto_score: bool = True,
        chunk_size: int = 100,
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Create batches from CSV data with unified write operations

        Handles large CSV imports efficiently through:
        - Optimized data conversion
        - Chunked processing
        - Consolidated database writes
        - Automatic scoring and action tracking
        """
        start_time = time.time()

        try:
            # Convert CSV data to batch requests
            batch_requests = self.csv_adapter.convert_csv_data_to_batch_requests(
                csv_data, store_id, user_id
            )

            if not batch_requests:
                return {
                    "store_id": store_id,
                    "total_requests": 0,
                    "successful": 0,
                    "failed": 0,
                    "success_rate": 0.0,
                    "execution_time_ms": 0,
                    "error": "No valid batch requests from CSV data",
                }

            # Process with unified write service for optimal performance
            operations = []
            for request in batch_requests:
                operation_data = {
                    "type": "create_batch",
                    "data": {
                        "barcode": request.barcode,
                        "product_name": request.product_name,
                        "brand": request.brand,
                        "category": request.category,
                        "quantity": request.quantity,
                        "expiry_date": request.expiry_date,
                        "batch_number": request.batch_number,
                        "cost_price": request.cost_price,
                        "selling_price": request.selling_price,
                        "source": "csv_import",
                        "shelf_life_days": 30,  # Default or calculated
                    },
                }
                operations.append(operation_data)

            # Execute with unified write service
            result = await self.unified_service.bulk_inventory_operations(
                store_id=store_id,
                user_id=user_id,
                operations=operations,
                chunk_size=chunk_size,
                auto_score=auto_score,
            )

            execution_time = (time.time() - start_time) * 1000

            # Enhance result with CSV-specific metadata
            result.update(
                {
                    "csv_rows_processed": len(csv_data),
                    "batch_requests_created": len(batch_requests),
                    "csv_to_batch_conversion_rate": len(batch_requests)
                    / len(csv_data)
                    * 100,
                    "execution_time_ms": execution_time,
                    "processing_metadata": {
                        "source": "csv_import",
                        "unified_write_service": True,
                        "auto_score": auto_score,
                        "chunk_size": chunk_size,
                        "processed_at": datetime.utcnow().isoformat(),
                    },
                }
            )

            logger.info(
                "CSV batch creation completed with unified service",
                csv_rows=len(csv_data),
                batch_requests=len(batch_requests),
                successful=result["successful"],
                failed=result["failed"],
                execution_time_ms=execution_time,
            )

            return result

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(
                "CSV batch creation failed",
                error=str(e),
                store_id=store_id,
                csv_rows=len(csv_data),
                execution_time_ms=execution_time,
            )
            raise

    async def bulk_update_batch_status(
        self, store_id: str, user_id: str, batch_updates: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Bulk update batch statuses with unified write operations

        Efficiently handles:
        - Status changes (active, expired, sold, donated)
        - Quantity updates
        - Location changes
        - Action tracking
        """
        start_time = time.time()

        try:
            # Convert updates to unified operations format
            operations = []
            for update in batch_updates:
                if "status" in update:
                    operation = {
                        "type": "update_status",
                        "batch_id": update["batch_id"],
                        "status": update["status"],
                    }
                    operations.append(operation)

                if "quantity" in update or "location" in update:
                    operation = {
                        "type": "update_batch",
                        "batch_id": update["batch_id"],
                        "data": {
                            k: v
                            for k, v in update.items()
                            if k not in ["batch_id", "status"]
                        },
                    }
                    operations.append(operation)

            # Execute bulk updates
            result = await self.unified_service.bulk_inventory_operations(
                store_id=store_id,
                user_id=user_id,
                operations=operations,
                chunk_size=50,
                auto_score=False,  # Don't re-score for status updates
            )

            execution_time = (time.time() - start_time) * 1000

            logger.info(
                "Bulk batch status update completed",
                store_id=store_id,
                updates_requested=len(batch_updates),
                operations_created=len(operations),
                successful=result["successful"],
                failed=result["failed"],
                execution_time_ms=execution_time,
            )

            return {
                **result,
                "updates_requested": len(batch_updates),
                "operations_created": len(operations),
                "execution_time_ms": execution_time,
            }

        except Exception as e:
            logger.error(
                "Bulk batch status update failed",
                error=str(e),
                store_id=store_id,
                updates_count=len(batch_updates),
            )
            raise

    async def batch_action_workflow(
        self, store_id: str, user_id: str, actions: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Execute batch action workflow with consolidated writes

        Handles complete action workflow:
        - Action execution (discount, donate, dispose)
        - Batch status updates
        - Quantity adjustments
        - Action tracking and analytics
        - Financial calculations
        """
        start_time = time.time()

        try:
            # Group actions by type for optimized processing
            grouped_actions = {
                "discounts": [],
                "donations": [],
                "disposals": [],
                "other": [],
            }

            for action in actions:
                action_type = action.get("action_type", "other")
                if action_type in [
                    "discount",
                    "discount_moderate",
                    "discount_aggressive",
                ]:
                    grouped_actions["discounts"].append(action)
                elif action_type in ["donate"]:
                    grouped_actions["donations"].append(action)
                elif action_type in ["dispose"]:
                    grouped_actions["disposals"].append(action)
                else:
                    grouped_actions["other"].append(action)

            results = {
                "discounts_processed": 0,
                "donations_processed": 0,
                "disposals_processed": 0,
                "other_processed": 0,
                "total_value_affected": 0.0,
                "total_quantity_affected": 0.0,
                "action_tracking_records": 0,
            }

            # Process each action type with optimized operations
            for action_type, action_list in grouped_actions.items():
                if not action_list:
                    continue

                group_result = await self._process_action_group(
                    store_id, user_id, action_type, action_list
                )

                results[f"{action_type}_processed"] = group_result["processed"]
                results["total_value_affected"] += group_result["value_affected"]
                results["total_quantity_affected"] += group_result["quantity_affected"]
                results["action_tracking_records"] += group_result["tracking_records"]

            execution_time = (time.time() - start_time) * 1000

            results.update(
                {
                    "total_actions": len(actions),
                    "execution_time_ms": execution_time,
                    "actions_per_second": len(actions) / (execution_time / 1000),
                    "processing_metadata": {
                        "workflow_optimized": True,
                        "grouped_processing": True,
                        "processed_at": datetime.utcnow().isoformat(),
                    },
                }
            )

            logger.info(
                "Batch action workflow completed",
                **{k: v for k, v in results.items() if k != "processing_metadata"},
            )

            return results

        except Exception as e:
            logger.error(
                "Batch action workflow failed",
                error=str(e),
                store_id=store_id,
                actions_count=len(actions),
            )
            raise

    # Private helper methods

    async def _create_batches_unified(
        self,
        store_id: str,
        user_id: str,
        batch_requests: list[BatchFromScanRequest],
        auto_score: bool,
        track_actions: bool,
    ) -> dict[str, Any]:
        """Create batches using unified write service"""

        operations = []
        for request in batch_requests:
            operation_data = {
                "type": "create_batch",
                "data": {
                    "barcode": request.barcode,
                    "product_name": request.product_name,
                    "brand": request.brand,
                    "category": request.category,
                    "quantity": request.quantity,
                    "expiry_date": request.expiry_date,
                    "batch_number": request.batch_number,
                    "cost_price": request.cost_price,
                    "selling_price": request.selling_price,
                    "source": "barcode_scan",
                    "scan_confidence": request.scan_confidence,
                    "ocr_confidence": request.ocr_confidence,
                    "shelf_life_days": 30,
                },
            }
            operations.append(operation_data)

        result = await self.unified_service.bulk_inventory_operations(
            store_id=store_id,
            user_id=user_id,
            operations=operations,
            chunk_size=50,
            auto_score=auto_score,
        )

        # Add scan-specific metadata
        result["processing_metadata"] = {
            "service_type": "unified_write_service",
            "source": "barcode_scan",
            "auto_score": auto_score,
            "track_actions": track_actions,
        }

        return result

    async def _create_batches_traditional(
        self, store_id: str, user_id: str, batch_requests: list[BatchFromScanRequest]
    ) -> dict[str, Any]:
        """Create batches using traditional batch service"""

        result = await self.batch_service.create_batches_from_csv_bulk(
            store_id=store_id,
            user_id=user_id,
            batch_requests=batch_requests,
            chunk_size=50,
        )

        # Add metadata to indicate traditional service was used
        result["processing_metadata"] = {
            "service_type": "traditional_batch_service",
            "source": "barcode_scan",
            "fallback_reason": "small_batch_or_unified_disabled",
        }

        return result

    async def _process_action_group(
        self,
        store_id: str,
        user_id: str,
        action_type: str,
        actions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Process a group of actions of the same type"""

        processed = 0
        value_affected = 0.0
        quantity_affected = 0.0
        tracking_records = 0

        # Create operations for this action group
        operations = []

        for action in actions:
            # Create status update operation
            operations.append(
                {
                    "type": "update_status",
                    "batch_id": action["batch_id"],
                    "status": self._get_status_for_action(action_type),
                }
            )

            # Create quantity update if specified
            if "quantity_affected" in action:
                operations.append(
                    {
                        "type": "update_batch",
                        "batch_id": action["batch_id"],
                        "data": {
                            "current_quantity": action.get("remaining_quantity", 0)
                        },
                    }
                )

            # Track financial impact
            value_affected += action.get("original_value", 0.0)
            quantity_affected += action.get("quantity_affected", 0.0)

        # Execute operations
        if operations:
            result = await self.unified_service.bulk_inventory_operations(
                store_id=store_id,
                user_id=user_id,
                operations=operations,
                chunk_size=25,
                auto_score=False,  # Don't re-score for actions
            )

            processed = result["successful"]
            tracking_records = result[
                "successful"
            ]  # One tracking record per successful operation

        return {
            "processed": processed,
            "value_affected": value_affected,
            "quantity_affected": quantity_affected,
            "tracking_records": tracking_records,
        }

    def _get_status_for_action(self, action_type: str) -> str:
        """Map action type to batch status"""
        status_mapping = {
            "discounts": "discounted",
            "donations": "donated",
            "disposals": "disposed",
            "other": "processed",
        }
        return status_mapping.get(action_type, "processed")


# Global service instance
_enhanced_batch_operations = None


def get_enhanced_batch_operations() -> EnhancedBatchOperations:
    """Get the global enhanced batch operations service"""
    global _enhanced_batch_operations
    if _enhanced_batch_operations is None:
        _enhanced_batch_operations = EnhancedBatchOperations()
    return _enhanced_batch_operations
