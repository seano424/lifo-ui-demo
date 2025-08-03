"""Logging utilities for LIFO AI Core"""

import json
import sys
from datetime import datetime
from typing import Any

from loguru import logger


class StructuredLogger:
    """Structured logger for LIFO AI Core"""

    def __init__(self, service_name: str = "lifo_ai_core", log_level: str = "INFO"):
        self.service_name = service_name
        self.log_level = log_level
        self._setup_logger()

    def _setup_logger(self) -> None:
        """Setup loguru with structured logging"""
        # Remove default logger
        logger.remove()

        # Add structured JSON logger
        logger.add(
            sys.stdout,
            level=self.log_level,
            format=self._json_formatter,
            colorize=False,
            serialize=False,
        )

        # Add file logger for errors
        logger.add(
            "logs/errors.log",
            level="ERROR",
            rotation="1 day",
            retention="30 days",
            format=self._json_formatter,
            serialize=False,
        )

    def _json_formatter(self, record) -> str:
        """Format log record as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record["level"].name,
            "service": self.service_name,
            "message": record["message"],
            "module": record["name"],
            "function": record["function"],
            "line": record["line"],
        }

        # Add extra fields if present
        if record.get("extra"):
            log_entry.update(record["extra"])

        # Add exception info if present
        if record.get("exception"):
            try:
                exc_info = record["exception"]
                log_entry["exception"] = {
                    "type": getattr(exc_info.type, '__name__', str(exc_info.type)) if hasattr(exc_info, 'type') else 'Unknown',
                    "value": str(exc_info.value) if hasattr(exc_info, 'value') else str(exc_info),
                    "traceback": exc_info.traceback.format() if hasattr(exc_info, 'traceback') and hasattr(exc_info.traceback, 'format') else 'No traceback available',
                }
            except AttributeError as e:
                log_entry["exception"] = {
                    "type": "ExceptionParsingError",
                    "value": f"Failed to parse exception: {e}",
                    "traceback": "Unable to extract traceback"
                }

        return json.dumps(log_entry)

    def info(self, message: str, **kwargs) -> None:
        """Log info message with extra fields"""
        logger.bind(**kwargs).info(message)

    def error(self, message: str, **kwargs) -> None:
        """Log error message with extra fields"""
        logger.bind(**kwargs).error(message)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with extra fields"""
        logger.bind(**kwargs).warning(message)

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with extra fields"""
        logger.bind(**kwargs).debug(message)

    def exception(self, message: str, **kwargs):
        """Log exception with traceback"""
        logger.bind(**kwargs).exception(message)


# Global logger instance
_logger = None


def get_logger(service_name: str = "lifo_ai_core", log_level: str = "INFO") -> StructuredLogger:
    """Get or create logger instance"""
    global _logger
    if _logger is None:
        _logger = StructuredLogger(service_name, log_level)
    return _logger


# Convenience functions
def log_scoring_event(store_id: str, batch_count: int, processing_time: float) -> None:
    """Log scoring event with structured data"""
    get_logger().info(
        "Scoring completed",
        event_type="scoring_completed",
        store_id=store_id,
        batch_count=batch_count,
        processing_time_seconds=processing_time,
    )


def log_csv_processing(
    store_id: str, filename: str, row_count: int, success_count: int, error_count: int
) -> None:
    """Log CSV processing event"""
    get_logger().info(
        "CSV processing completed",
        event_type="csv_processed",
        store_id=store_id,
        filename=filename,
        total_rows=row_count,
        successful_rows=success_count,
        error_rows=error_count,
        success_rate=round((success_count / row_count) * 100, 2) if row_count > 0 else 0,
    )


def log_database_operation(
    operation: str, table: str, affected_rows: int, execution_time: float
) -> None:
    """Log database operation"""
    get_logger().info(
        f"Database {operation} completed",
        event_type="database_operation",
        operation=operation,
        table=table,
        affected_rows=affected_rows,
        execution_time_ms=round(execution_time * 1000, 2),
    )


def log_error_with_context(error: Exception, context: dict[str, Any]) -> None:
    """Log error with additional context"""
    get_logger().exception(f"Error occurred: {error!s}", error_type=type(error).__name__, **context)
