"""
Unified CSV Processor for LIFO.AI
DEPRECATED: This module has been superseded by the new unified CSV services architecture.

Legacy module - replaced by: app.services.csv.unified_csv_service
The new architecture eliminates duplicate code and provides:
- Better security validation
- Consolidated parsing engine  
- Centralized category mapping
- Unified error handling
- Template generation

For new implementations, use: from app.services.csv import create_unified_csv_service

This file is kept for backward compatibility but will be removed in future versions.
"""

import asyncio
import io
import json
import logging
import re
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any

import chardet
import magic
import pandas as pd

# Import database operations for category resolution
try:
    from sqlalchemy import text

    from app.database.connection import get_db_sync
except ImportError:
    # Fallback for testing or standalone usage
    get_db_sync = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProcessingResult(Enum):
    """Processing result status"""

    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class SecurityViolation(Exception):
    """Raised when security violations are detected"""

    pass


class ValidationError(Exception):
    """Raised when validation fails"""

    pass


class UnifiedCSVProcessor:
    """
    Unified CSV processor that combines security, validation, and advanced processing
    """

    # Security limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_ROWS = 10000
    MAX_CELL_LENGTH = 1000
    MAX_COLUMNS = 50

    # Allowed file types
    ALLOWED_MIME_TYPES = {
        "text/csv",
        "text/plain",
        "application/csv",
        "application/vnd.ms-excel",
    }

    # Required columns
    REQUIRED_COLUMNS = ["sku", "product_name", "category", "quantity", "expiry_date"]

    # Global product workflow columns
    GLOBAL_PRODUCT_COLUMNS = {
        "barcode": None,
        "brand": "Unknown",
        "supplier_code": None,
        "unit_type": "pcs",
    }

    # Optional columns with defaults
    OPTIONAL_COLUMNS = {
        "brand": "Unknown",
        "cost_price": None,
        "selling_price": None,
        "manufacture_date": None,
        "location_code": "MAIN",
        "unit_type": "pcs",
        "batch_number": None,  # Allow CSV to provide batch numbers
    }

    # Security patterns to detect
    FORMULA_PATTERNS = [
        r"^[=@+\-]",  # Formula injection
        r"cmd\s*\(",  # Command injection
        r"system\s*\(",  # System calls
        r"exec\s*\(",  # Execution
        r"eval\s*\(",  # Evaluation
        r"<script",  # XSS
        r"javascript:",  # JavaScript execution
        r"data:",  # Data URIs
        r"vbscript:",  # VBScript
    ]

    # Advanced category mapping (updated for standardized categories)
    CATEGORY_MAPPING = {
        # Fresh produce
        "produce": "fresh_produce",
        "fruits": "fresh_produce",
        "vegetables": "fresh_produce",
        "légumes": "fresh_produce",
        "fruits et légumes": "fresh_produce",
        # Meat and fish
        "meat": "fresh_meat_fish",
        "fish": "fresh_meat_fish",
        "seafood": "fresh_meat_fish",
        "poultry": "fresh_meat_fish",
        "viande": "fresh_meat_fish",
        "poisson": "fresh_meat_fish",
        # Dairy and eggs (updated to standardized category)
        "dairy": "dairy_eggs",
        "milk": "dairy_eggs",
        "cheese": "dairy_eggs",
        "yogurt": "dairy_eggs",
        "eggs": "dairy_eggs",
        "produits laitiers": "dairy_eggs",
        "lait": "dairy_eggs",
        # Bakery
        "bakery": "bakery_fresh",
        "bread": "bakery_fresh",
        "pastry": "bakery_fresh",
        "boulangerie": "bakery_fresh",
        "pain": "bakery_fresh",
        # Frozen (updated to standardized category)
        "frozen": "frozen_foods",
        "frozen foods": "frozen_foods",
        "surgelé": "frozen_foods",
        "congelé": "frozen_foods",
        # Beverages
        "beverages": "beverages",
        "drinks": "beverages",
        "boissons": "beverages",
        # Standardized categories
        "dry_goods": "dry_goods",
        "pantry": "pantry_staples",
        "canned": "canned_jarred",
        "jarred": "canned_jarred",
        "deli": "deli_prepared",
        "prepared": "deli_prepared",
        "chilled": "chilled_packaged",
        "packaged": "chilled_packaged",
        "spices": "spices_condiments",
        "condiments": "spices_condiments",
        "bulk": "bulk_items",
        "specialty": "specialty_items",
        "general": "household_other",
        "other": "household_other",
        "household": "household_other",
    }

    # Shelf life mapping (days) - updated for standardized categories
    SHELF_LIFE_MAPPING = {
        "fresh_produce": 7,
        "fresh_meat_fish": 3,
        "bakery_fresh": 2,
        "dairy_eggs": 14,  # Updated from "dairy"
        "deli_prepared": 3,
        "frozen_foods": 365,  # Updated from "frozen"
        "chilled_packaged": 21,
        "pantry_staples": 730,
        "canned_jarred": 1095,
        "dry_goods": 365,
        "beverages": 180,
        "spices_condiments": 1095,
        "household_other": 180,  # Default for unknown items
        "specialty_items": 90,  # Moderate shelf life
        "bulk_items": 365,  # Long shelf life for bulk items
    }

    def __init__(self, store_id: str, user_id: str, inventory_ops: Any | None = None):
        """
        Initialize processor with store and user context

        Args:
            store_id: Store ID for multi-tenant processing
            user_id: User ID for audit logging
            inventory_ops: InventoryOperations instance for global product workflow
        """
        self.store_id = store_id
        self.user_id = user_id
        self.inventory_ops = inventory_ops
        self.warnings: list[str] = []
        self.errors: list[str] = []
        self.processed_count = 0
        self._category_cache: dict[str, str] = {}  # category_code -> category_id cache

    async def process_csv_file(
        self, file_path: str, file_content: bytes | None = None
    ) -> dict[str, Any]:
        """
        Main entry point for CSV processing

        Args:
            file_path: Path to CSV file or filename
            file_content: Raw file content (for uploaded files)

        Returns:
            Processing result with data, warnings, and errors
        """
        try:
            # Security validation
            await self._validate_file_security(file_path, file_content)

            # Load and parse CSV
            df = await self._load_csv(file_path, file_content)

            # Validate structure
            await self._validate_csv_structure(df)

            # Process and validate data
            processed_data = await self._process_data(df)

            # Generate batch numbers
            processed_data = await self._generate_batch_numbers(processed_data)

            # Process with global products if inventory operations available
            if self.inventory_ops:
                processed_data = await self._process_with_global_products(
                    processed_data
                )

            # Final validation
            await self._final_validation(processed_data)

            result = {
                "status": ProcessingResult.SUCCESS.value,
                "data": processed_data,
                "processed_count": self.processed_count,
                "warnings": self.warnings,
                "errors": self.errors,
                "metadata": {
                    "store_id": self.store_id,
                    "processed_at": datetime.utcnow().isoformat(),
                    "processed_by": self.user_id,
                },
            }

            logger.info(
                f"CSV processing completed successfully. Processed {self.processed_count} items."
            )
            return result

        except SecurityViolation as e:
            logger.error(f"Security violation during CSV processing: {e}")
            return self._error_result(f"Security violation: {e}")

        except ValidationError as e:
            logger.error(f"Validation error during CSV processing: {e}")
            return self._error_result(f"Validation error: {e}")

        except Exception as e:
            logger.error(f"Unexpected error during CSV processing: {e}")
            return self._error_result(f"Processing failed: {e}")

    async def _validate_file_security(
        self, file_path: str, file_content: bytes | None = None
    ) -> None:
        """Comprehensive security validation"""

        if file_content:
            # File size check
            if len(file_content) > self.MAX_FILE_SIZE:
                raise SecurityViolation(
                    f"File size exceeds maximum allowed size of {self.MAX_FILE_SIZE} bytes"
                )

            # MIME type detection
            mime_type = magic.from_buffer(file_content, mime=True)
            if mime_type not in self.ALLOWED_MIME_TYPES:
                raise SecurityViolation(
                    f"File type '{mime_type}' not allowed. Allowed types: {self.ALLOWED_MIME_TYPES}"
                )

            # Encoding detection and validation
            encoding_result = chardet.detect(file_content)
            if encoding_result["confidence"] < 0.7:
                raise SecurityViolation(
                    "File encoding is uncertain or potentially malicious"
                )

        # Filename validation
        if file_path:
            # Extract just the filename for security validation
            import os

            filename = os.path.basename(file_path)

            # Check for path traversal in the filename only
            if ".." in filename:
                raise SecurityViolation("Path traversal detected in filename")

            # Check file extension
            if not file_path.lower().endswith(".csv"):
                raise SecurityViolation("Only CSV files are allowed")

    async def _load_csv(
        self, file_path: str, file_content: bytes | None = None
    ) -> pd.DataFrame:
        """Load CSV with security checks"""

        try:
            if file_content:
                # Load from bytes
                df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
            else:
                # Load from file path
                df = pd.read_csv(file_path, encoding="utf-8")

            # Security checks on loaded data
            if len(df) > self.MAX_ROWS:
                raise SecurityViolation(
                    f"CSV contains {len(df)} rows, maximum allowed is {self.MAX_ROWS}"
                )

            if len(df.columns) > self.MAX_COLUMNS:
                raise SecurityViolation(
                    f"CSV contains {len(df.columns)} columns, maximum allowed is {self.MAX_COLUMNS}"
                )

            # OPTIMIZED: Bulk security validation using vectorized operations
            self._validate_security_bulk(df)

            return df

        except pd.errors.EmptyDataError as e:
            raise ValidationError("CSV file is empty") from e
        except pd.errors.ParserError as e:
            raise ValidationError(f"CSV parsing failed: {e}") from e
        except UnicodeDecodeError as e:
            raise ValidationError("File encoding is not valid UTF-8") from e

    async def _validate_csv_structure(self, df: pd.DataFrame):
        """Validate CSV structure and required columns"""

        # Normalize column names (lowercase, replace spaces/special chars with underscore)
        df.columns = [self._normalize_column_name(col) for col in df.columns]

        # Check required columns
        missing_columns = set(self.REQUIRED_COLUMNS) - set(df.columns)
        if missing_columns:
            raise ValidationError(f"Missing required columns: {missing_columns}")

        # Check for completely empty rows
        empty_rows = df.isnull().all(axis=1).sum()
        if empty_rows > 0:
            self.warnings.append(
                f"Found {empty_rows} completely empty rows, they will be skipped"
            )

    def _normalize_column_name(self, col_name: str) -> str:
        """Normalize column names to lowercase with underscores"""
        # Convert to lowercase and replace spaces/special chars with underscore
        normalized = re.sub(r"[^a-zA-Z0-9]", "_", str(col_name).lower())

        # Common column mappings
        mappings = {
            "product_name": "product_name",
            "productname": "product_name",
            "name": "product_name",
            "cost_price": "cost_price",
            "costprice": "cost_price",
            "selling_price": "selling_price",
            "sellingprice": "selling_price",
            "price": "selling_price",
            "expiry_date": "expiry_date",
            "expirydate": "expiry_date",
            "expiry": "expiry_date",
            "manufacture_date": "manufacture_date",
            "manufacturedate": "manufacture_date",
            "mfg_date": "manufacture_date",
        }

        return mappings.get(normalized, normalized)

    def _validate_security_bulk(self, df: pd.DataFrame):
        """
        OPTIMIZED: Bulk security validation using vectorized pandas operations
        Replaces individual cell checking with bulk pattern matching
        """
        # Combine all security patterns into single regex for efficiency
        combined_pattern = '|'.join(self.FORMULA_PATTERNS)

        # Check for oversized content efficiently
        for col in df.columns:
            if df[col].dtype == 'object':  # String columns only
                # Check cell length limits using vectorized operations
                too_long = df[col].str.len() > self.MAX_CELL_LENGTH
                if too_long.any():
                    long_indices = df[too_long].index
                    first_long_row = int(long_indices[0]) + 1
                    raise SecurityViolation(
                        f"Cell content exceeds maximum length at row {first_long_row}, column '{col}'"
                    )

                # Vectorized security pattern check
                dangerous_content = df[col].str.contains(combined_pattern, case=False, na=False, regex=True)
                if dangerous_content.any():
                    dangerous_indices = df[dangerous_content].index
                    first_dangerous_row = int(dangerous_indices[0]) + 1
                    raise SecurityViolation(
                        f"Potentially dangerous content detected at row {first_dangerous_row}, column '{col}'"
                    )

    async def _process_data(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Process and validate each row of data"""

        processed_rows = []

        for idx, row in df.iterrows():
            try:
                # Skip completely empty rows
                if row.isnull().all():
                    continue

                row_num = int(idx) + 1 if isinstance(idx, int | str) else 1
                processed_row = await self._process_single_row(row, row_num)
                if processed_row:
                    processed_rows.append(processed_row)
                    self.processed_count += 1

            except Exception as e:
                row_num = int(idx) + 1 if isinstance(idx, int | str) else 1
                self.errors.append(f"Row {row_num}: {e}")
                continue

        if not processed_rows:
            raise ValidationError("No valid rows found in CSV")

        return processed_rows

    async def _process_with_global_products(
        self, processed_data: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Process data using global products workflow"""
        if not self.inventory_ops:
            return processed_data

        enhanced_data = []

        for item in processed_data:
            try:
                # Find or create global product
                global_product = None

                # Try to find by barcode first
                if item.get("barcode"):
                    global_product = (
                        await self.inventory_ops.findGlobalProductByBarcode(
                            item["barcode"]
                        )
                    )

                # If not found by barcode, search by name
                if not global_product and item.get("product_name"):
                    search_results = await self.inventory_ops.searchGlobalProducts(
                        item["product_name"], self.store_id, 1
                    )
                    if search_results:
                        global_product = search_results[0]

                # Create new global product if not found
                if not global_product:
                    global_product = await self.inventory_ops.createGlobalProduct(
                        {
                            "name": item["product_name"],
                            "brand": item.get("brand", "Unknown"),
                            "barcode": item.get("barcode"),
                            "category_id": item["category_id"],  # Use resolved UUID
                            "typical_shelf_life_days": self.SHELF_LIFE_MAPPING.get(
                                item["category_code"], 30
                            ),
                            "unit_type": item.get("unit_type", "pcs"),
                            "created_by": self.user_id,
                        }
                    )

                # Check if product is in store catalog
                try:
                    await self.inventory_ops.addProductToStore(
                        self.store_id,
                        global_product["product_id"],
                        {
                            "default_cost_price": item.get("cost_price", 0),
                            "default_selling_price": item.get("selling_price", 0),
                            "store_specific_sku": item["sku"],
                            "supplier_code": item.get("supplier_code"),
                        },
                        self.user_id,
                    )
                except Exception as e:
                    # Product might already be in store catalog
                    if "duplicate" not in str(e).lower():
                        self.warnings.append(f"Failed to add product to store: {e}")

                # Create batch with global product reference
                await self.inventory_ops.createBatchWithGlobalProduct(
                    {
                        "global_product_id": global_product["product_id"],
                        "store_id": self.store_id,
                        "batch_number": item["batch_number"],
                        "expiry_date": item["expiry_date"],
                        "manufacture_date": item.get("manufacture_date"),
                        "initial_quantity": item["quantity"],
                        "current_quantity": item["quantity"],
                        "cost_price": item.get("cost_price"),
                        "selling_price": item.get("selling_price"),
                        "location_code": item.get("location_code", "MAIN"),
                        "batch_source": "csv_import",
                        "barcode_scanned": item.get("barcode"),
                        "created_by": self.user_id,
                    }
                )

                # Add global product info to item
                item["global_product_id"] = global_product["product_id"]
                item["verification_status"] = "verified"
                enhanced_data.append(item)

            except Exception as e:
                self.errors.append(
                    f"Global product processing failed for {item.get('sku', 'unknown')}: {e}"
                )
                enhanced_data.append(item)  # Keep original item

        return enhanced_data

    async def _process_single_row(
        self, row: pd.Series, row_num: int
    ) -> dict[str, Any] | None:
        """Process a single CSV row with comprehensive validation"""

        processed: dict[str, Any] = {}

        # Required fields
        processed["sku"] = self._validate_sku(row.get("sku"), row_num)
        processed["product_name"] = self._validate_product_name(
            row.get("product_name"), row_num
        )
        # Resolve category to UUID and store category_code for shelf life calculations
        category_raw = row.get("category")
        category_code = self._get_category_code_for_shelf_life(category_raw)
        processed["category_id"] = await self._resolve_category_to_uuid(
            category_raw, row_num
        )
        processed["category_code"] = category_code  # Store for shelf life calculations
        processed["quantity"] = self._validate_quantity(row.get("quantity"), row_num)
        processed["expiry_date"] = self._validate_expiry_date(
            row.get("expiry_date"), row_num
        )

        # Optional fields with defaults
        for field, default in self.OPTIONAL_COLUMNS.items():
            if field in row and pd.notna(row[field]):
                if field in ["cost_price", "selling_price"]:
                    price_val = self._validate_price(row[field], field, row_num)
                    if price_val is not None:
                        processed[field] = price_val
                elif field == "manufacture_date":
                    mfg_date = self._validate_manufacture_date(
                        row[field], processed["expiry_date"], row_num
                    )
                    if mfg_date is not None:
                        processed[field] = mfg_date
                else:
                    processed[field] = str(row[field]).strip()
            else:
                processed[field] = default if default is not None else ""

        # Global product workflow fields
        for field, default in self.GLOBAL_PRODUCT_COLUMNS.items():
            if field in row and pd.notna(row[field]):
                processed[field] = str(row[field]).strip()
            else:
                processed[field] = default if default is not None else ""

        # Estimate manufacture date if not provided
        if not processed.get("manufacture_date"):
            processed["manufacture_date"] = self._estimate_manufacture_date(
                processed["expiry_date"], processed["category_code"]
            )

        # Add metadata
        processed["store_id"] = self.store_id
        processed["created_by"] = self.user_id
        processed["status"] = "active"

        return processed

    def _validate_sku(self, sku: Any, row_num: int) -> str:
        """Validate SKU field"""
        if pd.isna(sku):
            raise ValidationError("SKU is required")

        sku_str = str(sku).strip()
        if not sku_str:
            raise ValidationError("SKU cannot be empty")

        # Check for reasonable SKU format
        if len(sku_str) > 100:
            raise ValidationError("SKU too long (max 100 characters)")

        # Basic security check
        for pattern in self.FORMULA_PATTERNS:
            if re.search(pattern, sku_str, re.IGNORECASE):
                raise ValidationError("Invalid characters in SKU")

        return sku_str

    def _validate_product_name(self, name: Any, row_num: int) -> str:
        """Validate product name field"""
        if pd.isna(name):
            raise ValidationError("Product name is required")

        name_str = str(name).strip()
        if not name_str:
            raise ValidationError("Product name cannot be empty")

        if len(name_str) > 255:
            raise ValidationError("Product name too long (max 255 characters)")

        return name_str

    async def _resolve_category_to_uuid(self, category: Any, row_num: int) -> str:
        """Resolve category string to category UUID from database"""
        if pd.isna(category):
            self.warnings.append(
                f"Row {row_num}: No category provided, using 'dry_goods'"
            )
            return await self._get_category_uuid("dry_goods")

        category_str = str(category).lower().strip()

        # First, try to map CSV category to standard category code
        category_code = None
        for key, value in self.CATEGORY_MAPPING.items():
            if key in category_str or category_str in key:
                category_code = value
                break

        # If no mapping found, default to dry_goods
        if not category_code:
            self.warnings.append(
                f"Row {row_num}: Unknown category '{category}', using 'dry_goods'"
            )
            category_code = "dry_goods"

        # Resolve category code to UUID
        return await self._get_category_uuid(category_code)

    async def _get_category_uuid(self, category_code: str) -> str:
        """Get category UUID from database by category code"""
        # Check cache first
        if category_code in self._category_cache:
            return self._category_cache[category_code]

        try:
            if get_db_sync is None:
                # Fallback: return category_code if no database access
                logger.warning(
                    f"No database access available, using category_code: {category_code}"
                )
                return category_code

            # Get database connection
            db_connection = get_db_sync()
            if db_connection is None:
                # Fallback: return category_code if no database access (pgbouncer compatibility)
                logger.debug(
                    f"Database access disabled for pgbouncer compatibility, using category_code: {category_code}"
                )
                return category_code

            # Query database for category UUID
            with db_connection as db:
                result = db.execute(
                    text(
                        "SELECT category_id FROM inventory.categories WHERE category_code = :code LIMIT 1"
                    ),
                    {"code": category_code},
                ).fetchone()

                if result:
                    category_uuid = str(result[0])
                    self._category_cache[category_code] = category_uuid
                    return category_uuid
                else:
                    # Fallback to dry_goods if category not found
                    logger.warning(
                        f"Category code '{category_code}' not found in database, falling back to dry_goods"
                    )
                    fallback_result = db.execute(
                        text(
                            "SELECT category_id FROM inventory.categories WHERE category_code = 'dry_goods' LIMIT 1"
                        )
                    ).fetchone()

                    if fallback_result:
                        fallback_uuid = str(fallback_result[0])
                        self._category_cache["dry_goods"] = fallback_uuid
                        return fallback_uuid
                    else:
                        # Ultimate fallback: return the category_code
                        logger.error(
                            "No categories found in database, using category_code as fallback"
                        )
                        return category_code

        except Exception as e:
            logger.error(f"Error resolving category '{category_code}': {e}")
            # Fallback: return category_code if database query fails
            return category_code

    def _validate_quantity(self, quantity: Any, row_num: int) -> float:
        """Validate quantity field"""
        if pd.isna(quantity):
            raise ValidationError("Quantity is required")

        try:
            qty = float(quantity)
            if qty < 0:
                raise ValidationError("Quantity cannot be negative")
            if qty > 1000000:
                raise ValidationError("Quantity seems unreasonably large")
            return qty
        except (ValueError, TypeError) as e:
            raise ValidationError(f"Invalid quantity format: {quantity}") from e

    def _validate_expiry_date(self, expiry: Any, row_num: int) -> str:
        """Validate and normalize expiry date"""
        if pd.isna(expiry):
            raise ValidationError("Expiry date is required")

        # Try to parse various date formats
        date_formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"]

        expiry_str = str(expiry).strip()

        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(expiry_str, fmt).date()

                # Validate date is reasonable (not too far in past/future)
                today = date.today()
                if parsed_date < today - timedelta(days=30):
                    self.warnings.append(f"Row {row_num}: Expiry date is in the past")
                elif parsed_date > today + timedelta(days=3650):  # 10 years
                    self.warnings.append(
                        f"Row {row_num}: Expiry date is very far in future"
                    )

                return parsed_date.isoformat()

            except ValueError:
                continue

        raise ValidationError(f"Invalid date format: {expiry}")

    def _validate_price(
        self, price: Any, field_name: str, row_num: int
    ) -> float | None:
        """Validate price fields"""
        if pd.isna(price) or price == "":
            return None

        try:
            # Handle currency symbols
            price_str = (
                str(price).replace("$", "").replace("€", "").replace(",", "").strip()
            )
            price_val = float(price_str)

            if price_val < 0:
                raise ValidationError(f"{field_name} cannot be negative")
            if price_val > 10000:
                self.warnings.append(
                    f"Row {row_num}: {field_name} seems very high: {price_val}"
                )

            return price_val

        except (ValueError, TypeError) as e:
            raise ValidationError(f"Invalid {field_name} format: {price}") from e

    def _validate_manufacture_date(
        self, mfg_date: Any, expiry_date: str, row_num: int
    ) -> str | None:
        """Validate manufacture date"""
        if pd.isna(mfg_date):
            return None

        # Parse manufacture date
        date_formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"]
        mfg_str = str(mfg_date).strip()

        for fmt in date_formats:
            try:
                mfg_parsed = datetime.strptime(mfg_str, fmt).date()
                expiry_parsed = datetime.fromisoformat(expiry_date).date()

                # Validate manufacture date is before expiry
                if mfg_parsed >= expiry_parsed:
                    self.warnings.append(
                        f"Row {row_num}: Manufacture date is after expiry date"
                    )

                return mfg_parsed.isoformat()

            except ValueError:
                continue

        self.warnings.append(
            f"Row {row_num}: Invalid manufacture date format, will estimate"
        )
        return None

    def _estimate_manufacture_date(self, expiry_date: str, category: str) -> str:
        """Estimate manufacture date based on category shelf life"""
        expiry = datetime.fromisoformat(expiry_date).date()
        shelf_life_days = self.SHELF_LIFE_MAPPING.get(category, 30)  # Default 30 days

        estimated_mfg = expiry - timedelta(days=shelf_life_days)
        return estimated_mfg.isoformat()

    async def _generate_batch_numbers(
        self, processed_data: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Generate unique batch numbers for items that don't already have them"""

        for idx, item in enumerate(processed_data):
            # Only generate batch number if not already provided in CSV
            existing_batch_number = item.get("batch_number", "").strip()

            # Debug logging
            logger.info(f"UnifiedCSVProcessor batch number check: idx={idx}, sku={item.get('sku', 'unknown')}, existing_batch_number='{existing_batch_number}'")

            if not existing_batch_number:
                # Generate batch number: STORE_SKU_YYYYMMDD_SEQUENCE
                date_str = datetime.now().strftime("%Y%m%d")
                sequence = f"{int(idx) + 1:03d}"

                batch_number = (
                    f"{self.store_id[:8]}_{item['sku'][:10]}_{date_str}_{sequence}"
                )
                item["batch_number"] = batch_number
                logger.info(f"Generated batch number: {batch_number}")
            else:
                logger.info(f"Keeping CSV-provided batch number: {existing_batch_number}")
                # If batch_number exists, keep the CSV-provided value

        return processed_data

    async def _final_validation(self, processed_data: list[dict[str, Any]]):
        """Final validation checks on processed data"""

        # Check for duplicate SKUs
        skus = [item["sku"] for item in processed_data]
        duplicate_skus = {sku for sku in skus if skus.count(sku) > 1}

        if duplicate_skus:
            self.warnings.append(f"Duplicate SKUs found: {duplicate_skus}")

        # Business rule validations
        for item in processed_data:
            # Check margin if both prices provided
            if item.get("cost_price") and item.get("selling_price"):
                if item["cost_price"] > item["selling_price"]:
                    self.warnings.append(
                        f"SKU {item['sku']}: Cost price higher than selling price"
                    )

    def _error_result(self, error_message: str) -> dict[str, Any]:
        """Create error result"""
        return {
            "status": ProcessingResult.ERROR.value,
            "data": [],
            "processed_count": 0,
            "warnings": self.warnings,
            "errors": [error_message] + self.errors,
            "metadata": {
                "store_id": self.store_id,
                "processed_at": datetime.utcnow().isoformat(),
                "processed_by": self.user_id,
            },
        }

    def _get_category_code_for_shelf_life(self, category: Any) -> str:
        """Get category code for shelf life calculations (without database lookup)"""
        if pd.isna(category):
            return "dry_goods"

        category_str = str(category).lower().strip()

        # Map CSV category to standard category code
        for key, value in self.CATEGORY_MAPPING.items():
            if key in category_str or category_str in key:
                return value

        # Default fallback
        return "dry_goods"


# CLI interface for standalone usage
async def main():
    """Command line interface"""
    import argparse

    parser = argparse.ArgumentParser(description="Unified CSV Processor for LIFO.AI")
    parser.add_argument("file_path", help="Path to CSV file")
    parser.add_argument("--store-id", required=True, help="Store ID")
    parser.add_argument("--user-id", required=True, help="User ID")
    parser.add_argument("--output", help="Output JSON file")

    args = parser.parse_args()

    processor = UnifiedCSVProcessor(args.store_id, args.user_id)
    result = await processor.process_csv_file(args.file_path)

    output = json.dumps(result, indent=2, default=str)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Results written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    asyncio.run(main())
