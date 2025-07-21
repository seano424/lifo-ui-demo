"""
Logging configuration for LIFO AI Engine
Provides structured logging with proper formatting and levels
"""

import logging
import sys
from pathlib import Path

import structlog

from app.core.config import settings


def setup_logging():
    """
    Configure structured logging for the application
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )

    # Configure structlog
    structlog.configure(
        processors=[
            # Filter out log level
            structlog.stdlib.filter_by_level,
            # Add log level to event dict
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Add call site information
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.LINENO,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                ]
            ),
            # Stack unwinder for exceptions
            structlog.processors.StackInfoRenderer(),
            # Format exceptions
            structlog.processors.format_exc_info,
            # Unicode handling
            structlog.processors.UnicodeDecoder(),
            # JSON formatting for production, key-value for development
            structlog.processors.JSONRenderer()
            if settings.environment == "production"
            else structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None):
    """
    Get a structured logger instance
    """
    return structlog.get_logger(name) if name else structlog.get_logger()
