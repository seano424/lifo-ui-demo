"""
CSV Duplicate Detection Endpoint
Checks for existing products/batches before upload to prevent duplicate errors
"""

from typing import Any
import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pathlib import Path

from app.auth.secure_dependencies import get_current_user, validate_store_access
from app.core.etl.unified_csv_processor import UnifiedCSVProcessor
from app.security.csv_security import CSVSecurityError, validate_and_sanitize_csv
from app.services.duplicate_detection_service import DuplicateDetectionService

router = APIRouter()
logger = structlog.get_logger()


@router.post("/check-duplicates")
async def check_csv_duplicates(
    file: UploadFile = File(...),
    store_id: str = Form(...),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Pre-flight check: Analyze CSV for duplicate SKUs/batches against database

    This endpoint helps users avoid uploading duplicate data by:
    1. Parsing the CSV file without writing to database
    2. Checking for duplicates within the CSV itself
    3. Querying database to find existing products/batches
    4. Returning a detailed conflict report with recommendations

    Use this BEFORE calling /upload-and-create-batches to show users:
    - What data already exists
    - What will be updated vs created
    - Confirmation prompt: "This file appears to have been uploaded before. Continue?"

    Returns:
        {
            "has_duplicates": bool,  # True if any conflicts found
            "duplicate_analysis": {
                "within_csv": [...],  # Duplicate SKUs in the CSV file
                "in_database": {
                    "products": int,  # Number of existing products
                    "batches": int,   # Number of existing batches
                    "duplicate_rows": int  # CSV rows that will UPDATE existing data
                },
                "duplicate_rows": int,  # Total rows that match existing data
                "conflict_percentage": float  # % of CSV that's duplicate
            },
            "recommendations": {
                "action": "proceed" | "proceed_with_caution" | "review_recommended" | "likely_duplicate_upload",
                "message": str,  # User-friendly message
                "can_update": bool,  # Can update existing records
                "can_skip_duplicates": bool
            },
            "details": {
                "total_rows": int,
                "unique_skus": int,
                "existing_products": int,
                "existing_batches": int,
                "conflict_details": [...],  # First 10 conflicts with details
                "total_conflict_details": int
            },
            "update_preview": {  # Preview of what will be updated
                "products": [...],
                "batches": [...]
            }
        }

    Frontend Integration Example:
    ```typescript
    // 1. Check for duplicates first
    const checkResult = await checkDuplicates(file, storeId);

    // 2. Show confirmation dialog if duplicates found
    if (checkResult.has_duplicates) {
        const confirmed = await showConfirmDialog({
            title: "Duplicate Data Detected",
            message: checkResult.recommendations.message,
            details: `${checkResult.duplicate_analysis.duplicate_rows} rows already exist`,
            actions: ["Update Existing", "Skip Duplicates", "Cancel"]
        });

        if (!confirmed) return;
    }

    // 3. Proceed with upload
    await uploadAndCreateBatches(file, storeId, {
        update_existing: confirmed === "Update Existing"
    });
    ```
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only CSV files are allowed."
        )

    # Validate store access
    await validate_store_access(store_id, current_user)

    try:
        logger.info(
            "Starting duplicate check",
            store_id=store_id,
            filename=file.filename,
            user_id=current_user["sub"]
        )

        # Read and validate file
        file_content = await file.read()
        safe_filename = Path(file.filename).name if file.filename else "unknown.csv"

        # Security validation
        try:
            security_result = validate_and_sanitize_csv(file_content, safe_filename)
        except CSVSecurityError as e:
            raise HTTPException(
                status_code=400, detail=f"Security validation failed: {str(e)}"
            ) from e

        sanitized_content = security_result["sanitized_content"].encode("utf-8")

        # Parse CSV to extract SKUs and batch numbers
        processor = UnifiedCSVProcessor(store_id, current_user["sub"])

        # Create temporary file for processing
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(mode="wb", suffix=".csv", delete=False) as temp_file:
            temp_file.write(sanitized_content)
            temp_file_path = temp_file.name

        try:
            # Process CSV to get structured data (without writing to database)
            result = await processor.process_csv_file(temp_file_path, sanitized_content)

            if result["status"] == "error":
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "CSV parsing failed",
                        "errors": result["errors"],
                        "warnings": result.get("warnings", [])
                    }
                )

            csv_data = result.get("data", [])

            if not csv_data:
                return {
                    "has_duplicates": False,
                    "duplicate_analysis": {
                        "within_csv": [],
                        "in_database": {
                            "products": 0,
                            "batches": 0,
                            "duplicate_rows": 0
                        },
                        "duplicate_rows": 0,
                        "conflict_percentage": 0.0
                    },
                    "recommendations": {
                        "action": "proceed",
                        "message": "No data found in CSV file",
                        "can_update": False,
                        "can_skip_duplicates": False
                    },
                    "details": {
                        "total_rows": 0,
                        "unique_skus": 0,
                        "existing_products": 0,
                        "existing_batches": 0,
                        "conflict_details": [],
                        "total_conflict_details": 0
                    },
                    "update_preview": None
                }

            # Use duplicate detection service to analyze
            detection_service = DuplicateDetectionService()
            duplicate_analysis = await detection_service.analyze_csv_duplicates(
                csv_data=csv_data,
                store_id=store_id
            )

            logger.info(
                "Duplicate check completed",
                store_id=store_id,
                filename=file.filename,
                has_duplicates=duplicate_analysis["has_duplicates"],
                duplicate_rows=duplicate_analysis["duplicate_analysis"]["duplicate_rows"],
                conflict_percentage=duplicate_analysis["duplicate_analysis"]["conflict_percentage"],
                recommended_action=duplicate_analysis["recommendations"]["action"]
            )

            return duplicate_analysis

        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Duplicate check failed",
            store_id=store_id,
            filename=file.filename if file else "unknown",
            error=str(e),
            error_type=type(e).__name__
        )
        raise HTTPException(
            status_code=500,
            detail=f"Duplicate check failed: {str(e)}"
        ) from None
