"""
Unified CSV Security Validation Service
Consolidates all security validation logic across CSV processing modules
"""

import re

import chardet
import magic
import structlog
from fastapi import HTTPException, UploadFile

logger = structlog.get_logger()


class CSVSecurityValidator:
    """
    Centralized CSV security validation service
    Consolidates duplicate security logic from multiple modules
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

    # Consolidated dangerous patterns from all modules
    DANGEROUS_PATTERNS = [
        r"^[=@+\-]",  # Excel formulas
        r"^\t",  # Tab characters
        r"^\r",  # Carriage return
        r"cmd\s*\(",  # Command execution
        r"powershell",  # PowerShell
        r"script",  # Script tags
        r"javascript:",  # JavaScript
        r"vbscript:",  # VBScript
        r"system\s*\(",  # System calls
        r"exec\s*\(",  # Execution
        r"eval\s*\(",  # Evaluation
        r"<script",  # XSS
        r"data:",  # Data URIs
    ]

    # Filename security patterns
    DANGEROUS_FILENAME_PATTERNS = [
        r"\.\./",  # Path traversal
        r"\\",  # Windows path separator
        r"[<>:\"\/\\|?*]",  # Windows invalid chars
        r"^\.",  # Hidden files
        r"^\$",  # System files
    ]

    def __init__(self):
        self.logger = logger.bind(component="csv_security_validator")

    async def validate_file_security(
        self, file: UploadFile = None, file_content: bytes = None, file_path: str = None
    ) -> None:
        """
        Comprehensive file security validation

        Args:
            file: FastAPI UploadFile object
            file_content: Raw file content bytes
            file_path: File path for validation

        Raises:
            HTTPException: If security validation fails
        """
        try:
            # Get content for validation
            content = file_content
            if file and not content:
                content = await file.read()
                await file.seek(0)  # Reset file pointer

            # File size validation
            if content and len(content) > self.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {self.MAX_FILE_SIZE / 1024 / 1024:.1f}MB",
                )

            # MIME type validation
            if content:
                mime_type = magic.from_buffer(content, mime=True)
                if mime_type not in self.ALLOWED_MIME_TYPES:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file type: {mime_type}. Expected CSV file.",
                    )

            # Filename validation
            if file and file.filename:
                self._validate_filename_security(file.filename)
            elif file_path:
                import os

                filename = os.path.basename(file_path)
                self._validate_filename_security(filename)

            # Content validation
            if content:
                self._validate_content_security(content)

            # Encoding validation
            if content:
                self._validate_encoding_security(content)

            self.logger.info("CSV file security validation passed")

        except HTTPException:
            raise
        except Exception as e:
            self.logger.error("CSV security validation failed", error=str(e))
            raise HTTPException(
                status_code=500, detail=f"Security validation failed: {str(e)}"
            ) from e

    def _validate_filename_security(self, filename: str) -> None:
        """Validate filename security"""
        for pattern in self.DANGEROUS_FILENAME_PATTERNS:
            if re.search(pattern, filename, re.IGNORECASE):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid filename. Contains dangerous characters",
                )

        # Check file extension
        if not filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    def _validate_content_security(self, content: bytes) -> None:
        """Validate file content security"""
        # Check for binary content indicators
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

        # Try to decode as text for further validation
        try:
            text_content = content.decode("utf-8")

            # Check for null bytes (binary indicator)
            if "\x00" in text_content:
                raise HTTPException(
                    status_code=400, detail="File contains binary data, not CSV"
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

        except UnicodeDecodeError as e:
            raise HTTPException(
                status_code=400, detail="File is not valid UTF-8 text"
            ) from e

    def _validate_encoding_security(self, content: bytes) -> None:
        """Validate file encoding security"""
        encoding_result = chardet.detect(content)

        if encoding_result["confidence"] < 0.7:
            raise HTTPException(
                status_code=400,
                detail="File encoding is uncertain or potentially malicious",
            )

        # Only allow safe encodings
        safe_encodings = ["utf-8", "ascii"]
        detected_encoding = encoding_result.get("encoding", "").lower()

        if detected_encoding not in safe_encodings:
            self.logger.warning(
                "Non-UTF-8 encoding detected",
                detected_encoding=detected_encoding,
                confidence=encoding_result["confidence"],
            )

    def validate_csv_content_patterns(self, csv_content: str) -> None:
        """
        Validate CSV content for dangerous patterns

        Args:
            csv_content: Decoded CSV content string

        Raises:
            HTTPException: If dangerous patterns detected
        """
        # Check content length
        if len(csv_content) > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="CSV content too large")

        # Check for dangerous patterns in content
        combined_pattern = "|".join(self.DANGEROUS_PATTERNS)

        if re.search(combined_pattern, csv_content, re.IGNORECASE | re.MULTILINE):
            raise HTTPException(
                status_code=400, detail="CSV contains suspicious content patterns"
            )

        # Check for excessive special characters
        special_char_count = sum(
            1
            for char in csv_content
            if not char.isalnum() and char not in ' ,.:-_\n\r\t"'
        )

        if special_char_count > len(csv_content) * 0.1:  # More than 10% special chars
            raise HTTPException(
                status_code=400, detail="CSV contains excessive special characters"
            )

    def sanitize_csv_cell(self, value: str) -> str:
        """
        Sanitize CSV cell content to prevent injection

        Args:
            value: Raw cell content

        Returns:
            Sanitized cell content
        """
        if not value:
            return ""

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

    def validate_csv_structure_limits(self, rows: list[list[str]]) -> None:
        """
        Validate CSV structure against security limits

        Args:
            rows: Parsed CSV rows

        Raises:
            HTTPException: If limits exceeded
        """
        if len(rows) > self.MAX_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Too many rows. Maximum: {self.MAX_ROWS}",
            )

        for row_idx, row in enumerate(rows):
            if len(row) > self.MAX_COLUMNS:
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


# Global instance
_security_validator = None


def get_csv_security_validator() -> CSVSecurityValidator:
    """Get or create the global CSV security validator instance"""
    global _security_validator
    if _security_validator is None:
        _security_validator = CSVSecurityValidator()
    return _security_validator
