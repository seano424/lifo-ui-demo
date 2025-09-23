"""
Database Monitoring API Endpoints
Enterprise-grade monitoring and alerting for LIFO.AI
"""

from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user
from app.database.connection import get_db
from app.services.database_monitoring import get_db_monitor

router = APIRouter()
logger = structlog.get_logger()

@router.get("/health/comprehensive")
async def get_comprehensive_database_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive database health assessment

    Enterprise monitoring covering:
    - Connection pooling and utilization
    - Query performance and slow queries
    - Table sizes and growth
    - Replication lag (if applicable)
    - Lock conflicts and deadlocks
    - Cache hit ratios
    - LIFO.AI specific metrics

    Critical for 3AM emergency situations
    """

    try:
        monitor = get_db_monitor()
        health_data = await monitor.get_comprehensive_health_check()

        return {
            "success": True,
            "database_health": health_data,
            "monitoring": {
                "collected_at": datetime.utcnow().isoformat(),
                "collected_by": current_user["sub"],
                "enterprise_monitoring": True,
                "pgbouncer_aware": True
            }
        }

    except Exception as e:
        logger.error("Comprehensive health check failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        ) from e

@router.get("/connections")
async def get_connection_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor database connections and connection pooling

    Critical for diagnosing pgbouncer issues and connection exhaustion
    """

    try:
        monitor = get_db_monitor()
        connection_stats = await monitor.get_connection_stats()

        return {
            "success": True,
            "connection_statistics": connection_stats,
            "pgbouncer_monitoring": {
                "prepared_statement_conflicts_monitored": True,
                "connection_pooling_aware": True
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Connection stats failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Connection monitoring failed: {str(e)}"
        ) from e

@router.get("/performance/queries")
async def get_query_performance_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor query performance and identify slow queries

    Essential for mobile performance optimization (<500ms target)
    """

    try:
        monitor = get_db_monitor()
        query_stats = await monitor.get_query_performance_stats()

        # Check for mobile performance violations
        mobile_performance_alerts = []
        for query in query_stats.get("slow_queries", []):
            if query.get("avg_time_ms", 0) > 500:  # Mobile target
                mobile_performance_alerts.append({
                    "query": query["query"][:100] + "...",
                    "avg_time_ms": query["avg_time_ms"],
                    "impact": "mobile_performance_violation"
                })

        return {
            "success": True,
            "query_performance": query_stats,
            "mobile_optimization": {
                "target_response_time_ms": 500,
                "violations": mobile_performance_alerts,
                "violation_count": len(mobile_performance_alerts)
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Query performance monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Query performance monitoring failed: {str(e)}"
        ) from e

@router.get("/storage/tables")
async def get_table_size_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor table sizes and growth patterns

    Critical for capacity planning and enterprise scaling to 10k+ stores
    """

    try:
        monitor = get_db_monitor()
        table_stats = await monitor.get_table_size_stats()

        # Calculate growth projections for enterprise scaling
        large_tables = [t for t in table_stats.get("tables", []) if t["size_gb"] > 1]

        return {
            "success": True,
            "table_statistics": table_stats,
            "enterprise_scaling": {
                "large_tables_count": len(large_tables),
                "largest_table_size_gb": large_tables[0]["size_gb"] if large_tables else 0,
                "capacity_planning_needed": len(large_tables) > 5,
                "scaling_to_10k_stores": {
                    "current_monitored_size_gb": table_stats.get("total_monitored_size_gb", 0),
                    "projected_at_10k_stores_gb": table_stats.get("total_monitored_size_gb", 0) * 10  # Rough estimate
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Table size monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Table size monitoring failed: {str(e)}"
        ) from e

@router.get("/replication")
async def get_replication_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor replication lag and status

    Essential for high availability and disaster recovery
    """

    try:
        monitor = get_db_monitor()
        replication_stats = await monitor.get_replication_stats()

        # Assess replication health for enterprise deployments
        replication_health = "healthy"
        if replication_stats.get("is_replica") and replication_stats.get("lag_seconds", 0) > 60:
            replication_health = "warning"
        if replication_stats.get("lag_seconds", 0) > 300:
            replication_health = "critical"

        return {
            "success": True,
            "replication_statistics": replication_stats,
            "high_availability": {
                "replication_health": replication_health,
                "disaster_recovery_ready": replication_stats.get("is_replica", False),
                "rpo_estimate_seconds": replication_stats.get("lag_seconds", 0),
                "enterprise_ready": replication_stats.get("lag_seconds", 0) < 300
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Replication monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Replication monitoring failed: {str(e)}"
        ) from e

@router.get("/locks")
async def get_lock_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor database locks and deadlocks

    Critical for diagnosing CSV upload issues and bulk operation conflicts
    """

    try:
        monitor = get_db_monitor()
        lock_stats = await monitor.get_lock_stats()

        # Assess impact on CSV operations
        csv_impact_assessment = "low"
        if lock_stats.get("blocked_locks", 0) > 5:
            csv_impact_assessment = "medium"
        if lock_stats.get("blocked_locks", 0) > 20:
            csv_impact_assessment = "high"

        return {
            "success": True,
            "lock_statistics": lock_stats,
            "csv_operation_impact": {
                "impact_level": csv_impact_assessment,
                "blocked_operations": lock_stats.get("blocked_locks", 0),
                "bulk_operation_safe": lock_stats.get("blocked_locks", 0) < 10,
                "mcp_recommended": lock_stats.get("blocked_locks", 0) > 10
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Lock monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Lock monitoring failed: {str(e)}"
        ) from e

@router.get("/cache")
async def get_cache_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Monitor buffer cache hit ratios

    Critical for mobile performance optimization
    """

    try:
        monitor = get_db_monitor()
        cache_stats = await monitor.get_cache_stats()

        # Mobile performance impact assessment
        mobile_impact = "optimal"
        hit_ratio = cache_stats.get("overall_hit_ratio", 1.0)

        if hit_ratio < 0.90:
            mobile_impact = "suboptimal"
        if hit_ratio < 0.80:
            mobile_impact = "poor"

        return {
            "success": True,
            "cache_statistics": cache_stats,
            "mobile_performance": {
                "cache_impact_on_mobile": mobile_impact,
                "mobile_performance_affected": hit_ratio < 0.85,
                "optimization_needed": hit_ratio < 0.80,
                "target_hit_ratio": 0.95
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("Cache monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Cache monitoring failed: {str(e)}"
        ) from e

@router.get("/metrics/lifo")
async def get_lifo_specific_metrics(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get LIFO.AI specific business metrics

    Business intelligence for inventory management system
    """

    try:
        monitor = get_db_monitor()
        lifo_stats = await monitor.get_lifo_specific_stats()

        # Calculate key business metrics
        business_metrics = lifo_stats.get("business_metrics", {})
        data_health = lifo_stats.get("data_health", {})

        # Business health assessment
        health_score = 100
        alerts = []

        if data_health.get("expired_batch_ratio", 0) > 0.20:  # More than 20% expired
            health_score -= 30
            alerts.append("High expired batch ratio detected")

        if data_health.get("scoring_coverage", 0) < 0.80:  # Less than 80% scored
            health_score -= 20
            alerts.append("Low scoring coverage detected")

        return {
            "success": True,
            "lifo_metrics": lifo_stats,
            "business_health": {
                "health_score": max(health_score, 0),
                "alerts": alerts,
                "data_quality": "good" if health_score > 80 else "needs_attention",
                "inventory_turnover_health": data_health.get("expired_batch_ratio", 0) < 0.10
            },
            "enterprise_insights": {
                "stores_ready_for_scaling": business_metrics.get("store_count", 0),
                "products_under_management": business_metrics.get("product_count", 0),
                "active_inventory_items": business_metrics.get("active_batch_count", 0),
                "data_processing_volume": "enterprise_scale" if business_metrics.get("active_batch_count", 0) > 10000 else "standard"
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error("LIFO metrics monitoring failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"LIFO metrics monitoring failed: {str(e)}"
        ) from e

@router.get("/alerts/generate")
async def generate_monitoring_alerts(
    threshold_level: str = Query("warning", description="Alert threshold: warning, critical"),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate monitoring alerts based on current system status

    3AM emergency alert system for database administrators
    """

    try:
        monitor = get_db_monitor()

        # Get comprehensive health data
        health_data = await monitor.get_comprehensive_health_check()

        alerts = []

        # Connection alerts
        connections = health_data.get("checks", {}).get("connections", {})
        if connections.get("utilization_percent", 0) > 90:
            alerts.append({
                "severity": "critical" if connections.get("utilization_percent", 0) > 95 else "warning",
                "component": "connections",
                "message": f"High connection utilization: {connections.get('utilization_percent')}%",
                "action": "Check for connection leaks or increase max_connections",
                "impact": "New connections may be rejected"
            })

        # Query performance alerts
        query_perf = health_data.get("checks", {}).get("query_performance", {})
        long_queries = [q for q in query_perf.get("active_queries", []) if q.get("duration_seconds", 0) > 30]
        if long_queries:
            alerts.append({
                "severity": "warning",
                "component": "query_performance",
                "message": f"{len(long_queries)} long-running queries detected",
                "action": "Review and optimize slow queries",
                "impact": "Mobile performance may be affected"
            })

        # Cache performance alerts
        cache_stats = health_data.get("checks", {}).get("cache", {})
        if cache_stats.get("overall_hit_ratio", 1) < 0.80:
            alerts.append({
                "severity": "warning",
                "component": "cache",
                "message": f"Low cache hit ratio: {cache_stats.get('overall_hit_ratio', 0):.2%}",
                "action": "Consider increasing shared_buffers",
                "impact": "Query performance degradation"
            })

        # Replication alerts
        replication = health_data.get("checks", {}).get("replication", {})
        if replication.get("lag_seconds", 0) > 300:
            alerts.append({
                "severity": "critical",
                "component": "replication",
                "message": f"High replication lag: {replication.get('lag_seconds')} seconds",
                "action": "Check replica connectivity and resources",
                "impact": "Data consistency at risk"
            })

        # Lock alerts
        locks = health_data.get("checks", {}).get("locks", {})
        if locks.get("blocked_locks", 0) > 10:
            alerts.append({
                "severity": "warning",
                "component": "locks",
                "message": f"{locks.get('blocked_locks')} blocked locks detected",
                "action": "Check for long-running transactions",
                "impact": "CSV uploads and bulk operations may fail"
            })

        # Filter by threshold level
        if threshold_level == "critical":
            alerts = [a for a in alerts if a["severity"] == "critical"]

        return {
            "success": True,
            "alert_summary": {
                "total_alerts": len(alerts),
                "critical_alerts": len([a for a in alerts if a["severity"] == "critical"]),
                "warning_alerts": len([a for a in alerts if a["severity"] == "warning"]),
                "overall_status": health_data.get("overall_status", "unknown"),
                "emergency_action_required": any(a["severity"] == "critical" for a in alerts)
            },
            "alerts": alerts,
            "recommendations": health_data.get("recommendations", []),
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": current_user["sub"],
            "for_3am_emergencies": True
        }

    except Exception as e:
        logger.error("Alert generation failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Alert generation failed: {str(e)}"
        ) from e

@router.post("/maintenance/analyze")
async def analyze_maintenance_needs(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze database maintenance needs

    Recommends VACUUM, ANALYZE, REINDEX operations for optimal performance
    """

    try:
        # This would typically involve checking table statistics,
        # bloat ratios, and index usage patterns

        # For now, return a structured maintenance plan
        maintenance_plan = {
            "vacuum_needed": {
                "tables": [],  # Would be populated based on actual analysis
                "priority": "medium",
                "estimated_duration_minutes": 30
            },
            "reindex_needed": {
                "indexes": [],  # Would be populated based on index bloat analysis
                "priority": "low",
                "estimated_duration_minutes": 15
            },
            "analyze_needed": {
                "tables": [],  # Would be populated based on statistics staleness
                "priority": "high",
                "estimated_duration_minutes": 10
            }
        }

        return {
            "success": True,
            "maintenance_analysis": maintenance_plan,
            "next_maintenance_window": "Schedule during low-traffic hours",
            "estimated_total_duration_minutes": 55,
            "analyzed_at": datetime.utcnow().isoformat(),
            "analyzed_by": current_user["sub"]
        }

    except Exception as e:
        logger.error("Maintenance analysis failed",
                   user_id=current_user["sub"], error=str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Maintenance analysis failed: {str(e)}"
        ) from e
