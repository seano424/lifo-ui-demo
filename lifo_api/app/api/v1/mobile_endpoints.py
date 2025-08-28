"""
Mobile-optimized API endpoints for LIFO.AI MVP
Lightweight responses designed for mobile scanning interface
Target: <0.5s response time, minimal data transfer
"""

import time
from datetime import date, datetime
from functools import lru_cache
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import (
    get_current_user,
    validate_batch_id_format,
    validate_store_id_format,
)
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.middleware.rate_limiting import ai_endpoint_rate_limit
from app.models.scan_models import (
    MobileBatchSummary,
    MobileStoreHealth,
    QuickBatchScore,
)
from app.utils.mobile_queries import create_mobile_query_optimizer, mobile_query_monitor
from app.utils.performance import (
    cached_mobile_response,
    compress_for_mobile,
)

router = APIRouter()
logger = structlog.get_logger()


@lru_cache(maxsize=100)
def get_cached_category_weights(category: str) -> dict[str, float]:
    """Cache category weights for faster mobile scoring"""
    # Default weights - in production this would cache from database
    weights_map = {
        "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
        "dairy": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
        "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
        "fresh_meat_fish": {"expiry": 0.65, "velocity": 0.2, "margin": 0.15},
        "frozen": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3},
    }
    return weights_map.get(category, {"expiry": 0.5, "velocity": 0.3, "margin": 0.2})


@router.get("/mobile-summary/{store_id}", response_model=MobileBatchSummary)
@ai_endpoint_rate_limit("60/minute")  # High limit for frequent mobile refreshes
@cached_mobile_response(ttl=180, prefix="mobile_summary")  # 3min cache for mobile
async def get_mobile_batch_summary(
    store_id: str,
    request: Request,
    include_details: bool = Query(False, description="Include detailed batch info"),
    limit_urgent: int = Query(
        10, ge=1, le=50, description="Max urgent items to return"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Lightweight response optimized for mobile scanning interface
    Returns only essential data for quick mobile consumption
    Target: <0.3s response time
    """
    start_time = time.time()

    try:
        store_id = validate_store_id_format(store_id)

        # MOBILE OPTIMIZATION: Use mobile-optimized queries
        mobile_optimizer = create_mobile_query_optimizer(db)
        inventory_data = await mobile_optimizer.get_store_inventory_fast(
            store_id,
            limit=200,  # Mobile performance limit
            urgency_filter=None,
        )

        if not inventory_data:
            return MobileBatchSummary(
                urgent_batches=[],
                expiring_today=[],
                action_needed=[],
                total_active_batches=0,
                store_health_score=1.0,
                cache_expires_in=300,
            )

        # Mobile-optimized categorization with performance limits
        urgent_batches = []
        expiring_today = []
        action_needed = []
        total_value_at_risk = 0.0

        # Mobile data is already optimized and limited
        for item in inventory_data:
            days_to_expiry = item["days_to_expiry"]

            # Quick urgency calculation (optimized for mobile)
            urgency_score = _calculate_quick_urgency_score(days_to_expiry)

            mobile_item = {
                "batch_id": item["batch_id"],
                "sku": item["sku"],
                "category": item["category"],
                "quantity": item["current_quantity"],
                "days_to_expiry": days_to_expiry,
                "urgency_score": urgency_score,
                "estimated_value": item["current_quantity"] * item["selling_price"],
            }

            # Only include essential details for mobile
            if not include_details:
                mobile_item = {
                    "batch_id": item["batch_id"],
                    "sku": item["sku"],
                    "days_to_expiry": days_to_expiry,
                    "urgency_score": urgency_score,
                    "quantity": item["current_quantity"],
                }

            # Categorize for mobile display
            if urgency_score >= 0.8:
                urgent_batches.append(mobile_item)
                total_value_at_risk += mobile_item.get("estimated_value", 0)
            elif days_to_expiry <= 0:
                expiring_today.append(mobile_item)
                total_value_at_risk += mobile_item.get("estimated_value", 0) * 0.5
            elif urgency_score >= 0.6:
                action_needed.append(mobile_item)

        # Limit results for mobile performance
        urgent_batches = sorted(
            urgent_batches, key=lambda x: x["urgency_score"], reverse=True
        )[:limit_urgent]
        expiring_today = sorted(expiring_today, key=lambda x: x["days_to_expiry"])[
            :limit_urgent
        ]
        action_needed = sorted(
            action_needed, key=lambda x: x["urgency_score"], reverse=True
        )[:limit_urgent]

        # Calculate store health score (simplified for mobile)
        total_items = len(inventory_data)
        urgent_count = len(urgent_batches)
        expiring_count = len(expiring_today)

        health_score = max(
            0.0, 1.0 - ((urgent_count + expiring_count) / max(total_items, 1)) * 2
        )

        processing_time_ms = (time.time() - start_time) * 1000

        # MOBILE PERFORMANCE: Record metrics for optimization
        mobile_query_monitor.record_query(
            "mobile_summary",
            processing_time_ms,
            len(urgent_batches) + len(expiring_today) + len(action_needed),
        )

        logger.info(
            "Mobile summary generated",
            store_id=store_id,
            total_items=total_items,
            urgent_items=urgent_count,
            expiring_today=expiring_count,
            health_score=health_score,
            processing_time_ms=processing_time_ms,
            mobile_target_met=processing_time_ms <= 300,  # 300ms mobile target
            user_id=current_user["sub"],
        )

        # MOBILE OPTIMIZATION: Compress response data
        mobile_response = MobileBatchSummary(
            urgent_batches=compress_for_mobile(urgent_batches, "standard"),
            expiring_today=compress_for_mobile(expiring_today, "standard"),
            action_needed=compress_for_mobile(action_needed, "standard"),
            total_active_batches=total_items,
            store_health_score=round(health_score, 2),
            cache_expires_in=180,  # 3 minutes cache for mobile
        )

        return mobile_response

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Mobile summary failed",
            store_id=store_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Failed to generate mobile summary") from e


@router.post("/batch-quick-score/{batch_id}", response_model=QuickBatchScore)
@ai_endpoint_rate_limit("100/minute")  # Very high limit for real-time scanning
@cached_mobile_response(ttl=60, prefix="quick_score")  # 1min cache for scanning
async def quick_batch_score(
    batch_id: str,
    request: Request,
    store_id: str = Query(..., description="Store ID for context"),
    force_recalculate: bool = Query(False, description="Force score recalculation"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Optimized scoring for real-time mobile scanning
    Target: <0.2s response time
    Uses cached category weights and simplified calculations
    """
    start_time = time.time()

    try:
        batch_id = validate_batch_id_format(batch_id)
        store_id = validate_store_id_format(store_id)

        # MOBILE OPTIMIZATION: Use ultra-fast batch scoring query
        mobile_optimizer = create_mobile_query_optimizer(db)
        batch_data = await mobile_optimizer.get_batch_quick_score_data(batch_id)
        if not batch_data:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Quick scoring calculation
        days_to_expiry = batch_data["days_to_expiry"]
        category = batch_data["category"]

        # Use cached weights for speed
        weights = get_cached_category_weights(category)

        # Simplified scoring for mobile speed
        expiry_score = _calculate_quick_expiry_score(
            days_to_expiry, batch_data.get("typical_shelf_life_days", 30)
        )
        velocity_score = 0.5  # Default for quick calculation
        margin_score = _calculate_quick_margin_score(
            batch_data["cost_price"], batch_data["selling_price"]
        )

        # Composite score
        composite_score = (
            expiry_score * weights["expiry"]
            + velocity_score * weights["velocity"]
            + margin_score * weights["margin"]
        )

        # Quick recommendation
        urgency_level, recommendation, suggested_action, discount_suggestion = (
            _get_quick_recommendation(composite_score, days_to_expiry)
        )

        processing_time_ms = (time.time() - start_time) * 1000

        # MOBILE PERFORMANCE: Record metrics for optimization
        mobile_query_monitor.record_query("quick_score", processing_time_ms, 1)

        logger.info(
            "Quick score calculated",
            batch_id=batch_id,
            composite_score=composite_score,
            urgency_level=urgency_level,
            processing_time_ms=processing_time_ms,
            mobile_target_met=processing_time_ms
            <= 200,  # 200ms mobile target for scoring
            user_id=current_user["sub"],
        )

        return QuickBatchScore(
            batch_id=batch_id,
            composite_score=round(composite_score, 2),
            urgency_level=urgency_level,
            recommendation=recommendation,
            days_to_expiry=days_to_expiry,
            suggested_action=suggested_action,
            discount_suggestion=discount_suggestion,
            processing_time_ms=processing_time_ms,
        )

    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Quick scoring failed",
            batch_id=batch_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Quick scoring failed") from e


@router.get("/store-health/{store_id}", response_model=MobileStoreHealth)
@ai_endpoint_rate_limit("30/minute")
@cached_mobile_response(ttl=300, prefix="store_health")  # 5min cache for health data
async def get_mobile_store_health(
    store_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Mobile-optimized store health overview
    Provides key metrics for mobile dashboard
    """
    start_time = time.time()

    try:
        store_id = validate_store_id_format(store_id)

        # MOBILE OPTIMIZATION: Use single-query health metrics
        mobile_optimizer = create_mobile_query_optimizer(db)
        analytics_data = await mobile_optimizer.get_store_health_metrics(store_id)

        if not analytics_data:
            return MobileStoreHealth(
                overall_score=1.0,
                critical_items=0,
                expiring_soon=0,
                total_value_at_risk=0.0,
                trends={},
                last_action_taken=None,
                next_recommended_action=None,
            )

        # Mobile-optimized metrics from single query
        total_items = analytics_data.get("total_batches", 0)
        critical_items = analytics_data.get("critical_batches", 0)
        expiring_soon = analytics_data.get("expiring_soon", 0)

        # Overall health score
        overall_score = 1.0
        if total_items > 0:
            risk_ratio = (critical_items + expiring_soon) / total_items
            overall_score = max(0.0, 1.0 - risk_ratio * 1.5)

        # Simplified trends for mobile
        trends = {
            "waste_trend": "stable",  # Would calculate from historical data
            "efficiency_trend": "improving",
            "action_rate": 0.7,
        }

        # Next recommended action
        next_action = None
        if critical_items > 0:
            next_action = (
                f"Review {critical_items} critical items requiring immediate attention"
            )
        elif expiring_soon > 0:
            next_action = f"Monitor {expiring_soon} items expiring soon"
        else:
            next_action = "Continue monitoring - store performing well"

        (time.time() - start_time) * 1000

        return MobileStoreHealth(
            overall_score=round(overall_score, 2),
            critical_items=critical_items,
            expiring_soon=expiring_soon,
            total_value_at_risk=analytics_data.get("total_value", 0)
            * 0.1,  # Estimated risk
            trends=trends,
            last_action_taken="Recent discount applied",  # Would come from action log
            next_recommended_action=next_action,
        )

    except Exception as e:
        logger.error(
            "Store health calculation failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Store health calculation failed") from e


@router.get("/batch-list-mobile/{store_id}")
@ai_endpoint_rate_limit("40/minute")
@cached_mobile_response(ttl=120, prefix="batch_list")  # 2min cache for list data
async def get_mobile_batch_list(
    store_id: str,
    request: Request,
    category: str | None = Query(None, description="Filter by category"),
    urgency_filter: str | None = Query(
        None, description="Filter by urgency: critical, high, medium, low"
    ),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Mobile-optimized batch list with filtering
    Lightweight data for mobile list views
    """
    start_time = time.time()

    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)

        # Get inventory data
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

        if not inventory_data:
            return {
                "batches": [],
                "total_count": 0,
                "has_more": False,
                "processing_time_ms": (time.time() - start_time) * 1000,
            }

        # MOBILE OPTIMIZATION: Use optimized query with built-in filtering
        mobile_optimizer = create_mobile_query_optimizer(db)

        # Convert urgency_filter to database-level filter
        db_urgency_filter = None
        if urgency_filter in ["critical", "high", "medium"]:
            db_urgency_filter = urgency_filter

        inventory_data = await mobile_optimizer.get_store_inventory_fast(
            store_id,
            limit=min(limit * 3, 300),  # Get extra for client-side filtering
            urgency_filter=db_urgency_filter,
        )

        # Apply remaining filters
        filtered_batches = []

        for item in inventory_data:
            # Category filter
            if category and item["category"] != category:
                continue

            # Urgency filter (if not already applied at DB level)
            urgency_score = _calculate_quick_urgency_score(item["days_to_expiry"])
            urgency_level = _get_urgency_level(urgency_score)

            if (
                urgency_filter
                and urgency_level != urgency_filter
                and not db_urgency_filter
            ):
                continue

            # Create mobile-optimized item
            mobile_item = {
                "batch_id": item["batch_id"],
                "sku": item["sku"],
                "category": item["category"],
                "quantity": item["current_quantity"],
                "days_to_expiry": item["days_to_expiry"],
                "urgency_score": round(urgency_score, 2),
                "urgency_level": urgency_level,
                "location": item.get("location_code", "MAIN"),
                "estimated_value": round(
                    item["current_quantity"] * item["selling_price"], 2
                ),
            }

            filtered_batches.append(mobile_item)

        # Sort by urgency (highest first)
        filtered_batches.sort(key=lambda x: x["urgency_score"], reverse=True)

        # Pagination
        total_count = len(filtered_batches)
        paginated_batches = filtered_batches[offset : offset + limit]
        has_more = offset + limit < total_count

        processing_time_ms = (time.time() - start_time) * 1000

        # MOBILE PERFORMANCE: Record metrics for optimization
        mobile_query_monitor.record_query(
            "batch_list", processing_time_ms, len(paginated_batches)
        )

        logger.info(
            "Mobile batch list generated",
            store_id=store_id,
            total_count=total_count,
            returned_count=len(paginated_batches),
            category_filter=category,
            urgency_filter=urgency_filter,
            processing_time_ms=processing_time_ms,
            mobile_target_met=processing_time_ms <= 300,  # 300ms mobile target
            user_id=current_user["sub"],
        )

        # MOBILE OPTIMIZATION: Compress batch list for mobile transmission
        compressed_batches = compress_for_mobile(paginated_batches, "standard")

        return {
            "batches": compressed_batches,
            "total_count": total_count,
            "has_more": has_more,
            "filters_applied": {"category": category, "urgency": urgency_filter},
            "processing_time_ms": processing_time_ms,
            "mobile_optimized": True,  # Indicator for mobile clients
        }

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Mobile batch list failed",
            store_id=store_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Failed to get batch list") from e


@router.get("/mobile-performance-health")
@ai_endpoint_rate_limit("10/minute")
async def get_mobile_performance_health(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Mobile performance health check and metrics
    Returns optimization status and performance statistics
    """
    try:
        from app.utils.performance import mobile_performance_health_check

        # Get comprehensive mobile health report
        health_report = await mobile_performance_health_check()

        # Get mobile query performance
        query_report = mobile_query_monitor.get_performance_report()

        # Calculate overall mobile health score
        mobile_health_issues = []

        # Check query performance
        for query_name, stats in query_report.items():
            if not stats.get("meets_mobile_target", True):
                mobile_health_issues.append(
                    f"{query_name}: {stats['avg_execution_ms']:.1f}ms (target: <200-300ms)"
                )

        # Check cache performance
        cache_issues = health_report.get("performance_issues", [])
        mobile_health_issues.extend(cache_issues)

        overall_status = (
            "excellent"
            if not mobile_health_issues
            else ("good" if len(mobile_health_issues) <= 2 else "needs_optimization")
        )

        return {
            "mobile_performance_status": overall_status,
            "query_performance": query_report,
            "cache_performance": health_report.get("cache_statistics", {}),
            "performance_issues": mobile_health_issues,
            "optimization_recommendations": _get_mobile_optimization_recommendations(
                query_report
            ),
            "memory_management": {
                "bounded_cache_active": health_report.get("memory_leak_fixed", False),
                "cache_utilization": health_report.get("cache_statistics", {}).get(
                    "utilization", 0
                ),
            },
            "checked_at": datetime.utcnow(),
        }

    except Exception as e:
        logger.error(
            "Mobile performance health check failed",
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Performance health check failed") from e


def _get_mobile_optimization_recommendations(query_report: dict) -> list[str]:
    """Generate mobile optimization recommendations based on performance data"""
    recommendations = []

    for query_name, stats in query_report.items():
        avg_time = stats.get("avg_execution_ms", 0)
        slow_rate = stats.get("slow_query_rate", 0)

        if avg_time > 300:
            recommendations.append(
                f"Optimize {query_name}: averaging {avg_time:.1f}ms (add indexes or reduce data)"
            )
        elif slow_rate > 0.1:  # >10% slow queries
            recommendations.append(
                f"Investigate {query_name}: {slow_rate:.1%} queries exceed mobile targets"
            )

    if not recommendations:
        recommendations.append(
            "Mobile performance is optimal - no recommendations needed"
        )

    return recommendations


# Helper functions for mobile optimization


def _calculate_quick_urgency_score(days_to_expiry: int) -> float:
    """Quick urgency calculation optimized for mobile"""
    if days_to_expiry <= 0:
        return 1.0
    elif days_to_expiry <= 1:
        return 0.95
    elif days_to_expiry <= 2:
        return 0.9
    elif days_to_expiry <= 3:
        return 0.8
    elif days_to_expiry <= 7:
        return 0.6
    elif days_to_expiry <= 14:
        return 0.4
    else:
        return 0.2


def _calculate_quick_expiry_score(days_to_expiry: int, shelf_life_days: int) -> float:
    """Quick expiry score for mobile performance"""
    if days_to_expiry <= 0:
        return 1.0
    elif days_to_expiry <= 1:
        return 0.95
    elif days_to_expiry <= 3:
        return 0.8
    elif days_to_expiry <= 7:
        return 0.6
    else:
        # Simplified ratio calculation
        if shelf_life_days > 0:
            ratio = days_to_expiry / shelf_life_days
            if ratio <= 0.2:
                return 0.5
        return 0.2


def _calculate_quick_margin_score(cost_price: float, selling_price: float) -> float:
    """Quick margin score for mobile performance"""
    if not cost_price or not selling_price or selling_price <= cost_price:
        return 1.0

    margin_percent = ((selling_price - cost_price) / selling_price) * 100

    if margin_percent < 10:
        return 1.0
    elif margin_percent < 25:
        return 0.7
    elif margin_percent < 50:
        return 0.4
    else:
        return 0.1


def _get_quick_recommendation(composite_score: float, days_to_expiry: int) -> tuple:
    """Get quick recommendation for mobile display"""
    if composite_score >= 0.8:
        return "critical", "Immediate action required", "Apply discount", 30
    elif composite_score >= 0.6:
        return "high", "Action needed soon", "Monitor closely", 15
    elif composite_score >= 0.4:
        return "medium", "Monitor for changes", "Regular check", None
    else:
        return "low", "No action needed", "Continue monitoring", None


def _get_urgency_level(urgency_score: float) -> str:
    """Convert urgency score to level"""
    if urgency_score >= 0.8:
        return "critical"
    elif urgency_score >= 0.6:
        return "high"
    elif urgency_score >= 0.4:
        return "medium"
    else:
        return "low"
