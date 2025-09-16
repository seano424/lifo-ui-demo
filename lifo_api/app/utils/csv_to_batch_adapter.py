"""
CSV to Batch Adapter Utility
Converts CSV processed data to BatchFromScanRequest format for batch creation
"""

from datetime import date, datetime, timedelta
from typing import Any

import structlog

from app.services.batch_creation_service import BatchFromScanRequest

logger = structlog.get_logger()


class CSVToBatchAdapter:
    """
    Utility class to convert CSV processed data to batch creation requests
    Bridges the gap between CSV upload processing and batch creation service
    """

    @staticmethod
    def convert_csv_data_to_batch_requests(
        csv_data: list[dict[str, Any]], store_id: str, user_id: str
    ) -> list[BatchFromScanRequest]:
        """
        Convert processed CSV data to batch creation requests

        Args:
            csv_data: List of processed CSV rows from UnifiedCSVProcessor
            store_id: Store ID for the batches
            user_id: User ID creating the batches

        Returns:
            List of BatchFromScanRequest objects ready for batch creation
        """
        batch_requests = []

        for i, row in enumerate(csv_data):
            try:
                # Convert CSV row to batch request
                batch_request = CSVToBatchAdapter._convert_single_row(row, i)
                batch_requests.append(batch_request)

            except Exception as e:
                logger.warning(
                    "Failed to convert CSV row to batch request",
                    row_index=i,
                    row_data=row,
                    error=str(e),
                    store_id=store_id,
                    user_id=user_id,
                )
                # Continue processing other rows
                continue

        logger.info(
            "CSV data converted to batch requests",
            total_rows=len(csv_data),
            successful_conversions=len(batch_requests),
            failed_conversions=len(csv_data) - len(batch_requests),
            store_id=store_id,
            user_id=user_id,
        )

        return batch_requests

    @staticmethod
    def _convert_single_row(
        row: dict[str, Any], row_index: int
    ) -> BatchFromScanRequest:
        """
        Convert a single CSV row to BatchFromScanRequest

        Args:
            row: Single processed CSV row
            row_index: Index of the row for error reporting

        Returns:
            BatchFromScanRequest object
        """
        try:
            # Extract required fields
            sku = row.get("sku", "").strip()
            product_name = row.get("product_name", "").strip()
            quantity = float(row.get("quantity", 0))
            expiry_date_str = row.get("expiry_date", "")

            from app.services.batch_creation_service import BatchFromScanRequest

            # Validate required fields
            if not sku:
                raise ValueError(f"Row {row_index}: SKU is required")
            if not product_name:
                raise ValueError(f"Row {row_index}: Product name is required")
            if quantity <= 0:
                raise ValueError(f"Row {row_index}: Quantity must be positive")
            if not expiry_date_str:
                raise ValueError(f"Row {row_index}: Expiry date is required")

            # Parse expiry date
            expiry_date = CSVToBatchAdapter._parse_date(expiry_date_str, row_index)

            # Extract optional fields with defaults
            brand = row.get("brand", "").strip() or None
            # Handle both old and new category formats for backward compatibility
            category = (
                row.get("category_code", "").strip()
                or row.get("category", "").strip()
                or None
            )
            batch_number = row.get("batch_number", "").strip() or None
            
            # Debug logging for batch number extraction
            logger.info(
                "CSV row processing",
                row_index=row_index,
                sku=sku,
                product_name=product_name,
                raw_batch_number=row.get("batch_number"),
                processed_batch_number=batch_number,
            )

            # Parse prices
            cost_price = CSVToBatchAdapter._parse_float(
                row.get("cost_price"), "cost_price", row_index
            )
            selling_price = CSVToBatchAdapter._parse_float(
                row.get("selling_price"), "selling_price", row_index
            )

            # Use SKU as barcode for CSV imports (common pattern)
            # Generate a proper barcode if SKU is not barcode-like
            barcode = CSVToBatchAdapter._generate_barcode_from_sku(sku)

            # Create batch request using the Pydantic model
            batch_data = {
                "barcode": barcode,
                "product_name": product_name,
                "brand": brand,
                "category": category,
                "quantity": quantity,
                "expiry_date": expiry_date,
                "batch_number": batch_number,  # Use provided batch number from CSV
                "cost_price": cost_price if cost_price is not None else None,
                "selling_price": selling_price if selling_price is not None else None,
                "scan_confidence": 1.0,  # CSV data is considered 100% confident
                "ocr_extracted_date": None,  # No OCR for CSV data
                "ocr_confidence": None,
                "openfoodfacts_data": None,  # Could be enhanced later
            }
            # Create BatchFromScanRequest for validation, then convert back to dict
            # Create BatchFromScanRequest instance
            batch_request = BatchFromScanRequest(**batch_data)

            return batch_request

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(
                f"Row {row_index}: Failed to convert row data: {str(e)}"
            ) from e

    @staticmethod
    def _parse_date(date_str: str, row_index: int) -> date:
        """Parse date string to date object"""
        if not date_str:
            raise ValueError(f"Row {row_index}: Date string is empty")

        # Common date formats
        date_formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"]

        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str.strip(), fmt).date()
                return parsed_date
            except ValueError:
                continue

        raise ValueError(
            f"Row {row_index}: Invalid date format '{date_str}'. Expected YYYY-MM-DD or DD/MM/YYYY"
        )

    @staticmethod
    def _parse_float(value: Any, field_name: str, row_index: int) -> float | None:
        """Parse float value with error handling"""
        if value is None or value == "":
            return None

        try:
            parsed_value = float(value)
            if parsed_value < 0:
                raise ValueError(f"Row {row_index}: {field_name} cannot be negative")
            return parsed_value
        except (ValueError, TypeError) as e:
            raise ValueError(
                f"Row {row_index}: Invalid {field_name} value '{value}'. Must be a positive number"
            ) from e

    @staticmethod
    def _generate_barcode_from_sku(sku: str) -> str:
        """
        Generate a barcode from SKU for CSV imports
        If SKU looks like a barcode (8+ digits), use it directly
        Otherwise, generate a unique barcode
        """
        # Clean SKU
        clean_sku = sku.strip().upper()

        # If SKU is already barcode-like (8+ characters, mostly numeric)
        if (
            len(clean_sku) >= 8
            and clean_sku.replace("-", "").replace("_", "").isalnum()
        ):
            # Use first 13 characters to fit EAN-13 format
            return clean_sku[:13]

        # Generate a barcode from SKU hash
        # Use a predictable hash so same SKU always gets same barcode
        import hashlib

        hash_object = hashlib.sha256(clean_sku.encode())
        hash_hex = hash_object.hexdigest()

        # Convert to numeric barcode (first 12 digits + check digit)
        numeric_part = "".join(c for c in hash_hex if c.isdigit())[:12]

        # Pad with zeros if needed
        while len(numeric_part) < 12:
            numeric_part += "0"

        # Simple check digit calculation (sum of alternating weighted digits)
        check_digit = (
            sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(numeric_part)) % 10
        )
        check_digit = (10 - check_digit) % 10

        return numeric_part + str(check_digit)

    @staticmethod
    def create_csv_batch_summary(
        batch_requests: list[BatchFromScanRequest], store_id: str, user_id: str
    ) -> dict[str, Any]:
        """
        Create a summary of the CSV batch conversion

        Args:
            batch_requests: List of converted batch requests
            store_id: Store ID
            user_id: User ID

        Returns:
            Summary dictionary with statistics and metadata
        """
        if not batch_requests:
            return {
                "total_items": 0,
                "valid_items": 0,
                "categories": {},
                "brands": {},
                "total_quantity": 0.0,
                "price_range": {},
                "expiry_analysis": {},
                "conversion_metadata": {
                    "store_id": store_id,
                    "user_id": user_id,
                    "converted_at": datetime.utcnow().isoformat(),
                },
            }

        # Calculate statistics
        categories: dict[str, int] = {}
        brands: dict[str, int] = {}
        total_quantity = 0.0
        prices = []
        expiry_dates = []

        for request in batch_requests:
            # Category distribution
            category = request.category or "uncategorized"
            categories[category] = categories.get(category, 0) + 1

            # Brand distribution
            brand = request.brand or "unknown"
            brands[brand] = brands.get(brand, 0) + 1

            # Quantity
            total_quantity += request.quantity

            # Prices
            if request.selling_price:
                prices.append(request.selling_price)

            # Expiry dates
            expiry_dates.append(request.expiry_date)

        # Price analysis
        price_range = {}
        if prices:
            price_range = {
                "min": min(prices),
                "max": max(prices),
                "average": sum(prices) / len(prices),
                "total_items_with_price": len(prices),
            }

        # Expiry analysis
        today = date.today()
        expiring_soon = sum(1 for d in expiry_dates if d <= today + timedelta(days=7))
        expired = sum(1 for d in expiry_dates if d < today)

        expiry_analysis = {
            "expiring_soon_7_days": expiring_soon,
            "already_expired": expired,
            "earliest_expiry": min(expiry_dates).isoformat() if expiry_dates else None,
            "latest_expiry": max(expiry_dates).isoformat() if expiry_dates else None,
        }

        return {
            "total_items": len(batch_requests),
            "valid_items": len(batch_requests),
            "categories": categories,
            "brands": brands,
            "total_quantity": total_quantity,
            "price_range": price_range,
            "expiry_analysis": expiry_analysis,
            "conversion_metadata": {
                "store_id": store_id,
                "user_id": user_id,
                "converted_at": datetime.utcnow().isoformat(),
                "barcode_generation_method": "sku_hash_based",
            },
        }
