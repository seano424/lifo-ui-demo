"""
Structured logging system for LIFO AI Engine
Centralized log aggregation with correlation IDs and business event tracking
"""

import logging
import sys
import uuid
from datetime import datetime, UTC
from typing import Any, Dict, Optional
from contextvars import ContextVar

import structlog
from structlog.contextvars import clear_contextvars

from app.core.config import settings
from app.monitoring.tracing import get_current_trace_id, get_current_span_id

# Context variables for correlation
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
session_id_var: ContextVar[str] = ContextVar("session_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class CorrelationProcessor:
    """Processor to add correlation IDs to log entries"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add correlation IDs
        event_dict["correlation_id"] = correlation_id_var.get() or str(uuid.uuid4())
        event_dict["session_id"] = session_id_var.get()
        event_dict["tenant_id"] = tenant_id_var.get()
        event_dict["user_id"] = user_id_var.get()
        event_dict["request_id"] = request_id_var.get()
        
        # Add tracing information
        trace_id = get_current_trace_id()
        span_id = get_current_span_id()
        
        if trace_id:
            event_dict["trace_id"] = trace_id
        if span_id:
            event_dict["span_id"] = span_id
        
        # Add service context
        event_dict["service"] = "lifo-ai-engine"
        event_dict["version"] = settings.api_version
        event_dict["environment"] = settings.environment
        
        return event_dict


class BusinessEventProcessor:
    """Processor for business event logging"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add business context if this is a business event
        if event_dict.get("event_type") == "business":
            event_dict["business_event"] = True
            
            # Ensure required business event fields
            if "operation" not in event_dict:
                event_dict["operation"] = "unknown"
            
            if "category" not in event_dict:
                event_dict["category"] = "general"
            
            # Add timestamp for business events
            event_dict["business_timestamp"] = datetime.now(UTC).isoformat()
        
        return event_dict


class PerformanceProcessor:
    """Processor for performance-related logging"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add performance context
        if any(key in event_dict for key in ["response_time_ms", "execution_time_ms", "processing_time_ms"]):
            event_dict["performance_event"] = True
            
            # Categorize performance
            response_time = (
                event_dict.get("response_time_ms") or 
                event_dict.get("execution_time_ms") or 
                event_dict.get("processing_time_ms")
            )
            
            if response_time:
                if response_time > 1000:
                    event_dict["performance_category"] = "slow"
                elif response_time > 500:
                    event_dict["performance_category"] = "medium"
                else:
                    event_dict["performance_category"] = "fast"
        
        return event_dict


class SecurityEventProcessor:
    """Processor for security-related logging"""
    
    def __call__(self, logger, method_name, event_dict):
        # Add security context
        if any(key in event_dict for key in ["auth_event", "security_event", "access_denied", "login", "logout"]):
            event_dict["security_event"] = True
            
            # Ensure IP address is logged for security events
            if "client_ip" not in event_dict:
                event_dict["client_ip"] = "unknown"
        
        return event_dict


class ErrorProcessor:
    """Processor for error logging with additional context"""
    
    def __call__(self, logger, method_name, event_dict):
        # Enhanced error processing
        if method_name in ["error", "exception"] or event_dict.get("error"):
            event_dict["error_event"] = True
            
            # Add error classification
            error_msg = str(event_dict.get("error", event_dict.get("event", "")))
            
            if any(term in error_msg.lower() for term in ["timeout", "connection", "network"]):
                event_dict["error_category"] = "network"
            elif any(term in error_msg.lower() for term in ["database", "sql", "query"]):
                event_dict["error_category"] = "database"
            elif any(term in error_msg.lower() for term in ["auth", "permission", "unauthorized"]):
                event_dict["error_category"] = "security"
            elif any(term in error_msg.lower() for term in ["validation", "invalid", "format"]):
                event_dict["error_category"] = "validation"
            else:
                event_dict["error_category"] = "application"
        
        return event_dict


def setup_structured_logging():
    """Configure structured logging for the application"""
    
    # Configure processors based on environment
    processors = [
        # Add correlation and context
        CorrelationProcessor(),
        BusinessEventProcessor(),
        PerformanceProcessor(),
        SecurityEventProcessor(),
        ErrorProcessor(),
        
        # Standard processors
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    # Add JSON formatter for production
    if settings.environment in ["production", "staging"]:
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Console-friendly format for development
        processors.append(
            structlog.dev.ConsoleRenderer(colors=True)
        )
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )


class StructuredLogger:
    """Enhanced structured logger with business event support"""
    
    def __init__(self, name: str):
        self.logger = structlog.get_logger(name)
    
    def set_correlation_context(
        self,
        correlation_id: Optional[str] = None,
        session_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """Set correlation context for current request"""
        
        if correlation_id:
            correlation_id_var.set(correlation_id)
        if session_id:
            session_id_var.set(session_id)
        if tenant_id:
            tenant_id_var.set(tenant_id)
        if user_id:
            user_id_var.set(user_id)
        if request_id:
            request_id_var.set(request_id)
    
    def clear_correlation_context(self):
        """Clear correlation context"""
        clear_contextvars()
    
    def log_business_event(
        self,
        operation: str,
        category: str,
        message: str,
        store_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        item_count: Optional[int] = None,
        processing_time_ms: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        level: str = "info"
    ):
        """Log business event with standardized structure"""
        
        event_data = {
            "event_type": "business",
            "operation": operation,
            "category": category,
            "message": message
        }
        
        if store_id:
            event_data["store_id"] = store_id
        if batch_id:
            event_data["batch_id"] = batch_id
        if item_count is not None:
            event_data["item_count"] = item_count
        if processing_time_ms is not None:
            event_data["processing_time_ms"] = processing_time_ms
        if metadata:
            event_data["metadata"] = metadata
        
        getattr(self.logger, level)(**event_data)
    
    def log_performance_event(
        self,
        operation: str,
        execution_time_ms: float,
        success: bool,
        result_count: Optional[int] = None,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log performance event"""
        
        event_data = {
            "event_type": "performance",
            "operation": operation,
            "execution_time_ms": execution_time_ms,
            "success": success
        }
        
        if result_count is not None:
            event_data["result_count"] = result_count
        if error:
            event_data["error"] = error
        if metadata:
            event_data["metadata"] = metadata
        
        level = "info" if success else "error"
        getattr(self.logger, level)(**event_data)
    
    def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log security event"""
        
        event_data = {
            "event_type": "security",
            "security_event_type": event_type,
            "success": success
        }
        
        if user_id:
            event_data["security_user_id"] = user_id
        if client_ip:
            event_data["client_ip"] = client_ip
        if user_agent:
            event_data["user_agent"] = user_agent
        if reason:
            event_data["reason"] = reason
        if metadata:
            event_data["metadata"] = metadata
        
        level = "info" if success else "warning"
        getattr(self.logger, level)(**event_data)
    
    def log_api_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        response_time_ms: float,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None
    ):
        """Log API request"""
        
        event_data = {
            "event_type": "api_request",
            "method": method,
            "endpoint": endpoint,
            "status_code": status_code,
            "response_time_ms": response_time_ms
        }
        
        if user_id:
            event_data["user_id"] = user_id
        if client_ip:
            event_data["client_ip"] = client_ip
        if user_agent:
            event_data["user_agent"] = user_agent
        if request_size:
            event_data["request_size"] = request_size
        if response_size:
            event_data["response_size"] = response_size
        
        # Determine log level based on status code
        if status_code >= 500:
            level = "error"
        elif status_code >= 400:
            level = "warning"
        else:
            level = "info"
        
        getattr(self.logger, level)(**event_data)
    
    def log_scoring_event(
        self,
        operation: str,
        category: Optional[str] = None,
        item_count: Optional[int] = None,
        processing_time_ms: Optional[float] = None,
        algorithm_version: Optional[str] = None,
        confidence_score: Optional[float] = None,
        store_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log scoring algorithm event"""
        
        event_data = {
            "event_type": "scoring",
            "operation": operation
        }
        
        if category:
            event_data["category"] = category
        if item_count is not None:
            event_data["item_count"] = item_count
        if processing_time_ms is not None:
            event_data["processing_time_ms"] = processing_time_ms
        if algorithm_version:
            event_data["algorithm_version"] = algorithm_version
        if confidence_score is not None:
            event_data["confidence_score"] = confidence_score
        if store_id:
            event_data["store_id"] = store_id
        if metadata:
            event_data["metadata"] = metadata
        
        self.logger.info(**event_data)
    
    def log_inventory_event(
        self,
        operation: str,
        item_count: int,
        store_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None,
        waste_reduction_estimate: Optional[float] = None,
        cost_impact: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log inventory management event"""
        
        event_data = {
            "event_type": "inventory",
            "operation": operation,
            "item_count": item_count
        }
        
        if store_id:
            event_data["store_id"] = store_id
        if batch_id:
            event_data["batch_id"] = batch_id
        if processing_time_ms is not None:
            event_data["processing_time_ms"] = processing_time_ms
        if waste_reduction_estimate is not None:
            event_data["waste_reduction_estimate"] = waste_reduction_estimate
        if cost_impact is not None:
            event_data["cost_impact"] = cost_impact
        if metadata:
            event_data["metadata"] = metadata
        
        self.logger.info(**event_data)
    
    # Standard logging methods
    def debug(self, message: str, **kwargs):
        self.logger.debug(message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self.logger.error(message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self.logger.critical(message, **kwargs)


def get_structured_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance"""
    return StructuredLogger(name)


# Global logger instances
app_logger = get_structured_logger("lifo.app")
api_logger = get_structured_logger("lifo.api")
business_logger = get_structured_logger("lifo.business")
security_logger = get_structured_logger("lifo.security")
performance_logger = get_structured_logger("lifo.performance")


def log_application_startup():
    """Log application startup event"""
    app_logger.log_business_event(
        operation="application_startup",
        category="system",
        message="LIFO AI Engine started successfully",
        metadata={
            "environment": settings.environment,
            "version": settings.api_version,
            "debug_mode": settings.debug,
            "log_level": settings.log_level
        }
    )


def log_application_shutdown():
    """Log application shutdown event"""
    app_logger.log_business_event(
        operation="application_shutdown",
        category="system",
        message="LIFO AI Engine shutting down",
        metadata={
            "environment": settings.environment,
            "version": settings.api_version
        }
    )