"""
Consolidated CSV Parsing and Processing Engine
Combines all CSV parsing implementations into a single, optimized engine
"""

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

import pandas as pd
import structlog
from fastapi import HTTPException

from .security_validator import get_csv_security_validator

logger = structlog.get_logger()


class CSVParsingEngine:
    """
    Unified CSV parsing and processing engine
    Consolidates duplicate parsing logic from multiple modules
    """

    # Column name normalization mappings
    COLUMN_MAPPINGS = {
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
        "batch_number": "batch_number",
        "batchnumber": "batch_number",
        "batch": "batch_number",
        "location_code": "location_code",
        "locationcode": "location_code",
        "location": "location_code",
    }

    # Date formats for parsing
    DATE_FORMATS = [
        "%Y-%m-%d",
        "%d/%m/%Y", 
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%Y.%m.%d"
    ]

    def __init__(self):
        self.logger = logger.bind(component="csv_parsing_engine")
        self.security_validator = get_csv_security_validator()

    async def parse_csv_content(
        self, 
        content: bytes = None, 
        file_path: str = None,
        encoding: str = "utf-8"
    ) -> dict[str, Any]:
        """
        Parse CSV content with comprehensive validation
        
        Args:
            content: Raw CSV content bytes
            file_path: Path to CSV file
            encoding: Content encoding
            
        Returns:
            Parsed CSV structure with headers and data rows
        """
        try:
            # Decode content securely
            csv_text = self._decode_csv_content(content, file_path, encoding)
            
            # Validate content patterns
            self.security_validator.validate_csv_content_patterns(csv_text)
            
            # Parse CSV structure
            parsed_data = await self._parse_csv_structure(csv_text)
            
            # Normalize and validate structure
            normalized_data = self._normalize_csv_structure(parsed_data)
            
            self.logger.info(
                "CSV content parsed successfully",
                total_rows=len(normalized_data["data_rows"]),
                columns=len(normalized_data["headers"])
            )
            
            return normalized_data
            
        except Exception as e:
            self.logger.error("CSV parsing failed", error=str(e))
            raise

    def _decode_csv_content(
        self, 
        content: bytes = None, 
        file_path: str = None, 
        encoding: str = "utf-8"
    ) -> str:
        """
        Securely decode CSV content from bytes or file
        
        Args:
            content: Raw content bytes
            file_path: Path to CSV file
            encoding: Content encoding
            
        Returns:
            Decoded CSV text content
        """
        if content:
            # Try multiple safe encodings
            safe_encodings = [encoding, "utf-8", "utf-8-sig", "latin1"]
            
            for enc in safe_encodings:
                try:
                    decoded = content.decode(enc)
                    
                    # Check for binary content
                    if "\x00" in decoded:
                        raise HTTPException(
                            status_code=400,
                            detail="File contains binary data"
                        )
                    
                    return decoded
                    
                except UnicodeDecodeError:
                    continue
            
            raise HTTPException(
                status_code=400,
                detail="Unable to decode CSV file. Please ensure it's properly encoded"
            )
            
        elif file_path:
            # Load from file path
            try:
                with open(file_path, encoding=encoding) as f:
                    return f.read()
            except FileNotFoundError:
                raise HTTPException(
                    status_code=404,
                    detail=f"CSV file not found: {file_path}"
                )
            except UnicodeDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail="File encoding error. Please ensure UTF-8 encoding"
                ) from e
        else:
            raise HTTPException(
                status_code=400,
                detail="Either content or file_path must be provided"
            )

    async def _parse_csv_structure(self, csv_content: str) -> dict[str, Any]:
        """
        Parse CSV structure using both csv module and pandas for flexibility
        
        Args:
            csv_content: Decoded CSV content
            
        Returns:
            Parsed CSV structure
        """
        try:
            # Method 1: Use csv module for strict parsing
            csv_reader = csv.reader(
                io.StringIO(csv_content),
                delimiter=",",
                quotechar='"',
                strict=False  # Allow some flexibility
            )
            
            rows = []
            for row_idx, row in enumerate(csv_reader):
                # Apply security validation
                self.security_validator.validate_csv_structure_limits([row])
                
                # Sanitize each cell
                sanitized_row = [
                    self.security_validator.sanitize_csv_cell(cell) 
                    for cell in row
                ]
                rows.append(sanitized_row)
                
                # Break if too many rows
                if row_idx >= self.security_validator.MAX_ROWS:
                    break
            
            if len(rows) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="CSV must contain at least a header row and one data row"
                )
            
            headers = rows[0]
            data_rows = rows[1:]
            
            return {
                "headers": headers,
                "data_rows": data_rows,
                "total_rows": len(data_rows),
                "parsing_method": "csv_module"
            }
            
        except csv.Error as e:
            # Fallback: Try pandas for more flexible parsing
            self.logger.warning("CSV module parsing failed, trying pandas", error=str(e))
            return await self._parse_with_pandas_fallback(csv_content)

    async def _parse_with_pandas_fallback(self, csv_content: str) -> dict[str, Any]:
        """
        Fallback CSV parsing using pandas for more flexibility
        
        Args:
            csv_content: CSV content string
            
        Returns:
            Parsed CSV structure
        """
        try:
            # Use pandas for more flexible parsing
            df = pd.read_csv(
                io.StringIO(csv_content),
                encoding="utf-8",
                na_filter=False,  # Don't convert strings to NaN
                dtype=str,  # Keep everything as strings initially
                skip_blank_lines=True
            )
            
            # Convert to list format
            headers = df.columns.tolist()
            data_rows = df.values.tolist()
            
            # Apply security validation
            self.security_validator.validate_csv_structure_limits([headers] + data_rows)
            
            # Sanitize content
            sanitized_data_rows = []
            for row in data_rows:
                sanitized_row = [
                    self.security_validator.sanitize_csv_cell(str(cell))
                    for cell in row
                ]
                sanitized_data_rows.append(sanitized_row)
            
            return {
                "headers": headers,
                "data_rows": sanitized_data_rows,
                "total_rows": len(sanitized_data_rows),
                "parsing_method": "pandas_fallback"
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"CSV parsing failed: {str(e)}"
            ) from e

    def _normalize_csv_structure(self, parsed_data: dict[str, Any]) -> dict[str, Any]:
        """
        Normalize CSV structure with standardized column names
        
        Args:
            parsed_data: Raw parsed CSV data
            
        Returns:
            Normalized CSV structure
        """
        headers = parsed_data["headers"]
        data_rows = parsed_data["data_rows"]
        
        # Normalize column names
        normalized_headers = []
        for header in headers:
            normalized_name = self._normalize_column_name(header)
            normalized_headers.append(normalized_name)
        
        # Check for duplicate columns after normalization
        seen_headers = set()
        final_headers = []
        for header in normalized_headers:
            if header in seen_headers:
                # Add suffix for duplicates
                counter = 1
                new_header = f"{header}_{counter}"
                while new_header in seen_headers:
                    counter += 1
                    new_header = f"{header}_{counter}"
                final_headers.append(new_header)
                seen_headers.add(new_header)
            else:
                final_headers.append(header)
                seen_headers.add(header)
        
        # Ensure consistent row lengths
        normalized_data_rows = []
        header_count = len(final_headers)
        
        for row_idx, row in enumerate(data_rows):
            # Pad or trim row to match header count
            if len(row) < header_count:
                # Pad with empty strings
                padded_row = row + [""] * (header_count - len(row))
                normalized_data_rows.append(padded_row)
            elif len(row) > header_count:
                # Trim excess columns
                trimmed_row = row[:header_count]
                normalized_data_rows.append(trimmed_row)
            else:
                normalized_data_rows.append(row)
        
        return {
            "headers": final_headers,
            "data_rows": normalized_data_rows,
            "total_rows": len(normalized_data_rows),
            "original_headers": headers,
            "parsing_method": parsed_data.get("parsing_method", "unknown")
        }

    def _normalize_column_name(self, col_name: str) -> str:
        """
        Normalize column names to standard format
        
        Args:
            col_name: Original column name
            
        Returns:
            Normalized column name
        """
        # Convert to lowercase and replace special chars with underscore
        normalized = re.sub(r"[^a-zA-Z0-9]", "_", str(col_name).lower().strip())
        
        # Remove multiple consecutive underscores
        normalized = re.sub(r"_+", "_", normalized)
        
        # Remove leading/trailing underscores
        normalized = normalized.strip("_")
        
        # Apply known mappings
        return self.COLUMN_MAPPINGS.get(normalized, normalized)

    def convert_to_dataframe(self, parsed_data: dict[str, Any]) -> pd.DataFrame:
        """
        Convert parsed CSV data to pandas DataFrame
        
        Args:
            parsed_data: Parsed CSV structure
            
        Returns:
            Pandas DataFrame with proper column names
        """
        try:
            df = pd.DataFrame(
                data=parsed_data["data_rows"],
                columns=parsed_data["headers"]
            )
            
            # Remove completely empty rows
            df = df.dropna(how='all')
            
            # Reset index after dropping rows
            df = df.reset_index(drop=True)
            
            self.logger.info(
                "CSV converted to DataFrame",
                rows=len(df),
                columns=len(df.columns)
            )
            
            return df
            
        except Exception as e:
            self.logger.error("DataFrame conversion failed", error=str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to convert CSV to DataFrame: {str(e)}"
            ) from e

    def parse_date_field(self, date_value: Any, field_name: str = "date") -> date | None:
        """
        Parse date field with multiple format support
        
        Args:
            date_value: Raw date value
            field_name: Field name for error reporting
            
        Returns:
            Parsed date object or None if parsing fails
        """
        if pd.isna(date_value) or not date_value:
            return None
        
        date_str = str(date_value).strip()
        
        for fmt in self.DATE_FORMATS:
            try:
                parsed_date = datetime.strptime(date_str, fmt).date()
                return parsed_date
            except ValueError:
                continue
        
        # Try pandas to_datetime as fallback
        try:
            parsed_date = pd.to_datetime(date_str, infer_datetime_format=True).date()
            return parsed_date
        except Exception:
            pass
        
        self.logger.warning(
            "Date parsing failed",
            field_name=field_name,
            value=date_str,
            attempted_formats=self.DATE_FORMATS
        )
        return None

    def parse_numeric_field(
        self, 
        value: Any, 
        field_name: str = "numeric",
        allow_negative: bool = False,
        max_value: float | None = None
    ) -> float | None:
        """
        Parse numeric field with validation
        
        Args:
            value: Raw numeric value
            field_name: Field name for error reporting
            allow_negative: Whether negative values are allowed
            max_value: Maximum allowed value
            
        Returns:
            Parsed numeric value or None if parsing fails
        """
        if pd.isna(value) or value == "":
            return None
        
        try:
            # Handle currency symbols and commas
            value_str = str(value).replace("$", "").replace("€", "").replace(",", "").strip()
            
            # Try decimal first for precision
            try:
                decimal_val = Decimal(value_str)
                numeric_val = float(decimal_val)
            except InvalidOperation:
                numeric_val = float(value_str)
            
            # Validation
            if not allow_negative and numeric_val < 0:
                self.logger.warning(
                    "Negative value not allowed",
                    field_name=field_name,
                    value=numeric_val
                )
                return None
            
            if max_value is not None and numeric_val > max_value:
                self.logger.warning(
                    "Value exceeds maximum",
                    field_name=field_name,
                    value=numeric_val,
                    max_allowed=max_value
                )
                return None
            
            return numeric_val
            
        except (ValueError, TypeError) as e:
            self.logger.warning(
                "Numeric parsing failed",
                field_name=field_name,
                value=value,
                error=str(e)
            )
            return None


# Global instance
_parsing_engine = None


def get_csv_parsing_engine() -> CSVParsingEngine:
    """Get or create the global CSV parsing engine instance"""
    global _parsing_engine
    if _parsing_engine is None:
        _parsing_engine = CSVParsingEngine()
    return _parsing_engine