"""
Unified CSV Processing Services Package
Consolidates all CSV processing functionality to eliminate duplicate code
"""

from .category_mapper import CategoryMappingService, get_category_mapper
from .error_handler import (
    CSVError,
    CSVErrorHandler,
    ErrorSeverity,
    ErrorType,
    create_new_error_handler,
    get_csv_error_handler,
)
from .parsing_engine import CSVParsingEngine, get_csv_parsing_engine
from .security_validator import CSVSecurityValidator, get_csv_security_validator
from .template_generator import CSVTemplateGenerator, get_csv_template_generator
from .unified_csv_service import UnifiedCSVService, create_unified_csv_service

__all__ = [
    # Main service
    "UnifiedCSVService",
    "create_unified_csv_service",
    # Component services
    "CSVSecurityValidator",
    "get_csv_security_validator",
    "CSVParsingEngine",
    "get_csv_parsing_engine",
    "CategoryMappingService",
    "get_category_mapper",
    "CSVTemplateGenerator",
    "get_csv_template_generator",
    # Error handling
    "CSVErrorHandler",
    "CSVError",
    "ErrorType",
    "ErrorSeverity",
    "get_csv_error_handler",
    "create_new_error_handler",
]
