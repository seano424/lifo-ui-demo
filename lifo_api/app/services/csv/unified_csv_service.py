"""
Unified CSV Service
Main service that integrates all consolidated CSV processing components
Replaces all duplicate CSV processing implementations
"""

import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd
import structlog
from fastapi import HTTPException, UploadFile

from .category_mapper import get_category_mapper
from .error_handler import ErrorType, create_new_error_handler
from .parsing_engine import get_csv_parsing_engine
from .security_validator import get_csv_security_validator
from .template_generator import get_csv_template_generator

logger = structlog.get_logger()


class UnifiedCSVService:
    """
    Unified CSV processing service that consolidates all CSV functionality
    Eliminates 200-300 lines of duplicate code across modules
    """

    def __init__(self, store_id: str, user_id: str):
        self.store_id = store_id
        self.user_id = user_id
        self.logger = logger.bind(
            component="unified_csv_service",
            store_id=store_id,
            user_id=user_id
        )
        
        # Initialize consolidated services
        self.security_validator = get_csv_security_validator()
        self.parsing_engine = get_csv_parsing_engine()
        self.category_mapper = get_category_mapper()
        self.template_generator = get_csv_template_generator()
        
        # Create isolated error handler for this processing session
        self.error_handler = create_new_error_handler()

    async def process_csv_upload(
        self,
        file: UploadFile,
        processing_mode: str = "validation_only",
        chunk_size: int = 50
    ) -> Dict[str, Any]:
        """
        Main CSV processing endpoint - replaces all duplicate processing logic
        
        Args:
            file: Uploaded CSV file
            processing_mode: "validation_only", "import", or "import_with_ai"
            chunk_size: Size of processing chunks for large files
            
        Returns:
            Unified processing response
        """
        processing_id = f"csv_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        try:
            self.logger.info(
                "Starting unified CSV processing",
                processing_id=processing_id,
                filename=file.filename,
                mode=processing_mode
            )
            
            # Step 1: Security validation (consolidated from all modules)
            await self.security_validator.validate_file_security(file=file)
            
            # Step 2: Parse CSV content (unified parsing logic)
            content = await file.read()
            await file.seek(0)  # Reset for potential reuse
            
            parsed_data = await self.parsing_engine.parse_csv_content(content=content)
            self.error_handler.update_stats(total_rows=parsed_data["total_rows"])
            
            # Step 3: Convert to DataFrame for easier processing
            df = self.parsing_engine.convert_to_dataframe(parsed_data)
            
            # Step 4: Validate structure and required fields
            validation_result = await self._validate_csv_structure(df)
            
            if not validation_result["is_valid"]:
                return self.error_handler.create_error_response(
                    message="CSV validation failed",
                    processing_id=processing_id,
                    metadata={"filename": file.filename, "mode": processing_mode}
                )
            
            # Step 5: Process data based on mode
            if processing_mode == "validation_only":
                processed_data = await self._validate_data_only(df)
            elif processing_mode == "import":
                processed_data = await self._process_for_import(df)
            elif processing_mode == "import_with_ai":
                processed_data = await self._process_with_ai_features(df)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid processing mode: {processing_mode}"
                )
            
            # Step 6: Generate response
            return self.error_handler.create_success_response(
                data=processed_data,
                processing_id=processing_id,
                metadata={
                    "filename": file.filename,
                    "mode": processing_mode,
                    "store_id": self.store_id,
                    "processed_by": self.user_id
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(
                "Unified CSV processing failed",
                processing_id=processing_id,
                error=str(e)
            )
            return self.error_handler.create_error_response(
                message=f"Processing failed: {str(e)}",
                status_code=500,
                processing_id=processing_id,
                metadata={"filename": file.filename}
            )

    async def _validate_csv_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate CSV structure with consolidated validation logic"""
        
        # Required columns check (consolidated from all modules)
        required_columns = ["sku", "product_name", "category", "quantity", "expiry_date"]
        missing_columns = set(required_columns) - set(df.columns)
        
        if missing_columns:
            for col in missing_columns:
                self.error_handler.add_validation_error(
                    field="structure",
                    value=f"missing_column_{col}",
                    message=f"Required column '{col}' is missing",
                    suggestion=f"Add column '{col}' to your CSV file"
                )
        
        # Check for completely empty rows
        empty_rows = df.isnull().all(axis=1).sum()
        if empty_rows > 0:
            self.error_handler.add_business_warning(
                message=f"Found {empty_rows} completely empty rows",
                suggestion="Remove empty rows to improve processing speed"
            )
        
        # Check data types and basic validation
        await self._validate_basic_data_types(df)
        
        return {
            "is_valid": not self.error_handler.has_errors(),
            "missing_columns": list(missing_columns),
            "empty_rows": empty_rows,
            "total_columns": len(df.columns)
        }

    async def _validate_basic_data_types(self, df: pd.DataFrame) -> None:
        """Validate basic data types for key columns"""
        
        for idx, row in df.iterrows():
            row_number = int(idx) + 2  # +2 for header and 0-based index
            
            # SKU validation (consolidated from all modules)
            if "sku" in df.columns:
                sku = row.get("sku")
                if pd.isna(sku) or not str(sku).strip():
                    self.error_handler.add_validation_error(
                        field="sku",
                        value=sku,
                        message="SKU cannot be empty",
                        row_number=row_number,
                        suggestion="Provide a unique SKU for each product"
                    )
                elif len(str(sku).strip()) > 100:
                    self.error_handler.add_validation_error(
                        field="sku",
                        value=sku,
                        message="SKU too long (max 100 characters)",
                        row_number=row_number
                    )
            
            # Product name validation
            if "product_name" in df.columns:
                name = row.get("product_name")
                if pd.isna(name) or not str(name).strip():
                    self.error_handler.add_validation_error(
                        field="product_name",
                        value=name,
                        message="Product name cannot be empty",
                        row_number=row_number
                    )
                elif len(str(name).strip()) > 255:
                    self.error_handler.add_validation_error(
                        field="product_name",
                        value=name,
                        message="Product name too long (max 255 characters)",
                        row_number=row_number
                    )
            
            # Quantity validation (consolidated numeric validation)
            if "quantity" in df.columns:
                quantity = self.parsing_engine.parse_numeric_field(
                    row.get("quantity"), 
                    "quantity",
                    allow_negative=False,
                    max_value=1000000
                )
                if quantity is None and not pd.isna(row.get("quantity")):
                    self.error_handler.add_validation_error(
                        field="quantity",
                        value=row.get("quantity"),
                        message="Invalid quantity format",
                        row_number=row_number,
                        suggestion="Use numeric values only (e.g., 10, 25.5)"
                    )
            
            # Date validation (consolidated date parsing)
            if "expiry_date" in df.columns:
                expiry_date = self.parsing_engine.parse_date_field(
                    row.get("expiry_date"),
                    "expiry_date"
                )
                if expiry_date is None and not pd.isna(row.get("expiry_date")):
                    self.error_handler.add_validation_error(
                        field="expiry_date",
                        value=row.get("expiry_date"),
                        message="Invalid date format",
                        row_number=row_number,
                        suggestion="Use YYYY-MM-DD format (e.g., 2024-12-25)"
                    )
                elif expiry_date and expiry_date < date.today() - timedelta(days=30):
                    self.error_handler.add_business_warning(
                        message="Expiry date is more than 30 days in the past",
                        row_number=row_number,
                        column="expiry_date"
                    )
            
            # Price validation (consolidated from all modules)
            for price_field in ["cost_price", "selling_price"]:
                if price_field in df.columns:
                    price = self.parsing_engine.parse_numeric_field(
                        row.get(price_field),
                        price_field,
                        allow_negative=False,
                        max_value=10000
                    )
                    if price is None and not pd.isna(row.get(price_field)) and str(row.get(price_field)).strip():
                        self.error_handler.add_validation_error(
                            field=price_field,
                            value=row.get(price_field),
                            message=f"Invalid {price_field} format",
                            row_number=row_number,
                            suggestion="Use numeric values only (e.g., 10.50)"
                        )

    async def _validate_data_only(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process CSV for validation only - no imports"""
        
        validated_rows = []
        
        for idx, row in df.iterrows():
            row_number = int(idx) + 2
            
            try:
                # Process single row with consolidated validation
                processed_row = await self._process_single_row(row, row_number)
                if processed_row:
                    validated_rows.append(processed_row)
                    self.error_handler.processing_stats["processed_rows"] += 1
                else:
                    self.error_handler.processing_stats["skipped_rows"] += 1
            except Exception as e:
                self.error_handler.add_error(
                    message=str(e),
                    error_type=ErrorType.VALIDATION,
                    row_number=row_number
                )
        
        # Generate insights for validation results
        insights = await self._generate_validation_insights(validated_rows)
        
        return {
            "validation_mode": True,
            "validated_rows": validated_rows,
            "insights": insights,
            "ready_for_import": not self.error_handler.has_errors()
        }

    async def _process_for_import(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process CSV for actual import"""
        
        processed_rows = []
        
        for idx, row in df.iterrows():
            row_number = int(idx) + 2
            
            try:
                processed_row = await self._process_single_row(row, row_number)
                if processed_row:
                    # Add import-specific fields
                    processed_row.update({
                        "store_id": self.store_id,
                        "created_by": self.user_id,
                        "import_timestamp": datetime.utcnow().isoformat(),
                        "status": "ready_for_batch_creation"
                    })
                    processed_rows.append(processed_row)
                    self.error_handler.processing_stats["processed_rows"] += 1
            except Exception as e:
                self.error_handler.add_error(
                    message=str(e),
                    error_type=ErrorType.SYSTEM,
                    row_number=row_number
                )
        
        return {
            "import_mode": True,
            "processed_data": processed_rows,
            "batch_requests": await self._convert_to_batch_requests(processed_rows)
        }

    async def _process_with_ai_features(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process CSV with AI suggestions and enhancements"""
        
        # First do standard processing
        import_result = await self._process_for_import(df)
        
        # Add AI features
        ai_suggestions = await self._generate_ai_suggestions(import_result["processed_data"])
        category_suggestions = await self._generate_category_suggestions(df)
        optimization_tips = await self._generate_optimization_tips(import_result["processed_data"])
        
        import_result.update({
            "ai_features": True,
            "ai_suggestions": ai_suggestions,
            "category_suggestions": category_suggestions,
            "optimization_tips": optimization_tips
        })
        
        return import_result

    async def _process_single_row(self, row: pd.Series, row_number: int) -> Optional[Dict[str, Any]]:
        """Process a single CSV row with consolidated validation logic"""
        
        # Skip completely empty rows
        if row.isnull().all():
            return None
        
        processed = {}
        
        # Required fields processing
        processed["sku"] = str(row.get("sku", "")).strip().upper()
        processed["product_name"] = str(row.get("product_name", "")).strip()
        
        # Category processing (consolidated category mapping)
        raw_category = row.get("category", "")
        category_code = self.category_mapper.map_category(raw_category)
        processed["category_code"] = category_code
        processed["category_id"] = await self.category_mapper.resolve_category_uuid(category_code)
        
        # Numeric fields
        processed["quantity"] = self.parsing_engine.parse_numeric_field(
            row.get("quantity"), "quantity", allow_negative=False
        ) or 0
        
        # Date fields (consolidated date parsing)
        processed["expiry_date"] = self.parsing_engine.parse_date_field(
            row.get("expiry_date"), "expiry_date"
        )
        
        processed["manufacture_date"] = self.parsing_engine.parse_date_field(
            row.get("manufacture_date"), "manufacture_date"
        )
        
        # If no manufacture date, estimate based on category shelf life
        if not processed["manufacture_date"] and processed["expiry_date"]:
            shelf_life = self.category_mapper.get_shelf_life_days(category_code)
            estimated_mfg = processed["expiry_date"] - timedelta(days=shelf_life)
            processed["manufacture_date"] = estimated_mfg
        
        # Price fields
        processed["cost_price"] = self.parsing_engine.parse_numeric_field(
            row.get("cost_price"), "cost_price", allow_negative=False
        )
        processed["selling_price"] = self.parsing_engine.parse_numeric_field(
            row.get("selling_price"), "selling_price", allow_negative=False
        )
        
        # Optional fields
        processed["brand"] = str(row.get("brand", "")).strip() or None
        processed["batch_number"] = str(row.get("batch_number", "")).strip() or None
        processed["location_code"] = str(row.get("location_code", "MAIN")).strip()
        processed["supplier"] = str(row.get("supplier", "")).strip() or None
        processed["unit_type"] = str(row.get("unit_type", "pcs")).strip()
        processed["description"] = str(row.get("description", "")).strip() or None
        
        # Business logic validation (consolidated from all modules)
        await self._validate_business_rules(processed, row_number)
        
        return processed

    async def _validate_business_rules(self, data: Dict[str, Any], row_number: int) -> None:
        """Consolidated business rule validation from all modules"""
        
        # Price logic validation
        if data.get("cost_price") and data.get("selling_price"):
            if data["cost_price"] >= data["selling_price"]:
                self.error_handler.add_business_warning(
                    message="Cost price is higher than or equal to selling price",
                    row_number=row_number,
                    column="selling_price",
                    suggestion="Review pricing to ensure profitability"
                )
        
        # Date logic validation
        if data.get("manufacture_date") and data.get("expiry_date"):
            if data["manufacture_date"] >= data["expiry_date"]:
                self.error_handler.add_validation_error(
                    field="manufacture_date",
                    value=data["manufacture_date"],
                    message="Manufacture date cannot be after expiry date",
                    row_number=row_number
                )
        
        # Quantity validation
        if data.get("quantity", 0) == 0:
            self.error_handler.add_business_warning(
                message="Zero quantity items may not need inventory tracking",
                row_number=row_number,
                column="quantity"
            )

    async def _convert_to_batch_requests(self, processed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert processed data to batch creation requests"""
        
        batch_requests = []
        
        for item in processed_data:
            # Generate batch number if not provided
            if not item.get("batch_number"):
                item["batch_number"] = self._generate_batch_number(item["sku"], item.get("expiry_date"))
            
            batch_request = {
                "barcode": self._generate_barcode_from_sku(item["sku"]),
                "product_name": item["product_name"],
                "brand": item.get("brand"),
                "category": item["category_code"],
                "quantity": item["quantity"],
                "expiry_date": item["expiry_date"].isoformat() if item["expiry_date"] else None,
                "batch_number": item["batch_number"],
                "cost_price": item.get("cost_price"),
                "selling_price": item.get("selling_price"),
                "scan_confidence": 1.0,  # CSV data is 100% confident
                "ocr_extracted_date": None,
                "ocr_confidence": None,
                "openfoodfacts_data": None
            }
            
            batch_requests.append(batch_request)
        
        return batch_requests

    def _generate_batch_number(self, sku: str, expiry_date: Optional[date]) -> str:
        """Generate batch number (consolidated from csv_to_batch_adapter)"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        
        if expiry_date:
            try:
                if isinstance(expiry_date, str):
                    exp_date = datetime.fromisoformat(expiry_date).strftime("%m%d")
                else:
                    exp_date = expiry_date.strftime("%m%d")
                return f"{sku}-{timestamp}-{exp_date}"
            except (ValueError, AttributeError):
                pass
        
        return f"{sku}-{timestamp}-{uuid.uuid4().hex[:4]}"

    def _generate_barcode_from_sku(self, sku: str) -> str:
        """Generate barcode from SKU (consolidated from csv_to_batch_adapter)"""
        import hashlib
        
        clean_sku = sku.strip().upper()
        
        # If SKU looks like a barcode, use it
        if len(clean_sku) >= 8 and clean_sku.replace("-", "").replace("_", "").isalnum():
            return clean_sku[:13]
        
        # Generate barcode from hash
        hash_object = hashlib.sha256(clean_sku.encode())
        hash_hex = hash_object.hexdigest()
        numeric_part = "".join(c for c in hash_hex if c.isdigit())[:12]
        
        # Pad with zeros if needed
        while len(numeric_part) < 12:
            numeric_part += "0"
        
        # Add check digit
        check_digit = (sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(numeric_part)) % 10)
        check_digit = (10 - check_digit) % 10
        
        return numeric_part + str(check_digit)

    async def _generate_validation_insights(self, validated_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate insights for validation results"""
        
        if not validated_rows:
            return {"message": "No valid rows found"}
        
        categories = {}
        brands = {}
        price_analysis = {"with_prices": 0, "without_prices": 0}
        expiry_analysis = {"expiring_soon": 0, "expired": 0}
        
        today = date.today()
        
        for row in validated_rows:
            # Category distribution
            category = row.get("category_code", "unknown")
            categories[category] = categories.get(category, 0) + 1
            
            # Brand distribution
            brand = row.get("brand") or "unknown"
            brands[brand] = brands.get(brand, 0) + 1
            
            # Price analysis
            if row.get("cost_price") and row.get("selling_price"):
                price_analysis["with_prices"] += 1
            else:
                price_analysis["without_prices"] += 1
            
            # Expiry analysis
            if row.get("expiry_date"):
                expiry_date = row["expiry_date"]
                if isinstance(expiry_date, str):
                    expiry_date = datetime.fromisoformat(expiry_date).date()
                
                if expiry_date <= today + timedelta(days=7):
                    expiry_analysis["expiring_soon"] += 1
                if expiry_date < today:
                    expiry_analysis["expired"] += 1
        
        return {
            "total_validated": len(validated_rows),
            "category_distribution": categories,
            "brand_distribution": brands,
            "pricing_analysis": price_analysis,
            "expiry_analysis": expiry_analysis
        }

    async def _generate_ai_suggestions(self, processed_data: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Generate AI suggestions (consolidated from secure_csv_processor)"""
        
        suggestions = []
        
        if not processed_data:
            return suggestions
        
        # Analyze for urgency alerts
        today = date.today()
        urgent_items = []
        
        for item in processed_data:
            if item.get("expiry_date"):
                expiry_date = item["expiry_date"]
                if isinstance(expiry_date, str):
                    expiry_date = datetime.fromisoformat(expiry_date).date()
                
                days_to_expiry = (expiry_date - today).days
                if days_to_expiry <= 3:
                    urgent_items.append({
                        "sku": item["sku"],
                        "product_name": item["product_name"],
                        "days_to_expiry": days_to_expiry
                    })
        
        if urgent_items:
            suggestions.append({
                "type": "urgent_action",
                "message": f"Found {len(urgent_items)} items expiring within 3 days",
                "action": "Consider immediate discounting or removal from inventory"
            })
        
        # Pricing analysis
        low_margin_items = []
        for item in processed_data:
            if item.get("cost_price") and item.get("selling_price"):
                margin = ((item["selling_price"] - item["cost_price"]) / item["selling_price"]) * 100
                if margin < 10:
                    low_margin_items.append(item)
        
        if low_margin_items:
            suggestions.append({
                "type": "pricing_review",
                "message": f"Found {len(low_margin_items)} items with margins below 10%",
                "action": "Review pricing strategy for better profitability"
            })
        
        return suggestions

    async def _generate_category_suggestions(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """Generate category suggestions for unknown categories"""
        
        suggestions = {}
        
        if "category" in df.columns:
            unique_categories = df["category"].dropna().unique()
            
            for cat in unique_categories:
                if not self.category_mapper.validate_category_code(cat):
                    suggestions[cat] = self.category_mapper.get_category_suggestions(cat)
        
        return suggestions

    async def _generate_optimization_tips(self, processed_data: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Generate optimization tips for better inventory management"""
        
        tips = []
        
        # Check for missing batch numbers
        missing_batch_numbers = sum(1 for item in processed_data if not item.get("batch_number"))
        if missing_batch_numbers > 0:
            tips.append({
                "type": "data_quality",
                "message": f"{missing_batch_numbers} items missing batch numbers",
                "tip": "Add batch numbers for better inventory tracking and recall management"
            })
        
        # Check for missing suppliers
        missing_suppliers = sum(1 for item in processed_data if not item.get("supplier"))
        if missing_suppliers > 0:
            tips.append({
                "type": "supply_chain",
                "message": f"{missing_suppliers} items missing supplier information",
                "tip": "Add supplier details for better supply chain management"
            })
        
        return tips

    # Template generation methods (consolidated)
    def generate_template(self, template_type: str = "standard") -> str:
        """Generate CSV template using consolidated template generator"""
        
        if template_type == "basic":
            return self.template_generator.generate_basic_template()
        elif template_type == "standard":
            return self.template_generator.generate_standard_template()
        elif template_type == "extended":
            return self.template_generator.generate_extended_template()
        else:
            raise ValueError(f"Unknown template type: {template_type}")

    def generate_category_template(self, category_code: str) -> str:
        """Generate category-specific template"""
        return self.template_generator.generate_category_specific_template(category_code)

    def get_template_info(self) -> Dict[str, Any]:
        """Get template information"""
        return self.template_generator.get_template_info()


# Factory function for creating service instances
def create_unified_csv_service(store_id: str, user_id: str) -> UnifiedCSVService:
    """Create a new unified CSV service instance"""
    return UnifiedCSVService(store_id=store_id, user_id=user_id)