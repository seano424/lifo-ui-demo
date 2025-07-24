"""
LIFO AI Engine FastAPI Application
Intelligent inventory scoring and waste reduction microservice
"""

import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import router as api_v1_router
from app.core.config import settings
from app.database.connection import engine, init_database
from app.middleware.rate_limiting import (
    check_blocked_ip,
    limiter,
    rate_limit_handler,
)
from app.middleware.security_headers import (
    ProductionSecurityMiddleware,
    SecurityHeadersMiddleware,
)
from app.utils.exceptions import setup_exception_handlers
from app.utils.logging import setup_logging
from app.utils.mvp_exceptions import (
    MobilePerformanceException,
    MVPBaseException,
    ValidationException,
    general_exception_handler,
    mvp_exception_handler,
    performance_exception_handler,
    validation_exception_handler,
)

# Load environment variables from .env files (try multiple locations)
env_paths = [
    os.path.join(os.path.dirname(__file__), "../.env.local"),
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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle application startup and shutdown"""
    # Startup
    logger.info("Starting LIFO AI Engine", version=settings.api_version)

    try:
        # Initialize database connection
        await init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise

    yield

    # Shutdown
    logger.info("Shutting down LIFO AI Engine")
    await engine().dispose()


# Create FastAPI application
app = FastAPI(
    title="LIFO AI Engine",
    description="""
    ## Intelligent Inventory Management Microservice

    Advanced AI-driven scoring system for food waste reduction and inventory optimization.

    ### Key Features:
    - **Multi-factor Scoring**: Expiry, velocity, and margin analysis
    - **Real-time Recommendations**: Automated discount and action suggestions
    - **CSV Processing**: Bulk inventory upload with validation
    - **Store-aware Operations**: Multi-tenant architecture with RLS
    - **Analytics & Alerts**: Comprehensive inventory insights

    ### Authentication:
    Uses Supabase JWT tokens for seamless integration with existing frontend.

    ### Performance:
    - Async PostgreSQL operations
    - Optimized scoring algorithms
    - Production-ready with proper error handling
    """,
    version=settings.api_version,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Security middleware (order matters - most restrictive first)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.get_allowed_hosts())

# Production security middleware
if settings.environment == "production":
    app.add_middleware(ProductionSecurityMiddleware)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

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


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log request (sanitize sensitive headers)
    sanitized_headers = dict(request.headers)
    # Remove sensitive headers from logs
    sensitive_headers = ["authorization", "cookie", "x-api-key", "x-supabase-auth"]
    for header in sensitive_headers:
        if header in sanitized_headers:
            sanitized_headers[header] = "***REDACTED***"

    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        headers=sanitized_headers,
    )

    response = await call_next(request)

    # Log response
    process_time = time.time() - start_time
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        process_time=f"{process_time:.3f}s",
    )

    return response


# Setup exception handlers
setup_exception_handlers(app)

# Add MVP-specific exception handlers

app.add_exception_handler(MVPBaseException, mvp_exception_handler)  # type: ignore
app.add_exception_handler(ValidationException, validation_exception_handler)  # type: ignore
app.add_exception_handler(MobilePerformanceException, performance_exception_handler)  # type: ignore
app.add_exception_handler(Exception, general_exception_handler)

# Include API v1 router
app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


# Root endpoint
@app.get("/", tags=["Health"])
async def root():
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
            "Multi-factor inventory scoring",
            "Real-time recommendations",
            "CSV bulk processing",
            "Store-aware analytics",
            "Supabase authentication",
        ],
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint with detailed service status
    """
    try:
        # Test database connection
        from app.database.connection import test_connection

        db_healthy = await test_connection()

        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "timestamp": time.time(),
            "version": settings.api_version,
            "database": "connected" if db_healthy else "disconnected",
            "environment": settings.environment,
            "cors_origins": settings.get_cors_origins(),
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "timestamp": time.time(), "error": str(e)},
        )


# API info endpoint
@app.get("/api/info", tags=["Health"])
async def api_info():
    """
    Detailed API information and capabilities
    """
    return {
        "name": "LIFO AI Engine",
        "version": settings.api_version,
        "description": "AI-powered inventory management microservice",
        "endpoints": {
            "inventory": f"{settings.api_v1_prefix}/inventory",
            "scoring": f"{settings.api_v1_prefix}/scoring",
            "csv": f"{settings.api_v1_prefix}/csv",
            "analytics": f"{settings.api_v1_prefix}/analytics",
            "stores": f"{settings.api_v1_prefix}/stores",
        },
        "features": {
            "ai_scoring": True,
            "csv_processing": True,
            "real_time_alerts": True,
            "multi_tenant": True,
            "async_operations": True,
        },
        "authentication": "Supabase JWT",
        "database": "PostgreSQL with AsyncPG",
    }


if __name__ == "__main__":
    # For development
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower(),
    )
