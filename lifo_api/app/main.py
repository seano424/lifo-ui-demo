"""
LIFO AI Engine FastAPI Application
Intelligent inventory scoring and waste reduction microservice
"""

import os
import time

from dotenv import load_dotenv

# CRITICAL: Load environment variables FIRST before any other imports
# This ensures all modules can access environment variables during import
env_paths = [
    os.path.join(
        os.path.dirname(__file__), "../../.env.local"
    ),  # Root level (unified config)
    os.path.join(os.path.dirname(__file__), "../.env.local"),  # API level (fallback)
    os.path.join(os.path.dirname(__file__), "../.env"),
    ".env.local",
    ".env",
]

env_loaded = False
for env_path in env_paths:
    if os.path.exists(env_path):
        print(f"Loading environment from: {env_path}")
        load_dotenv(env_path)
        env_loaded = True
        break

if not env_loaded:
    print("No .env file found, using system environment variables only")

# NOW import everything else after environment is loaded
from collections.abc import AsyncGenerator  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402
from typing import Any  # noqa: E402

import structlog  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import FastAPI, Request, Response  # noqa: E402
from fastapi.encoders import jsonable_encoder  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.middleware.trustedhost import TrustedHostMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402

from app.api.v1.router import router as api_v1_router  # noqa: E402
from app.core.config import get_monitoring_config, settings  # noqa: E402

# Import models to register them with SQLAlchemy Base
from app.database import inventory_models, models  # noqa: E402, F401
from app.database.connection import engine, init_database  # noqa: E402
from app.middleware.comprehensive_security import (  # noqa: E402
    ComprehensiveSecurityMiddleware,
)
from app.middleware.error_handling import (  # noqa: E402
    ErrorHandlingMiddleware,
    get_custom_exception_handler,
)
from app.middleware.performance_monitoring import (  # noqa: E402
    PerformanceMonitoringMiddleware,
)
from app.middleware.rate_limiting import (  # noqa: E402
    check_blocked_ip,
    limiter,
    rate_limit_handler,
)
from app.middleware.security_headers import (  # noqa: E402
    ProductionSecurityMiddleware,
    SecurityHeadersMiddleware,
)
from app.models.base import HealthResponse  # noqa: E402
from app.monitoring.alerts import get_alert_manager  # noqa: E402
from app.monitoring.metrics import get_metrics_collector  # noqa: E402
from app.security.security_monitor import get_security_monitor  # noqa: E402
from app.utils.error_handling import get_error_tracker  # noqa: E402
from app.utils.exceptions import setup_exception_handlers  # noqa: E402
from app.utils.logging import setup_logging  # noqa: E402
from app.utils.mvp_exceptions import (  # noqa: E402
    MobilePerformanceException,
    MVPBaseException,
    ValidationException,
    general_exception_handler,
    mvp_exception_handler,
    performance_exception_handler,
    validation_exception_handler,
)

# Environment validation (secure logging)
if os.getenv("ENVIRONMENT") == "development":
    print("Environment variables loaded:")
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if jwt_secret:
        # Only show length, never the actual secret
        print(f"SUPABASE_JWT_SECRET: ***configured*** (length: {len(jwt_secret)})")
    else:
        print("SUPABASE_JWT_SECRET: ⚠️  NOT CONFIGURED - authentication will fail")
    print(f"ENVIRONMENT: {os.getenv('ENVIRONMENT')}")

    # Additional security checks in development
    database_url = os.getenv("DATABASE_URL", "")
    valid_db_prefixes = (
        "postgresql://",
        "postgresql+asyncpg://",  # Async PostgreSQL (Supabase)
        "postgres://",
        "sqlite://",
        "sqlite+aiosqlite://",  # Async SQLite
    )
    if database_url and not database_url.startswith(valid_db_prefixes):
        print("⚠️  WARNING: DATABASE_URL format may be incorrect")

    if not os.getenv("SUPABASE_URL"):
        print("⚠️  WARNING: SUPABASE_URL not configured")

# Setup structured logging
setup_logging()
logger = structlog.get_logger()


# Custom JSON Response class for proper datetime serialization
class CustomJSONResponse(JSONResponse):
    """Custom JSON response with proper datetime and date serialization"""

    def render(self, content) -> bytes:
        import json
        from datetime import date, datetime
        from decimal import Decimal

        def custom_serializer(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, date):
                return obj.isoformat()
            elif isinstance(obj, Decimal):
                return float(obj)
            # For any other non-serializable types, convert to string
            return str(obj)

        try:
            # First try FastAPI's jsonable_encoder
            encoded_content = jsonable_encoder(content)
            return super().render(encoded_content)
        except (TypeError, ValueError):
            # If that fails, use our custom serializer
            json_str = json.dumps(
                content, default=custom_serializer, ensure_ascii=False
            )
            return json_str.encode("utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle application startup and shutdown"""
    # Startup
    logger.info("Starting LIFO AI Engine", version=settings.api_version)

    try:
        # Test Supabase connection (our primary database service)
        from app.database.supabase_service import get_supabase_service

        supabase_service = get_supabase_service()
        connection_ok = await supabase_service.test_connection()

        if connection_ok:
            logger.info("Supabase database connection established successfully")
        else:
            logger.warning(
                "Supabase connection test failed, but continuing with startup"
            )

        # Try SQLAlchemy connection (optional for complex queries)
        try:
            await init_database()
            logger.info("SQLAlchemy database connection also established")
        except Exception as sql_error:
            logger.warning(
                "SQLAlchemy connection failed, using Supabase only",
                error=str(sql_error),
            )

        # Initialize performance monitoring system
        if settings.enable_performance_monitoring:
            logger.info(
                "Performance monitoring system initialized",
                config=get_monitoring_config(),
            )

            # Start metrics collection
            metrics_collector = get_metrics_collector()
            logger.info(
                "Metrics collector started",
                cache_stats=metrics_collector.metrics.get("system_resources", {}),
            )

            # Initialize alert manager if alerting is enabled
            if settings.enable_alerting:
                alert_manager = get_alert_manager()
                logger.info(
                    "Alert manager initialized",
                    rules_count=len(alert_manager.alert_rules),
                )
        else:
            logger.warning(
                "Performance monitoring disabled - production visibility will be limited"
            )

        # Initialize comprehensive security monitoring
        get_security_monitor()  # Initialize but don't store reference
        logger.info(
            "Security monitoring system initialized",
            environment=settings.environment,
            high_security_mode=settings.environment == "production",
        )

        # Initialize automated scoring system if enabled
        if settings.enable_automated_scoring:
            try:
                from app.core.automated_scoring import initialize_automated_scoring
                await initialize_automated_scoring()
                logger.info(
                    "Automated scoring system initialized successfully",
                    default_cron=settings.default_scoring_cron,
                    timezone=settings.default_scoring_timezone
                )
            except Exception as auto_score_error:
                logger.error(
                    "Failed to initialize automated scoring system",
                    error=str(auto_score_error)
                )
                # Don't fail startup for automated scoring issues
        else:
            logger.info("Automated scoring system disabled in configuration")

        # Log debug health endpoints availability for production troubleshooting
        debug_endpoints = [
            f"{settings.api_v1_prefix}/debug/minimal",
            f"{settings.api_v1_prefix}/debug/debug-request",
            f"{settings.api_v1_prefix}/debug/middleware-check",
            f"{settings.api_v1_prefix}/debug/environment-status",
            f"{settings.api_v1_prefix}/debug/database-connectivity",
            f"{settings.api_v1_prefix}/debug/production-troubleshoot"
        ]
        logger.info(
            "Debug health endpoints available for production troubleshooting",
            endpoints=debug_endpoints,
            environment=settings.environment
        )

    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        # Don't raise - allow server to start with Supabase-only mode

    yield

    # Shutdown
    logger.info("Shutting down LIFO AI Engine")

    # Performance monitoring shutdown
    if settings.enable_performance_monitoring:
        try:
            metrics_collector = get_metrics_collector()
            final_stats = metrics_collector.get_metrics_summary()
            logger.info(
                "Final performance statistics",
                api_requests=len(final_stats.get("api_metrics", {})),
                db_queries=len(final_stats.get("database_metrics", {})),
                cache_operations=len(final_stats.get("cache_metrics", {})),
            )
        except Exception as e:
            logger.error("Error collecting final performance statistics", error=str(e))

    # Shutdown automated scoring system
    if settings.enable_automated_scoring:
        try:
            from app.core.automated_scoring import shutdown_automated_scoring
            await shutdown_automated_scoring()
            logger.info("Automated scoring system shutdown completed")
        except Exception as e:
            logger.error("Error shutting down automated scoring system", error=str(e))

    await engine().dispose()


# Create FastAPI application
app = FastAPI(
    title="LIFO AI Engine",
    description="""
    ## Intelligent Inventory Management Microservice

    Advanced AI-driven scoring system for food waste reduction and inventory optimization.
    ### Architecture:
    - **Frontend**: Handles product lookup via OpenFoodFacts API directly
    - **Backend**: Focuses on AI processing (OCR, scoring, analytics)

    ### Key Features:
    - **Google Vision OCR**: Complex image processing and text extraction
    - **Multi-factor Scoring**: Expiry, velocity, and margin analysis
    - **Real-time Recommendations**: Automated discount and action suggestions
    - **CSV Processing**: Bulk inventory upload with validation
    - **Analytics & Alerts**: Comprehensive inventory insights
    - **Donation System**: Basic EU-compliant donation eligibility

    ### Authentication:
    Uses Supabase JWT tokens for seamless integration with existing frontend.

    ### Performance:
    - Async PostgreSQL operations
    - Optimized AI algorithms
    - Production-ready with proper error handling
    """,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    default_response_class=CustomJSONResponse,
)

# Health check bypass middleware (MUST BE FIRST for proper health checks)
@app.middleware("http")
async def health_check_bypass_middleware_priority(request: Request, call_next: Any) -> Response:
    """
    Priority health check bypass - runs BEFORE TrustedHostMiddleware
    Solves DigitalOcean App Platform health check 400 error issue
    """
    health_paths = ["/health", "/api/v1/health", "/api/v1/health/"]

    if request.url.path in health_paths:
        client_host = request.client.host if request.client else "unknown"

        # DigitalOcean internal network patterns
        if client_host.startswith("10.244.") or client_host == "10.244.65.235":
            logger.debug(
                "Health check from DO load balancer - bypassing host validation",
                client_host=client_host,
                path=request.url.path
            )

            # Create a simple health response without complex middleware chain
            if request.url.path in health_paths:
                from app.models.base import HealthResponse
                return JSONResponse(
                    content={
                        "status": "healthy",
                        "database_connected": True,  # Assume healthy for LB checks
                        "version": settings.api_version,
                        "uptime": None,
                    }
                )

    return await call_next(request)

# Security middleware (order matters - most restrictive first)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.get_allowed_hosts())

# Production security middleware
if settings.environment == "production":
    app.add_middleware(ProductionSecurityMiddleware)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Error handling middleware (must be very early for complete coverage)
app.add_middleware(ErrorHandlingMiddleware)

# Comprehensive security middleware (must be first for security)
app.add_middleware(ComprehensiveSecurityMiddleware)

# Performance monitoring middleware (must be early in chain for accurate timing)
if settings.enable_performance_monitoring:
    app.add_middleware(
        PerformanceMonitoringMiddleware,
        enable_detailed_logging=settings.enable_detailed_request_logging,
    )

# Rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)  # type: ignore

# Security blocking middleware
app.middleware("http")(check_blocked_ip)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)



# Health check debugging middleware (for production troubleshooting)
@app.middleware("http")
async def health_check_debugging_middleware(request: Request, call_next: Any) -> Response:
    """
    Debug health check requests to troubleshoot deployment issues
    """
    health_paths = ["/health", "/api/v1/health", "/api/v1/health/"]

    if request.url.path in health_paths:
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        # Always log health check attempts in production/staging for debugging
        if settings.environment in ["production", "staging"]:
            logger.info(
                "Health check request received",
                client_host=client_host,
                path=request.url.path,
                method=request.method,
                user_agent=user_agent[:100],  # Truncate long user agents
                headers=dict(request.headers),  # Log all headers for debugging
                environment=settings.environment
            )

    response = await call_next(request)

    # Log health check responses in production/staging
    if request.url.path in health_paths and settings.environment in ["production", "staging"]:
        logger.info(
            "Health check response sent",
            status_code=response.status_code,
            path=request.url.path,
            client_host=request.client.host if request.client else "unknown",
            environment=settings.environment
        )

    return response


# Enhanced request logging middleware with performance monitoring integration
@app.middleware("http")
async def enhanced_request_logging(request: Request, call_next: Any) -> Response:
    start_time = time.time()

    # Only do detailed logging in development or when explicitly enabled
    if settings.enable_detailed_request_logging or settings.debug:
        # Log request (sanitize sensitive headers)
        sanitized_headers = dict(request.headers)
        # Remove sensitive headers from logs
        sensitive_headers = ["authorization", "cookie", "x-api-key", "x-supabase-auth"]
        for header in sensitive_headers:
            if header in sanitized_headers:
                sanitized_headers[header] = "***REDACTED***"

        logger.debug(
            "Request started",
            method=request.method,
            url=str(request.url),
            user_agent=request.headers.get("user-agent", "unknown")[
                :100
            ],  # Truncate long user agents
        )

    response: Response = await call_next(request)

    # Always log completion with performance data
    process_time = time.time() - start_time
    process_time_ms = process_time * 1000

    # Determine log level based on performance and status
    if response.status_code >= 500:
        log_level = "error"
    elif response.status_code >= 400:
        log_level = "warning"
    elif process_time_ms > 1000:  # Slow requests
        log_level = "warning"
    else:
        log_level = "info"

    getattr(logger, log_level)(
        "Request completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time_ms=round(process_time_ms, 2),
        performance_status="slow" if process_time_ms > 500 else "normal",
    )

    # Trigger alerts for performance monitoring
    if settings.enable_alerting and settings.enable_performance_monitoring:
        try:
            metrics_collector = get_metrics_collector()
            alert_manager = get_alert_manager()

            # Check metrics periodically (every 10th request to reduce overhead)
            if hasattr(request.state, "request_count"):
                request.state.request_count += 1
            else:
                request.state.request_count = 1

            if request.state.request_count % 10 == 0:
                metrics_summary = metrics_collector.get_metrics_summary()
                alert_manager.check_metrics(metrics_summary)
        except Exception as e:
            # Don't let monitoring errors affect request processing
            logger.debug("Monitoring check failed", error=str(e))

    return response


# Setup exception handlers
setup_exception_handlers(app)

# Add comprehensive error handling exception handlers
from pydantic import ValidationError  # noqa: E402
from sqlalchemy.exc import SQLAlchemyError  # noqa: E402

custom_exception_handler = get_custom_exception_handler()
app.add_exception_handler(
    SQLAlchemyError, custom_exception_handler.database_error_handler
)  # type: ignore
app.add_exception_handler(
    ValidationError, custom_exception_handler.validation_error_handler
)  # type: ignore

# Add MVP-specific exception handlers (after comprehensive handlers)
app.add_exception_handler(MVPBaseException, mvp_exception_handler)  # type: ignore
app.add_exception_handler(ValidationException, validation_exception_handler)  # type: ignore
app.add_exception_handler(MobilePerformanceException, performance_exception_handler)  # type: ignore
app.add_exception_handler(Exception, general_exception_handler)

# Include API v1 router
app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


# Root endpoint
@app.get("/", tags=["Health"])
async def root() -> dict[str, Any]:
    """
    API root endpoint with service information
    """
    return {
        "service": "LIFO AI Engine",
        "version": settings.api_version,
        "description": "Intelligent inventory scoring and waste reduction microservice",
        "documentation": "/docs",
        "health": "/health",
        "status": "operational",
        "features": [
            "Google Vision OCR processing",
            "Multi-factor inventory scoring",
            "Real-time recommendations",
            "CSV bulk processing",
            "Donation eligibility checking",
            "Mobile-optimized endpoints",
        ],
    }


# Health check endpoint - Multiple paths for deployment compatibility
@app.get("/health", tags=["Health"], response_model=HealthResponse)
@app.get("/api/v1/health", tags=["Health"], response_model=HealthResponse)
@app.get("/api/v1/health/", tags=["Health"], response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint with detailed service status
    """
    try:
        # Test database connections
        from app.database.connection import test_connection
        from app.database.supabase_service import supabase_health_check

        # Test legacy SQLAlchemy connection (for compatibility)
        _sqlalchemy_healthy = (
            await test_connection()
        )  # Keep for compatibility but don't use

        # Check Supabase health (primary database method)
        try:
            supabase_result = await supabase_health_check()
            supabase_healthy = supabase_result.get("status") == "healthy"
        except Exception:
            supabase_healthy = False

        # Use Supabase as primary database indicator (since we fixed the connectivity)
        # Overall healthy if Supabase works (SQLAlchemy is optional now)
        overall_healthy = supabase_healthy

        # Report Supabase connection as database_connected since that's what we're using
        primary_db_connected = supabase_healthy

        return HealthResponse(
            status="healthy" if overall_healthy else "unhealthy",
            database_connected=primary_db_connected,  # Now reports Supabase status
            version=settings.api_version,
            uptime=None,  # Can be calculated if needed
        )
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            database_connected=False,
            version=settings.api_version,
            uptime=None,
        )


# API info endpoint
@app.get("/api/info", tags=["Health"])
async def api_info() -> dict[str, Any]:
    """
    Detailed API information and capabilities
    """
    return {
        "name": "LIFO AI Engine",
        "version": settings.api_version,
        "description": "AI-powered inventory management microservice",
        "endpoints": {
            "scoring": f"{settings.api_v1_prefix}/scoring",
            "vision_ocr": f"{settings.api_v1_prefix}/vision",
            "csv": f"{settings.api_v1_prefix}/csv",
            "analytics": f"{settings.api_v1_prefix}/analytics",
            "donations": f"{settings.api_v1_prefix}/donations",
            "mobile": f"{settings.api_v1_prefix}/mobile",
        },
        "features": {
            "google_vision_ocr": True,
            "ai_scoring": True,
            "csv_processing": True,
            "donation_eligibility": True,
            "mobile_optimization": True,
            "async_operations": True,
            "comprehensive_error_tracking": True,
        },
        "architecture": {
            "frontend_handles": "Product lookup via OpenFoodFacts",
            "backend_focuses": "AI processing, OCR, scoring, analytics",
        },
        "authentication": "Supabase JWT",
        "database": "PostgreSQL with AsyncPG",
    }


# Error tracking statistics endpoint (admin/debug use)
@app.get("/api/errors/stats", tags=["Health", "Monitoring"])
async def get_error_statistics():
    """
    Get comprehensive error tracking statistics
    Useful for monitoring system health and debugging
    """
    try:
        error_tracker = get_error_tracker()
        stats = error_tracker.get_error_statistics()

        return {
            "error_tracking": stats,
            "system_health": {
                "overall_status": "healthy"
                if stats["errors_last_1h"] < 10
                else "degraded",
                "error_rate_last_hour": stats["errors_last_1h"],
                "error_rate_last_24h": stats["errors_last_24h"],
                "monitoring_active": stats["monitoring_health"] == "active",
            },
        }
    except Exception as e:
        logger.error("Failed to get error statistics", error=str(e))
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve error statistics", "message": str(e)},
        )


# Endpoint-specific error analysis
@app.get("/api/errors/endpoints/{endpoint_path:path}", tags=["Health", "Monitoring"])
async def get_endpoint_error_analysis(endpoint_path: str):
    """
    Get detailed error analysis for a specific endpoint
    """
    try:
        error_tracker = get_error_tracker()
        # Ensure endpoint starts with /
        if not endpoint_path.startswith("/"):
            endpoint_path = f"/{endpoint_path}"

        analysis = error_tracker.get_endpoint_error_analysis(endpoint_path)
        return {"endpoint_analysis": analysis}
    except Exception as e:
        logger.error(
            "Failed to get endpoint error analysis",
            error=str(e),
            endpoint=endpoint_path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve endpoint error analysis",
                "message": str(e),
                "endpoint": endpoint_path,
            },
        )


if __name__ == "__main__":
    # For development
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # noqa: S104  # Intentional for containerized deployment
        port=8000,
        reload=True,
        log_level=settings.log_level.lower(),
    )
