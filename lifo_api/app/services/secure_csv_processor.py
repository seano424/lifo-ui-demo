"""
Secure CSV processing service for AI features only
Part of hybrid architecture security remediation
UPDATED: Now uses unified CSV services to eliminate duplicate code
"""

from datetime import datetime
from typing import Any

import structlog
from fastapi import HTTPException, UploadFile

from app.services.csv import create_unified_csv_service

logger = structlog.get_logger()


class SecureCSVProcessor:
    """
    Secure CSV processor for AI features only - Updated to use unified services
    No database writes - returns validated data for frontend to save via Supabase
    """

    def __init__(self):
        self.logger = logger.bind(component="secure_csv_processor")

    async def process_csv_for_validation(
        self, file: UploadFile, store_id: str, user_id: str = "system"
    ) -> dict[str, Any]:
        """
        Process CSV for validation only - now uses unified CSV service
        Returns validated data for frontend to save via Supabase
        """
        try:
            # Use unified CSV service for all processing
            unified_service = create_unified_csv_service(
                store_id=store_id, user_id=user_id
            )

            # Process using validation_only mode
            result = await unified_service.process_csv_upload(
                file=file, processing_mode="validation_only"
            )

            # Transform response to maintain backward compatibility
            if result.get("success"):
                processing_data = result.get("data", {})
                validation_data = processing_data.get("validated_rows", [])

                # Legacy format for backward compatibility
                legacy_result = {
                    "upload_id": result.get("processing_id"),
                    "filename": file.filename,
                    "store_id": store_id,
                    "file_size": 0,  # File size not tracked in new system
                    "total_rows": result.get("processing_stats", {}).get(
                        "total_rows", 0
                    ),
                    "validation": {
                        "is_valid": result.get("processing_stats", {}).get(
                            "error_count", 0
                        )
                        == 0,
                        "valid_count": result.get("processing_stats", {}).get(
                            "processed_rows", 0
                        ),
                        "error_count": result.get("processing_stats", {}).get(
                            "error_rows", 0
                        ),
                        "warning_count": result.get("processing_stats", {}).get(
                            "warning_rows", 0
                        ),
                        "valid_rows": validation_data,
                        "errors": result.get("errors", []),
                        "warnings": result.get("warnings", []),
                    },
                    "ai_suggestions": processing_data.get("ai_suggestions", {}),
                    "validated_data": validation_data,
                    "processed_at": result.get(
                        "processed_at", datetime.utcnow().isoformat()
                    ),
                }

                self.logger.info(
                    "CSV file processed securely using unified service",
                    upload_id=legacy_result["upload_id"],
                    filename=file.filename,
                    total_rows=legacy_result["total_rows"],
                    valid_rows=legacy_result["validation"]["valid_count"],
                    error_count=legacy_result["validation"]["error_count"],
                )

                return legacy_result
            else:
                # Handle error case
                raise HTTPException(
                    status_code=400, detail=result.get("error", "CSV processing failed")
                )

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(
                "Secure CSV processing failed",
                filename=file.filename,
                error=str(e),
            )
            raise HTTPException(
                status_code=500, detail=f"CSV processing failed: {e!s}"
            ) from e

    def generate_secure_csv_template(self) -> str:
        """Generate secure CSV template using unified template generator"""
        try:
            # Use unified template generator service
            from app.services.csv import get_csv_template_generator

            template_generator = get_csv_template_generator()
            return template_generator.generate_standard_template()
        except ImportError:
            # Fallback if unified service not available
            return self._generate_fallback_template()

    def _generate_fallback_template(self) -> str:
        """Fallback template generation for backward compatibility"""
        headers = [
            "sku",
            "product_name",
            "quantity",
            "cost_price",
            "selling_price",
            "expiry_date",
            "category",
            "brand",
            "location_code",
        ]

        sample_data = [
            [
                "DAIRY-001",
                "Organic Milk 1L",
                "24",
                "1.20",
                "2.50",
                "2024-12-25",
                "dairy_eggs",
                "Farm Fresh",
                "FRIDGE-A1",
            ],
            [
                "BREAD-001",
                "Whole Wheat Bread",
                "15",
                "0.80",
                "1.80",
                "2024-12-20",
                "bakery_fresh",
                "Local Bakery",
                "SHELF-B2",
            ],
        ]

        # Generate CSV content
        csv_content = ",".join(headers) + "\n"
        for row in sample_data:
            csv_content += ",".join(str(cell) for cell in row) + "\n"

        return csv_content
