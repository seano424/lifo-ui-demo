"""
Secure Scoring API endpoints for AI features only
Part of hybrid architecture security remediation
"""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user
from app.core.scoring import create_scoring_service
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.middleware.rate_limiting import ai_endpoint_rate_limit, scoring_rate_limit

router = APIRouter()
logger = structlog.get_logger()


@router.post("/batch/{store_id}")
@scoring_rate_limit("20/minute")
async def score_store_batch(
    store_id: str,
    request: Request,
    force_recalculate: bool = Query(
        False, description="Force recalculation of all scores"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Calculate AI scoring for store inventory - SECURE READ-ONLY VERSION
    """
    try:
        # Initialize secure scoring service
        scoring_service = create_scoring_service(db)

        # Score store inventory using secure read-only operations
        results = await scoring_service.score_store_inventory(
            store_id, recalculate_all=force_recalculate
        )

        logger.info(
            "Store inventory scored securely",
            store_id=store_id,
            batches_processed=results.get("processed", 0),
            high_priority=results.get("high_priority_count", 0),
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "total_items": results.get("total_items", 0),
            "processed": results.get("processed", 0),
            "high_priority_count": results.get("high_priority_count", 0),
            "processing_time_ms": results.get("processing_time_ms", 0),
            "errors": results.get("errors", []),
            "message": f"Scored {results.get('processed', 0)} batches successfully",
        }

    except Exception as e:
        logger.error(
            "Failed to score store inventory",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Scoring failed") from e


@router.get("/alerts/{store_id}")
@ai_endpoint_rate_limit("30/minute")
async def get_urgency_alerts(
    store_id: str,
    request: Request,
    threshold: float = Query(
        0.6, ge=0.0, le=1.0, description="Urgency threshold (0.0-1.0)"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum alerts to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get AI urgency alerts for inventory items - READ-ONLY
    """
    try:
        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get inventory data for analysis
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

        if not inventory_data:
            return {
                "store_id": store_id,
                "alerts": [],
                "total_count": 0,
                "threshold": threshold,
            }

        # Filter high urgency items based on scoring logic
        alerts = []
        for item in inventory_data:
            days_to_expiry = item["days_to_expiry"]

            # Calculate urgency score
            urgency_score = 0.0
            if days_to_expiry <= 0:
                urgency_score = 1.0
            elif days_to_expiry <= 1:
                urgency_score = 0.95
            elif days_to_expiry <= 2:
                urgency_score = 0.9
            elif days_to_expiry <= 3:
                urgency_score = 0.8
            elif days_to_expiry <= 7:
                urgency_score = 0.6

            if urgency_score >= threshold:
                alerts.append(
                    {
                        "batch_id": item["batch_id"],
                        "sku": item["sku"],
                        "product_name": item.get("product_name", "Unknown"),
                        "category": item["category"],
                        "current_quantity": item["current_quantity"],
                        "selling_price": item["selling_price"],
                        "days_to_expiry": days_to_expiry,
                        "urgency_score": urgency_score,
                        "urgency_level": "critical" if urgency_score >= 0.8 else "high",
                        "potential_loss": item["current_quantity"]
                        * item["selling_price"],
                        "recommendation": "Immediate action required"
                        if urgency_score >= 0.8
                        else "Action needed soon",
                    }
                )

        # Sort by urgency score and limit results
        alerts.sort(key=lambda x: x["urgency_score"], reverse=True)
        alerts = alerts[:limit]

        logger.info(
            "Urgency alerts retrieved",
            store_id=store_id,
            alerts_count=len(alerts),
            threshold=threshold,
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "alerts": alerts,
            "total_count": len(alerts),
            "threshold": threshold,
            "generated_at": "utcnow",
        }

    except Exception as e:
        logger.error(
            "Failed to get urgency alerts",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Failed to get alerts") from e


@router.get("/recommendations/{store_id}")
@ai_endpoint_rate_limit("20/minute")
async def get_ai_recommendations(
    store_id: str,
    request: Request,
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=50, description="Maximum recommendations"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get AI-powered recommendations for inventory management
    """
    try:
        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get inventory data
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

        if not inventory_data:
            return {"store_id": store_id, "recommendations": [], "total_count": 0}

        # Filter by category if specified
        if category:
            inventory_data = [
                item for item in inventory_data if item.get("category_code") == category
            ]

        # Generate AI recommendations
        recommendations = []
        for item in inventory_data:
            days_to_expiry = item["days_to_expiry"]
            margin_percent = (
                (item["selling_price"] - item["cost_price"]) / item["selling_price"]
            ) * 100

            # Generate recommendations based on AI logic
            if days_to_expiry <= 1:
                recommendations.append(
                    {
                        "batch_id": item["batch_id"],
                        "sku": item["sku"],
                        "product_name": item.get("product_name", "Unknown"),
                        "recommendation_type": "urgent_discount",
                        "action": "Apply 30-50% discount immediately",
                        "reason": f"Expires in {days_to_expiry} day(s)",
                        "priority": "critical",
                        "suggested_discount": min(
                            50, max(20, int(margin_percent * 0.6))
                        ),
                        "potential_savings": item["current_quantity"]
                        * item["selling_price"]
                        * 0.8,
                    }
                )
            elif days_to_expiry <= 3:
                recommendations.append(
                    {
                        "batch_id": item["batch_id"],
                        "sku": item["sku"],
                        "product_name": item.get("product_name", "Unknown"),
                        "recommendation_type": "discount",
                        "action": "Apply 15-25% discount",
                        "reason": f"Expires in {days_to_expiry} day(s)",
                        "priority": "high",
                        "suggested_discount": min(
                            25, max(10, int(margin_percent * 0.4))
                        ),
                        "potential_savings": item["current_quantity"]
                        * item["selling_price"]
                        * 0.6,
                    }
                )
            elif item["current_quantity"] > 50:  # High quantity
                recommendations.append(
                    {
                        "batch_id": item["batch_id"],
                        "sku": item["sku"],
                        "product_name": item.get("product_name", "Unknown"),
                        "recommendation_type": "bulk_promotion",
                        "action": "Create bulk promotion or bundle",
                        "reason": f"High quantity ({item['current_quantity']}) may not sell in time",
                        "priority": "medium",
                        "suggested_discount": 10,
                        "potential_savings": item["current_quantity"]
                        * item["selling_price"]
                        * 0.3,
                    }
                )

        # Sort by priority and limit
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 4))
        recommendations = recommendations[:limit]

        logger.info(
            "AI recommendations generated",
            store_id=store_id,
            recommendations_count=len(recommendations),
            category=category,
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "recommendations": recommendations,
            "filters": {"category": category},
            "total_count": len(recommendations),
            "ai_insights": {
                "urgent_items": len(
                    [r for r in recommendations if r["priority"] == "critical"]
                ),
                "high_priority_items": len(
                    [r for r in recommendations if r["priority"] == "high"]
                ),
                "total_potential_savings": sum(
                    r.get("potential_savings", 0) for r in recommendations
                ),
            },
        }

    except Exception as e:
        logger.error(
            "Failed to get AI recommendations",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Failed to get recommendations") from e


@router.get("/analytics/{store_id}")
@ai_endpoint_rate_limit("40/minute")
async def get_scoring_analytics(
    store_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=90, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get scoring analytics and insights for a store
    """
    try:
        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get analytics data
        analytics_data = await read_ops.get_analytics_data(store_id, days)

        if not analytics_data:
            return {
                "store_id": store_id,
                "period_days": days,
                "analytics": {},
                "insights": [],
            }

        # Generate AI insights
        insights = []

        if analytics_data.get("critical_items", 0) > 0:
            insights.append(
                {
                    "type": "urgent_attention",
                    "message": f"{analytics_data['critical_items']} items require immediate attention",
                    "recommendation": "Review critical items and apply discounts",
                }
            )

        if analytics_data.get("expired_count", 0) > 0:
            insights.append(
                {
                    "type": "waste_reduction",
                    "message": f"{analytics_data['expired_count']} items have expired",
                    "recommendation": "Improve inventory rotation and monitoring",
                }
            )

        total_value = analytics_data.get("total_value", 0)
        if total_value > 0:
            at_risk_value = (
                analytics_data.get("critical_items", 0)
                + analytics_data.get("high_urgency_items", 0)
            ) * (total_value / analytics_data.get("total_batches", 1))
            if at_risk_value > total_value * 0.1:  # More than 10% of value at risk
                insights.append(
                    {
                        "type": "financial_risk",
                        "message": f"${at_risk_value:.2f} inventory value at risk",
                        "recommendation": "Implement immediate action plan",
                    }
                )

        logger.info(
            "Scoring analytics retrieved",
            store_id=store_id,
            period_days=days,
            insights_count=len(insights),
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "period_days": days,
            "analytics": analytics_data,
            "ai_insights": insights,
            "summary": {
                "total_items": analytics_data.get("total_batches", 0),
                "items_at_risk": analytics_data.get("critical_items", 0)
                + analytics_data.get("high_urgency_items", 0),
                "total_value": total_value,
                "risk_percentage": (
                    analytics_data.get("critical_items", 0)
                    + analytics_data.get("high_urgency_items", 0)
                )
                / max(analytics_data.get("total_batches", 1), 1)
                * 100,
            },
        }

    except Exception as e:
        logger.error(
            "Failed to get scoring analytics",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Analytics failed") from e
