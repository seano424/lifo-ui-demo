"""
Secure CSV processing service for AI features only
Part of hybrid architecture security remediation
"""

import csv
import io
import re
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

import structlog
from fastapi import HTTPException, UploadFile

logger = structlog.get_logger()


class SecureCSVProcessor:
    """
    Secure CSV processor for AI features only
    No database writes - returns validated data for frontend to save via Supabase
    """

    # Security limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_ROWS = 10000
    MAX_CELL_LENGTH = 1000

    # Allowed columns (whitelist approach)
    ALLOWED_COLUMNS = {
        "sku",
        "product_name",
        "category",
        "brand",
        "quantity",
        "cost_price",
        "selling_price",
        "expiry_date",
        "batch_number",
        "location_code",
        "supplier",
        "description",
        "unit_type",
    }

    # Dangerous patterns for CSV formula injection
    DANGEROUS_PATTERNS = [
        r"^=.*",  # Excel formulas
        r"^@.*",  # Excel formulas
        r"^\+.*",  # Excel formulas
        r"^-.*",  # Excel formulas
        r"^\t.*",  # Tab characters
        r"^\r.*",  # Carriage return
        r".*cmd.*",  # Command execution
        r".*powershell.*",  # PowerShell
        r".*script.*",  # Script tags
        r".*javascript.*",  # JavaScript
        r".*vbscript.*",  # VBScript
    ]

    def __init__(self):
        self.logger = logger.bind(component="secure_csv_processor")

    async def process_csv_for_validation(
        self, file: UploadFile, store_id: str
    ) -> dict[str, Any]:
        """
        Process CSV for validation only - no database writes
        Returns validated data for frontend to save via Supabase
        """
        upload_id = f"upload_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

        try:
            # Security validation
            await self._validate_file_security(file)

            # Read file content
            content = await file.read()

            # Decode CSV content securely
            csv_content = self._decode_csv_content_secure(content)

            # Parse CSV structure securely
            parsed_data = self._parse_csv_structure_secure(csv_content)

            # Validate and sanitize data
            validation_result = await self._validate_and_sanitize_csv(
                parsed_data, store_id
            )

            # Generate AI suggestions for validated data
            suggestions = await self._generate_ai_suggestions(
                validation_result["valid_rows"]
            )

            result = {
                "upload_id": upload_id,
                "filename": file.filename,
                "store_id": store_id,
                "file_size": len(content),
                "total_rows": len(parsed_data["data_rows"]),
                "validation": validation_result,
                "ai_suggestions": suggestions,
                "validated_data": validation_result["valid_rows"],
                "processed_at": datetime.utcnow().isoformat(),
            }

            self.logger.info(
                "CSV file processed securely",
                upload_id=upload_id,
                filename=file.filename,
                total_rows=result["total_rows"],
                valid_rows=validation_result["valid_count"],
                error_count=validation_result["error_count"],
            )

            return result

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(
                "Secure CSV processing failed",
                upload_id=upload_id,
                filename=file.filename,
                error=str(e),
            )
            raise HTTPException(status_code=500, detail=f"CSV processing failed: {e!s}")

    async def _validate_file_security(self, file: UploadFile) -> None:
        """Validate file security constraints"""

        # Read file content first to validate actual size
        content = await file.read()
        await file.seek(0)  # Reset file pointer

        # Check actual file size (more reliable than file.size)
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {self.MAX_FILE_SIZE / 1024 / 1024:.1f}MB",
            )

        # Validate file content is actually CSV-like
        self._validate_csv_content(content)

        # Check file extension
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

        # Check content type (more strict validation)
        allowed_content_types = [
            "text/csv",
            "text/plain",
            "application/csv",
            "application/vnd.ms-excel",  # Some systems use this for CSV
        ]
        if file.content_type and file.content_type not in allowed_content_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content type: {file.content_type}. Expected CSV file.",
            )

        # Check for dangerous filename patterns
        if self._has_dangerous_filename(file.filename):
            raise HTTPException(
                status_code=400,
                detail="Invalid filename. Contains dangerous characters",
            )

    def _has_dangerous_filename(self, filename: str) -> bool:
        """Check if filename contains dangerous patterns"""
        dangerous_patterns = [
            r"\.\./",  # Path traversal
            r"\\",  # Windows path separator
            r"<",  # HTML/XML tags
            r">",  # HTML/XML tags
            r'[<>:"/\\|?*]',  # Windows invalid chars
            r"^\.",  # Hidden files
            r"^\$",  # System files
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return True

        return False

    def _validate_csv_content(self, content: bytes) -> None:
        """Validate that file content is actually CSV data"""
        try:
            # Try to decode as text
            text_content = content.decode("utf-8")

            # Check for binary content indicators
            if "\x00" in text_content:
                raise HTTPException(
                    status_code=400, detail="File contains binary data, not CSV"
                )

            # Check for executable content indicators
            dangerous_headers = [
                b"MZ",  # Windows executable
                b"\x7fELF",  # Linux executable
                b"\x89PNG",  # PNG image
                b"\xff\xd8\xff",  # JPEG image
                b"PK\x03\x04",  # ZIP archive
                b"%PDF",  # PDF file
            ]

            for header in dangerous_headers:
                if content.startswith(header):
                    raise HTTPException(
                        status_code=400,
                        detail="File appears to be binary data, not CSV",
                    )

            # Basic CSV structure validation
            lines = text_content.split("\n")
            if len(lines) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="File must contain at least a header row and one data row",
                )

            # Check if first line looks like CSV headers
            first_line = lines[0].strip()
            if not first_line or "," not in first_line:
                raise HTTPException(
                    status_code=400,
                    detail="File does not appear to be valid CSV format",
                )

        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File is not valid UTF-8 text")

    def _decode_csv_content_secure(self, content: bytes) -> str:
        """Securely decode CSV content with size checks"""

        # Check raw content size
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, detail=f"File content too large: {len(content)} bytes"
            )

        # Try safe encodings only
        safe_encodings = ["utf-8", "utf-8-sig"]

        for encoding in safe_encodings:
            try:
                decoded = content.decode(encoding)

                # Check for binary content
                if "\x00" in decoded:
                    raise HTTPException(
                        status_code=400, detail="File contains binary data"
                    )

                return decoded

            except UnicodeDecodeError:
                continue

        raise HTTPException(
            status_code=400,
            detail="Unable to decode CSV file. Please ensure it's UTF-8 encoded",
        )

    def _parse_csv_structure_secure(self, csv_content: str) -> dict[str, Any]:
        """Parse CSV structure with security checks"""

        # Check content length
        if len(csv_content) > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="CSV content too large")

        # Check for suspicious patterns in raw content
        if self._has_suspicious_content(csv_content):
            raise HTTPException(
                status_code=400, detail="CSV contains suspicious content"
            )

        try:
            # Use CSV reader with security settings
            csv_reader = csv.reader(
                io.StringIO(csv_content),
                delimiter=",",
                quotechar='"',
                strict=True,  # Strict parsing
            )

            rows = []
            for row_idx, row in enumerate(csv_reader):
                if row_idx > self.MAX_ROWS:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Too many rows. Maximum: {self.MAX_ROWS}",
                    )

                # Check row length
                if len(row) > 50:  # Max columns
                    raise HTTPException(
                        status_code=400, detail=f"Too many columns in row {row_idx + 1}"
                    )

                # Check cell content length
                for cell_idx, cell in enumerate(row):
                    if len(cell) > self.MAX_CELL_LENGTH:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cell content too long at row {row_idx + 1}, column {cell_idx + 1}",
                        )

                rows.append(row)

            if len(rows) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="CSV must contain at least a header row and one data row",
                )

            headers = [header.strip().lower() for header in rows[0]]
            data_rows = rows[1:]

            return {
                "headers": headers,
                "data_rows": data_rows,
                "total_rows": len(data_rows),
            }

        except csv.Error as e:
            raise HTTPException(status_code=400, detail=f"CSV parsing error: {e!s}")

    def _has_suspicious_content(self, content: str) -> bool:
        """Check for suspicious content patterns"""

        # Check for dangerous patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                return True

        # Check for excessive special characters
        special_char_count = sum(
            1 for char in content if not char.isalnum() and char not in ' ,.:-_\n\r\t"'
        )
        if special_char_count > len(content) * 0.1:  # More than 10% special chars
            return True

        return False

    def _sanitize_csv_cell(self, value: str) -> str:
        """Sanitize CSV cell content to prevent injection"""
        if not value:
            return ""

        # Remove dangerous characters
        sanitized = value.strip()

        # Check for formula injection patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.match(pattern, sanitized, re.IGNORECASE):
                # Escape potential formulas by prepending single quote
                sanitized = "'" + sanitized
                break

        # Remove control characters
        sanitized = "".join(
            char for char in sanitized if ord(char) >= 32 or char in "\t\n\r"
        )

        # Limit length
        if len(sanitized) > self.MAX_CELL_LENGTH:
            sanitized = sanitized[: self.MAX_CELL_LENGTH]

        return sanitized

    async def _validate_and_sanitize_csv(
        self, parsed_data: dict[str, Any], store_id: str
    ) -> dict[str, Any]:
        """Validate and sanitize CSV data"""

        headers = parsed_data["headers"]
        data_rows = parsed_data["data_rows"]

        # Validate headers against whitelist
        invalid_headers = []
        for header in headers:
            if header not in self.ALLOWED_COLUMNS:
                invalid_headers.append(header)

        if invalid_headers:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid columns: {invalid_headers}. Allowed: {list(self.ALLOWED_COLUMNS)}",
            )

        # Check for required columns
        required_columns = [
            "sku",
            "product_name",
            "quantity",
            "cost_price",
            "selling_price",
        ]
        missing_required = []
        for required_col in required_columns:
            if required_col not in headers:
                missing_required.append(required_col)

        if missing_required:
            raise HTTPException(
                status_code=400, detail=f"Missing required columns: {missing_required}"
            )

        # Validate and sanitize each row
        valid_rows = []
        errors = []
        warnings = []

        for row_idx, row in enumerate(data_rows):
            row_number = row_idx + 2  # +2 for header and 0-based index

            try:
                # Check column count
                if len(row) != len(headers):
                    errors.append(
                        {
                            "row": row_number,
                            "error": f"Column count mismatch. Expected {len(headers)}, got {len(row)}",
                        }
                    )
                    continue

                # Convert row to dict and sanitize
                row_data = {}
                for header, value in zip(headers, row):
                    sanitized_value = self._sanitize_csv_cell(value)
                    row_data[header] = sanitized_value

                # Validate each field
                validated_row = await self._validate_row_secure(row_data, row_number)

                # Business logic validation
                business_validation = await self._validate_business_rules_secure(
                    validated_row, store_id, row_number
                )

                if business_validation["warnings"]:
                    warnings.extend(business_validation["warnings"])

                if business_validation["errors"]:
                    errors.extend(business_validation["errors"])
                else:
                    valid_rows.append(validated_row)

            except Exception as e:
                errors.append(
                    {"row": row_number, "error": f"Row validation failed: {e!s}"}
                )

        return {
            "is_valid": len(errors) == 0,
            "total_rows": len(data_rows),
            "valid_count": len(valid_rows),
            "error_count": len(errors),
            "warning_count": len(warnings),
            "valid_rows": valid_rows,
            "errors": errors[:50],  # Limit error list
            "warnings": warnings[:50],  # Limit warning list
        }

    async def _validate_row_secure(
        self, row_data: dict[str, str], row_number: int
    ) -> dict[str, Any]:
        """Validate individual row with security checks"""
        validated_row = {}

        # SKU validation
        if "sku" in row_data:
            sku = row_data["sku"].strip().upper()
            if not sku or len(sku) < 2 or len(sku) > 50:
                raise ValueError("Invalid SKU: must be 2-50 characters")
            if not re.match(r"^[A-Z0-9\-_]+$", sku):
                raise ValueError(
                    "Invalid SKU: only letters, numbers, hyphens, and underscores allowed"
                )
            validated_row["sku"] = sku

        # Product name validation
        if "product_name" in row_data:
            name = row_data["product_name"].strip()
            if not name or len(name) < 2 or len(name) > 255:
                raise ValueError("Invalid product name: must be 2-255 characters")
            # Remove HTML/XML tags
            name = re.sub(r"<[^>]+>", "", name)
            validated_row["product_name"] = name

        # Quantity validation
        if "quantity" in row_data:
            try:
                quantity = float(row_data["quantity"])
                if quantity < 0 or quantity > 100000:
                    raise ValueError("Invalid quantity: must be 0-100000")
                validated_row["quantity"] = quantity
            except ValueError:
                raise ValueError(f"Invalid quantity format: {row_data['quantity']}")

        # Price validation
        for price_field in ["cost_price", "selling_price"]:
            if price_field in row_data:
                try:
                    price = Decimal(row_data[price_field])
                    if price < 0 or price > Decimal("10000"):
                        raise ValueError(f"Invalid {price_field}: must be 0-10000")
                    validated_row[price_field] = price
                except (ValueError, InvalidOperation):
                    raise ValueError(
                        f"Invalid {price_field} format: {row_data[price_field]}"
                    )

        # Date validation
        if row_data.get("expiry_date"):
            try:
                expiry_date = datetime.strptime(
                    row_data["expiry_date"], "%Y-%m-%d"
                ).date()
                # Check reasonable date range
                if expiry_date < datetime.now().date() - timedelta(days=30):
                    raise ValueError(f"Expiry date too old: {expiry_date}")
                if expiry_date > datetime.now().date() + timedelta(days=365 * 5):
                    raise ValueError(f"Expiry date too far in future: {expiry_date}")
                validated_row["expiry_date"] = expiry_date
            except ValueError:
                raise ValueError(
                    f"Invalid expiry date format: {row_data['expiry_date']}. Use YYYY-MM-DD"
                )

        # Category validation
        if "category" in row_data:
            category = row_data["category"].strip().lower()
            valid_categories = [
                "fresh_produce",
                "dairy",
                "bakery_fresh",
                "fresh_meat_fish",
                "frozen",
                "canned_jarred",
                "dry_goods",
                "beverages",
                "deli_prepared",
                "spices_condiments",
                "general",
            ]
            if category and category not in valid_categories:
                category = "general"  # Default to general if invalid
            validated_row["category"] = category or "general"

        # Copy other safe fields
        for field in ["brand", "batch_number", "location_code", "supplier"]:
            if row_data.get(field):
                value = row_data[field].strip()
                if len(value) > 100:
                    value = value[:100]
                # Remove special characters
                value = re.sub(r'[<>"\']', "", value)
                validated_row[field] = value

        return validated_row

    async def _validate_business_rules_secure(
        self, row_data: dict[str, Any], store_id: str, row_number: int
    ) -> dict[str, list]:
        """Validate business rules without database queries"""
        errors = []
        warnings = []

        # Price logic validation
        if "cost_price" in row_data and "selling_price" in row_data:
            if row_data["selling_price"] <= row_data["cost_price"]:
                warnings.append(
                    {
                        "row": row_number,
                        "field": "selling_price",
                        "warning": "Selling price should be higher than cost price",
                    }
                )

        # Expiry date validation
        if "expiry_date" in row_data:
            if row_data["expiry_date"] < datetime.now().date():
                warnings.append(
                    {
                        "row": row_number,
                        "field": "expiry_date",
                        "warning": "Product has already expired",
                    }
                )

        # Quantity validation
        if "quantity" in row_data:
            if row_data["quantity"] == 0:
                warnings.append(
                    {
                        "row": row_number,
                        "field": "quantity",
                        "warning": "Zero quantity items may not need tracking",
                    }
                )

        return {"errors": errors, "warnings": warnings}

    async def _generate_ai_suggestions(
        self, valid_rows: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Generate AI suggestions for validated data"""

        if not valid_rows:
            return {"suggestions": [], "insights": {}}

        suggestions = []
        insights = {
            "total_items": len(valid_rows),
            "categories": {},
            "urgency_alerts": [],
            "pricing_insights": [],
        }

        # Category analysis
        for row in valid_rows:
            category = row.get("category", "general")
            if category not in insights["categories"]:
                insights["categories"][category] = 0
            insights["categories"][category] += 1

        # Urgency analysis
        for row in valid_rows:
            if "expiry_date" in row:
                days_to_expiry = (row["expiry_date"] - datetime.now().date()).days
                if days_to_expiry <= 3:
                    insights["urgency_alerts"].append(
                        {
                            "sku": row["sku"],
                            "product_name": row["product_name"],
                            "days_to_expiry": days_to_expiry,
                            "urgency": "critical" if days_to_expiry <= 1 else "high",
                        }
                    )

        # Pricing insights
        margins = []
        for row in valid_rows:
            if "cost_price" in row and "selling_price" in row:
                margin = (
                    (row["selling_price"] - row["cost_price"])
                    / row["selling_price"]
                    * 100
                )
                margins.append(margin)

        if margins:
            insights["pricing_insights"] = {
                "average_margin": sum(margins) / len(margins),
                "low_margin_items": len([m for m in margins if m < 10]),
            }

        # Generate suggestions
        if insights["urgency_alerts"]:
            suggestions.append(
                {
                    "type": "urgent_action",
                    "message": f"Found {len(insights['urgency_alerts'])} items expiring soon",
                    "action": "Consider immediate discounting or removal",
                }
            )

        if insights["pricing_insights"].get("low_margin_items", 0) > 0:
            suggestions.append(
                {
                    "type": "pricing_review",
                    "message": f"Found {insights['pricing_insights']['low_margin_items']} items with low margins",
                    "action": "Review pricing strategy",
                }
            )

        return {"suggestions": suggestions, "insights": insights}

    def generate_secure_csv_template(self) -> str:
        """Generate secure CSV template"""
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
                "dairy",
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
