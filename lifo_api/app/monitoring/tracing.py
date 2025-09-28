"""
OpenTelemetry distributed tracing configuration for LIFO AI Engine
Provides end-to-end request visibility and performance monitoring
"""

import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional

from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.util.http import get_excluded_urls
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Context variables for correlation IDs
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")

class DistributedTracing:
    """
    Comprehensive distributed tracing setup for enterprise monitoring
    """
    
    def __init__(self):
        self.tracer_provider: Optional[TracerProvider] = None
        self.tracer: Optional[trace.Tracer] = None
        self.instrumentors = []
        
    def setup_tracing(self, app=None) -> None:
        """Initialize OpenTelemetry tracing with multiple exporters"""
        
        # Create resource with service information
        resource = Resource.create({
            ResourceAttributes.SERVICE_NAME: "lifo-ai-engine",
            ResourceAttributes.SERVICE_VERSION: settings.api_version,
            ResourceAttributes.SERVICE_NAMESPACE: "lifo",
            ResourceAttributes.SERVICE_INSTANCE_ID: str(uuid.uuid4()),
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: settings.environment,
        })
        
        # Create tracer provider
        self.tracer_provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(self.tracer_provider)
        
        # Configure exporters based on environment
        self._setup_exporters()
        
        # Get tracer
        self.tracer = trace.get_tracer(__name__)
        
        # Setup auto-instrumentation
        if app:
            self._setup_auto_instrumentation(app)
            
        logger.info(
            "Distributed tracing initialized",
            service_name="lifo-ai-engine",
            environment=settings.environment,
            exporters=self._get_configured_exporters()
        )
    
    def _setup_exporters(self) -> None:
        """Configure trace exporters for different environments"""
        
        if settings.environment == "development":
            # Console exporter for development
            console_exporter = ConsoleSpanExporter()
            console_processor = BatchSpanProcessor(console_exporter)
            self.tracer_provider.add_span_processor(console_processor)
        
        # Jaeger exporter (if configured)
        jaeger_endpoint = getattr(settings, 'jaeger_endpoint', None)
        if jaeger_endpoint:
            jaeger_exporter = JaegerExporter(
                agent_host_name=getattr(settings, 'jaeger_agent_host', 'localhost'),
                agent_port=getattr(settings, 'jaeger_agent_port', 6831),
                collector_endpoint=jaeger_endpoint,
            )
            jaeger_processor = BatchSpanProcessor(jaeger_exporter)
            self.tracer_provider.add_span_processor(jaeger_processor)
        
        # OTLP exporter (for cloud providers)
        otlp_endpoint = getattr(settings, 'otlp_endpoint', None)
        if otlp_endpoint:
            otlp_exporter = OTLPSpanExporter(
                endpoint=otlp_endpoint,
                headers=getattr(settings, 'otlp_headers', {})
            )
            otlp_processor = BatchSpanProcessor(otlp_exporter)
            self.tracer_provider.add_span_processor(otlp_processor)
    
    def _setup_auto_instrumentation(self, app) -> None:
        """Setup automatic instrumentation for common libraries"""
        
        # FastAPI instrumentation
        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=self.tracer_provider,
            excluded_urls=get_excluded_urls("OTEL_PYTHON_FASTAPI_EXCLUDED_URLS")
        )
        self.instrumentors.append("fastapi")
        
        # SQLAlchemy instrumentation
        try:
            SQLAlchemyInstrumentor().instrument(
                tracer_provider=self.tracer_provider,
                enable_commenter=True,
                commenter_options={}
            )
            self.instrumentors.append("sqlalchemy")
        except Exception as e:
            logger.warning("Failed to instrument SQLAlchemy", error=str(e))
        
        # HTTP client instrumentation
        try:
            HTTPXClientInstrumentor().instrument(
                tracer_provider=self.tracer_provider
            )
            self.instrumentors.append("httpx")
        except Exception as e:
            logger.warning("Failed to instrument HTTPX", error=str(e))
        
        # Redis instrumentation (if Redis is available)
        try:
            if settings.redis_url:
                RedisInstrumentor().instrument(
                    tracer_provider=self.tracer_provider
                )
                self.instrumentors.append("redis")
        except Exception as e:
            logger.warning("Failed to instrument Redis", error=str(e))
    
    def _get_configured_exporters(self) -> list[str]:
        """Get list of configured exporters"""
        exporters = []
        
        if settings.environment == "development":
            exporters.append("console")
        
        if getattr(settings, 'jaeger_endpoint', None):
            exporters.append("jaeger")
            
        if getattr(settings, 'otlp_endpoint', None):
            exporters.append("otlp")
            
        return exporters
    
    def create_span(
        self, 
        name: str, 
        kind: trace.SpanKind = trace.SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None
    ) -> trace.Span:
        """Create a new span with automatic correlation"""
        
        if not self.tracer:
            # Return a no-op span if tracing is not initialized
            return trace.NoOpSpan(trace.INVALID_SPAN_CONTEXT)
        
        span = self.tracer.start_span(name, kind=kind)
        
        # Add correlation IDs
        request_id = request_id_var.get()
        tenant_id = tenant_id_var.get()
        user_id = user_id_var.get()
        
        if request_id:
            span.set_attribute("request.id", request_id)
        if tenant_id:
            span.set_attribute("tenant.id", tenant_id)
        if user_id:
            span.set_attribute("user.id", user_id)
        
        # Add custom attributes
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        
        return span
    
    def trace_business_operation(
        self,
        operation_name: str,
        operation_type: str,
        store_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        category: Optional[str] = None
    ):
        """Decorator for tracing business operations"""
        
        def decorator(func):
            async def async_wrapper(*args, **kwargs):
                attributes = {
                    "operation.type": operation_type,
                    "business.operation": operation_name
                }
                
                if store_id:
                    attributes["store.id"] = store_id
                if batch_id:
                    attributes["batch.id"] = batch_id
                if category:
                    attributes["category"] = category
                
                with self.create_span(
                    f"business.{operation_name}",
                    kind=trace.SpanKind.INTERNAL,
                    attributes=attributes
                ) as span:
                    try:
                        result = await func(*args, **kwargs)
                        span.set_status(trace.Status(trace.StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(
                            trace.Status(
                                trace.StatusCode.ERROR,
                                description=str(e)
                            )
                        )
                        span.record_exception(e)
                        raise
            
            def sync_wrapper(*args, **kwargs):
                attributes = {
                    "operation.type": operation_type,
                    "business.operation": operation_name
                }
                
                if store_id:
                    attributes["store.id"] = store_id
                if batch_id:
                    attributes["batch.id"] = batch_id
                if category:
                    attributes["category"] = category
                
                with self.create_span(
                    f"business.{operation_name}",
                    kind=trace.SpanKind.INTERNAL,
                    attributes=attributes
                ) as span:
                    try:
                        result = func(*args, **kwargs)
                        span.set_status(trace.Status(trace.StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(
                            trace.Status(
                                trace.StatusCode.ERROR,
                                description=str(e)
                            )
                        )
                        span.record_exception(e)
                        raise
            
            if hasattr(func, "__code__") and func.__code__.co_flags & 0x80:  # CO_COROUTINE
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    def set_correlation_ids(
        self,
        request_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> None:
        """Set correlation IDs for current context"""
        
        if request_id:
            request_id_var.set(request_id)
        if tenant_id:
            tenant_id_var.set(tenant_id)
        if user_id:
            user_id_var.set(user_id)
    
    def get_correlation_ids(self) -> Dict[str, str]:
        """Get current correlation IDs"""
        return {
            "request_id": request_id_var.get(),
            "tenant_id": tenant_id_var.get(),
            "user_id": user_id_var.get()
        }
    
    def cleanup(self) -> None:
        """Cleanup instrumentation"""
        for instrumentor_name in self.instrumentors:
            try:
                if instrumentor_name == "fastapi":
                    FastAPIInstrumentor().uninstrument()
                elif instrumentor_name == "sqlalchemy":
                    SQLAlchemyInstrumentor().uninstrument()
                elif instrumentor_name == "httpx":
                    HTTPXClientInstrumentor().uninstrument()
                elif instrumentor_name == "redis":
                    RedisInstrumentor().uninstrument()
            except Exception as e:
                logger.warning(f"Failed to uninstrument {instrumentor_name}", error=str(e))


# Global distributed tracing instance
distributed_tracing = DistributedTracing()


def get_distributed_tracing() -> DistributedTracing:
    """Get the global distributed tracing instance"""
    return distributed_tracing


def get_current_trace_id() -> Optional[str]:
    """Get current trace ID for correlation"""
    current_span = trace.get_current_span()
    if current_span and current_span.is_recording():
        return format(current_span.get_span_context().trace_id, "032x")
    return None


def get_current_span_id() -> Optional[str]:
    """Get current span ID for correlation"""
    current_span = trace.get_current_span()
    if current_span and current_span.is_recording():
        return format(current_span.get_span_context().span_id, "016x")
    return None


# Convenience decorators
def trace_database_operation(operation_name: str):
    """Decorator for tracing database operations"""
    return distributed_tracing.trace_business_operation(
        operation_name,
        "database"
    )


def trace_api_operation(operation_name: str):
    """Decorator for tracing API operations"""
    return distributed_tracing.trace_business_operation(
        operation_name,
        "api"
    )


def trace_scoring_operation(operation_name: str, category: Optional[str] = None):
    """Decorator for tracing scoring operations"""
    return distributed_tracing.trace_business_operation(
        operation_name,
        "scoring",
        category=category
    )


def trace_batch_operation(operation_name: str, batch_id: Optional[str] = None):
    """Decorator for tracing batch operations"""
    return distributed_tracing.trace_business_operation(
        operation_name,
        "batch",
        batch_id=batch_id
    )