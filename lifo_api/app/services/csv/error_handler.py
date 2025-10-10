"""
Unified Error Handling and Response Formatting for CSV Processing
Consolidates all error handling and response formatting logic
"""

from datetime import datetime
from enum import Enum
from typing import Any

import structlog
from fastapi import HTTPException

logger = structlog.get_logger()


class ErrorSeverity(Enum):
    """Error severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorType(Enum):
    """Error type categories"""

    SECURITY = "security"
    VALIDATION = "validation"
    PARSING = "parsing"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    PERFORMANCE = "performance"


class CSVError:
    """Represents a single CSV processing error"""

    def __init__(
        self,
        message: str,
        error_type: ErrorType,
        severity: ErrorSeverity,
        row_number: int | None = None,
        column: str | None = None,
        field_value: str | None = None,
        suggestion: str | None = None,
        error_code: str | None = None,
    ):
        self.message = message
        self.error_type = error_type
        self.severity = severity
        self.row_number = row_number
        self.column = column
        self.field_value = field_value
        self.suggestion = suggestion
        self.error_code = error_code
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> dict[str, Any]:
        """Convert error to dictionary format"""
        error_dict = {
            "message": self.message,
            "type": self.error_type.value,
            "severity": self.severity.value,
            "timestamp": self.timestamp.isoformat(),
        }

        if self.row_number is not None:
            error_dict["row"] = self.row_number
        if self.column:
            error_dict["column"] = self.column
        if self.field_value:
            error_dict["value"] = self.field_value
        if self.suggestion:
            error_dict["suggestion"] = self.suggestion
        if self.error_code:
            error_dict["code"] = self.error_code

        return error_dict


class CSVErrorHandler:
    """
    Unified error handling and response formatting service
    Consolidates duplicate error handling logic from multiple modules
    """

    def __init__(self):
        self.logger = logger.bind(component="csv_error_handler")
        self.errors: list[CSVError] = []
        self.warnings: list[CSVError] = []
        self.processing_stats = {
            "total_rows": 0,
            "processed_rows": 0,
            "skipped_rows": 0,
            "error_rows": 0,
            "warning_rows": 0,
        }

    def clear_errors(self) -> None:
        """Clear all errors and warnings"""
        self.errors.clear()
        self.warnings.clear()
        self.processing_stats = {
            "total_rows": 0,
            "processed_rows": 0,
            "skipped_rows": 0,
            "error_rows": 0,
            "warning_rows": 0,
        }

    def add_error(
        self,
        message: str,
        error_type: ErrorType = ErrorType.VALIDATION,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        row_number: int | None = None,
        column: str | None = None,
        field_value: str | None = None,
        suggestion: str | None = None,
        error_code: str | None = None,
    ) -> None:
        """Add an error to the collection"""
        error = CSVError(
            message=message,
            error_type=error_type,
            severity=severity,
            row_number=row_number,
            column=column,
            field_value=field_value,
            suggestion=suggestion,
            error_code=error_code,
        )

        if severity in [ErrorSeverity.WARNING, ErrorSeverity.INFO]:
            self.warnings.append(error)
            if row_number:
                self.processing_stats["warning_rows"] += 1
        else:
            self.errors.append(error)
            if row_number:
                self.processing_stats["error_rows"] += 1

        self.logger.info(
            "CSV error recorded",
            error_type=error_type.value,
            severity=severity.value,
            row=row_number,
            message=message[:100],  # Truncate for logging
        )

    def add_validation_error(
        self,
        field: str,
        value: Any,
        message: str,
        row_number: int | None = None,
        suggestion: str | None = None,
    ) -> None:
        """Add a validation error with standardized formatting"""
        formatted_message = f"Invalid {field}: {message}"
        if row_number:
            formatted_message = f"Row {row_number}: {formatted_message}"

        self.add_error(
            message=formatted_message,
            error_type=ErrorType.VALIDATION,
            severity=ErrorSeverity.ERROR,
            row_number=row_number,
            column=field,
            field_value=str(value) if value is not None else None,
            suggestion=suggestion,
            error_code=f"VALIDATION_{field.upper()}_INVALID",
        )

    def add_security_error(
        self,
        message: str,
        row_number: int | None = None,
        column: str | None = None,
        field_value: str | None = None,
    ) -> None:
        """Add a security error"""
        self.add_error(
            message=message,
            error_type=ErrorType.SECURITY,
            severity=ErrorSeverity.CRITICAL,
            row_number=row_number,
            column=column,
            field_value=field_value,
            error_code="SECURITY_VIOLATION",
        )

    def add_parsing_error(
        self, message: str, row_number: int | None = None, suggestion: str | None = None
    ) -> None:
        """Add a parsing error"""
        self.add_error(
            message=message,
            error_type=ErrorType.PARSING,
            severity=ErrorSeverity.ERROR,
            row_number=row_number,
            suggestion=suggestion,
            error_code="PARSING_FAILED",
        )

    def add_business_warning(
        self,
        message: str,
        row_number: int | None = None,
        column: str | None = None,
        suggestion: str | None = None,
    ) -> None:
        """Add a business logic warning"""
        self.add_error(
            message=message,
            error_type=ErrorType.BUSINESS_LOGIC,
            severity=ErrorSeverity.WARNING,
            row_number=row_number,
            column=column,
            suggestion=suggestion,
            error_code="BUSINESS_WARNING",
        )

    def update_stats(
        self, total_rows: int = 0, processed_rows: int = 0, skipped_rows: int = 0
    ) -> None:
        """Update processing statistics"""
        if total_rows > 0:
            self.processing_stats["total_rows"] = total_rows
        if processed_rows > 0:
            self.processing_stats["processed_rows"] = processed_rows
        if skipped_rows > 0:
            self.processing_stats["skipped_rows"] = skipped_rows

    def has_critical_errors(self) -> bool:
        """Check if there are any critical errors"""
        return any(error.severity == ErrorSeverity.CRITICAL for error in self.errors)

    def has_errors(self) -> bool:
        """Check if there are any errors (excluding warnings)"""
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        """Check if there are any warnings"""
        return len(self.warnings) > 0

    def get_error_summary(self) -> dict[str, Any]:
        """Get summary of errors by type and severity"""
        summary = {
            "total_errors": len(self.errors),
            "total_warnings": len(self.warnings),
            "by_type": {},
            "by_severity": {},
            "critical_count": 0,
            "error_count": 0,
            "warning_count": 0,
            "info_count": 0,
        }

        all_issues = self.errors + self.warnings

        for issue in all_issues:
            # Count by type
            type_key = issue.error_type.value
            summary["by_type"][type_key] = summary["by_type"].get(type_key, 0) + 1

            # Count by severity
            severity_key = issue.severity.value
            summary["by_severity"][severity_key] = (
                summary["by_severity"].get(severity_key, 0) + 1
            )

            # Count totals
            if issue.severity == ErrorSeverity.CRITICAL:
                summary["critical_count"] += 1
            elif issue.severity == ErrorSeverity.ERROR:
                summary["error_count"] += 1
            elif issue.severity == ErrorSeverity.WARNING:
                summary["warning_count"] += 1
            elif issue.severity == ErrorSeverity.INFO:
                summary["info_count"] += 1

        return summary

    def format_errors_for_response(self, limit: int = 50) -> list[dict[str, Any]]:
        """Format errors for API response with limit"""
        error_list = []

        # Include all critical errors first
        critical_errors = [
            e for e in self.errors if e.severity == ErrorSeverity.CRITICAL
        ]
        for error in critical_errors[:limit]:
            error_list.append(error.to_dict())

        # Add other errors up to limit
        remaining_limit = limit - len(error_list)
        if remaining_limit > 0:
            other_errors = [
                e for e in self.errors if e.severity != ErrorSeverity.CRITICAL
            ]
            for error in other_errors[:remaining_limit]:
                error_list.append(error.to_dict())

        return error_list

    def format_warnings_for_response(self, limit: int = 20) -> list[dict[str, Any]]:
        """Format warnings for API response with limit"""
        return [warning.to_dict() for warning in self.warnings[:limit]]

    def create_success_response(
        self, data: Any, processing_id: str = None, metadata: dict[str, Any] = None
    ) -> dict[str, Any]:
        """Create standardized success response"""
        response = {
            "success": True,
            "status": "completed",
            "data": data,
            "processing_stats": self.processing_stats,
            "errors": self.format_errors_for_response(),
            "warnings": self.format_warnings_for_response(),
            "error_summary": self.get_error_summary(),
            "processed_at": datetime.utcnow().isoformat(),
        }

        if processing_id:
            response["processing_id"] = processing_id

        if metadata:
            response["metadata"] = metadata

        return response

    def create_error_response(
        self,
        message: str,
        status_code: int = 400,
        processing_id: str = None,
        metadata: dict[str, Any] = None,
    ) -> dict[str, Any]:
        """Create standardized error response"""
        response = {
            "success": False,
            "status": "failed",
            "error": message,
            "processing_stats": self.processing_stats,
            "errors": self.format_errors_for_response(),
            "warnings": self.format_warnings_for_response(),
            "error_summary": self.get_error_summary(),
            "failed_at": datetime.utcnow().isoformat(),
        }

        if processing_id:
            response["processing_id"] = processing_id

        if metadata:
            response["metadata"] = metadata

        return response

    def create_validation_response(self) -> dict[str, Any]:
        """Create response for validation-only operations"""
        is_valid = not self.has_errors()

        response = {
            "valid": is_valid,
            "status": "validated",
            "processing_stats": self.processing_stats,
            "errors": self.format_errors_for_response(),
            "warnings": self.format_warnings_for_response(),
            "error_summary": self.get_error_summary(),
            "validated_at": datetime.utcnow().isoformat(),
        }

        return response

    def raise_if_critical(self) -> None:
        """Raise HTTPException if there are critical errors"""
        if self.has_critical_errors():
            critical_errors = [
                e for e in self.errors if e.severity == ErrorSeverity.CRITICAL
            ]

            error_messages = [e.message for e in critical_errors[:3]]  # First 3 errors
            combined_message = "; ".join(error_messages)

            if len(critical_errors) > 3:
                combined_message += (
                    f" (and {len(critical_errors) - 3} more critical errors)"
                )

            raise HTTPException(status_code=400, detail=combined_message)

    def get_performance_metrics(self) -> dict[str, Any]:
        """Get performance metrics for monitoring"""
        total_issues = len(self.errors) + len(self.warnings)
        total_rows = self.processing_stats["total_rows"]

        return {
            "error_rate": (len(self.errors) / total_rows * 100)
            if total_rows > 0
            else 0,
            "warning_rate": (len(self.warnings) / total_rows * 100)
            if total_rows > 0
            else 0,
            "success_rate": (self.processing_stats["processed_rows"] / total_rows * 100)
            if total_rows > 0
            else 0,
            "total_issues": total_issues,
            "critical_issues": sum(
                1 for e in self.errors if e.severity == ErrorSeverity.CRITICAL
            ),
            "rows_per_error": total_rows / len(self.errors)
            if len(self.errors) > 0
            else total_rows,
        }


# Global instance
_error_handler = None


def get_csv_error_handler() -> CSVErrorHandler:
    """Get or create the global CSV error handler instance"""
    global _error_handler
    if _error_handler is None:
        _error_handler = CSVErrorHandler()
    return _error_handler


def create_new_error_handler() -> CSVErrorHandler:
    """Create a new error handler instance for isolated processing"""
    return CSVErrorHandler()
