"""Secure Scoring API endpoints for AI features only.

Part of hybrid architecture security remediation.
Provides read-only scoring operations with enhanced security.
"""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user
from app.core.scoring import create_scoring_service
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.middleware.rate_limiting import (
    ai_endpoint_rate_limit,
    scoring_rate_limit,
)

router = APIRouter()
logger = structlog.get_logger()


@router.post("/batch/{store_id}/bulk")
@scoring_rate_limit("10/minute")
async def score_store_batch_bulk(
    store_id: str,
    request: Request,
    force_recalculate: bool = Query(
        False, description="Force recalculation of all scores"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    OPTIMIZED: Calculate AI scoring for store inventory with bulk operations for <1s performance
    """
    try:
        # Initialize secure scoring service
        scoring_service = create_scoring_service(db)

        # Score store inventory using optimized bulk operations
        results = await scoring_service.score_store_inventory_bulk(
            store_id, recalculate_all=force_recalculate
        )

        logger.info(
            "Store inventory scored with bulk optimization",
            store_id=store_id,
            batches_processed=results.get("processed", 0),
            high_priority=results.get("high_priority_count", 0),
            processing_time_ms=results.get("processing_time_ms", 0),
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "total_items": results.get("total_items", 0),
            "processed": results.get("processed", 0),
            "high_priority_count": results.get("high_priority_count", 0),
            "processing_time_ms": results.get("processing_time_ms", 0),
            "errors": results.get("errors", []),
            "performance": "bulk_optimized",
            "message": f"Bulk scored {results.get('processed', 0)} batches in {results.get('processing_time_ms', 0)}ms",
        }

    except Exception as e:
        logger.error(
            "Failed to bulk score store inventory",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Bulk scoring failed") from e


@router.post("/batch/{store_id}")
@scoring_rate_limit("20/minute")
async def score_store_batch(
    store_id: str,
    request: Request,
    force_recalculate: bool = Query(
        False, description="Force recalculation of all scores"
    ),
    save_to_database: bool = Query(
        True, description="Save calculated scores to database"
    ),
    include_donation_rationale: bool = Query(
        True, description="Include donation vs discount rationale in results"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Calculate AI scoring for store inventory with donation-first enhancement.

    Args:
        store_id: Store identifier for batch scoring
        request: FastAPI request object
        force_recalculate: Whether to recalculate all scores
        save_to_database: Whether to persist results to database
        include_donation_rationale: Whether to include donation insights
        db: Database session
        current_user: Authenticated user information

    Returns:
        Dictionary with scoring results and statistics

    Raises:
        HTTPException: If scoring operation fails
    """
    try:
        # Initialize secure scoring service
        scoring_service = create_scoring_service(db)

        # Get store donation preferences if rationale requested
        store_donation_config: dict[str, Any] | None = None
        if include_donation_rationale:
            from sqlalchemy import select

            from app.database.models import StoreSettings

            result = await db.execute(
                select(StoreSettings).where(StoreSettings.store_id == store_id)
            )
            store_settings = result.scalar_one_or_none()
            if (store_settings
                and store_settings.donation_preference_config):
                store_donation_config = (
                    store_settings.donation_preference_config
                )

        # Score store inventory using secure read-only operations
        results = await scoring_service.score_store_inventory(
            store_id,
            recalculate_all=force_recalculate,
            store_donation_config=store_donation_config,
            include_donation_rationale=include_donation_rationale
        )

        # NEW: Save scores to database if requested
        if save_to_database and results.get("scores"):
            read_ops = get_read_only_operations(db)
            success = await read_ops.store_score_results(results["scores"])
            results["database_saved"] = success

            if success:
                logger.info(
                    "Scores saved to database successfully",
                    store_id=store_id,
                    scores_saved=len(results["scores"])
                )
            else:
                logger.warning(
                    "Failed to save scores to database",
                    store_id=store_id
                )

        logger.info(
            "Store inventory scored with database writes enabled",
            store_id=store_id,
            batches_processed=results.get("processed", 0),
            high_priority=results.get("high_priority_count", 0),
            database_writes_enabled=save_to_database,
            user_id=current_user["sub"],
        )

        response_data = {
            "store_id": store_id,
            "total_items": results.get("total_items", 0),
            "processed": results.get("processed", 0),
            "high_priority_count": results.get("high_priority_count", 0),
            "processing_time_ms": results.get("processing_time_ms", 0),
            "errors": results.get("errors", []),
            "message": f"Scored {results.get('processed', 0)} batches successfully",
        }

        # Include donation rationale if requested
        if include_donation_rationale and results.get("donation_insights"):
            strategy = "balanced"
            if store_donation_config:
                strategy = store_donation_config.get("strategy", "balanced")

            response_data.update({
                "donation_insights": results.get("donation_insights"),
                "store_donation_strategy": strategy,
                "donation_suitable_categories": results.get(
                    "donation_suitable_categories", []
                ),
                "rationale_included": True
            })

        return response_data

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
    limit: int = Query(50, ge=1, le=100, description="Maximum alerts"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get AI urgency alerts for inventory items - READ-ONLY.

    Args:
        store_id: Store identifier
        request: FastAPI request object
        threshold: Urgency threshold for filtering alerts
        limit: Maximum number of alerts to return
        db: Database session
        current_user: Authenticated user information

    Returns:
        Dictionary with urgency alerts and metadata

    Raises:
        HTTPException: If operation fails
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
                        "potential_loss": (
                            item["current_quantity"] * item["selling_price"]
                        ),
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
) -> dict[str, Any]:
    """Get AI-powered recommendations for inventory management using existing scores.

    This endpoint uses pre-calculated scores from the database instead of recalculating
    everything from scratch, ensuring consistency with the main scoring system and
    preventing food safety bugs where expired products might get discount recommendations.

    Args:
        store_id: Store identifier
        request: FastAPI request object
        category: Optional category filter
        limit: Maximum number of recommendations
        db: Database session
        current_user: Authenticated user information

    Returns:
        Dictionary with AI recommendations and insights

    Raises:
        HTTPException: If operation fails
    """
    try:
        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get existing scores from database
        from app.database.read_only_operations import AnalyticsDataFetcher
        data_fetcher = AnalyticsDataFetcher(logger)
        
        # Fetch existing scores and inventory data
        scoring_data = await data_fetcher.fetch_scoring_data(store_id)
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

        if not scoring_data and not inventory_data:
            return {"store_id": store_id, "recommendations": [], "total_count": 0}

        # Create a map for quick inventory lookup
        inventory_by_batch = {item["batch_id"]: item for item in inventory_data}

        # Generate recommendations using existing scores
        recommendations = []
        processed_batches = set()

        # Process items with existing scores first
        for score in scoring_data:
            batch_id = score["batch_id"]
            inventory_item = inventory_by_batch.get(batch_id)
            
            if not inventory_item:
                continue
                
            # Filter by category if specified
            if category and inventory_item.get("category_code") != category:
                continue
                
            processed_batches.add(batch_id)
            
            # Map database recommendation to API format
            recommendation = _create_recommendation_from_score(score, inventory_item)
            if recommendation:
                recommendations.append(recommendation)

        # Fallback for items without scores (basic urgency-based logic)
        for item in inventory_data:
            batch_id = item["batch_id"]
            if batch_id in processed_batches:
                continue
                
            # Filter by category if specified
            if category and item.get("category_code") != category:
                continue
                
            # Use basic logic for items without scores
            recommendation = _create_fallback_recommendation(item)
            if recommendation:
                recommendations.append(recommendation)

        # Sort by priority and limit
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(
            key=lambda x: priority_order.get(x["priority"], 4)
        )
        recommendations = recommendations[:limit]

        logger.info(
            "AI recommendations retrieved using existing scores",
            store_id=store_id,
            recommendations_count=len(recommendations),
            existing_scores_used=len(scoring_data),
            fallback_items=len(inventory_data) - len(scoring_data),
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
                "existing_scores_used": len(scoring_data),
                "fallback_recommendations": len(inventory_data) - len(scoring_data),
            },
        }

    except Exception as e:
        logger.error(
            "Failed to get AI recommendations",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Failed to get recommendations"
        ) from e


def _create_recommendation_from_score(score: dict, inventory_item: dict) -> dict | None:
    """Create recommendation from existing database score.
    
    Args:
        score: Score data from database with recommendation, urgency_level, etc.
        inventory_item: Inventory item data
        
    Returns:
        Formatted recommendation or None if invalid
    """
    try:
        days_to_expiry = inventory_item["days_to_expiry"]
        
        # Map urgency levels to priorities
        urgency_to_priority = {
            "critical": "critical",
            "high": "high", 
            "medium": "medium",
            "low": "low"
        }
        
        priority = urgency_to_priority.get(score.get("urgency_level", "low"), "low")
        recommendation_type = score.get("recommendation", "monitor")
        discount_percent = score.get("discount_percent", 0)
        reason = score.get("reason", "AI recommendation")
        
        # Map database recommendations to API format
        action_mapping = {
            "dispose": "Remove from inventory immediately - product expired" if days_to_expiry < 0 else "Dispose for safety",
            "discount": f"Apply {discount_percent}% discount" if discount_percent > 0 else "Apply discount",
            "monitor": "Monitor closely for changes",
            "promote": "Create promotion or bundle",
            "donate": "Consider donation if suitable"
        }
        
        # Determine recommendation type and action
        if days_to_expiry < 0:
            # Expired - must dispose (food safety critical)
            recommendation_type_api = "disposal_required"
            action = "Remove from inventory immediately - product expired"
            food_safety_alert = True
            suggested_discount = 0
        elif recommendation_type == "dispose":
            recommendation_type_api = "disposal_required" 
            action = action_mapping.get("dispose", "Dispose for safety")
            food_safety_alert = True
            suggested_discount = 0
        elif recommendation_type == "discount":
            if days_to_expiry <= 1:
                recommendation_type_api = "urgent_discount"
            else:
                recommendation_type_api = "discount"
            action = action_mapping.get("discount", f"Apply {discount_percent}% discount")
            food_safety_alert = days_to_expiry <= 0
            suggested_discount = discount_percent
        else:
            recommendation_type_api = recommendation_type
            action = action_mapping.get(recommendation_type, "Monitor and take action as needed")
            food_safety_alert = days_to_expiry <= 0
            suggested_discount = discount_percent

        # Calculate potential savings/loss
        if days_to_expiry < 0 or recommendation_type == "dispose":
            potential_value = inventory_item["current_quantity"] * inventory_item["cost_price"]
            potential_savings = 0
            potential_loss = potential_value
        else:
            potential_value = inventory_item["current_quantity"] * inventory_item["selling_price"]
            if discount_percent > 0:
                potential_savings = potential_value * (discount_percent / 100)
                potential_loss = 0
            else:
                potential_savings = potential_value * 0.3  # Estimated savings
                potential_loss = 0

        recommendation = {
            "batch_id": inventory_item["batch_id"],
            "sku": inventory_item.get("sku", "Unknown"),
            "product_name": inventory_item.get("product_name", "Unknown"),
            "recommendation_type": recommendation_type_api,
            "action": action,
            "reason": reason,
            "priority": priority,
            "suggested_discount": suggested_discount,
            "composite_score": score.get("composite_score", 0.0),
        }
        
        # Add conditional fields
        if potential_savings > 0:
            recommendation["potential_savings"] = round(potential_savings, 2)
        if potential_loss > 0:
            recommendation["potential_loss"] = round(potential_loss, 2)
        if food_safety_alert:
            recommendation["food_safety_alert"] = True
            
        return recommendation
        
    except Exception as e:
        logger.warning(
            "Error creating recommendation from score",
            batch_id=score.get("batch_id"),
            error=str(e)
        )
        return None


def _create_fallback_recommendation(inventory_item: dict) -> dict | None:
    """Create basic recommendation for items without scores using urgency logic.
    
    Args:
        inventory_item: Inventory item data
        
    Returns:
        Basic recommendation or None if invalid
    """
    try:
        days_to_expiry = inventory_item["days_to_expiry"]
        
        # Basic urgency-based logic (same as original)
        if days_to_expiry < 0:
            # CRITICAL: Expired products must be disposed for food safety
            return {
                "batch_id": inventory_item["batch_id"],
                "sku": inventory_item.get("sku", "Unknown"),
                "product_name": inventory_item.get("product_name", "Unknown"),
                "recommendation_type": "disposal_required",
                "action": "Remove from inventory immediately - product expired",
                "reason": f"Expired {abs(days_to_expiry)} day(s) ago",
                "priority": "critical",
                "suggested_discount": 0,
                "potential_loss": inventory_item["current_quantity"] * inventory_item["cost_price"],
                "food_safety_alert": True,
                "composite_score": 0.9,
            }
        elif days_to_expiry == 0:
            return {
                "batch_id": inventory_item["batch_id"],
                "sku": inventory_item.get("sku", "Unknown"),
                "product_name": inventory_item.get("product_name", "Unknown"),
                "recommendation_type": "immediate_action",
                "action": "Donate immediately or dispose if unsafe",
                "reason": "Expires today",
                "priority": "critical",
                "suggested_discount": 0,
                "potential_loss": inventory_item["current_quantity"] * inventory_item["cost_price"],
                "food_safety_alert": True,
                "composite_score": 0.85,
            }
        elif days_to_expiry == 1:
            return {
                "batch_id": inventory_item["batch_id"],
                "sku": inventory_item.get("sku", "Unknown"),
                "product_name": inventory_item.get("product_name", "Unknown"),
                "recommendation_type": "urgent_discount",
                "action": "Apply 30-50% discount immediately",
                "reason": f"Expires in {days_to_expiry} day(s)",
                "priority": "critical",
                "suggested_discount": 40,
                "potential_savings": inventory_item["current_quantity"] * inventory_item["selling_price"] * 0.8,
                "composite_score": 0.7,
            }
        elif days_to_expiry <= 3:
            return {
                "batch_id": inventory_item["batch_id"],
                "sku": inventory_item.get("sku", "Unknown"),
                "product_name": inventory_item.get("product_name", "Unknown"),
                "recommendation_type": "discount",
                "action": "Apply 15-25% discount",
                "reason": f"Expires in {days_to_expiry} day(s)",
                "priority": "high",
                "suggested_discount": 20,
                "potential_savings": inventory_item["current_quantity"] * inventory_item["selling_price"] * 0.6,
                "composite_score": 0.5,
            }
        elif inventory_item["current_quantity"] > 50:  # High quantity
            return {
                "batch_id": inventory_item["batch_id"],
                "sku": inventory_item.get("sku", "Unknown"),
                "product_name": inventory_item.get("product_name", "Unknown"),
                "recommendation_type": "bulk_promotion",
                "action": "Create bulk promotion or bundle",
                "reason": f"High quantity ({inventory_item['current_quantity']}) may not sell in time",
                "priority": "medium",
                "suggested_discount": 10,
                "potential_savings": inventory_item["current_quantity"] * inventory_item["selling_price"] * 0.3,
                "composite_score": 0.4,
            }
        
        return None  # No recommendation needed
        
    except Exception as e:
        logger.warning(
            "Error creating fallback recommendation",
            batch_id=inventory_item.get("batch_id"),
            error=str(e)
        )
        return None


@router.get("/analytics/{store_id}")
@ai_endpoint_rate_limit("40/minute")
async def get_scoring_analytics(
    store_id: str,
    request: Request,
    days: int = Query(30, ge=1, le=90, description="Analysis period"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get scoring analytics and insights for a store.

    Args:
        store_id: Store identifier
        request: FastAPI request object
        days: Analysis period in days
        db: Database session
        current_user: Authenticated user information

    Returns:
        Dictionary with analytics data and AI insights

    Raises:
        HTTPException: If operation fails
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
            at_risk_items = (
                analytics_data.get("critical_items", 0)
                + analytics_data.get("high_urgency_items", 0)
            )
            total_batches = analytics_data.get("total_batches", 1)
            at_risk_value = at_risk_items * (total_value / total_batches)
            # More than 10% of value at risk
            if at_risk_value > total_value * 0.1:
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
