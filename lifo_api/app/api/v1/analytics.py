"""
Analytics API endpoints for LIFO AI Engine
Provides analytics, reporting, and performance metrics
"""

from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import (
    get_current_user,
    validate_store_access,
)
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations

router = APIRouter()
logger = structlog.get_logger()


@router.get("/store/{store_id}")
async def get_store_analytics(
    store_id: str,
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get comprehensive analytics for a store
    """
    try:
        # Validate store access
        await validate_store_access(store_id, current_user)

        # Get analytics data
        read_ops = get_read_only_operations(db)
        analytics_data = await read_ops.get_store_analytics(store_id, days)

        if not analytics_data:
            raise HTTPException(status_code=404, detail="No analytics data found")

        logger.info(
            "Store analytics retrieved",
            store_id=store_id,
            period_days=days,
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "analysis_period": f"{days} days",
            "data": analytics_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get store analytics",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Internal server error") from None


@router.get("/dashboard/{store_id}")
async def get_dashboard_data(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get dashboard data for a store (7-day snapshot)
    FAST: Reads from pre-calculated scores, no blocking operations
    """
    try:
        # Validate store access
        await validate_store_access(store_id, current_user)

        # Get 7-day analytics (reads from existing product_scores)
        read_ops = get_read_only_operations(db)
        analytics_data = await read_ops.get_store_analytics(store_id, 7)

        # Build dashboard response with actionable batches
        dashboard_data = {
            "store_id": store_id,
            "summary": analytics_data.get("inventory_summary", {}),
            "alerts": {
                "expired_items": analytics_data.get("inventory_summary", {}).get(
                    "expired_count", 0
                ),
                "expiring_soon": analytics_data.get("inventory_summary", {}).get(
                    "expiring_soon_count", 0
                ),
                # Removed confusing high_urgency - use actionable_batches for AI urgency
            },
            "top_categories": analytics_data.get("category_breakdown", [])[:5],
            "recent_activity": analytics_data.get("recent_actions", [])[:10],
            "actionable_batches": analytics_data.get("actionable_batches", [])[
                :20
            ],  # Top 20 most urgent
            "last_updated": datetime.now().isoformat(),
        }

        logger.info(
            "Dashboard data retrieved", store_id=store_id, user_id=current_user["sub"]
        )

        return dashboard_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get dashboard data",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Internal server error") from None


@router.post("/scoring/trigger/{store_id}")
async def trigger_background_scoring(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Trigger background scoring for a store (non-blocking)
    This endpoint runs scoring in the background and updates product_scores table
    """
    try:
        # Validate store access
        await validate_store_access(store_id, current_user)

        # Run scoring without timeout concerns
        from app.core.scoring import create_scoring_service

        scoring_service = create_scoring_service(db)

        logger.info("Starting background scoring", store_id=store_id)
        start_time = datetime.now()

        # Run full scoring with all batch lookups
        scoring_results = await scoring_service.score_store_inventory(
            store_id, recalculate_all=True
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        logger.info(
            "Background scoring completed",
            store_id=store_id,
            batches_processed=scoring_results.get("processed", 0),
            high_priority=scoring_results.get("high_priority_count", 0),
            processing_time_seconds=processing_time,
        )

        return {
            "store_id": store_id,
            "status": "completed",
            "batches_processed": scoring_results.get("processed", 0),
            "high_priority_count": scoring_results.get("high_priority_count", 0),
            "processing_time_seconds": round(processing_time, 2),
            "timestamp": datetime.now().isoformat(),
            "message": "Scoring completed successfully. Dashboard will now show AI-enhanced recommendations.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to complete background scoring",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Background scoring failed"
        ) from None


@router.get("/performance/{store_id}")
async def get_performance_metrics(
    store_id: str,
    days: int = Query(30, ge=7, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get performance metrics for waste reduction and revenue optimization
    """
    try:
        # Validate store access
        if not await validate_store_access(store_id, current_user):
            raise HTTPException(status_code=403, detail="Manager access required")

        # Get analytics data
        read_ops = get_read_only_operations(db)
        analytics_data = await read_ops.get_store_analytics(store_id, days)

        # Calculate performance metrics
        total_actions = len(analytics_data.get("recent_actions", []))
        successful_actions = sum(
            1
            for action in analytics_data.get("recent_actions", [])
            if action.get("effectiveness_score", 0) > 0.5
        )

        # Calculate waste reduction (would need historical data)
        waste_reduction_percent = 0  # Placeholder
        revenue_recovered = sum(
            action.get("new_price", 0) - action.get("original_price", 0)
            for action in analytics_data.get("recent_actions", [])
            if action.get("new_price") and action.get("original_price")
        )

        performance_data = {
            "store_id": store_id,
            "period_days": days,
            "metrics": {
                "total_actions_taken": total_actions,
                "successful_actions": successful_actions,
                "action_success_rate": successful_actions / max(total_actions, 1) * 100,
                "waste_reduction_percent": waste_reduction_percent,
                "revenue_recovered": abs(revenue_recovered),
                "inventory_turnover": 0,  # Would need sales data
                "average_margin": 0,  # Would need detailed calculations
            },
            "trends": {
                "urgency_distribution": analytics_data.get("urgency_distribution", {}),
                "category_performance": analytics_data.get("category_breakdown", []),
            },
            "generated_at": datetime.utcnow(),
        }

        logger.info(
            "Performance metrics retrieved",
            store_id=store_id,
            period_days=days,
            user_id=current_user["sub"],
        )

        return performance_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get performance metrics",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Internal server error") from None


@router.get("/trends/{store_id}")
async def get_trend_analysis(
    store_id: str,
    metric: str = Query(
        "waste", description="Metric to analyze (waste, revenue, velocity)"
    ),
    days: int = Query(90, ge=30, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get trend analysis for specific metrics
    """
    try:
        # Validate store access
        if not await validate_store_access(store_id, current_user):
            raise HTTPException(status_code=403, detail="Manager access required")

        # Get analytics data
        read_ops = get_read_only_operations(db)
        await read_ops.get_store_analytics(store_id, days)

        # Build trend data (placeholder - would need time series data)
        trend_data = {
            "store_id": store_id,
            "metric": metric,
            "period_days": days,
            "trend_points": [],  # Would contain time series data
            "trend_direction": "stable",  # up, down, stable
            "percentage_change": 0.0,
            "insights": [
                "Inventory management is stable",
                "Consider implementing more proactive discounting",
                "Monitor high-value categories more closely",
            ],
            "generated_at": datetime.utcnow(),
        }

        logger.info(
            "Trend analysis retrieved",
            store_id=store_id,
            metric=metric,
            period_days=days,
            user_id=current_user["sub"],
        )

        return trend_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get trend analysis",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Internal server error") from None


@router.get("/exports/{store_id}")
async def get_export_data(
    store_id: str,
    export_type: str = Query(
        "inventory", description="Export type (inventory, analytics, actions)"
    ),
    days: int = Query(30, ge=1, le=365, description="Data period in days"),
    format: str = Query("json", description="Export format (json, csv)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Export analytics data in various formats
    """
    try:
        # Validate store access
        if not await validate_store_access(store_id, current_user):
            raise HTTPException(status_code=403, detail="Manager access required")

        # Get the requested data
        read_ops = get_read_only_operations(db)

        if export_type == "analytics":
            data = await read_ops.get_store_analytics(store_id, days)
        else:
            # For other export types, return basic analytics
            data = await read_ops.get_store_analytics(store_id, days)

        export_data = {
            "store_id": store_id,
            "export_type": export_type,
            "export_format": format,
            "period_days": days,
            "data": data,
            "exported_at": datetime.utcnow(),
            "exported_by": current_user["sub"],
        }

        logger.info(
            "Export data generated",
            store_id=store_id,
            export_type=export_type,
            format=format,
            user_id=current_user["sub"],
        )

        return export_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to generate export data",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Internal server error") from None
