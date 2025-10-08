"""
Streamlined CSV Template Generation System
Consolidates all template generation logic across CSV processing modules
"""

import csv
import io
from datetime import date, timedelta
from typing import Any, Dict, List

import structlog

from .category_mapper import get_category_mapper

logger = structlog.get_logger()


class CSVTemplateGenerator:
    """
    Unified CSV template generation service
    Consolidates duplicate template generation logic from multiple modules
    """

    # Standard CSV columns for templates
    STANDARD_COLUMNS = [
        "sku",
        "product_name", 
        "category",
        "brand",
        "quantity",
        "cost_price",
        "selling_price",
        "expiry_date",
        "manufacture_date",
        "batch_number",
        "location_code",
        "supplier",
        "unit_type",
        "description"
    ]

    # Required columns (minimal template)
    REQUIRED_COLUMNS = [
        "sku",
        "product_name",
        "category", 
        "quantity",
        "expiry_date"
    ]

    # Extended columns (full template)
    EXTENDED_COLUMNS = STANDARD_COLUMNS + [
        "barcode",
        "supplier_code",
        "nutritional_info",
        "allergen_info",
        "storage_requirements",
        "country_of_origin",
        "certification",
        "weight",
        "dimensions"
    ]

    def __init__(self):
        self.logger = logger.bind(component="csv_template_generator")
        self.category_mapper = get_category_mapper()

    def generate_basic_template(self) -> str:
        """
        Generate basic CSV template with required columns only
        
        Returns:
            CSV template content as string
        """
        template_data = self._get_basic_sample_data()
        return self._generate_csv_content(self.REQUIRED_COLUMNS, template_data)

    def generate_standard_template(self) -> str:
        """
        Generate standard CSV template with all common columns
        
        Returns:
            CSV template content as string
        """
        template_data = self._get_standard_sample_data()
        return self._generate_csv_content(self.STANDARD_COLUMNS, template_data)

    def generate_extended_template(self) -> str:
        """
        Generate extended CSV template with all possible columns
        
        Returns:
            CSV template content as string
        """
        template_data = self._get_extended_sample_data()
        return self._generate_csv_content(self.EXTENDED_COLUMNS, template_data)

    def generate_category_specific_template(self, category_code: str) -> str:
        """
        Generate template with category-specific sample data
        
        Args:
            category_code: Standard category code
            
        Returns:
            CSV template content as string
        """
        template_data = self._get_category_specific_sample_data(category_code)
        return self._generate_csv_content(self.STANDARD_COLUMNS, template_data)

    def generate_custom_template(
        self, 
        columns: list[str], 
        include_samples: bool = True,
        sample_count: int = 3
    ) -> str:
        """
        Generate custom CSV template with specified columns
        
        Args:
            columns: List of column names to include
            include_samples: Whether to include sample data rows
            sample_count: Number of sample rows to include
            
        Returns:
            CSV template content as string
        """
        # Validate columns
        valid_columns = []
        for col in columns:
            if col in self.EXTENDED_COLUMNS:
                valid_columns.append(col)
            else:
                self.logger.warning(f"Unknown column ignored: {col}")
        
        if not valid_columns:
            # Fallback to basic template
            valid_columns = self.REQUIRED_COLUMNS
        
        template_data = []
        if include_samples:
            template_data = self._get_custom_sample_data(valid_columns, sample_count)
        
        return self._generate_csv_content(valid_columns, template_data)

    def _generate_csv_content(self, columns: list[str], data: list[dict[str, str]]) -> str:
        """
        Generate CSV content from columns and data
        
        Args:
            columns: Column names
            data: Sample data rows
            
        Returns:
            CSV content as string
        """
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        # Write header
        writer.writerow(columns)
        
        # Write data rows
        for row in data:
            csv_row = [row.get(col, "") for col in columns]
            writer.writerow(csv_row)
        
        content = output.getvalue()
        output.close()
        
        self.logger.info(
            "CSV template generated",
            columns=len(columns),
            sample_rows=len(data)
        )
        
        return content

    def _get_basic_sample_data(self) -> list[dict[str, str]]:
        """Get basic sample data for minimal template"""
        today = date.today()
        expiry1 = (today + timedelta(days=30)).isoformat()
        expiry2 = (today + timedelta(days=14)).isoformat()
        
        return [
            {
                "sku": "DAIRY-001",
                "product_name": "Organic Milk 1L",
                "category": "dairy_eggs",
                "quantity": "24",
                "expiry_date": expiry1
            },
            {
                "sku": "BREAD-001", 
                "product_name": "Whole Wheat Bread",
                "category": "bakery_fresh",
                "quantity": "15",
                "expiry_date": expiry2
            }
        ]

    def _get_standard_sample_data(self) -> list[dict[str, str]]:
        """Get standard sample data for full template"""
        today = date.today()
        expiry1 = (today + timedelta(days=30)).isoformat()
        expiry2 = (today + timedelta(days=14)).isoformat()
        expiry3 = (today + timedelta(days=7)).isoformat()
        
        mfg1 = (today - timedelta(days=2)).isoformat()
        mfg2 = (today - timedelta(days=1)).isoformat()
        mfg3 = (today - timedelta(days=5)).isoformat()
        
        return [
            {
                "sku": "DAIRY-001",
                "product_name": "Organic Milk 1L",
                "category": "dairy_eggs",
                "brand": "Farm Fresh",
                "quantity": "24",
                "cost_price": "1.20",
                "selling_price": "2.50",
                "expiry_date": expiry1,
                "manufacture_date": mfg1,
                "batch_number": "BATCH-001",
                "location_code": "FRIDGE-A1",
                "supplier": "Local Dairy Co",
                "unit_type": "bottle",
                "description": "Fresh organic whole milk"
            },
            {
                "sku": "BREAD-001",
                "product_name": "Whole Wheat Bread",
                "category": "bakery_fresh", 
                "brand": "Artisan Bakery",
                "quantity": "15",
                "cost_price": "0.80",
                "selling_price": "1.80",
                "expiry_date": expiry2,
                "manufacture_date": mfg2,
                "batch_number": "BATCH-002",
                "location_code": "SHELF-B2",
                "supplier": "Local Bakery",
                "unit_type": "loaf",
                "description": "Whole wheat bread, high fiber"
            },
            {
                "sku": "FRUIT-001",
                "product_name": "Organic Bananas",
                "category": "fresh_produce",
                "brand": "Organic Farms",
                "quantity": "50",
                "cost_price": "0.30",
                "selling_price": "0.80",
                "expiry_date": expiry3,
                "manufacture_date": mfg3,
                "batch_number": "BATCH-003",
                "location_code": "PRODUCE-A",
                "supplier": "Tropical Imports",
                "unit_type": "bunch",
                "description": "Fresh organic bananas"
            }
        ]

    def _get_extended_sample_data(self) -> list[dict[str, str]]:
        """Get extended sample data with all columns"""
        standard_data = self._get_standard_sample_data()
        
        # Add extended fields to each row
        extended_fields = {
            "barcode": ["1234567890123", "2345678901234", "3456789012345"],
            "supplier_code": ["SUP-001", "SUP-002", "SUP-003"],
            "nutritional_info": [
                "Calories: 60 per 100ml, Fat: 3.5g",
                "Calories: 250 per 100g, Carbs: 45g",
                "Calories: 89 per 100g, Potassium: 358mg"
            ],
            "allergen_info": ["Contains: Milk", "Contains: Gluten, Wheat", "None"],
            "storage_requirements": ["Keep refrigerated", "Store in cool, dry place", "Room temperature"],
            "country_of_origin": ["Australia", "Australia", "Ecuador"],
            "certification": ["Organic", "None", "Organic, Fair Trade"],
            "weight": ["1000g", "500g", "150g"],
            "dimensions": ["10x5x20cm", "25x8x15cm", "20x5x5cm"]
        }
        
        for i, row in enumerate(standard_data):
            for field, values in extended_fields.items():
                row[field] = values[i] if i < len(values) else ""
        
        return standard_data

    def _get_category_specific_sample_data(self, category_code: str) -> list[dict[str, str]]:
        """Get sample data specific to a category"""
        today = date.today()
        shelf_life = self.category_mapper.get_shelf_life_days(category_code)
        expiry = (today + timedelta(days=shelf_life)).isoformat()
        mfg = (today - timedelta(days=2)).isoformat()
        
        # Category-specific templates
        category_templates = {
            "fresh_produce": {
                "sku": "PROD-001",
                "product_name": "Fresh Organic Apples",
                "brand": "Organic Farms",
                "unit_type": "kg",
                "location_code": "PRODUCE-A"
            },
            "fresh_meat_fish": {
                "sku": "MEAT-001", 
                "product_name": "Premium Beef Steak",
                "brand": "Prime Cuts",
                "unit_type": "kg",
                "location_code": "MEAT-COLD"
            },
            "dairy_eggs": {
                "sku": "DAIRY-001",
                "product_name": "Fresh Free-Range Eggs",
                "brand": "Farm Fresh",
                "unit_type": "dozen",
                "location_code": "DAIRY-FRIDGE"
            },
            "bakery_fresh": {
                "sku": "BREAD-001",
                "product_name": "Artisan Sourdough",
                "brand": "Local Bakery",
                "unit_type": "loaf",
                "location_code": "BAKERY-SHELF"
            },
            "frozen_foods": {
                "sku": "FROZEN-001",
                "product_name": "Frozen Mixed Vegetables",
                "brand": "Frozen Foods Co",
                "unit_type": "bag",
                "location_code": "FREEZER-A"
            },
            "beverages": {
                "sku": "DRINK-001",
                "product_name": "Natural Spring Water",
                "brand": "Pure Springs",
                "unit_type": "bottle",
                "location_code": "BEVERAGE-SHELF"
            }
        }
        
        template = category_templates.get(category_code, {
            "sku": f"{category_code.upper()}-001",
            "product_name": f"Sample {category_code.replace('_', ' ').title()} Product",
            "brand": "Generic Brand",
            "unit_type": "pcs",
            "location_code": "MAIN-STORAGE"
        })
        
        # Build complete sample data
        sample_data = {
            "sku": template["sku"],
            "product_name": template["product_name"],
            "category": category_code,
            "brand": template["brand"],
            "quantity": "10",
            "cost_price": "5.00",
            "selling_price": "10.00",
            "expiry_date": expiry,
            "manufacture_date": mfg,
            "batch_number": "BATCH-001",
            "location_code": template["location_code"],
            "supplier": "Sample Supplier",
            "unit_type": template["unit_type"],
            "description": f"Sample {category_code.replace('_', ' ')} product for template"
        }
        
        return [sample_data]

    def _get_custom_sample_data(self, columns: list[str], sample_count: int) -> list[dict[str, str]]:
        """Generate custom sample data for specified columns"""
        sample_data = []
        
        # Use standard sample data as base
        standard_samples = self._get_standard_sample_data()
        
        for i in range(min(sample_count, len(standard_samples))):
            if i < len(standard_samples):
                # Use existing sample
                base_sample = standard_samples[i]
            else:
                # Generate new sample
                base_sample = self._generate_generic_sample(i + 1)
            
            # Filter to only requested columns
            filtered_sample = {col: base_sample.get(col, "") for col in columns}
            sample_data.append(filtered_sample)
        
        return sample_data

    def _generate_generic_sample(self, index: int) -> dict[str, str]:
        """Generate a generic sample row"""
        today = date.today()
        expiry = (today + timedelta(days=30)).isoformat()
        mfg = (today - timedelta(days=2)).isoformat()
        
        return {
            "sku": f"SKU-{index:03d}",
            "product_name": f"Sample Product {index}",
            "category": "dry_goods",
            "brand": "Sample Brand",
            "quantity": "10",
            "cost_price": "5.00",
            "selling_price": "10.00",
            "expiry_date": expiry,
            "manufacture_date": mfg,
            "batch_number": f"BATCH-{index:03d}",
            "location_code": "MAIN",
            "supplier": "Sample Supplier",
            "unit_type": "pcs",
            "description": f"Sample product {index} for CSV template"
        }

    def get_template_info(self) -> dict[str, Any]:
        """
        Get information about available templates
        
        Returns:
            Template information dictionary
        """
        categories = self.category_mapper.get_all_categories()
        
        return {
            "templates": {
                "basic": {
                    "description": "Minimal template with required columns only",
                    "columns": self.REQUIRED_COLUMNS,
                    "use_case": "Quick import with essential data"
                },
                "standard": {
                    "description": "Standard template with common columns",
                    "columns": self.STANDARD_COLUMNS,
                    "use_case": "Full inventory import with pricing and batches"
                },
                "extended": {
                    "description": "Extended template with all possible columns",
                    "columns": self.EXTENDED_COLUMNS,
                    "use_case": "Comprehensive import with detailed product information"
                }
            },
            "categories": {
                code: {
                    "display_name": info["display_name"],
                    "shelf_life_days": info["shelf_life_days"]
                }
                for code, info in categories.items()
            },
            "column_descriptions": self._get_column_descriptions()
        }

    def _get_column_descriptions(self) -> dict[str, str]:
        """Get descriptions for all available columns"""
        return {
            "sku": "Unique product identifier (Stock Keeping Unit)",
            "product_name": "Full name/description of the product", 
            "category": "Product category (use standard category codes)",
            "brand": "Brand or manufacturer name",
            "quantity": "Current stock quantity (numeric)",
            "cost_price": "Cost price per unit (numeric)",
            "selling_price": "Selling price per unit (numeric)",
            "expiry_date": "Expiry date (YYYY-MM-DD format)",
            "manufacture_date": "Manufacturing date (YYYY-MM-DD format)",
            "batch_number": "Batch or lot number for tracking",
            "location_code": "Storage location identifier",
            "supplier": "Supplier or vendor name",
            "unit_type": "Unit of measurement (pcs, kg, bottle, etc.)",
            "description": "Additional product description",
            "barcode": "Product barcode (UPC/EAN)",
            "supplier_code": "Supplier's product code",
            "nutritional_info": "Nutritional information text",
            "allergen_info": "Allergen information",
            "storage_requirements": "Storage temperature/conditions",
            "country_of_origin": "Country where product was produced",
            "certification": "Certifications (Organic, Fair Trade, etc.)",
            "weight": "Product weight with unit",
            "dimensions": "Product dimensions (LxWxH)"
        }


# Global instance
_template_generator = None


def get_csv_template_generator() -> CSVTemplateGenerator:
    """Get or create the global CSV template generator instance"""
    global _template_generator
    if _template_generator is None:
        _template_generator = CSVTemplateGenerator()
    return _template_generator