"""
Comprehensive input validation and sanitization for security hardening
Prevents injection attacks, data validation, and input sanitization
"""

import html
import re
import urllib.parse
import uuid
from typing import Any

import structlog
from fastapi import HTTPException

logger = structlog.get_logger()


class InputValidationError(Exception):
    """Custom exception for input validation failures"""

    pass


class SecurityInputValidator:
    """
    Comprehensive input validation and sanitization system
    Designed to prevent injection attacks and ensure data integrity
    """

    def __init__(self):
        # SQL injection patterns
        self.sql_injection_patterns = [
            r"(\s|^)(select|union|insert|update|delete|drop|create|alter|exec|execute)\s",
            r"(--|#|/\*|\*/)",
            r"(;|\||&)",
            r"(0x[0-9a-f]+)",
            r"(char\(|ascii\(|substring\()",
            r"(\bor\b|\band\b)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?",
            r"(\bor\b|\band\b)\s+['\"]?[a-z]+['\"]?\s*=\s*['\"]?[a-z]+['\"]?",
        ]

        # XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"onclick\s*=",
            r"onmouseover\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<form[^>]*>",
        ]

        # Command injection patterns
        self.command_injection_patterns = [
            r"[;&|`$]",
            r"\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl)\b",
            r"(\.\./){2,}",
            r"(\\x[0-9a-f]{2})+",
        ]

        # Path traversal patterns
        self.path_traversal_patterns = [
            r"\.\.\/",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
            r"..%2f",
            r"..%5c",
        ]

        # Compiled regex patterns for performance
        self.compiled_patterns = {
            "sql": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.sql_injection_patterns
            ],
            "xss": [
                re.compile(pattern, re.IGNORECASE) for pattern in self.xss_patterns
            ],
            "cmd": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.command_injection_patterns
            ],
            "path": [
                re.compile(pattern, re.IGNORECASE)
                for pattern in self.path_traversal_patterns
            ],
        }

    def validate_and_sanitize_input(
        self,
        value: Any,
        input_type: str = "general",
        max_length: int | None = None,
        allow_html: bool = False,
        strict_mode: bool = True,
    ) -> Any:
        """
        Comprehensive input validation and sanitization

        Args:
            value: Input value to validate
            input_type: Type of input (general, sql, email, url, etc.)
            max_length: Maximum allowed length
            allow_html: Whether to allow HTML content
            strict_mode: Enable strict validation mode

        Returns:
            Sanitized and validated input

        Raises:
            InputValidationError: If validation fails
        """
        if value is None:
            return None

        # Convert to string for validation
        str_value = str(value)

        # Check length limits
        if max_length and len(str_value) > max_length:
            raise InputValidationError(
                f"Input exceeds maximum length of {max_length} characters"
            )

        # Check for null bytes
        if "\x00" in str_value:
            raise InputValidationError("Null bytes not allowed in input")

        # Perform type-specific validation
        if input_type == "sql":
            self._validate_sql_input(str_value, strict_mode)
        elif input_type == "email":
            return self._validate_email(str_value)
        elif input_type == "url":
            return self._validate_url(str_value)
        elif input_type == "uuid":
            return self._validate_uuid(str_value)
        elif input_type == "alphanumeric":
            return self._validate_alphanumeric(str_value)
        elif input_type == "filename":
            return self._validate_filename(str_value)
        elif input_type == "store_id":
            return self._validate_store_id(str_value)
        elif input_type == "batch_id":
            return self._validate_batch_id(str_value)

        # General validation for all inputs
        if strict_mode:
            self._validate_against_injection_attacks(str_value)

        # Sanitize HTML if not allowed
        if not allow_html:
            str_value = html.escape(str_value)

        # URL decode and validate
        str_value = self._safe_url_decode(str_value)

        return str_value

    def _validate_sql_input(self, value: str, strict_mode: bool = True):
        """Validate input that will be used in SQL contexts"""
        for pattern in self.compiled_patterns["sql"]:
            if pattern.search(value):
                logger.warning(
                    "SQL injection attempt detected",
                    pattern=pattern.pattern,
                    value=value[:50],
                )
                raise InputValidationError(
                    "Input contains potentially dangerous SQL patterns"
                )

    def _validate_against_injection_attacks(self, value: str):
        """Validate against various injection attack patterns"""

        # Check for XSS patterns
        for pattern in self.compiled_patterns["xss"]:
            if pattern.search(value):
                logger.warning(
                    "XSS attempt detected", pattern=pattern.pattern, value=value[:50]
                )
                raise InputValidationError(
                    "Input contains potentially dangerous script content"
                )

        # Check for command injection patterns
        for pattern in self.compiled_patterns["cmd"]:
            if pattern.search(value):
                logger.warning(
                    "Command injection attempt detected",
                    pattern=pattern.pattern,
                    value=value[:50],
                )
                raise InputValidationError(
                    "Input contains potentially dangerous command patterns"
                )

        # Check for path traversal patterns
        for pattern in self.compiled_patterns["path"]:
            if pattern.search(value):
                logger.warning(
                    "Path traversal attempt detected",
                    pattern=pattern.pattern,
                    value=value[:50],
                )
                raise InputValidationError(
                    "Input contains potentially dangerous path patterns"
                )

    def _validate_email(self, email: str) -> str:
        """Validate email format"""
        email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        if not email_pattern.match(email):
            raise InputValidationError("Invalid email format")

        # Additional security checks
        if len(email) > 254:  # RFC 5321 limit
            raise InputValidationError("Email address too long")

        return email.lower().strip()

    def _validate_url(self, url: str) -> str:
        """Validate URL format and security"""
        # Basic URL validation
        url_pattern = re.compile(
            r"^https?://"  # http:// or https://
            r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
            r"localhost|"  # localhost...
            r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
            r"(?::\d+)?"  # optional port
            r"(?:/?|[/?]\S+)$",
            re.IGNORECASE,
        )

        if not url_pattern.match(url):
            raise InputValidationError("Invalid URL format")

        # Security checks
        parsed_url = urllib.parse.urlparse(url)

        # Block dangerous schemes
        dangerous_schemes = ["javascript", "data", "vbscript", "file", "ftp"]
        if parsed_url.scheme.lower() in dangerous_schemes:
            raise InputValidationError("Dangerous URL scheme detected")

        # Block private IP ranges in production
        if parsed_url.hostname:
            if self._is_private_ip(parsed_url.hostname):
                logger.warning(
                    "Private IP access attempt", hostname=parsed_url.hostname
                )
                raise InputValidationError("Access to private IP ranges not allowed")

        return url

    def _validate_uuid(self, uuid_str: str) -> str:
        """Validate UUID format"""
        try:
            uuid_obj = uuid.UUID(uuid_str)
            return str(uuid_obj)
        except ValueError as e:
            raise InputValidationError("Invalid UUID format") from e

    def _validate_alphanumeric(self, value: str) -> str:
        """Validate alphanumeric input with basic special characters"""
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", value):
            raise InputValidationError(
                "Input must contain only alphanumeric characters, hyphens, underscores, and dots"
            )
        return value

    def _validate_filename(self, filename: str) -> str:
        """Validate filename for security"""
        # Check for dangerous characters
        dangerous_chars = ["<", ">", ":", '"', "|", "?", "*", "\x00"]
        if any(char in filename for char in dangerous_chars):
            raise InputValidationError("Filename contains dangerous characters")

        # Check for path traversal
        if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
            raise InputValidationError("Filename contains path traversal patterns")

        # Check length
        if len(filename) > 255:
            raise InputValidationError("Filename too long")

        # Check for reserved names (Windows)
        reserved_names = [
            "CON",
            "PRN",
            "AUX",
            "NUL",
            "COM1",
            "COM2",
            "COM3",
            "COM4",
            "COM5",
            "COM6",
            "COM7",
            "COM8",
            "COM9",
            "LPT1",
            "LPT2",
            "LPT3",
            "LPT4",
            "LPT5",
            "LPT6",
            "LPT7",
            "LPT8",
            "LPT9",
        ]
        if filename.upper().split(".")[0] in reserved_names:
            raise InputValidationError("Filename uses reserved system name")

        return filename

    def _validate_store_id(self, store_id: str) -> str:
        """Validate store ID format"""
        # Store IDs should be alphanumeric with hyphens/underscores
        if not re.match(r"^[a-zA-Z0-9_\-]{1,50}$", store_id):
            raise InputValidationError("Invalid store ID format")
        return store_id

    def _validate_batch_id(self, batch_id: str) -> str:
        """Validate batch ID format"""
        # Batch IDs should be alphanumeric with hyphens/underscores
        if not re.match(r"^[a-zA-Z0-9_\-]{1,50}$", batch_id):
            raise InputValidationError("Invalid batch ID format")
        return batch_id

    def _safe_url_decode(self, value: str) -> str:
        """Safely URL decode input"""
        try:
            # Single URL decode to handle encoded attacks
            decoded = urllib.parse.unquote(value)

            # Check if double encoding is present (potential attack)
            double_decoded = urllib.parse.unquote(decoded)
            if decoded != double_decoded:
                logger.warning("Double URL encoding detected", original=value[:50])
                # Return original to prevent double-decoding attacks
                return value

            return decoded
        except Exception:
            # If decoding fails, return original
            return value

    def _is_private_ip(self, hostname: str) -> bool:
        """Check if hostname is a private IP address"""
        try:
            import ipaddress

            ip = ipaddress.ip_address(hostname)
            return ip.is_private
        except ValueError:
            # Not an IP address
            return False

    def validate_json_input(
        self, json_data: dict[str, Any], max_depth: int = 10
    ) -> dict[str, Any]:
        """Validate JSON input for security issues"""
        if not isinstance(json_data, dict):
            raise InputValidationError("Input must be a JSON object")

        # Check depth to prevent deeply nested attacks
        def check_depth(obj, depth=0):
            if depth > max_depth:
                raise InputValidationError(f"JSON depth exceeds maximum of {max_depth}")

            if isinstance(obj, dict):
                for key, value in obj.items():
                    # Validate keys
                    self.validate_and_sanitize_input(key, max_length=100)
                    check_depth(value, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    check_depth(item, depth + 1)

        check_depth(json_data)
        return json_data

    def sanitize_log_input(self, value: Any) -> str:
        """Sanitize input for safe logging"""
        if value is None:
            return "None"

        str_value = str(value)

        # Truncate long values
        if len(str_value) > 200:
            str_value = str_value[:197] + "..."

        # Remove control characters
        str_value = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", str_value)

        # Remove potential log injection patterns
        str_value = (
            str_value.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
        )

        return str_value


# Global validator instance
security_validator = SecurityInputValidator()


def validate_input(
    value: Any,
    input_type: str = "general",
    max_length: int | None = None,
    allow_html: bool = False,
    strict_mode: bool = True,
) -> Any:
    """
    Shorthand function for input validation

    Args:
        value: Input value to validate
        input_type: Type of input validation to apply
        max_length: Maximum allowed length
        allow_html: Whether to allow HTML content
        strict_mode: Enable strict validation mode

    Returns:
        Validated and sanitized input

    Raises:
        HTTPException: If validation fails
    """
    try:
        return security_validator.validate_and_sanitize_input(
            value, input_type, max_length, allow_html, strict_mode
        )
    except InputValidationError as e:
        logger.warning("Input validation failed", error=str(e), input_type=input_type)
        raise HTTPException(
            status_code=400, detail=f"Input validation failed: {str(e)}"
        ) from e


def validate_store_id_format(store_id: str) -> str:
    """Validate store ID with security checks"""
    return validate_input(store_id, "store_id")


def validate_batch_id_format(batch_id: str) -> str:
    """Validate batch ID with security checks"""
    return validate_input(batch_id, "batch_id")


def validate_email_format(email: str) -> str:
    """Validate email with security checks"""
    return validate_input(email, "email")


def validate_filename_format(filename: str) -> str:
    """Validate filename with security checks"""
    return validate_input(filename, "filename")


def sanitize_for_logging(value: Any) -> str:
    """Sanitize value for safe logging"""
    return security_validator.sanitize_log_input(value)
