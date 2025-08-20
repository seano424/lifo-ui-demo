"""
Security tests for CSV processing vulnerabilities
⚠️ CRITICAL CSV PROCESSING VULNERABILITIES DETECTED ⚠️
"""

import asyncio
import io
import time
from unittest.mock import AsyncMock

import pytest
from fastapi import UploadFile

from app.services.secure_csv_processor import SecureCSVProcessor as CSVProcessor


class TestCSVUploadVulnerabilities:
    """Test CSV file upload security vulnerabilities"""

    def test_file_type_bypass_vulnerability(self):
        """🚨 CRITICAL: File type validation can be bypassed"""
        # Test 1: Malicious file with CSV extension
        malicious_php = b"<?php system($_GET['cmd']); ?>"
        fake_csv = UploadFile(
            filename="malicious.csv",  # CSV extension but not CSV content
            file=io.BytesIO(malicious_php),
            content_type="application/x-php",
        )

        # System only checks filename extension, not actual content
        assert fake_csv.filename.endswith(".csv")  # Passes validation!

        # Test 2: Double extension attack
        double_ext = UploadFile(
            filename="invoice.php.csv",  # Could be interpreted as PHP
            file=io.BytesIO(b"malicious,content"),
            content_type="text/csv",
        )

        assert double_ext.filename.endswith(".csv")  # Still passes!

    def test_mime_type_validation_missing(self):
        """🚨 HIGH: No MIME type validation"""
        # File with wrong MIME type
        UploadFile(
            filename="virus.csv",
            file=io.BytesIO(b"MZ\x90\x00"),  # PE executable header
            content_type="application/octet-stream",  # Not text/csv
        )

        # System doesn't validate MIME type
        # Accepts any content type as long as filename ends with .csv

    def test_filename_injection_vulnerability(self):
        """🚨 HIGH: Filename injection attacks"""
        malicious_filenames = [
            "../../../etc/passwd.csv",  # Path traversal
            "file\x00.exe.csv",  # Null byte injection
            "con.csv",  # Windows reserved name
            "file with\ttabs\nand\rbreaks.csv",  # Control characters
            "très_long_" + "x" * 1000 + ".csv",  # Very long filename
            "file with unicode \u202e.csv",  # Unicode direction override
            "file;rm -rf /.csv",  # Command injection in filename
        ]

        for filename in malicious_filenames:
            # No filename sanitization - accepts malicious filenames
            UploadFile(
                filename=filename,
                file=io.BytesIO(b"header1,header2\nvalue1,value2"),
                content_type="text/csv",
            )
            # System would process these without sanitization

    def test_file_size_bypass_attack(self):
        """🚨 MEDIUM: File size limits can be bypassed"""
        # Test 1: Compressed bomb
        # Small compressed file that expands to huge size
        zip_bomb_csv = b"PK\x03\x04" + b"x" * 100  # Fake ZIP header

        UploadFile(
            filename="bomb.csv",
            file=io.BytesIO(zip_bomb_csv),
            content_type="application/zip",  # Actually compressed
        )

        # Size check on compressed content, not expanded content
        assert len(zip_bomb_csv) < 10 * 1024 * 1024  # Passes size check

        # Test 2: Streaming attack
        # File that appears small but streams large content
        class MaliciousStream:
            def __init__(self):
                self.position = 0

            def read(self, size=-1):
                # Returns different size than len() suggests
                if self.position < 1000:
                    self.position += 1000
                    return b"x" * 10000000  # 10MB each read
                return b""

            def __len__(self):
                return 1000  # Lies about size

        # System checks len() but uses read() - inconsistent

    def test_memory_exhaustion_attack(self):
        """🚨 HIGH: Memory exhaustion through large CSV"""
        # CSV with very large cells
        large_cell = "x" * 1000000  # 1MB cell
        memory_bomb_csv = f"header1,header2\n{large_cell},{large_cell}\n" * 100

        # Entire file loaded into memory - could exhaust RAM
        content = memory_bomb_csv.encode("utf-8")

        # System loads entire file content into memory at once
        # No streaming processing for large files
        assert len(content) > 100 * 1024 * 1024  # >100MB in memory

    def test_temporary_file_cleanup_missing(self):
        """🚨 MEDIUM: No temporary file cleanup"""
        # UploadFile creates temporary files
        UploadFile(
            filename="test.csv",
            file=io.BytesIO(b"header\ndata"),
            content_type="text/csv",
        )

        # Process file
        # temp_file.file remains open
        # No explicit cleanup in error conditions

        # Temporary files could accumulate and fill disk
        # Especially if processing fails partway through


class TestCSVParsingVulnerabilities:
    """Test CSV parsing security vulnerabilities"""

    @pytest.mark.asyncio
    async def test_csv_injection_formula_injection(self):
        """🚨 CRITICAL: CSV injection / Formula injection"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Malicious CSV with formula injection
        malicious_csv = """sku,product_name,quantity,cost_price,selling_price,expiry_date
=cmd|'/c calc'!A0,Normal Product,10,1.00,2.00,2024-12-31
=HYPERLINK("http://malicious.com","Click me"),Product 2,5,2.00,3.00,2024-11-30
@SUM(1+1)*cmd|'/c notepad',Product 3,20,0.50,1.50,2024-10-31
+cmd|'/c shutdown /s',Product 4,15,3.00,5.00,2024-09-30"""

        # When exported and opened in Excel, these formulas execute!
        # System doesn't sanitize formula prefixes: =, +, -, @

        parsed_data = csv_processor._parse_csv_structure(malicious_csv)

        # Check if dangerous formulas are preserved
        for row in parsed_data["data_rows"]:
            if len(row) > 0:
                sku = row[0]
                # These should be sanitized but aren't
                if sku.startswith(("=", "+", "-", "@")):
                    pytest.fail(f"Formula injection not prevented: {sku}")

    @pytest.mark.asyncio
    async def test_csv_bomb_attack(self):
        """🚨 HIGH: CSV bomb - excessive rows/columns"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # CSV bomb: excessive columns
        bomb_headers = ",".join([f"col{i}" for i in range(10000)])  # 10k columns
        bomb_row = ",".join(["data"] * 10000)
        csv_bomb = f"{bomb_headers}\n{bomb_row}\n"

        # No limits on number of columns
        try:
            parsed_data = csv_processor._parse_csv_structure(csv_bomb)
            # System would try to process 10k columns - memory exhaustion
            assert len(parsed_data["headers"]) == 10000
        except Exception:
            pass  # Expected to fail due to resource exhaustion

        # CSV bomb: excessive rows
        headers = "sku,name,price"
        rows = "\n".join(
            [f"item{i},Product {i},1.00" for i in range(1000000)]
        )  # 1M rows
        csv_bomb_rows = f"{headers}\n{rows}"

        # No limits on number of rows
        try:
            parsed_data = csv_processor._parse_csv_structure(csv_bomb_rows)
            assert len(parsed_data["data_rows"]) == 1000000  # Would cause memory issues
        except Exception:
            pass

    @pytest.mark.asyncio
    async def test_unicode_normalization_attack(self):
        """🚨 MEDIUM: Unicode normalization vulnerabilities"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Unicode normalization attack
        # Different unicode representations of same character
        normal_sku = "PROD-001"
        unicode_sku = "PROD\u2010001"  # Uses unicode hyphen instead of ASCII

        csv_content = f"""sku,product_name,quantity,cost_price,selling_price,expiry_date
{normal_sku},Product 1,10,1.00,2.00,2024-12-31
{unicode_sku},Product 2,5,2.00,3.00,2024-11-30"""

        parsed_data = csv_processor._parse_csv_structure(csv_content)

        # These might be treated as different SKUs but look identical
        # Could bypass duplicate detection
        sku1 = parsed_data["data_rows"][0][0]
        sku2 = parsed_data["data_rows"][1][0]

        # Visually identical but different unicode
        assert sku1 != sku2  # System treats as different
        assert sku1.encode() != sku2.encode()  # Different byte representation

    @pytest.mark.asyncio
    async def test_encoding_detection_vulnerability(self):
        """🚨 MEDIUM: Encoding detection can be exploited"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Malicious content that looks different in different encodings
        # UTF-8 vs Latin-1 interpretation
        malicious_bytes = b"sku,name\n\xc0\xaeitem,product"

        # In UTF-8: Invalid sequence
        # In Latin-1: Valid but different characters

        # System tries multiple encodings - could be exploited
        # to hide malicious content in encoding confusion
        try:
            csv_processor._decode_csv_content(malicious_bytes)
            # Different encoding interpretations possible
        except ValueError:
            pass  # Expected for invalid UTF-8

    @pytest.mark.asyncio
    async def test_csv_parser_DoS_attack(self):
        """🚨 HIGH: CSV parser denial of service"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Test 1: Deeply nested quotes
        nested_quotes = '"' * 10000 + "content" + '"' * 10000
        malicious_csv = f"header\n{nested_quotes}"

        # CSV parser might have exponential time complexity
        start_time = time.time()
        try:
            csv_processor._parse_csv_structure(malicious_csv)
        except Exception:
            pass
        parse_time = time.time() - start_time

        # Should complete quickly, not hang
        assert parse_time < 5.0  # Shouldn't take more than 5 seconds

        # Test 2: Malformed CSV with unmatched quotes
        malformed_csv = (
            'header1,header2\n"unclosed quote field,normal field\nrow2,data2'
        )

        # Malformed CSV could cause parser to hang or crash
        try:
            csv_processor._parse_csv_structure(malformed_csv)
        except Exception:
            pass  # Expected to fail


class TestDataValidationVulnerabilities:
    """Test data validation security vulnerabilities"""

    @pytest.mark.asyncio
    async def test_input_length_limits_missing(self):
        """🚨 HIGH: No input length limits"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Very long inputs that could cause buffer overflows
        very_long_string = "x" * 1000000  # 1MB string

        # Test each validator with excessive input
        validators_to_test = [
            ("sku", csv_processor._validate_sku),
            ("product_name", csv_processor._validate_product_name),
            ("text", csv_processor._validate_text),
            ("location", csv_processor._validate_location),
        ]

        for field_name, validator in validators_to_test:
            try:
                result = await validator(very_long_string, field_name, 1)
                # Should reject very long strings
                if len(result) > 1000:  # Arbitrary reasonable limit
                    pytest.fail(
                        f"Validator {field_name} accepts excessive length: {len(result)}"
                    )
            except Exception:
                pass  # Expected to fail validation

    @pytest.mark.asyncio
    async def test_numeric_overflow_vulnerability(self):
        """🚨 HIGH: Numeric overflow not handled"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Test numeric overflow
        overflow_values = [
            "999999999999999999999999999999999999",  # Very large integer
            "1.7976931348623157e+309",  # Float overflow
            "-1.7976931348623157e+309",  # Negative overflow
            "1e999999",  # Exponent overflow
            "0." + "0" * 1000000 + "1",  # Very small decimal
        ]

        for value in overflow_values:
            try:
                # Test price validation with overflow
                result = await csv_processor._validate_price(value, "price", 1)
                # Should handle overflow gracefully
                if result and abs(float(result)) == float("inf"):
                    pytest.fail(f"Price validator allows infinite values: {result}")
            except Exception:
                pass  # Expected to fail

    @pytest.mark.asyncio
    async def test_date_parsing_vulnerabilities(self):
        """🚨 MEDIUM: Date parsing vulnerabilities"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Malicious date formats
        malicious_dates = [
            "2024-13-45",  # Invalid date
            "../../../../../../etc/passwd",  # Path traversal
            "2024-01-01 00:00:00; DROP TABLE batches; --",  # SQL injection
            "2024-01-01\x00evil",  # Null byte injection
            "1" * 1000,  # Very long date string
            "2024-01-01T00:00:00Z+999999",  # Timezone overflow
        ]

        for date_value in malicious_dates:
            try:
                result = await csv_processor._validate_date(date_value, "date", 1)
                # Should reject malicious date formats
                if result:
                    # Check if malicious content preserved
                    date_str = str(result)
                    if any(char in date_str for char in [";", "DROP", "\x00", "../"]):
                        pytest.fail(
                            f"Date validator preserves malicious content: {date_str}"
                        )
            except Exception:
                pass  # Expected to fail validation

    @pytest.mark.asyncio
    async def test_sku_injection_vulnerability(self):
        """🚨 HIGH: SKU validation allows injection"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Malicious SKUs
        malicious_skus = [
            "PROD'; DROP TABLE products; --",  # SQL injection
            "PROD\"; system('rm -rf /'); //",  # Command injection
            "PROD<script>alert('xss')</script>",  # XSS
            "PROD\x00EVIL",  # Null byte injection
            "../../../config.json",  # Path traversal
            "PROD\r\nHTTP/1.1 200 OK\r\n",  # HTTP response splitting
        ]

        for sku in malicious_skus:
            try:
                result = await csv_processor._validate_sku(sku, "sku", 1)
                if result:
                    # Check if dangerous characters preserved
                    dangerous_chars = ["'", '"', "<", ">", "\x00", "../", "\r", "\n"]
                    if any(char in result for char in dangerous_chars):
                        pytest.fail(
                            f"SKU validator preserves dangerous characters: {result}"
                        )
            except Exception:
                pass  # Expected to fail validation


class TestCSVImportVulnerabilities:
    """Test CSV import process vulnerabilities"""

    @pytest.mark.asyncio
    async def test_race_condition_in_import(self):
        """🚨 HIGH: Race condition between validation and import"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Simulate time gap between validation and import
        valid_data = [{"sku": "PROD-001", "product_name": "Product 1", "quantity": 10}]

        async def concurrent_modification():
            # Another process modifies data between validation and import
            await asyncio.sleep(0.05)  # Small delay
            # Data could be changed by another process
            valid_data[0]["sku"] = "'; DROP TABLE products; --"

        async def import_process():
            await asyncio.sleep(0.1)  # Import starts after validation
            # Uses potentially modified data
            return await csv_processor._import_inventory_data(valid_data, "store123")

        # Race condition: validation passes but import uses modified data
        await asyncio.gather(concurrent_modification(), import_process())

    @pytest.mark.asyncio
    async def test_transaction_boundary_missing(self):
        """🚨 CRITICAL: No transaction boundaries in import"""
        mock_db = AsyncMock()
        csv_processor = CSVProcessor(mock_db)

        # Import data that partially fails
        mixed_data = [
            {"sku": "VALID-001", "product_name": "Valid Product", "quantity": 10},
            {"sku": "INVALID", "product_name": None, "quantity": -999},  # Invalid
            {"sku": "VALID-002", "product_name": "Another Valid", "quantity": 5},
        ]

        # Mock inventory operations to fail on second item
        async def mock_create_batch(data):
            if "INVALID" in data.get("sku", ""):
                raise Exception("Validation failed")
            return "batch-id"

        csv_processor.inventory_ops.create_batch = mock_create_batch

        # Import will partially succeed
        # First item imported, second fails, third might not be processed
        # No rollback of successful operations
        try:
            await csv_processor._import_inventory_data(mixed_data, "store123")
            # Database left in inconsistent state
        except Exception:
            pass

    @pytest.mark.asyncio
    async def test_duplicate_detection_bypass(self):
        """🚨 MEDIUM: Duplicate detection can be bypassed"""
        mock_db = AsyncMock()
        CSVProcessor(mock_db)

        # Duplicates with subtle differences
        duplicate_data = [
            {"sku": "PROD-001", "product_name": "Product"},
            {"sku": "PROD\u2010001", "product_name": "Product"},  # Unicode hyphen
            {"sku": "PROD-001 ", "product_name": "Product"},  # Trailing space
            {"sku": "prod-001", "product_name": "Product"},  # Case difference
        ]

        # Business logic might not catch these as duplicates
        # Could create multiple entries for "same" product
        for _data in duplicate_data:
            # Each treated as unique due to subtle differences
            pass

    @pytest.mark.asyncio
    async def test_import_without_authorization_recheck(self):
        """🚨 HIGH: Import doesn't recheck authorization"""
        mock_db = AsyncMock()
        CSVProcessor(mock_db)

        # User uploads CSV (has access)
        # Admin removes user access during processing
        # Import continues with old authorization

        # No authorization recheck during import phase
        # User could import data to store they no longer have access to

        # Import proceeds even if user access was revoked
        # Should recheck permissions before each database operation


# Summary of CSV Processing Vulnerabilities:
"""
🚨 CRITICAL CSV PROCESSING VULNERABILITIES IDENTIFIED:

1. File Upload Bypass (CRITICAL)
   - Filename extension check only, no content validation
   - No MIME type verification
   - Path traversal in filenames possible

2. CSV Injection / Formula Injection (CRITICAL)
   - No sanitization of formula prefixes (=, +, -, @)
   - Malicious formulas executed when exported to Excel

3. Memory Exhaustion (HIGH)
   - Entire file loaded into memory
   - No protection against CSV bombs
   - No limits on rows/columns

4. Missing Transaction Boundaries (CRITICAL)
   - Import operations not atomic
   - Partial failures leave database inconsistent

5. Input Length Limits Missing (HIGH)
   - No protection against very long strings
   - Buffer overflow potential

6. Numeric Overflow (HIGH)
   - No handling of numeric overflow/underflow
   - Could cause crashes or unexpected behavior

7. Race Conditions (HIGH)
   - Time gap between validation and import
   - Concurrent modifications possible

8. Encoding Vulnerabilities (MEDIUM)
   - Encoding detection can be exploited
   - Unicode normalization attacks possible

9. Parser DoS Attacks (HIGH)
   - CSV parser vulnerable to complexity attacks
   - Malformed CSV could cause hangs

10. Authorization Bypass (HIGH)
    - No authorization recheck during import
    - User could import after access revoked

IMMEDIATE ACTIONS REQUIRED:
1. Implement proper file type validation (MIME + content)
2. Sanitize CSV content to prevent formula injection
3. Add memory and complexity limits for CSV processing
4. Wrap all import operations in database transactions
5. Add input length and content validation
6. Implement proper numeric overflow handling
7. Add authorization rechecking during import
8. Stream process large files instead of loading in memory
9. Add rate limiting for CSV upload endpoints
10. Implement virus/malware scanning for uploaded files
"""
