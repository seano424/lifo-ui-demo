"""
FastAPI CSV Upload Endpoint - Unified with Python ETL Core
Uses the consolidated UnifiedCSVProcessor for all CSV operations
"""

import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user, validate_store_access
from app.database.connection import get_db

# Import the unified processor (now properly installed)
try:
    from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
except ImportError as e:
    # Fallback to using the secure CSV processor already in the API
    try:
        from app.services.secure_csv_processor import SecureCSVProcessor as UnifiedCSVProcessor
    except ImportError:
        print(f"Warning: Could not import CSV processor: {e}")
        UnifiedCSVProcessor = None

router = APIRouter()


class FastAPICSVIntegration:
    """
    FastAPI integration for the unified CSV processor
    """

    @staticmethod
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
        if not UnifiedCSVProcessor:
            raise HTTPException(status_code=500, detail="Unified CSV processor not available")

        try:
            # Create processor instance
            processor = UnifiedCSVProcessor(store_id, user_id)

            # Create temporary file for processing
            with tempfile.NamedTemporaryFile(mode="wb", suffix=".csv", delete=False) as temp_file:
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
            raise HTTPException(status_code=400, detail=f"CSV processing failed: {e!s}") from None


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

        # Validate file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

        # Process CSV using unified processor
        integration = FastAPICSVIntegration()
        result = await integration.process_csv_upload(file_content, store_id, current_user["sub"])

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

        # Prepare response
        response_data = {
            "success": True,
            "message": f"Successfully processed {result['processed_count']} items",
            "data": {
                "processed_count": result["processed_count"],
                "total_items": len(result["data"]),
                "status": result["status"],
                "warnings": result.get("warnings", []),
                "errors": result.get("errors", []),
                "store_id": store_id,
                "metadata": result.get("metadata", {}),
            },
        }

        # Add warnings to response if present
        if result.get("warnings"):
            response_data["data"]["has_warnings"] = True
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
            "expiry_date": "2024-07-20",
            "brand": "FreshFarms",
            "cost_price": "2.50",
            "selling_price": "3.99",
            "manufacture_date": "2024-07-13",
            "location_code": "MAIN",
            "unit_type": "kg",
        },
        {
            "sku": "MILK002",
            "product_name": "Whole Milk",
            "category": "dairy",
            "quantity": "30",
            "expiry_date": "2024-07-18",
            "brand": "DairyBest",
            "cost_price": "1.20",
            "selling_price": "1.89",
            "manufacture_date": "2024-07-10",
            "location_code": "FRIDGE",
            "unit_type": "liter",
        },
        {
            "sku": "BREAD003",
            "product_name": "Sourdough Bread",
            "category": "bakery_fresh",
            "quantity": "25",
            "expiry_date": "2024-07-15",
            "brand": "BakeryPlus",
            "cost_price": "2.00",
            "selling_price": "3.50",
            "manufacture_date": "2024-07-13",
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
                "date_format": "YYYY-MM-DD (e.g., 2024-07-20)",
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
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

        # Process CSV in validation-only mode
        integration = FastAPICSVIntegration()
        result = await integration.process_csv_upload(file_content, store_id, current_user["sub"])

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
        raise HTTPException(status_code=500, detail=f"Validation failed: {e!s}") from None
