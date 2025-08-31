"""
CSV Security Module - LIFO AI Engine
Provides comprehensive security for CSV file uploads and processing
Prevents formula injection, validates file content, and sanitizes data
"""

import re
from pathlib import Path
from typing import Any

import magic
import structlog

logger = structlog.get_logger()


class CSVSecurityError(Exception):
    """Custom exception for CSV security violations"""

    pass


class CSVSecurityValidator:
    """
    Comprehensive CSV security validation and sanitization
    """

    # Dangerous formula prefixes that can execute code in Excel/Calc
    DANGEROUS_PREFIXES = [
        "=",
        "+",
        "-",
        "@",  # Standard formula prefixes
        "\t=",
        "\r=",
        "\n=",  # Formula prefixes with whitespace
        " =",
        " +",
        " -",
        " @",  # Formula prefixes with space
    ]

    # Maximum safe file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024

    # Allowed MIME types for CSV files
    ALLOWED_MIME_TYPES = {
        "text/csv",
        "text/plain",
        "application/csv",
        "application/vnd.ms-excel",  # Sometimes CSV is detected as Excel
    }

    # Maximum number of rows to prevent DoS attacks
    MAX_ROWS = 50000

    # Maximum field length to prevent buffer overflow attacks
    MAX_FIELD_LENGTH = 10000

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="csv_security")

    def validate_file_upload(
        self, file_content: bytes, filename: str
    ) -> dict[str, Any]:
        """
        Comprehensive file upload validation

        Args:
            file_content: Raw file content
            filename: Original filename

        Returns:
            Dict with validation results

        Raises:
            CSVSecurityError: If validation fails
        """
        validation_result = {
            "valid": True,
            "warnings": [],
            "security_issues": [],
            "file_info": {},
        }

        try:
            # 1. File size validation
            if len(file_content) > self.MAX_FILE_SIZE:
                raise CSVSecurityError(
                    f"File too large: {len(file_content)} bytes (max: {self.MAX_FILE_SIZE})"
                )

            # 2. File extension validation
            if not self._validate_file_extension(filename):
                raise CSVSecurityError(f"Invalid file extension: {filename}")

            # 3. MIME type validation using python-magic
            mime_type = self._get_mime_type(file_content)
            if mime_type not in self.ALLOWED_MIME_TYPES:
                validation_result["warnings"].append(
                    f"Unexpected MIME type: {mime_type}. Proceeding with caution."
                )

            # 4. Content structure validation
            content_validation = self._validate_content_structure(file_content)
            validation_result.update(content_validation)

            # 5. Security scan for malicious patterns
            security_scan = self._scan_for_security_threats(file_content)
            validation_result["security_issues"].extend(security_scan)

            validation_result["file_info"] = {
                "size_bytes": len(file_content),
                "mime_type": mime_type,
                "filename": filename,
                "estimated_rows": content_validation.get("estimated_rows", 0),
            }

            self.logger.info(
                "File validation completed",
                filename=filename,
                size=len(file_content),
                mime_type=mime_type,
                security_issues=len(validation_result["security_issues"]),
            )

            return validation_result

        except CSVSecurityError:
            raise
        except Exception as e:
            self.logger.error("File validation error", error=str(e))
            raise CSVSecurityError(f"Validation failed: {str(e)}") from e

    def sanitize_csv_content(self, content: str) -> tuple[str, list[str]]:
        """
        Sanitize CSV content to prevent formula injection attacks

        Args:
            content: Raw CSV content as string

        Returns:
            Tuple of (sanitized_content, list_of_changes_made)
        """
        changes_made = []
        lines = content.split("\n")
        sanitized_lines = []

        for line_num, line in enumerate(lines, 1):
            # Skip empty lines
            if not line.strip():
                sanitized_lines.append(line)
                continue

            # Process CSV fields (simple CSV parsing for security)
            fields = self._parse_csv_fields(line)
            sanitized_fields = []

            for field_num, field in enumerate(fields, 1):
                sanitized_field, field_changes = self._sanitize_field(field)
                sanitized_fields.append(sanitized_field)

                # Record changes for logging
                for change in field_changes:
                    changes_made.append(f"Line {line_num}, Field {field_num}: {change}")

            # Reconstruct line
            sanitized_line = ",".join(
                f'"{field}"' if "," in field or '"' in field else field
                for field in sanitized_fields
            )
            sanitized_lines.append(sanitized_line)

        sanitized_content = "\n".join(sanitized_lines)

        if changes_made:
            self.logger.warning("CSV content sanitized", changes=len(changes_made))

        return sanitized_content, changes_made

    def _validate_file_extension(self, filename: str) -> bool:
        """Validate file extension"""
        allowed_extensions = {".csv", ".txt"}
        file_ext = Path(filename).suffix.lower()
        return file_ext in allowed_extensions

    def _get_mime_type(self, file_content: bytes) -> str:
        """Get MIME type using python-magic for accurate detection"""
        try:
            # Use python-magic for accurate MIME type detection
            mime_type = magic.from_buffer(file_content, mime=True)
            return mime_type
        except Exception:
            # Fallback to basic detection
            return "text/plain"

    def _validate_content_structure(self, file_content: bytes) -> dict[str, Any]:
        """Validate CSV content structure"""
        try:
            # Decode content
            content = file_content.decode("utf-8-sig")  # Handle BOM
        except UnicodeDecodeError:
            try:
                content = file_content.decode("latin1")  # Fallback encoding
            except UnicodeDecodeError as e:
                raise CSVSecurityError("Invalid file encoding") from e

        lines = content.split("\n")
        non_empty_lines = [line for line in lines if line.strip()]

        # Check row count
        if len(non_empty_lines) > self.MAX_ROWS:
            raise CSVSecurityError(
                f"Too many rows: {len(non_empty_lines)} (max: {self.MAX_ROWS})"
            )

        # Check for extremely long fields (potential DoS)
        for line_num, line in enumerate(
            non_empty_lines[:100], 1
        ):  # Check first 100 lines
            if len(line) > self.MAX_FIELD_LENGTH:
                raise CSVSecurityError(f"Line {line_num} too long: {len(line)} chars")

        return {
            "estimated_rows": len(non_empty_lines),
            "total_lines": len(lines),
            "content_preview": content[:500] if content else "",
        }

    def _scan_for_security_threats(self, file_content: bytes) -> list[str]:
        """Scan for security threats in file content"""
        threats = []

        try:
            content = file_content.decode("utf-8-sig", errors="ignore")
        except (UnicodeDecodeError, AttributeError):
            content = file_content.decode("latin1", errors="ignore")

        # Check for formula injection patterns
        formula_patterns = [
            r"^\s*[=+\-@]",  # Formula prefixes at start of field
            r"DDE\s*\(",  # DDE (Dynamic Data Exchange) functions
            r"cmd\s*\|",  # Command execution attempts
            r"powershell",  # PowerShell execution
            r"<script",  # Script tags
            r"javascript:",  # JavaScript URLs
        ]

        for pattern in formula_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
            if matches:
                threats.append(f"Potential formula injection: {pattern}")

        # Check for suspicious URLs
        url_patterns = [
            r"https?://[^\s,]+\.exe",  # URLs ending in .exe
            r"ftp://[^\s,]+",  # FTP URLs
            r"file://[^\s,]+",  # File URLs
        ]

        for pattern in url_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                threats.append(f"Suspicious URL pattern: {pattern}")

        return threats

    def _parse_csv_fields(self, line: str) -> list[str]:
        """Simple CSV field parsing for security (not full CSV parser)"""
        # Handle quoted fields properly
        fields = []
        current_field = ""
        in_quotes = False

        i = 0
        while i < len(line):
            char = line[i]

            if char == '"' and (i == 0 or line[i - 1] != "\\"):
                in_quotes = not in_quotes
                current_field += char
            elif char == "," and not in_quotes:
                fields.append(current_field.strip())
                current_field = ""
            else:
                current_field += char
            i += 1

        # Add the last field
        if current_field or line.endswith(","):
            fields.append(current_field.strip())

        return fields

    def _sanitize_field(self, field: str) -> tuple[str, list[str]]:
        """Sanitize individual CSV field"""
        changes = []

        # Remove quotes for processing
        if field.startswith('"') and field.endswith('"'):
            field = field[1:-1]
            was_quoted = True
        else:
            was_quoted = False

        # 1. Check for dangerous formula prefixes
        for prefix in self.DANGEROUS_PREFIXES:
            if field.startswith(prefix):
                # Replace dangerous prefix with safe alternative
                field = "'" + field  # Prepend single quote to make it literal
                changes.append(f"Formula prefix '{prefix}' neutralized")
                break

        # 2. Escape special characters that could be interpreted as formulas
        dangerous_chars = ["=", "+", "-", "@"]
        if any(field.startswith(char) for char in dangerous_chars):
            if not field.startswith("'"):  # Don't double-escape
                field = "'" + field
                changes.append("Dangerous character escaped")

        # 3. Remove or escape DDE and other function calls
        dde_pattern = r"(DDE|CMD|POWERSHELL)\s*\("
        if re.search(dde_pattern, field, re.IGNORECASE):
            field = re.sub(dde_pattern, r"'\1(", field, flags=re.IGNORECASE)
            changes.append("DDE/CMD function neutralized")

        # 4. Sanitize URLs in fields
        field = re.sub(r"javascript:", "javascript_", field, flags=re.IGNORECASE)
        if "javascript_" in field.lower():
            changes.append("JavaScript URL sanitized")

        # 5. Limit field length
        if len(field) > self.MAX_FIELD_LENGTH:
            field = field[: self.MAX_FIELD_LENGTH] + "...[TRUNCATED]"
            changes.append(f"Field truncated to {self.MAX_FIELD_LENGTH} characters")

        # Restore quotes if needed
        if was_quoted or "," in field or '"' in field:
            field = '"' + field.replace('"', '""') + '"'

        return field, changes


def validate_and_sanitize_csv(file_content: bytes, filename: str) -> dict[str, Any]:
    """
    Main function to validate and sanitize CSV uploads

    Args:
        file_content: Raw file content
        filename: Original filename

    Returns:
        Dict with validation results and sanitized content

    Raises:
        CSVSecurityError: If validation fails
    """
    validator = CSVSecurityValidator()

    # Validate file
    validation_result = validator.validate_file_upload(file_content, filename)

    # If validation passes, sanitize content
    try:
        content_str = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        content_str = file_content.decode("latin1")

    sanitized_content, sanitization_changes = validator.sanitize_csv_content(
        content_str
    )

    return {
        "validation": validation_result,
        "sanitized_content": sanitized_content,
        "sanitization_changes": sanitization_changes,
        "original_size": len(file_content),
        "sanitized_size": len(sanitized_content.encode("utf-8")),
        "security_status": "secure"
        if not validation_result["security_issues"]
        else "sanitized",
    }
