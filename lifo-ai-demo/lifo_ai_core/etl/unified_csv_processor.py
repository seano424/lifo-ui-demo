"""
Unified CSV Processor for LIFO.AI Demo
Simplified version for demo purposes with synchronous processing
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
import re
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UnifiedCSVProcessor:
    """
    Simplified CSV processor for demo purposes
    """
    
    # Security limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_ROWS = 10000
    MAX_COLUMNS = 50
    
    # Required columns
    REQUIRED_COLUMNS = ['sku', 'product_name', 'category', 'quantity', 'expiry_date']
    
    # Optional columns with defaults
    OPTIONAL_COLUMNS = {
        'brand': 'Unknown',
        'cost_price': None,
        'selling_price': None,
        'manufacture_date': None,
        'location_code': 'MAIN',
        'unit_type': 'pcs',
        'supplier': 'Unknown'
    }
    
    # Category mapping
    CATEGORY_MAPPING = {
        'produce': 'fresh_produce', 'fruits': 'fresh_produce', 'vegetables': 'fresh_produce',
        'fruit': 'fresh_produce', 'vegetable': 'fresh_produce',
        'meat': 'fresh_meat_fish', 'fish': 'fresh_meat_fish', 'seafood': 'fresh_meat_fish',
        'poultry': 'fresh_meat_fish', 'dairy': 'dairy', 'milk': 'dairy', 'cheese': 'dairy',
        'yogurt': 'dairy', 'bakery': 'bakery_fresh', 'bread': 'bakery_fresh',
        'frozen': 'frozen', 'beverages': 'beverages', 'drinks': 'beverages',
        'dry_goods': 'dry_goods', 'pantry': 'pantry_staples', 'canned': 'canned_jarred',
        'snacks': 'snacks', 'confectionery': 'confectionery', 'health_food': 'health_food',
        'spices_condiments': 'spices_condiments', 'cereals': 'cereals'
    }
    
    # Shelf life mapping (days)
    SHELF_LIFE_MAPPING = {
        'fresh_produce': 7, 'fresh_meat_fish': 3, 'bakery_fresh': 2,
        'dairy': 14, 'frozen': 365, 'beverages': 180, 'dry_goods': 365,
        'pantry_staples': 730, 'canned_jarred': 1095, 'snacks': 90,
        'confectionery': 180, 'health_food': 365, 'spices_condiments': 1095,
        'cereals': 365
    }
    
    # Security patterns
    FORMULA_PATTERNS = [
        r'^[=@+\-]',  # Formula injection
        r'cmd\s*\(',  # Command injection
        r'system\s*\(',  # System calls
        r'<script',  # XSS
        r'javascript:',  # JavaScript execution
    ]

    def __init__(self, store_id: str = "demo-store"):
        """
        Initialize processor
        """
        self.store_id = store_id
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.processed_count = 0
        
    def process_csv_file(self, file_path: str) -> Dict[str, Any]:
        """
        Main entry point for CSV processing
        """
        try:
            # Load CSV
            df = self._load_csv(file_path)
            
            # Validate structure
            self._validate_csv_structure(df)
            
            # Process data
            processed_data = self._process_data(df)
            
            # Calculate success rate
            success_rate = (self.processed_count / len(df)) * 100 if len(df) > 0 else 0
            
            result = {
                'status': 'success',
                'data': processed_data,
                'processed_count': self.processed_count,
                'success_rate': success_rate,
                'warnings': self.warnings,
                'errors': self.errors,
                'metadata': {
                    'store_id': self.store_id,
                    'processed_at': datetime.utcnow().isoformat(),
                    'total_rows': len(df)
                }
            }
            
            logger.info(f"CSV processing completed successfully. Processed {self.processed_count} items.")
            return result
            
        except Exception as e:
            logger.error(f"Error during CSV processing: {e}")
            return self._error_result(f"Processing failed: {e}")

    def _load_csv(self, file_path: str) -> pd.DataFrame:
        """Load CSV with basic validation"""
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
            
            # Basic security checks
            if len(df) > self.MAX_ROWS:
                raise ValueError(f"CSV contains {len(df)} rows, maximum allowed is {self.MAX_ROWS}")
            
            if len(df.columns) > self.MAX_COLUMNS:
                raise ValueError(f"CSV contains {len(df.columns)} columns, maximum allowed is {self.MAX_COLUMNS}")
            
            # Check for formula injection
            for col in df.columns:
                for idx, value in df[col].items():
                    if pd.notna(value) and isinstance(value, str):
                        for pattern in self.FORMULA_PATTERNS:
                            if re.search(pattern, value, re.IGNORECASE):
                                self.warnings.append(f"Potentially dangerous content detected at row {idx+1}, column '{col}'")
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError("CSV file is empty")
        except pd.errors.ParserError as e:
            raise ValueError(f"CSV parsing failed: {e}")
        except UnicodeDecodeError:
            raise ValueError("File encoding is not valid UTF-8")

    def _validate_csv_structure(self, df: pd.DataFrame):
        """Validate CSV structure"""
        # Normalize column names
        original_columns = df.columns.tolist()
        df.columns = [self._normalize_column_name(col) for col in df.columns]
        
        # Check required columns
        missing_columns = set(self.REQUIRED_COLUMNS) - set(df.columns)
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Check for empty rows
        empty_rows = df.isnull().all(axis=1).sum()
        if empty_rows > 0:
            self.warnings.append(f"Found {empty_rows} completely empty rows, they will be skipped")

    def _normalize_column_name(self, col_name: str) -> str:
        """Normalize column names"""
        normalized = re.sub(r'[^a-zA-Z0-9]', '_', str(col_name).lower())
        
        # Common mappings
        mappings = {
            'product_id': 'sku',
            'productname': 'product_name',
            'name': 'product_name',
            'cat': 'category',
            'qty': 'quantity',
            'expire_date': 'expiry_date',
            'cost': 'cost_price',
            'price': 'selling_price',
            'loc': 'location_code',
            'units': 'unit_type',
            'brand_name': 'brand'
        }
        
        return mappings.get(normalized, normalized)

    def _process_data(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process each row of data"""
        processed_rows = []
        
        for idx, row in df.iterrows():
            try:
                # Skip empty rows
                if row.isnull().all():
                    continue
                
                processed_row = self._process_single_row(row, idx + 1)
                if processed_row:
                    processed_rows.append(processed_row)
                    self.processed_count += 1
                    
            except Exception as e:
                self.errors.append(f"Row {idx + 1}: {e}")
                continue
        
        if not processed_rows:
            raise ValueError("No valid rows found in CSV")
        
        return processed_rows

    def _process_single_row(self, row: pd.Series, row_num: int) -> Optional[Dict[str, Any]]:
        """Process a single CSV row"""
        processed = {}
        
        # Required fields
        processed['sku'] = self._validate_sku(row.get('sku'), row_num)
        processed['product_name'] = self._validate_product_name(row.get('product_name'), row_num)
        processed['category'] = self._normalize_category(row.get('category'), row_num)
        processed['quantity'] = self._validate_quantity(row.get('quantity'), row_num)
        processed['expiry_date'] = self._validate_expiry_date(row.get('expiry_date'), row_num)
        
        # Optional fields
        for field, default in self.OPTIONAL_COLUMNS.items():
            if field in row and pd.notna(row[field]):
                if field in ['cost_price', 'selling_price']:
                    processed[field] = self._validate_price(row[field], field, row_num)
                else:
                    processed[field] = str(row[field]).strip()
            else:
                processed[field] = default
        
        # Estimate manufacture date if not provided
        if not processed.get('manufacture_date'):
            processed['manufacture_date'] = self._estimate_manufacture_date(
                processed['expiry_date'], 
                processed['category']
            )
        
        # Add metadata
        processed['store_id'] = self.store_id
        processed['status'] = 'active'
        processed['created_at'] = datetime.utcnow().isoformat()
        
        return processed

    def _validate_sku(self, sku: Any, row_num: int) -> str:
        """Validate SKU"""
        if pd.isna(sku):
            raise ValueError(f"SKU is required")
        
        sku_str = str(sku).strip()
        if not sku_str:
            raise ValueError(f"SKU cannot be empty")
        
        return sku_str

    def _validate_product_name(self, name: Any, row_num: int) -> str:
        """Validate product name"""
        if pd.isna(name):
            raise ValueError(f"Product name is required")
        
        name_str = str(name).strip()
        if not name_str:
            raise ValueError(f"Product name cannot be empty")
        
        return name_str

    def _normalize_category(self, category: Any, row_num: int) -> str:
        """Normalize category"""
        if pd.isna(category):
            self.warnings.append(f"Row {row_num}: No category provided, using 'dry_goods'")
            return 'dry_goods'
        
        category_str = str(category).lower().strip()
        
        # Try to map to standard categories
        for key, value in self.CATEGORY_MAPPING.items():
            if key in category_str:
                return value
        
        # If no mapping found, return as-is
        return category_str

    def _validate_quantity(self, quantity: Any, row_num: int) -> float:
        """Validate quantity"""
        if pd.isna(quantity):
            raise ValueError(f"Quantity is required")
        
        try:
            qty = float(quantity)
            if qty < 0:
                raise ValueError(f"Quantity cannot be negative")
            return qty
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quantity format: {quantity}")

    def _validate_expiry_date(self, expiry: Any, row_num: int) -> str:
        """Validate expiry date"""
        if pd.isna(expiry):
            raise ValueError(f"Expiry date is required")
        
        # Try to parse various date formats
        date_formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d']
        
        expiry_str = str(expiry).strip()
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(expiry_str, fmt).date()
                
                # Validate date is reasonable
                today = date.today()
                if parsed_date < today - timedelta(days=30):
                    self.warnings.append(f"Row {row_num}: Expiry date is in the past")
                
                return parsed_date.isoformat()
                
            except ValueError:
                continue
        
        raise ValueError(f"Invalid date format: {expiry}")

    def _validate_price(self, price: Any, field_name: str, row_num: int) -> Optional[float]:
        """Validate price fields"""
        if pd.isna(price) or price == '':
            return None
        
        try:
            # Handle currency symbols
            price_str = str(price).replace('$', '').replace('€', '').replace('£', '').replace(',', '').strip()
            price_val = float(price_str)
            
            if price_val < 0:
                raise ValueError(f"{field_name} cannot be negative")
            
            return price_val
            
        except (ValueError, TypeError):
            raise ValueError(f"Invalid {field_name} format: {price}")

    def _estimate_manufacture_date(self, expiry_date: str, category: str) -> str:
        """Estimate manufacture date"""
        expiry = datetime.fromisoformat(expiry_date).date()
        shelf_life_days = self.SHELF_LIFE_MAPPING.get(category, 30)
        
        estimated_mfg = expiry - timedelta(days=shelf_life_days)
        return estimated_mfg.isoformat()

    def _error_result(self, error_message: str) -> Dict[str, Any]:
        """Create error result"""
        return {
            'status': 'error',
            'data': [],
            'processed_count': 0,
            'success_rate': 0,
            'warnings': self.warnings,
            'errors': [error_message] + self.errors,
            'metadata': {
                'store_id': self.store_id,
                'processed_at': datetime.utcnow().isoformat()
            }
        }