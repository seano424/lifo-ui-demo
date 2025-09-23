"""
CSV Upload Helper Functions
Extracted from large upload_csv_and_create_batches function for better maintainability
"""

import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Tuple

import structlog
from fastapi import HTTPException

from app.security.csv_security import CSVSecurityError, validate_and_sanitize_csv
from app.services.batch_creation_service import BatchCreationService
try:
    # Try to import optimized service first
    from app.services.batch_creation_service_optimized import OptimizedBatchCreationService
    USE_OPTIMIZED_SERVICE = True
except ImportError:
    USE_OPTIMIZED_SERVICE = False
from app.utils.csv_to_batch_adapter import CSVToBatchAdapter
from app.utils.timing_metrics import CSVProcessingTimer, TimingMetrics, get_memory_usage_mb

logger = structlog.get_logger()


class CSVUploadValidator:
    """Handles CSV upload validation logic"""

    @staticmethod
    def validate_file_type(file_name: str | None) -> None:
        """Validate CSV file type"""
        if not file_name or not file_name.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400, detail="Invalid file type. Only CSV files are allowed."
            )

    @staticmethod
    def validate_file_size(file_content: bytes, max_size_mb: int = 10) -> None:
        """Validate file size"""
        max_size_bytes = max_size_mb * 1024 * 1024
        if len(file_content) > max_size_bytes:
            raise HTTPException(
                status_code=400, detail=f"File too large. Maximum size is {max_size_mb}MB."
            )

    @staticmethod
    def validate_chunk_size(chunk_size: int) -> None:
        """Validate chunk size parameter"""
        if chunk_size < 1 or chunk_size > 100:
            raise HTTPException(
                status_code=400, detail="Chunk size must be between 1 and 100"
            )


class CSVSecurityProcessor:
    """Handles CSV security validation and sanitization"""

    @staticmethod
    def process_csv_security(
        file_content: bytes, file_name: str | None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Process CSV security validation and sanitization

        Args:
            file_content: Raw CSV file content
            file_name: Original filename

        Returns:
            Tuple of (sanitized_content, security_result)
        """
        safe_filename = Path(file_name).name if file_name else "unknown.csv"

        try:
            security_result = validate_and_sanitize_csv(file_content, safe_filename)
        except CSVSecurityError as e:
            raise HTTPException(
                status_code=400, detail=f"Security validation failed: {str(e)}"
            ) from e

        # Use sanitized content for processing
        sanitized_content = security_result["sanitized_content"].encode("utf-8")

        # Log security actions if any
        if security_result["sanitization_changes"]:
            logger.info(
                "CSV Security: sanitization changes applied",
                changes_count=len(security_result["sanitization_changes"])
            )

        if security_result["validation"]["security_issues"]:
            logger.info(
                "CSV Security: security issues detected",
                issues_count=len(security_result["validation"]["security_issues"])
            )

        return sanitized_content, security_result


class CSVDataProcessor:
    """Handles CSV data processing using unified processor"""

    @staticmethod
    async def process_csv_data(
        sanitized_content: bytes, store_id: str, user_id: str
    ) -> Dict[str, Any]:
        """
        Process CSV data using unified processor

        Args:
            sanitized_content: Sanitized CSV content
            store_id: Store ID
            user_id: User ID

        Returns:
            CSV processing result
        """
        from app.api.v1.csv_upload import FastAPICSVIntegration

        integration = FastAPICSVIntegration()
        csv_result = await integration.process_csv_upload(
            sanitized_content, store_id, user_id
        )

        # Check CSV processing result
        if csv_result["status"] == "error":
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "CSV processing failed",
                    "errors": csv_result["errors"],
                    "warnings": csv_result.get("warnings", []),
                },
            )

        return csv_result


class BatchConversionService:
    """Handles conversion from CSV data to batch requests"""

    @staticmethod
    def convert_csv_to_batches(
        csv_data: list, store_id: str, user_id: str
    ) -> Tuple[list, float]:
        """
        Convert CSV data to batch creation requests

        Args:
            csv_data: Processed CSV data
            store_id: Store ID
            user_id: User ID

        Returns:
            Tuple of (batch_requests, conversion_time_ms)
        """
        try:
            # Time the batch conversion
            batch_conversion_start = time.time()
            batch_requests = CSVToBatchAdapter.convert_csv_data_to_batch_requests(
                csv_data=csv_data,
                store_id=store_id,
                user_id=user_id,
            )
            batch_conversion_time_ms = (time.time() - batch_conversion_start) * 1000

            logger.info(
                "CSV to batch conversion completed",
                conversion_time_ms=batch_conversion_time_ms,
                requests_created=len(batch_requests),
                store_id=store_id,
            )

            return batch_requests, batch_conversion_time_ms

        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to convert CSV data to batch requests: {str(e)}",
            ) from e


class BatchCreationManager:
    """Handles batch creation in database"""

    def __init__(self):
        # Use optimized service if available
        if USE_OPTIMIZED_SERVICE:
            self.batch_service = OptimizedBatchCreationService()
            logger.info("Using OptimizedBatchCreationService for enhanced performance")
        else:
            self.batch_service = BatchCreationService()
            logger.info("Using standard BatchCreationService")

    async def create_batches(
        self, store_id: str, user_id: str, batch_requests: list, chunk_size: int
    ) -> Tuple[Dict[str, Any], float]:
        """
        Create batches in database using bulk service

        Args:
            store_id: Store ID
            user_id: User ID
            batch_requests: List of batch requests
            chunk_size: Chunk size for processing

        Returns:
            Tuple of (batch_results, db_operations_time_ms)
        """
        # Time the database operations
        db_operations_start = time.time()
        
        # Use optimized method if available
        if USE_OPTIMIZED_SERVICE and hasattr(self.batch_service, 'create_batches_from_csv_bulk_optimized'):
            batch_results = await self.batch_service.create_batches_from_csv_bulk_optimized(
                store_id=store_id,
                user_id=user_id,
                batch_requests=batch_requests,
                chunk_size=chunk_size,
            )
        else:
            batch_results = await self.batch_service.create_batches_from_csv_bulk(
                store_id=store_id,
                user_id=user_id,
                batch_requests=batch_requests,
                chunk_size=chunk_size,
            )
        
        db_operations_time_ms = (time.time() - db_operations_start) * 1000

        # Extract performance metrics if available
        if "performance_metrics" in batch_results:
            perf_metrics = batch_results["performance_metrics"]
            logger.info(
                "Database batch creation completed (OPTIMIZED)",
                db_operations_time_ms=db_operations_time_ms,
                db_reported_time_ms=perf_metrics.get("database_time_ms"),
                items_per_second=perf_metrics.get("items_per_second"),
                successful_batches=batch_results["successful"],
                failed_batches=batch_results["failed"],
                success_rate=batch_results["success_rate"],
                store_id=store_id,
            )
        else:
            logger.info(
                "Database batch creation completed",
                db_operations_time_ms=db_operations_time_ms,
                successful_batches=batch_results["successful"],
                failed_batches=batch_results["failed"],
                success_rate=batch_results["success_rate"],
                store_id=store_id,
            )

        return batch_results, db_operations_time_ms


class CSVUploadResponseBuilder:
    """Builds the final response for CSV upload and batch creation"""

    @staticmethod
    def build_response(
        csv_result: Dict[str, Any],
        batch_results: Dict[str, Any],
        batch_requests: list,
        security_result: Dict[str, Any],
        store_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Build comprehensive response for CSV upload and batch creation

        Args:
            csv_result: CSV processing result
            batch_results: Batch creation results
            batch_requests: Original batch requests
            security_result: Security validation result
            store_id: Store ID
            user_id: User ID

        Returns:
            Comprehensive response dictionary
        """
        # Create CSV batch summary
        csv_summary = CSVToBatchAdapter.create_csv_batch_summary(
            batch_requests=batch_requests,
            store_id=store_id,
            user_id=user_id,
        )

        # Prepare final response
        response_data = {
            "success": True,
            "message": f"CSV processed and {batch_results['successful']} batches created successfully",
            "csv_processing": {
                "processed_rows": csv_result["processed_count"],
                "total_csv_items": len(csv_result["data"]),
                "csv_warnings": csv_result.get("warnings", []),
                "csv_errors": csv_result.get("errors", []),
                "security_status": security_result["security_status"],
                "sanitization_applied": len(security_result["sanitization_changes"]) > 0,
            },
            "batch_creation": {
                "total_requests": batch_results["total_requests"],
                "successful_batches": batch_results["successful"],
                "failed_batches": batch_results["failed"],
                "success_rate": batch_results["success_rate"],
                "processing_metadata": batch_results["processing_metadata"],
                "product_statistics": batch_results["product_statistics"],
            },
            "data_summary": csv_summary,
            "failed_items": batch_results["failed_batches"]
            if batch_results["failed"] > 0
            else [],
            "store_id": store_id,
            "processed_at": datetime.utcnow().isoformat(),
            "processed_by": user_id,
        }

        # Add success details to response
        if batch_results["successful"] > 0:
            response_data["successful_batches_sample"] = batch_results[
                "successful_batches"
            ][:5]  # First 5 for preview

        return response_data


class CSVUploadOrchestrator:
    """Main orchestrator for CSV upload and batch creation workflow"""

    def __init__(self):
        self.validator = CSVUploadValidator()
        self.security_processor = CSVSecurityProcessor()
        self.data_processor = CSVDataProcessor()
        self.batch_converter = BatchConversionService()
        self.batch_manager = BatchCreationManager()
        self.response_builder = CSVUploadResponseBuilder()
        self.timer = CSVProcessingTimer()

    async def process_upload_and_create_batches(
        self,
        file_content: bytes,
        file_name: str | None,
        store_id: str,
        user_id: str,
        chunk_size: int = 100,  # Increased default from 50 to 100 for better performance
    ) -> Dict[str, Any]:
        """
        Main workflow for CSV upload and batch creation with comprehensive timing

        Args:
            file_content: Raw file content
            file_name: Original filename
            store_id: Store ID
            user_id: User ID
            chunk_size: Chunk size for processing

        Returns:
            Complete processing result with detailed performance metrics
        """
        # Start overall timing
        overall_start = time.perf_counter()
        
        # Capture initial memory usage
        initial_memory = get_memory_usage_mb()
        
        # Step 1: Validate file and parameters
        self.timer.start_stage("file_validation")
        self.validator.validate_file_type(file_name)
        self.validator.validate_file_size(file_content)
        self.validator.validate_chunk_size(chunk_size)
        self.timer.end_stage("file_validation")

        # Step 2: Security validation and sanitization
        self.timer.start_stage("security_validation")
        sanitized_content, security_result = self.security_processor.process_csv_security(
            file_content, file_name
        )
        self.timer.end_stage("security_validation")

        # Step 3: Process CSV data
        self.timer.start_stage("csv_parsing")
        csv_result = await self.data_processor.process_csv_data(
            sanitized_content, store_id, user_id
        )
        self.timer.end_stage("csv_parsing")
        
        # Record items processed
        self.timer.metrics.items_processed = len(csv_result.get("data", []))

        # Step 4: Convert CSV data to batch requests
        self.timer.start_stage("batch_creation")
        batch_requests, conversion_time_ms = self.batch_converter.convert_csv_to_batches(
            csv_result["data"], store_id, user_id
        )
        self.timer.metrics.batch_creation_ms = conversion_time_ms
        self.timer.end_stage("batch_creation")

        if not batch_requests:
            raise HTTPException(
                status_code=400,
                detail="No valid batch requests could be created from CSV data",
            )

        # Step 5: Create batches in database
        self.timer.start_stage("batch_insertion")
        batch_results, db_time_ms = await self.batch_manager.create_batches(
            store_id, user_id, batch_requests, chunk_size
        )
        self.timer.metrics.batch_insertion_ms = db_time_ms
        self.timer.metrics.database_operations_ms = db_time_ms
        self.timer.end_stage("batch_insertion")

        # Calculate total time and throughput
        self.timer.metrics.total_processing_ms = (time.perf_counter() - overall_start) * 1000
        self.timer.metrics.calculate_throughput()
        
        # Capture final memory usage
        final_memory = get_memory_usage_mb()
        self.timer.metrics.memory_usage_mb = final_memory - initial_memory

        # Step 6: Build response with timing metrics
        response_data = self.response_builder.build_response(
            csv_result, batch_results, batch_requests, security_result, store_id, user_id
        )
        
        # Add comprehensive timing metrics to response
        response_data["performance_metrics"] = self.timer.metrics.to_dict()
        response_data["timing_summary"] = self.timer.get_stage_summary()
        
        # Log performance summary
        self.timer.metrics.log_summary("CSV Upload and Batch Creation")
        
        return response_data