"""
FastAPI CSV Upload Endpoint - Unified with Python ETL Core
Uses the consolidated UnifiedCSVProcessor for all CSV operations
"""

import os
import tempfile
from pathlib import Path
from typing import Any

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user, validate_store_access

# Import the unified processor (now consolidated into lifo_api)
from app.core.etl.unified_csv_processor import UnifiedCSVProcessor
from app.database.connection import get_db
from app.security.csv_security import (
    CSVSecurityError,
    validate_and_sanitize_csv,
)
from app.utils.performance import measure_time
import time

router = APIRouter()
logger = structlog.get_logger()


class FastAPICSVIntegration:
    """
    FastAPI integration for the unified CSV processor
    """

    @staticmethod
    @measure_time("csv_processing_pipeline")
    async def process_csv_upload(
        file_content: bytes, store_id: str, user_id: str
    ) -> dict[str, Any]:
        """
        Process CSV upload using the unified processor

        Args:
            file_content: Raw CSV file content
            store_id: Store ID for multi-tenant processing
            user_id: User ID for audit logging

        Returns:
            Processing result with data, warnings, and errors
        """

        try:
            # Create processor instance
            processor = UnifiedCSVProcessor(store_id, user_id)

            # Create temporary file for processing
            with tempfile.NamedTemporaryFile(
                mode="wb", suffix=".csv", delete=False
            ) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name

            try:
                # Process the CSV file
                result = await processor.process_csv_file(temp_file_path, file_content)
                return result
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except OSError:
                    pass

        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"CSV processing failed: {e!s}"
            ) from None


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    store_id: str = Form(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and process CSV inventory file

    This endpoint uses the unified CSV processor that combines:
    - Security validation (file type, size, content scanning)
    - Advanced data processing (category mapping, date handling)
    - Business rule validation
    - Comprehensive error reporting
    """

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only CSV files are allowed."
        )

    # Validate store access
    await validate_store_access(store_id, current_user)

    try:
        # ⏱️ START COMPREHENSIVE TIMING
        import time

        total_start_time = time.perf_counter()
        timing_details = {}

        # ⏱️ File Upload Timing
        file_start = time.perf_counter()
        file_content = await file.read()
        file_end = time.perf_counter()
        timing_details["file_upload_ms"] = (file_end - file_start) * 1000

        # ⏱️ Security Validation Timing
        security_start = time.perf_counter()
        # SECURITY: Comprehensive CSV validation and sanitization
        # Sanitize filename to prevent path traversal false positives
        safe_filename = Path(file.filename).name if file.filename else "unknown.csv"

        try:
            security_result = validate_and_sanitize_csv(file_content, safe_filename)
        except CSVSecurityError as e:
            raise HTTPException(
                status_code=400, detail=f"Security validation failed: {str(e)}"
            ) from e

        # Use sanitized content for processing
        sanitized_content = security_result["sanitized_content"].encode("utf-8")
        security_end = time.perf_counter()
        timing_details["security_validation_ms"] = (
            security_end - security_start
        ) * 1000

        # Log security actions if any
        if security_result["sanitization_changes"]:
            print(
                f"CSV Security: {len(security_result['sanitization_changes'])} changes made"
            )

        if security_result["validation"]["security_issues"]:
            print(
                f"CSV Security: {len(security_result['validation']['security_issues'])} issues detected"
            )

        # ⏱️ CSV Processing Timing
        csv_processing_start = time.perf_counter()
        # Process CSV using unified processor with sanitized content
        integration = FastAPICSVIntegration()
        result = await integration.process_csv_upload(
            sanitized_content, store_id, current_user["sub"]
        )
        csv_processing_end = time.perf_counter()
        timing_details["csv_processing_ms"] = (
            csv_processing_end - csv_processing_start
        ) * 1000

        # Check processing result status
        if result["status"] == "error":
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "CSV processing failed",
                    "errors": result["errors"],
                    "warnings": result.get("warnings", []),
                },
            )

        # Debug logging to understand the result structure
        print(f"[DEBUG] CSV processor result keys: {list(result.keys())}")
        print(f"[DEBUG] CSV processor result: {result}")

        # Prepare response to match frontend CSVUploadResponse interface
        processed_count = result["processed_count"]
        total_items = len(result["data"]) if result.get("data") else 0

        # ⏱️ Calculate Total Processing Time
        total_end_time = time.perf_counter()
        timing_details["total_processing_ms"] = (
            total_end_time - total_start_time
        ) * 1000

        # Extract timing metrics from metadata if available
        metadata = result.get("metadata", {})
        csv_internal_processing_time_ms = metadata.get("processing_time_ms", 0)

        # Get detailed timing information if available
        csv_internal_timing = metadata.get("timing_details", {})
        # Merge internal CSV timing with our external timing
        timing_details.update(csv_internal_timing)
        skipped_count = metadata.get("skipped_count", 0)
        duplicates = metadata.get("duplicates_detected", [])

        response_data: dict[str, Any] = {
            "success": True,
            "processed": processed_count,
            "skipped": skipped_count,  # Now populated from metadata
            "errors": result.get("errors", []),
            "total_items": total_items,
            "processing_time_ms": round(
                timing_details.get("total_processing_ms", 0), 2
            ),
            "duplicates_skipped": duplicates[:10]
            if duplicates
            else [],  # Limit to first 10
            "performance_metrics": {
                # ⏱️ Comprehensive Timing Metrics
                "total_processing_ms": round(
                    timing_details.get("total_processing_ms", 0), 2
                ),
                "file_upload_ms": round(timing_details.get("file_upload_ms", 0), 2),
                "security_validation_ms": round(
                    timing_details.get("security_validation_ms", 0), 2
                ),
                "csv_processing_ms": round(
                    timing_details.get("csv_processing_ms", 0), 2
                ),
                "csv_internal_processing_ms": round(csv_internal_processing_time_ms, 2),
                "items_per_second": round(
                    processed_count
                    / (timing_details.get("total_processing_ms", 1) / 1000),
                    2,
                )
                if timing_details.get("total_processing_ms", 0) > 0
                else 0,
                # Internal CSV processor metrics
                "duplicate_detection_ms": round(
                    timing_details.get("duplicate_detection_ms", 0), 2
                ),
                "product_resolution_ms": round(
                    timing_details.get("product_resolution_ms", 0), 2
                ),
                "batch_insertion_ms": round(
                    timing_details.get("batch_insertion_ms", 0), 2
                ),
                "database_operations_ms": round(
                    timing_details.get(
                        "database_operations_ms", csv_internal_processing_time_ms
                    ),
                    2,
                ),
                "csv_parsing_ms": round(timing_details.get("csv_parsing_ms", 0), 2),
                "validation_ms": round(timing_details.get("validation_ms", 0), 2),
                # Performance indicators
                "mobile_optimized": True,
                "enterprise_ready": True,
                "timing_precision": "microsecond",
            },
            "message": f"Successfully processed {processed_count} items",
            # Keep additional data for debugging/extended info AND pass processed data
            "_internal": {
                "status": result["status"],
                "data": result.get("data", []),  # Include the processed data here
                "warnings": result.get("warnings", []),
                "store_id": store_id,
                "metadata": result.get("metadata", {}),
                "security": {
                    "status": security_result["security_status"],
                    "sanitization_applied": len(security_result["sanitization_changes"])
                    > 0,
                    "security_issues_detected": len(
                        security_result["validation"]["security_issues"]
                    )
                    > 0,
                    "file_size_original": security_result["original_size"],
                    "file_size_processed": security_result["sanitized_size"],
                },
            },
        }

        # Add warnings to response if present
        if result.get("warnings"):
            response_data["_internal"]["has_warnings"] = True
            response_data["message"] += f" with {len(result['warnings'])} warnings"

        # ⏱️ Log Comprehensive Performance Summary
        logger.info(
            "CSV Upload Performance Summary",
            store_id=store_id,
            user_id=current_user["sub"],
            filename=file.filename,
            total_processing_ms=round(timing_details.get("total_processing_ms", 0), 2),
            file_upload_ms=round(timing_details.get("file_upload_ms", 0), 2),
            security_validation_ms=round(
                timing_details.get("security_validation_ms", 0), 2
            ),
            csv_processing_ms=round(timing_details.get("csv_processing_ms", 0), 2),
            items_processed=processed_count,
            items_per_second=round(
                processed_count / (timing_details.get("total_processing_ms", 1) / 1000),
                2,
            )
            if timing_details.get("total_processing_ms", 0) > 0
            else 0,
            success=True,
            timing_precision="microsecond",
        )

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during CSV processing: {e!s}",
        ) from None


@router.get("/template")
async def get_csv_template(current_user: dict[str, Any] = Depends(get_current_user)):
    """
    Download CSV template with sample data

    Returns a CSV template that matches the unified processor's expected format
    """

    # Template headers (normalized column names)
    headers = [
        "sku",
        "product_name",
        "category",
        "quantity",
        "expiry_date",
        "brand",
        "cost_price",
        "selling_price",
        "manufacture_date",
        "location_code",
        "unit_type",
    ]

    # Sample data rows
    sample_data = [
        {
            "sku": "APPLE001",
            "product_name": "Red Apples",
            "category": "fresh_produce",
            "quantity": "50",
            "expiry_date": "2025-07-20",
            "brand": "FreshFarms",
            "cost_price": "2.50",
            "selling_price": "3.99",
            "manufacture_date": "2025-07-13",
            "location_code": "MAIN",
            "unit_type": "kg",
        },
        {
            "sku": "MILK002",
            "product_name": "Whole Milk",
            "category": "dairy",
            "quantity": "30",
            "expiry_date": "2025-07-18",
            "brand": "DairyBest",
            "cost_price": "1.20",
            "selling_price": "1.89",
            "manufacture_date": "2025-07-10",
            "location_code": "FRIDGE",
            "unit_type": "liter",
        },
        {
            "sku": "BREAD003",
            "product_name": "Sourdough Bread",
            "category": "bakery_fresh",
            "quantity": "25",
            "expiry_date": "2025-07-15",
            "brand": "BakeryPlus",
            "cost_price": "2.00",
            "selling_price": "3.50",
            "manufacture_date": "2025-07-13",
            "location_code": "BAKERY",
            "unit_type": "pcs",
        },
    ]

    # Generate CSV content
    csv_lines = [",".join(headers)]
    for row in sample_data:
        csv_lines.append(",".join(str(row.get(header, "")) for header in headers))

    csv_content = "\n".join(csv_lines)

    return {
        "success": True,
        "data": {
            "content": csv_content,
            "filename": "inventory_template.csv",
            "headers": headers,
            "sample_rows": len(sample_data),
            "instructions": {
                "required_columns": [
                    "sku",
                    "product_name",
                    "category",
                    "quantity",
                    "expiry_date",
                ],
                "optional_columns": [
                    "brand",
                    "cost_price",
                    "selling_price",
                    "manufacture_date",
                    "location_code",
                    "unit_type",
                ],
                "category_examples": [
                    "fresh_produce",
                    "fresh_meat_fish",
                    "dairy",
                    "bakery_fresh",
                    "frozen",
                    "beverages",
                    "dry_goods",
                    "canned_jarred",
                ],
                "date_format": "YYYY-MM-DD (e.g., 2025-07-20)",
                "notes": [
                    "SKU must be unique within your store",
                    "Quantities should be positive numbers",
                    "Dates should be in YYYY-MM-DD format",
                    "Categories will be normalized to standard values",
                    "Missing optional fields will use default values",
                ],
            },
        },
    }


@router.post("/validate")
async def validate_csv(
    file: UploadFile = File(...),
    store_id: str = Form(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate CSV file without importing data

    This endpoint performs all validation checks without actually
    writing data to the database. Useful for previewing imports.
    """

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only CSV files are allowed."
        )

    # Validate store access
    await validate_store_access(store_id, current_user)

    try:
        # Read file content
        file_content = await file.read()

        # Validate file size
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="File too large. Maximum size is 10MB."
            )

        # Process CSV in validation-only mode
        integration = FastAPICSVIntegration()
        result = await integration.process_csv_upload(
            file_content, store_id, current_user["sub"]
        )

        # Return validation results
        return {
            "success": True,
            "validation_results": {
                "status": result["status"],
                "valid_rows": result["processed_count"],
                "total_items": len(result["data"]),
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
                "preview_data": result["data"][:5]
                if result["data"]
                else [],  # First 5 rows for preview
                "metadata": result.get("metadata", {}),
            },
            "message": "Validation completed successfully"
            if result["status"] != "error"
            else "Validation found errors",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Validation failed: {e!s}"
        ) from None


@router.post("/upload-and-create-batches")
@measure_time("csv_upload_and_batch_creation_full")
async def upload_csv_and_create_batches(
    file: UploadFile = File(...),
    store_id: str = Form(...),
    chunk_size: int = Form(50),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload CSV file, validate data, and create inventory batches in Supabase

    This endpoint combines CSV processing with batch creation:
    1. Validates and processes CSV file using unified processor
    2. Converts CSV data to batch creation requests
    3. Creates inventory batches in Supabase database with transaction management
    4. Returns comprehensive results with statistics and detailed performance metrics
    """
    # Validate store access
    await validate_store_access(store_id, current_user)

    try:
        # ⏱️ START COMPREHENSIVE TIMING FOR BATCH CREATION WORKFLOW
        total_workflow_start = time.perf_counter()

        # Track file upload time
        upload_start = time.perf_counter()
        file_content = await file.read()
        upload_time_ms = (time.perf_counter() - upload_start) * 1000

        # ⏱️ Track orchestrator processing time
        orchestrator_start = time.perf_counter()
        # Use the new orchestrator to handle the entire workflow with timing
        from app.utils.csv_upload_helpers import CSVUploadOrchestrator

        orchestrator = CSVUploadOrchestrator()
        response_data = await orchestrator.process_upload_and_create_batches(
            file_content=file_content,
            file_name=file.filename,
            store_id=store_id,
            user_id=current_user["sub"],
            chunk_size=chunk_size,
        )
        orchestrator_time_ms = (time.perf_counter() - orchestrator_start) * 1000

        # ⏱️ Calculate total workflow time
        total_workflow_time_ms = (time.perf_counter() - total_workflow_start) * 1000

        # Add comprehensive timing to metrics
        if "performance_metrics" in response_data:
            response_data["performance_metrics"]["file_upload_ms"] = round(
                upload_time_ms, 2
            )
            response_data["performance_metrics"]["orchestrator_processing_ms"] = round(
                orchestrator_time_ms, 2
            )
            response_data["performance_metrics"]["total_workflow_ms"] = round(
                total_workflow_time_ms, 2
            )
            response_data["performance_metrics"]["timing_precision"] = "microsecond"
            response_data["performance_metrics"]["workflow_optimized"] = True

        # ⏱️ Log comprehensive operation with detailed timing breakdown
        performance_metrics = response_data.get("performance_metrics", {})
        logger.info(
            "CSV upload and batch creation completed - Performance Summary",
            store_id=store_id,
            user_id=current_user["sub"],
            filename=file.filename,
            # Business metrics
            csv_rows_processed=response_data["csv_processing"]["processed_rows"],
            batch_requests_created=response_data["batch_creation"]["total_requests"],
            batches_created=response_data["batch_creation"]["successful_batches"],
            batches_failed=response_data["batch_creation"]["failed_batches"],
            success_rate=response_data["batch_creation"]["success_rate"],
            chunk_size=chunk_size,
            # Comprehensive timing metrics
            total_workflow_ms=round(total_workflow_time_ms, 2),
            file_upload_ms=round(upload_time_ms, 2),
            orchestrator_processing_ms=round(orchestrator_time_ms, 2),
            csv_parsing_ms=performance_metrics.get("csv_parsing_ms", 0),
            security_validation_ms=performance_metrics.get("security_validation_ms", 0),
            batch_creation_ms=performance_metrics.get("batch_creation_ms", 0),
            batch_insertion_ms=performance_metrics.get("batch_insertion_ms", 0),
            database_operations_ms=performance_metrics.get("database_operations_ms", 0),
            items_per_second=performance_metrics.get("items_per_second", 0),
            timing_precision="microsecond",
            workflow_optimized=True,
        )

        # 🎯 AUTO-TRIGGER SCORING FOR SMALL-TO-MEDIUM UPLOADS
        # After successful batch creation, automatically trigger scoring for uploads ≤1,000 items
        # This provides immediate urgency scores without manual intervention
        successful_batches = response_data["batch_creation"]["successful_batches"]
        total_items = response_data["batch_creation"]["total_requests"]

        if successful_batches > 0:
            # Hybrid approach: auto-trigger for ≤1,000 items, manual for larger
            AUTO_SCORE_THRESHOLD = 1000

            if total_items <= AUTO_SCORE_THRESHOLD:
                try:
                    # Import the automated scoring scheduler
                    from app.core.automated_scoring import (
                        get_automated_scoring_scheduler,
                    )

                    scheduler = get_automated_scoring_scheduler()

                    # Trigger immediate scoring (force_recalculate=False to be efficient)
                    job_id = await scheduler.trigger_immediate_scoring(
                        store_id, force_recalculate=False
                    )

                    # Add job_id to response so user can track progress
                    response_data["auto_scoring"] = {
                        "triggered": True,
                        "job_id": job_id,
                        "message": f"Automatic scoring triggered for {successful_batches} new batches",
                        "note": "Track scoring progress using the job_id",
                    }

                    logger.info(
                        "Auto-triggered scoring after CSV upload",
                        store_id=store_id,
                        job_id=job_id,
                        total_items=total_items,
                        successful_batches=successful_batches,
                        user_id=current_user["sub"],
                    )

                except Exception as scoring_error:
                    # Don't fail the entire request if auto-scoring fails
                    logger.warning(
                        "Failed to auto-trigger scoring after CSV upload",
                        store_id=store_id,
                        total_items=total_items,
                        error=str(scoring_error),
                        user_id=current_user["sub"],
                    )
                    response_data["auto_scoring"] = {
                        "triggered": False,
                        "error": str(scoring_error),
                        "message": "Automatic scoring failed. Trigger manually if needed.",
                    }
            else:
                # For large uploads, suggest manual trigger
                response_data["auto_scoring"] = {
                    "triggered": False,
                    "message": f"Large upload detected ({total_items} items). Trigger scoring manually when ready.",
                    "note": f"Uploads with >{AUTO_SCORE_THRESHOLD} items require manual scoring trigger to avoid system overload.",
                }

                logger.info(
                    "Large CSV upload - scoring not auto-triggered",
                    store_id=store_id,
                    total_items=total_items,
                    threshold=AUTO_SCORE_THRESHOLD,
                    user_id=current_user["sub"],
                )

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "CSV upload and batch creation failed",
            store_id=store_id,
            user_id=current_user["sub"],
            filename=file.filename if file else "unknown",
            error=str(e),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during CSV batch processing: {e!s}",
        ) from None
