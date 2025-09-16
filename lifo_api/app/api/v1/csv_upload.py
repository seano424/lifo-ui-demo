"""
FastAPI CSV Upload Endpoint - Unified with Python ETL Core
Uses the consolidated UnifiedCSVProcessor for all CSV operations
"""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user, validate_store_access
from app.database.connection import get_db
from app.security.csv_security import (
    CSVSecurityError,
    validate_and_sanitize_csv,
)
from app.utils.performance import measure_time

# Import the unified processor (now consolidated into lifo_api)
from app.core.etl.unified_csv_processor import UnifiedCSVProcessor

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
        # Read file content
        file_content = await file.read()

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

        # Log security actions if any
        if security_result["sanitization_changes"]:
            print(
                f"CSV Security: {len(security_result['sanitization_changes'])} changes made"
            )

        if security_result["validation"]["security_issues"]:
            print(
                f"CSV Security: {len(security_result['validation']['security_issues'])} issues detected"
            )

        # Process CSV using unified processor with sanitized content
        integration = FastAPICSVIntegration()
        result = await integration.process_csv_upload(
            sanitized_content, store_id, current_user["sub"]
        )

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

        response_data: dict[str, Any] = {
            "success": True,
            "processed": processed_count,
            "skipped": 0,  # TODO: Add skipped count from processor
            "errors": result.get("errors", []),
            "total_items": total_items,
            "processing_time_ms": result.get("metadata", {}).get(
                "processing_time_ms", 0
            ),
            "duplicates_skipped": [],  # TODO: Add from processor if available
            "performance_metrics": {
                "items_per_second": processed_count
                / (result.get("metadata", {}).get("processing_time_ms", 1) / 1000)
                if result.get("metadata", {}).get("processing_time_ms", 0) > 0
                else 0,
                "duplicate_detection_ms": 0,  # TODO: Add from processor
                "product_resolution_ms": 0,  # TODO: Add from processor
                "batch_insertion_ms": 0,  # TODO: Add from processor
                "database_operations_ms": result.get("metadata", {}).get(
                    "processing_time_ms", 0
                ),
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
    4. Returns comprehensive results with statistics
    """

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only CSV files are allowed."
        )

    # Validate store access
    await validate_store_access(store_id, current_user)

    # Validate chunk size
    if chunk_size < 1 or chunk_size > 100:
        raise HTTPException(
            status_code=400, detail="Chunk size must be between 1 and 100"
        )

    try:
        # Read and validate file content
        file_content = await file.read()

        # Validate file size (10MB limit)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="File too large. Maximum size is 10MB."
            )

        # SECURITY: Comprehensive CSV validation and sanitization
        safe_filename = Path(file.filename).name if file.filename else "unknown.csv"

        try:
            security_result = validate_and_sanitize_csv(file_content, safe_filename)
        except CSVSecurityError as e:
            raise HTTPException(
                status_code=400, detail=f"Security validation failed: {str(e)}"
            ) from e

        # Use sanitized content for processing
        sanitized_content = security_result["sanitized_content"].encode("utf-8")

        # Step 1: Process CSV using unified processor
        integration = FastAPICSVIntegration()
        csv_result = await integration.process_csv_upload(
            sanitized_content, store_id, current_user["sub"]
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

        # Step 2: Convert CSV data to batch requests
        from app.utils.csv_to_batch_adapter import CSVToBatchAdapter
        import time

        try:
            # Time the batch conversion
            batch_conversion_start = time.time()
            batch_requests = CSVToBatchAdapter.convert_csv_data_to_batch_requests(
                csv_data=csv_result["data"],
                store_id=store_id,
                user_id=current_user["sub"],
            )
            batch_conversion_time_ms = (time.time() - batch_conversion_start) * 1000
            
            logger.info(
                "CSV to batch conversion completed",
                conversion_time_ms=batch_conversion_time_ms,
                requests_created=len(batch_requests),
                store_id=store_id,
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to convert CSV data to batch requests: {str(e)}",
            ) from e

        if not batch_requests:
            raise HTTPException(
                status_code=400,
                detail="No valid batch requests could be created from CSV data",
            )

        # Step 3: Create batches in Supabase using bulk service
        from app.services.batch_creation_service import BatchCreationService

        batch_service = BatchCreationService()
        
        # Time the database operations
        db_operations_start = time.time()
        batch_results = await batch_service.create_batches_from_csv_bulk(
            store_id=store_id,
            user_id=current_user["sub"],
            batch_requests=batch_requests,
            chunk_size=chunk_size,
        )
        db_operations_time_ms = (time.time() - db_operations_start) * 1000
        
        logger.info(
            "Database batch creation completed",
            db_operations_time_ms=db_operations_time_ms,
            successful_batches=batch_results["successful"],
            failed_batches=batch_results["failed"],
            success_rate=batch_results["success_rate"],
            store_id=store_id,
        )

        # Step 4: Create comprehensive summary
        csv_summary = CSVToBatchAdapter.create_csv_batch_summary(
            batch_requests=batch_requests,
            store_id=store_id,
            user_id=current_user["sub"],
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
                "sanitization_applied": len(security_result["sanitization_changes"])
                > 0,
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
            "processed_by": current_user["sub"],
        }

        # Add success details to response
        if batch_results["successful"] > 0:
            response_data["successful_batches_sample"] = batch_results[
                "successful_batches"
            ][:5]  # First 5 for preview

        # Log comprehensive operation
        logger.info(
            "CSV upload and batch creation completed",
            store_id=store_id,
            user_id=current_user["sub"],
            filename=file.filename,
            csv_rows_processed=csv_result["processed_count"],
            batch_requests_created=len(batch_requests),
            batches_created=batch_results["successful"],
            batches_failed=batch_results["failed"],
            success_rate=batch_results["success_rate"],
            chunk_size=chunk_size,
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
