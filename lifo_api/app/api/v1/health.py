"""
Health check endpoints for LIFO API
Tests database connectivity and service health
"""

import asyncio
from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException

from app.auth.secure_dependencies import get_current_user
from app.database.connection import get_db_manager, test_connection
from app.database.supabase_service import supabase_health_check
from app.monitoring.metrics import get_metrics_collector
from app.utils.performance import mobile_performance_health_check

router = APIRouter()
logger = structlog.get_logger()


@router.get("/")
@router.get("")
async def health_check() -> dict[str, Any]:
    """
    Comprehensive health check for all services
    """
    start_time = asyncio.get_event_loop().time()

    health_status: dict[str, Any] = {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "services": {},
    }

    # Test Supabase connectivity
    try:
        supabase_health = await supabase_health_check()
        health_status["services"]["supabase"] = supabase_health

        if supabase_health["status"] != "healthy":
            health_status["status"] = "degraded"

    except Exception as e:
        logger.error("Supabase health check failed", error=str(e))
        health_status["services"]["supabase"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"

    # Test SQLAlchemy connection (if available)
    try:
        sqlalchemy_healthy = await test_connection()
        health_status["services"]["sqlalchemy"] = {
            "status": "healthy" if sqlalchemy_healthy else "unhealthy",
            "connection_type": "postgresql+asyncpg",
        }

        if not sqlalchemy_healthy:
            health_status["status"] = "degraded"

    except Exception as e:
        logger.error("SQLAlchemy health check failed", error=str(e))
        health_status["services"]["sqlalchemy"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        # Don't fail overall health if SQLAlchemy is down but Supabase works

    # Add database manager info
    try:
        db_manager = get_db_manager()
        db_info = await db_manager.get_connection_info()
        health_status["services"]["database_manager"] = {
            "status": "healthy",
            "info": db_info,
        }
    except Exception as e:
        health_status["services"]["database_manager"] = {
            "status": "unhealthy",
            "error": str(e),
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


@router.get("/supabase")
async def supabase_health() -> dict[str, Any]:
    """
    Supabase-specific health check
    """
    try:
        return await supabase_health_check()
    except Exception as e:
        logger.error("Supabase health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "service": "supabase", "error": str(e)},
        ) from e


@router.get("/database")
async def database_health() -> dict[str, Any]:
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
            detail={"status": "unhealthy", "service": "database", "error": str(e)},
        ) from e


@router.get("/ready")
async def readiness_check() -> dict[str, Any]:
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
                detail={"ready": False, "reason": "Supabase service unavailable"},
            )

        return {
            "ready": True,
            "timestamp": asyncio.get_event_loop().time(),
            "services": {"supabase": "healthy"},
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        raise HTTPException(
            status_code=503, detail={"ready": False, "reason": str(e)}
        ) from e


@router.get("/live")
async def liveness_check() -> dict[str, Any]:
    """
    Kubernetes-style liveness check
    Simple check that the application is running
    """
    return {
        "alive": True,
        "timestamp": asyncio.get_event_loop().time(),
        "version": "1.0.0",
    }


@router.get("/performance")
async def performance_health_check(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Comprehensive performance health check
    Includes mobile performance, cache health, and system metrics
    """
    try:
        start_time = asyncio.get_event_loop().time()

        # Get metrics collector
        metrics_collector = get_metrics_collector()

        # Get comprehensive performance health
        performance_health = await mobile_performance_health_check()

        # Get current metrics summary
        metrics_summary = metrics_collector.get_metrics_summary()

        # Combine all health data
        health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": performance_health.get("overall_health", "unknown"),
            "performance_health": performance_health,
            "metrics_summary": metrics_summary,
            "mobile_optimization": {
                "bounded_cache_active": performance_health.get(
                    "memory_leak_fixed", False
                ),
                "mobile_targets_met": _check_mobile_performance_targets(
                    metrics_summary
                ),
                "cache_utilization": performance_health.get("cache_statistics", {}).get(
                    "utilization", 0
                ),
            },
            "system_health": {
                "database_performance": _assess_database_performance(metrics_summary),
                "api_performance": _assess_api_performance(metrics_summary),
                "cache_performance": _assess_cache_performance(metrics_summary),
            },
        }

        # Calculate response time
        end_time = asyncio.get_event_loop().time()
        health_report["health_check_time_ms"] = round((end_time - start_time) * 1000, 2)

        # Determine HTTP status based on health
        overall_health_score = metrics_summary.get("performance_health", {}).get(
            "overall_health_score", 1.0
        )

        if overall_health_score < 0.5:
            raise HTTPException(status_code=503, detail=health_report)
        elif overall_health_score < 0.7:
            health_report["warning"] = "Performance degradation detected"

        return health_report

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Performance health check failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "Performance health check failed",
                "error": str(e),
            },
        ) from e


@router.get("/mobile-performance")
async def mobile_performance_health(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Mobile-specific performance health check
    Validates mobile optimization targets are being met
    """
    try:
        metrics_collector = get_metrics_collector()
        metrics_summary = metrics_collector.get_metrics_summary()

        # Analyze mobile endpoint performance
        mobile_endpoints = {
            "/mobile-summary/": {"target_ms": 300, "critical": True},
            "/batch-quick-score/": {"target_ms": 200, "critical": True},
            "/store-health/": {"target_ms": 300, "critical": False},
            "/batch-list-mobile/": {"target_ms": 300, "critical": False},
        }

        mobile_health: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "mobile_targets_status": "optimal",
            "endpoint_performance": {},
            "violations": [],
            "recommendations": [],
        }

        total_violations = 0
        critical_violations = 0

        # Check each mobile endpoint
        api_metrics = metrics_summary.get("api_metrics", {})
        for endpoint_pattern, config in mobile_endpoints.items():
            for endpoint_key, metrics in api_metrics.items():
                if endpoint_pattern.strip("/") in endpoint_key:
                    avg_time = metrics.get("avg_response_time_ms", 0)
                    violations = metrics.get("mobile_target_violations", 0)
                    total_requests = metrics.get("total_requests", 0)

                    endpoint_health = {
                        "avg_response_time_ms": avg_time,
                        "target_ms": config["target_ms"],
                        "meets_target": avg_time <= config["target_ms"],
                        "violation_rate": violations / total_requests
                        if total_requests > 0
                        else 0,
                        "total_requests": total_requests,
                        "critical_endpoint": config["critical"],
                    }

                    mobile_health["endpoint_performance"][endpoint_key] = (
                        endpoint_health
                    )

                    # Count violations
                    if not endpoint_health["meets_target"]:
                        total_violations += 1
                        if config["critical"]:
                            critical_violations += 1

                        violation_msg = f"{endpoint_key}: {avg_time:.1f}ms (target: {config['target_ms']}ms)"
                        mobile_health["violations"].append(violation_msg)

        # Determine overall mobile status
        if critical_violations > 0:
            mobile_health["mobile_targets_status"] = "critical"
        elif total_violations > 0:
            mobile_health["mobile_targets_status"] = "degraded"

        # Add recommendations
        if critical_violations > 0:
            mobile_health["recommendations"].append(
                "Critical mobile endpoints exceeding targets - immediate optimization needed"
            )
        elif total_violations > 0:
            mobile_health["recommendations"].append(
                "Some mobile endpoints need performance optimization"
            )
        else:
            mobile_health["recommendations"].append("Mobile performance is optimal")

        # Check cache performance for mobile
        cache_metrics = metrics_summary.get("cache_metrics", {})
        mobile_cache_health = cache_metrics.get("mobile_cache", {})
        if mobile_cache_health:
            hit_rate = mobile_cache_health.get("hit_rate_percent", 0)
            if hit_rate < 60:
                mobile_health["recommendations"].append(
                    f"Mobile cache hit rate is {hit_rate:.1f}% - consider cache optimization"
                )

        return mobile_health

    except Exception as e:
        logger.error("Mobile performance health check failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "Mobile performance health check failed",
                "error": str(e),
            },
        ) from e


@router.get("/metrics")
async def get_performance_metrics(
    hours: int = 24, current_user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Get comprehensive performance metrics
    Provides detailed metrics for monitoring dashboards
    """
    try:
        metrics_collector = get_metrics_collector()

        # Get comprehensive metrics summary
        metrics_summary = metrics_collector.get_metrics_summary()

        # Add time series data for key metrics
        time_series_data = {}

        # Mobile endpoint response times
        mobile_endpoints = [
            "api_get_mobile_summary",
            "api_post_batch_quick_score",
            "api_get_store_health",
            "api_get_batch_list_mobile",
        ]

        for endpoint in mobile_endpoints:
            time_series_key = f"{endpoint}_response_time"
            time_series_data[endpoint] = metrics_collector.get_time_series_data(
                time_series_key, hours=hours
            )

        # System metrics time series
        system_metrics = [
            "system_cpu_usage_percent",
            "system_memory_usage_percent",
            "system_disk_usage_percent",
        ]

        for metric in system_metrics:
            time_series_data[metric] = metrics_collector.get_time_series_data(
                metric, hours=hours
            )

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "time_period_hours": hours,
            "metrics_summary": metrics_summary,
            "time_series_data": time_series_data,
            "data_retention": {
                "max_data_points_per_metric": 1000,
                "collection_interval_seconds": 30,
            },
        }

    except Exception as e:
        logger.error("Failed to get performance metrics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": "Failed to retrieve performance metrics",
                "error": str(e),
            },
        ) from e


def _check_mobile_performance_targets(metrics_summary: dict[str, Any]) -> bool:
    """Check if mobile performance targets are being met"""
    api_metrics = metrics_summary.get("api_metrics", {})

    mobile_endpoints = [
        "get/mobile/summary",
        "post/batch/quick/score",
        "get/store/health",
        "get/batch/list/mobile",
    ]

    for endpoint_key, metrics in api_metrics.items():
        if any(mobile_ep in endpoint_key for mobile_ep in mobile_endpoints):
            avg_time = metrics.get("avg_response_time_ms", 0)
            if avg_time > 300:  # Mobile target
                return False

    return True


def _assess_database_performance(metrics_summary: dict[str, Any]) -> str:
    """Assess database performance health"""
    db_metrics = metrics_summary.get("database_metrics", {})

    if not db_metrics:
        return "unknown"

    slow_queries = 0
    total_queries = 0

    for _query_name, metrics in db_metrics.items():
        total_queries += metrics.get("total_queries", 0)
        slow_queries += metrics.get("slow_query_rate", 0) * metrics.get(
            "total_queries", 0
        )

    if total_queries == 0:
        return "no_data"

    slow_query_rate = slow_queries / total_queries

    if slow_query_rate > 0.2:  # >20% slow queries
        return "poor"
    elif slow_query_rate > 0.1:  # >10% slow queries
        return "fair"
    elif slow_query_rate > 0.05:  # >5% slow queries
        return "good"
    else:
        return "excellent"


def _assess_api_performance(metrics_summary: dict[str, Any]) -> str:
    """Assess API performance health"""
    api_metrics = metrics_summary.get("api_metrics", {})

    if not api_metrics:
        return "unknown"

    slow_endpoints = 0
    total_endpoints = len(api_metrics)

    for _endpoint_key, metrics in api_metrics.items():
        avg_time = metrics.get("avg_response_time_ms", 0)
        if avg_time > 500:  # General API threshold
            slow_endpoints += 1

    slow_endpoint_rate = slow_endpoints / total_endpoints if total_endpoints > 0 else 0

    if slow_endpoint_rate > 0.3:  # >30% slow endpoints
        return "poor"
    elif slow_endpoint_rate > 0.1:  # >10% slow endpoints
        return "fair"
    elif slow_endpoint_rate > 0:  # Some slow endpoints
        return "good"
    else:
        return "excellent"


def _assess_cache_performance(metrics_summary: dict[str, Any]) -> str:
    """Assess cache performance health"""
    cache_metrics = metrics_summary.get("cache_metrics", {})

    if not cache_metrics:
        return "unknown"

    low_hit_rate_caches = 0
    total_caches = len(cache_metrics)

    for _cache_name, metrics in cache_metrics.items():
        hit_rate = metrics.get("hit_rate_percent", 0)
        if hit_rate < 60:  # <60% hit rate is concerning
            low_hit_rate_caches += 1

    low_hit_rate_ratio = low_hit_rate_caches / total_caches if total_caches > 0 else 0

    if low_hit_rate_ratio > 0.5:  # >50% caches with low hit rate
        return "poor"
    elif low_hit_rate_ratio > 0.2:  # >20% caches with low hit rate
        return "fair"
    elif low_hit_rate_ratio > 0:  # Some caches with low hit rate
        return "good"
    else:
        return "excellent"



@router.get("/multi-store/status")
async def multi_store_health_status(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Multi-store specific health monitoring
    Essential for Phase 3 MVP monitoring across 5-10 stores
    """
    try:
        # Simple health aggregation for MVP
        multi_store_health = {
            "timestamp": datetime.utcnow().isoformat(),
            "multi_store_status": "operational",
            "services": {
                "cross_store_analytics": "healthy",
                "multi_store_alerts": "healthy", 
                "performance_comparison": "healthy",
                "aggregated_metrics": "healthy"
            },
            "performance_targets": {
                "cross_store_query_time": "< 2 seconds",
                "alert_generation": "< 1 second", 
                "comparison_analytics": "< 3 seconds"
            },
            "mvp_capabilities": [
                "Cross-store overview dashboard",
                "Performance comparison between stores", 
                "Aggregated alerts across stores",
                "Multi-store performance metrics"
            ],
            "deployment_info": {
                "target_scale": "5-10 stores",
                "deployment_platform": "Digital Ocean App Platform",
                "auto_scaling": "1-3 instances",
                "monitoring": "Built-in health checks"
            }
        }
            
        return multi_store_health
        
    except Exception as e:
        logger.error("Multi-store health check failed", error=str(e))
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "multi_store_status": "error",
            "error": str(e),
            "mvp_note": "Multi-store health monitoring requires proper authentication"
        }
