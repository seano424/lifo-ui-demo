"""
Health check endpoints for LIFO API
Tests database connectivity and service health
"""

import asyncio
from typing import Dict, Any

import structlog
from fastapi import APIRouter, HTTPException

from app.database.connection import test_connection, get_db_manager
from app.database.supabase_service import supabase_health_check

router = APIRouter()
logger = structlog.get_logger()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check for all services
    """
    start_time = asyncio.get_event_loop().time()
    
    health_status = {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "services": {}
    }
    
    # Test Supabase connectivity
    try:
        supabase_health = await supabase_health_check()
        health_status["services"]["supabase"] = supabase_health
        
        if supabase_health["status"] != "healthy":
            health_status["status"] = "degraded"
            
    except Exception as e:
        logger.error("Supabase health check failed", error=str(e))
        health_status["services"]["supabase"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"
    
    # Test SQLAlchemy connection (if available)
    try:
        sqlalchemy_healthy = await test_connection()
        health_status["services"]["sqlalchemy"] = {
            "status": "healthy" if sqlalchemy_healthy else "unhealthy",
            "connection_type": "postgresql+asyncpg"
        }
        
        if not sqlalchemy_healthy:
            health_status["status"] = "degraded"
            
    except Exception as e:
        logger.error("SQLAlchemy health check failed", error=str(e))
        health_status["services"]["sqlalchemy"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        # Don't fail overall health if SQLAlchemy is down but Supabase works
    
    # Add database manager info
    try:
        db_manager = get_db_manager()
        db_info = await db_manager.get_connection_info()
        health_status["services"]["database_manager"] = {
            "status": "healthy",
            "info": db_info
        }
    except Exception as e:
        health_status["services"]["database_manager"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    end_time = asyncio.get_event_loop().time()
    health_status["total_response_time_ms"] = round((end_time - start_time) * 1000, 2)
    
    # Return appropriate HTTP status
    if health_status["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health_status)
    elif health_status["status"] == "degraded":
        # Still return 200 but indicate degraded performance
        health_status["warning"] = "Some services are experiencing issues"
    
    return health_status


@router.get("/health/supabase")
async def supabase_health() -> Dict[str, Any]:
    """
    Supabase-specific health check
    """
    try:
        return await supabase_health_check()
    except Exception as e:
        logger.error("Supabase health check failed", error=str(e))
        raise HTTPException(
            status_code=503, 
            detail={
                "status": "unhealthy",
                "service": "supabase",
                "error": str(e)
            }
        )


@router.get("/health/database")
async def database_health() -> Dict[str, Any]:
    """
    Database connectivity health check
    """
    try:
        db_manager = get_db_manager()
        return await db_manager.health_check()
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "service": "database",
                "error": str(e)
            }
        )


@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Kubernetes-style readiness check
    Returns 200 only if all critical services are healthy
    """
    try:
        # Check Supabase (critical)
        supabase_health = await supabase_health_check()
        if supabase_health["status"] != "healthy":
            raise HTTPException(
                status_code=503,
                detail={
                    "ready": False,
                    "reason": "Supabase service unavailable"
                }
            )
        
        return {
            "ready": True,
            "timestamp": asyncio.get_event_loop().time(),
            "services": {
                "supabase": "healthy"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "ready": False,
                "reason": str(e)
            }
        )


@router.get("/health/live")
async def liveness_check() -> Dict[str, Any]:
    """
    Kubernetes-style liveness check
    Simple check that the application is running
    """
    return {
        "alive": True,
        "timestamp": asyncio.get_event_loop().time(),
        "version": "1.0.0"
    }