"""
Debug Health Endpoint for Production Deployment Issues
Provides detailed request analysis to identify 400 error causes
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict

import structlog
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

router = APIRouter()
logger = structlog.get_logger()


@router.get("/debug-request")
async def debug_request_analysis(request: Request) -> Dict[str, Any]:
    """
    Analyze incoming request in detail to identify issues causing 400 errors
    """
    try:
        # Capture all request details
        request_analysis = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "url": {
                "raw": str(request.url),
                "path": request.url.path,
                "query": request.url.query,
                "scheme": request.url.scheme,
                "hostname": request.url.hostname,
                "port": request.url.port,
            },
            "headers": {},
            "client": {
                "host": request.client.host if request.client else None,
                "port": request.client.port if request.client else None,
            },
            "environment_check": await _check_environment_variables(),
            "middleware_state": _check_middleware_state(request),
            "app_state": _check_app_state(request),
        }

        # Safely capture headers (avoid sensitive data)
        sensitive_headers = ["authorization", "cookie", "x-api-key", "x-supabase-auth"]
        for key, value in request.headers.items():
            if key.lower() in sensitive_headers:
                request_analysis["headers"][key] = "***REDACTED***"
            else:
                request_analysis["headers"][key] = value

        # Try to read body if present (be careful with size)
        try:
            body = await request.body()
            if body:
                request_analysis["body"] = {
                    "length": len(body),
                    "content": body.decode('utf-8') if len(body) < 1000 else "***TRUNCATED***",
                    "content_type": request.headers.get("content-type", "unknown")
                }
        except Exception as body_error:
            request_analysis["body_error"] = str(body_error)

        return request_analysis

    except Exception as e:
        logger.error("Debug request analysis failed", error=str(e))
        return {
            "error": "Debug analysis failed",
            "exception": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.get("/minimal")
async def minimal_health_check() -> Dict[str, str]:
    """
    Absolute minimal health check with no dependencies
    """
    return {
        "status": "minimal_ok",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Minimal health check successful"
    }


@router.get("/middleware-check")
async def middleware_check(request: Request) -> Dict[str, Any]:
    """
    Check if middleware is causing issues
    """
    middleware_info = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_state": {},
        "middleware_markers": {},
        "security_checks": {},
    }

    # Check request state
    try:
        if hasattr(request, "state"):
            for attr in dir(request.state):
                if not attr.startswith("_"):
                    try:
                        value = getattr(request.state, attr)
                        middleware_info["request_state"][attr] = str(value)
                    except Exception:
                        middleware_info["request_state"][attr] = "***ERROR_READING***"
    except Exception as e:
        middleware_info["request_state_error"] = str(e)

    # Check for middleware markers
    security_headers = [
        "x-content-type-options",
        "x-frame-options",
        "x-xss-protection",
        "strict-transport-security",
        "content-security-policy"
    ]

    for header in security_headers:
        middleware_info["security_checks"][header] = request.headers.get(header, "NOT_SET")

    # Check rate limiting state
    if hasattr(request.app, "state") and hasattr(request.app.state, "limiter"):
        middleware_info["rate_limiting"] = "CONFIGURED"
    else:
        middleware_info["rate_limiting"] = "NOT_FOUND"

    return middleware_info


@router.get("/environment-status")
async def environment_status() -> Dict[str, Any]:
    """
    Check environment configuration that might cause 400 errors
    """
    return await _check_environment_variables()


@router.get("/database-connectivity")
async def debug_database_connectivity() -> Dict[str, Any]:
    """
    Test database connectivity without full health check complexity
    """
    db_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }

    # Test Supabase connection
    try:
        from app.database.supabase_service import get_supabase_service

        supabase = get_supabase_service()
        connection_test = await supabase.test_connection()

        db_status["tests"]["supabase"] = {
            "status": "success",
            "result": connection_test
        }
    except Exception as e:
        db_status["tests"]["supabase"] = {
            "status": "error",
            "error": str(e)
        }

    # Test SQLAlchemy connection
    try:
        from app.database.connection import test_connection

        sqlalchemy_test = await test_connection()
        db_status["tests"]["sqlalchemy"] = {
            "status": "success" if sqlalchemy_test else "failed",
            "result": sqlalchemy_test
        }
    except Exception as e:
        db_status["tests"]["sqlalchemy"] = {
            "status": "error",
            "error": str(e)
        }

    return db_status


async def _check_environment_variables() -> Dict[str, Any]:
    """Check critical environment variables"""
    env_check = {
        "critical_vars": {},
        "optional_vars": {},
        "validation_errors": []
    }

    # Critical environment variables
    critical_vars = [
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_JWT_SECRET",
        "SUPABASE_ANON_KEY",
        "ENVIRONMENT"
    ]

    for var in critical_vars:
        value = os.getenv(var)
        if value:
            # Don't expose secrets, just confirm they exist
            if "SECRET" in var or "KEY" in var or "PASSWORD" in var:
                env_check["critical_vars"][var] = f"***SET*** (length: {len(value)})"
            else:
                env_check["critical_vars"][var] = value
        else:
            env_check["critical_vars"][var] = "***NOT_SET***"
            env_check["validation_errors"].append(f"{var} is not configured")

    # Optional variables
    optional_vars = ["CORS_ORIGINS", "ALLOWED_HOSTS", "LOG_LEVEL"]
    for var in optional_vars:
        value = os.getenv(var)
        env_check["optional_vars"][var] = value if value else "***NOT_SET***"

    return env_check


def _check_middleware_state(request: Request) -> Dict[str, Any]:
    """Check middleware processing state"""
    middleware_state = {
        "app_available": hasattr(request, "app"),
        "state_available": hasattr(request, "state"),
        "client_info": request.client is not None,
    }

    # Check app state
    if hasattr(request, "app") and hasattr(request.app, "state"):
        try:
            middleware_state["limiter_configured"] = hasattr(request.app.state, "limiter")
        except Exception as e:
            middleware_state["app_state_error"] = str(e)

    return middleware_state


def _check_app_state(request: Request) -> Dict[str, Any]:
    """Check FastAPI app state"""
    app_state = {
        "app_title": "unknown",
        "app_version": "unknown",
        "middlewares": [],
        "routes_count": 0
    }

    try:
        if hasattr(request, "app"):
            app = request.app
            app_state["app_title"] = getattr(app, "title", "unknown")
            app_state["app_version"] = getattr(app, "version", "unknown")

            # Count middleware
            if hasattr(app, "user_middleware"):
                app_state["middlewares"] = [str(m) for m in app.user_middleware]

            # Count routes
            if hasattr(app, "routes"):
                app_state["routes_count"] = len(app.routes)

    except Exception as e:
        app_state["error"] = str(e)

    return app_state


@router.get("/production-troubleshoot")
async def production_troubleshoot(request: Request) -> Dict[str, Any]:
    """
    Comprehensive production troubleshooting endpoint
    """
    troubleshoot_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "request_analysis": {},
        "environment_status": {},
        "database_status": {},
        "middleware_status": {},
        "recommendations": []
    }

    # Get request analysis
    try:
        troubleshoot_data["request_analysis"] = {
            "method": request.method,
            "path": request.url.path,
            "query": request.url.query,
            "content_type": request.headers.get("content-type"),
            "user_agent": request.headers.get("user-agent", "")[:100],
            "accept": request.headers.get("accept"),
        }
    except Exception as e:
        troubleshoot_data["request_analysis"]["error"] = str(e)

    # Environment status
    troubleshoot_data["environment_status"] = await _check_environment_variables()

    # Database status
    try:
        troubleshoot_data["database_status"] = await debug_database_connectivity()
    except Exception as e:
        troubleshoot_data["database_status"] = {"error": str(e)}

    # Middleware status
    troubleshoot_data["middleware_status"] = _check_middleware_state(request)

    # Generate recommendations based on findings
    if troubleshoot_data["environment_status"]["validation_errors"]:
        troubleshoot_data["recommendations"].append(
            "Environment variable issues detected - check deployment configuration"
        )

    if "error" in troubleshoot_data["database_status"]:
        troubleshoot_data["recommendations"].append(
            "Database connectivity issues detected - verify connection strings"
        )

    if not troubleshoot_data["recommendations"]:
        troubleshoot_data["recommendations"].append(
            "No obvious configuration issues detected - check application logs for detailed error messages"
        )

    return troubleshoot_data