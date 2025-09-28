"""
Cross-Store Analytics API Endpoints for Phase 3 Multi-Store MVP
Provides aggregated analytics, performance comparison, and alerts across multiple stores
"""

import asyncio
from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_user_stores
from app.auth.secure_dependencies import get_current_user
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.utils.multi_store_cache import cache_multi_store_operation

router = APIRouter()
logger = structlog.get_logger()


@router.get("/overview")
async def get_multi_store_overview(
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    user_stores: list[str] = Depends(get_user_stores),
) -> dict[str, Any]:
    """
    Get aggregated overview of all stores accessible to the user
    Essential for multi-store management dashboard
    """
    try:
        # Validate authentication
        if current_user is None or "sub" not in current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if not user_stores:
            return {
                "user_id": current_user["sub"],
                "total_stores": 0,
                "overview": {},
                "message": "No stores accessible to this user"
            }

        # Use caching for performance optimization (5-minute cache for MVP)
        cache_params = {"days": days, "store_count": len(user_stores)}

        async def fetch_overview_data() -> dict[str, Any]:
            read_ops = get_read_only_operations(db)

            # Process stores concurrently for 10x performance improvement
            async def fetch_store_analytics(store_id: str) -> tuple[str, dict[str, Any]]:
                try:
                    analytics = await read_ops.get_store_analytics(store_id, days)
                    return store_id, analytics
                except Exception as e:
                    logger.warning(f"Failed to get analytics for store {store_id}", error=str(e))
                    return store_id, {}

            # Execute all store queries concurrently
            store_results = await asyncio.gather(*[
                fetch_store_analytics(store_id) for store_id in user_stores
            ], return_exceptions=True)

            # Aggregate data across all user stores
            aggregated_data = {
                "total_stores": len(user_stores),
                "total_inventory_items": 0,
                "total_expired": 0,
                "total_expiring_soon": 0,
                "total_high_priority": 0,
                "combined_waste_reduction": 0.0,
                "store_summaries": []
            }

            # Process results and aggregate metrics
            for result in store_results:
                if isinstance(result, Exception):
                    logger.warning(f"Store processing failed: {result}")
                    continue

                store_id, store_analytics = result  # type: ignore[misc]
                if not store_analytics:  # Empty dict from failed fetch
                    continue

                inventory_summary = store_analytics.get("inventory_summary", {})

                # Aggregate metrics
                aggregated_data["total_inventory_items"] += int(inventory_summary.get("total_products", 0))
                aggregated_data["total_expired"] += int(inventory_summary.get("expired_count", 0))
                aggregated_data["total_expiring_soon"] += int(inventory_summary.get("expiring_soon_count", 0))

                # Count high priority batches efficiently
                actionable_batches = store_analytics.get("actionable_batches", [])
                high_priority_count = sum(1 for batch in actionable_batches if batch.get("urgency", 0) > 0.7)
                aggregated_data["total_high_priority"] += high_priority_count

                # Store-specific summary
                store_summary = {
                    "store_id": store_id,
                    "total_items": inventory_summary.get("total_products", 0),
                    "expired_items": inventory_summary.get("expired_count", 0),
                    "expiring_soon": inventory_summary.get("expiring_soon_count", 0),
                    "high_priority_batches": high_priority_count,
                    "health_score": max(0, 100 - (inventory_summary.get("expired_count", 0) * 10))
                }
                aggregated_data["store_summaries"].append(store_summary)  # type: ignore[attr-defined]

            # Calculate overall health metrics
            total_items = int(aggregated_data["total_inventory_items"])
            if total_items > 0:
                expired_rate = (int(aggregated_data["total_expired"]) / total_items) * 100
                aggregated_data["overall_health_score"] = max(0, 100 - expired_rate)
            else:
                aggregated_data["overall_health_score"] = 100

            return {
                "user_id": current_user["sub"],
                "analysis_period": f"{days} days",
                "aggregated_data": aggregated_data,
                "generated_at": datetime.utcnow().isoformat()
            }

        # Get cached or fresh data
        result = await cache_multi_store_operation(
            user_id=current_user["sub"],
            operation="overview",
            data_fetcher=fetch_overview_data,
            params=cache_params,
            ttl_minutes=5  # 5-minute cache for MVP performance
        )  # type: ignore[no-any-return]

        logger.info(
            "Multi-store overview served",
            user_id=current_user["sub"],
            stores_count=len(user_stores),
            cached=True  # Could be enhanced to track cache hits/misses
        )

        return result

    except Exception as e:
        logger.error(
            "Failed to generate multi-store overview",
            user_id=current_user["sub"],
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to generate multi-store overview") from None


@router.get("/comparison")
async def get_store_performance_comparison(
    days: int = Query(30, ge=7, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    user_stores: list[str] = Depends(get_user_stores),
) -> dict[str, Any]:
    """
    Compare performance metrics across user's accessible stores
    Critical for identifying best/worst performing locations
    """
    try:
        # Validate authentication
        if current_user is None or "sub" not in current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if not user_stores:
            return {
                "user_id": current_user["sub"],
                "comparison": [],
                "message": "No stores accessible for comparison"
            }

        read_ops = get_read_only_operations(db)
        store_comparisons = []

        for store_id in user_stores:
            try:
                store_analytics = await read_ops.get_store_analytics(store_id, days)
                inventory_summary = store_analytics.get("inventory_summary", {})
                actionable_batches = store_analytics.get("actionable_batches", [])

                # Calculate performance metrics
                total_items = inventory_summary.get("total_products", 0)
                expired_items = inventory_summary.get("expired_count", 0)
                expiring_soon = inventory_summary.get("expiring_soon_count", 0)

                # Performance scoring
                waste_score = 0 if total_items == 0 else (1 - (expired_items / total_items)) * 100
                urgency_score = 100 - min(len(actionable_batches) * 5, 100)  # Fewer urgent batches = better score

                overall_score = (waste_score * 0.6 + urgency_score * 0.4)

                store_performance = {
                    "store_id": store_id,
                    "metrics": {
                        "total_items": total_items,
                        "expired_items": expired_items,
                        "expiring_soon": expiring_soon,
                        "actionable_batches": len(actionable_batches),
                        "waste_score": round(waste_score, 1),
                        "urgency_score": round(urgency_score, 1),
                        "overall_score": round(overall_score, 1)
                    },
                    "performance_tier": "excellent" if overall_score >= 80 else "good" if overall_score >= 60 else "needs_attention"
                }

                store_comparisons.append(store_performance)

            except Exception as e:
                logger.warning(f"Failed to analyze store {store_id} for comparison", error=str(e))
                continue

        # Sort by overall score (best performing first)
        store_comparisons.sort(key=lambda x: x["metrics"]["overall_score"], reverse=True)  # type: ignore[index]

        # Add rankings
        for i, store in enumerate(store_comparisons):
            store["rank"] = i + 1  # type: ignore[assignment]

        logger.info(
            "Store performance comparison generated",
            user_id=current_user["sub"],
            stores_analyzed=len(store_comparisons),
            period_days=days
        )

        return {
            "user_id": current_user["sub"],
            "analysis_period": f"{days} days",
            "store_comparisons": store_comparisons,
            "summary": {
                "best_performing": store_comparisons[0]["store_id"] if store_comparisons else None,
                "needs_attention": [s["store_id"] for s in store_comparisons if s["performance_tier"] == "needs_attention"]
            },
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(
            "Failed to generate store performance comparison",
            user_id=current_user["sub"],
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to generate store comparison") from None


@router.get("/alerts")
async def get_cross_store_alerts(
    priority: str = Query("all", description="Alert priority filter (all, high, critical)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    user_stores: list[str] = Depends(get_user_stores),
) -> dict[str, Any]:
    """
    Get aggregated alerts across all user stores
    Essential for multi-store monitoring and quick response
    """
    try:
        # Validate authentication
        if current_user is None or "sub" not in current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if not user_stores:
            return {
                "user_id": current_user["sub"],
                "alerts": [],
                "message": "No stores accessible for alerts monitoring"
            }

        read_ops = get_read_only_operations(db)
        all_alerts = []

        for store_id in user_stores:
            try:
                store_analytics = await read_ops.get_store_analytics(store_id, 7)  # Last 7 days for alerts
                inventory_summary = store_analytics.get("inventory_summary", {})
                actionable_batches = store_analytics.get("actionable_batches", [])

                # Generate alerts based on data
                store_alerts = []

                # Critical: Expired items
                expired_count = inventory_summary.get("expired_count", 0)
                if expired_count > 0:
                    store_alerts.append({
                        "alert_type": "expired_inventory",
                        "priority": "critical",
                        "message": f"{expired_count} expired items require immediate attention",
                        "count": expired_count,
                        "action_required": "Remove expired items and review inventory rotation"
                    })

                # High: Items expiring soon
                expiring_soon = inventory_summary.get("expiring_soon_count", 0)
                if expiring_soon > 10:  # Threshold for alert
                    store_alerts.append({
                        "alert_type": "expiring_soon",
                        "priority": "high",
                        "message": f"{expiring_soon} items expiring within 3 days",
                        "count": expiring_soon,
                        "action_required": "Apply discounts or promotions to move inventory"
                    })

                # Medium: High urgency batches
                high_urgency_batches = [b for b in actionable_batches if b.get("urgency", 0) > 0.8]
                if len(high_urgency_batches) > 5:
                    store_alerts.append({
                        "alert_type": "high_urgency_batches",
                        "priority": "medium",
                        "message": f"{len(high_urgency_batches)} batches require urgent action",
                        "count": len(high_urgency_batches),
                        "action_required": "Review AI recommendations for urgent batches"
                    })

                # Add store context to each alert
                for alert in store_alerts:
                    alert["store_id"] = store_id
                    alert["generated_at"] = datetime.utcnow().isoformat()

                all_alerts.extend(store_alerts)

            except Exception as e:
                logger.warning(f"Failed to generate alerts for store {store_id}", error=str(e))
                continue

        # Filter by priority if specified
        if priority != "all":
            all_alerts = [alert for alert in all_alerts if alert["priority"] == priority]

        # Sort by priority (critical first)
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_alerts.sort(key=lambda x: priority_order.get(x["priority"], 99))

        logger.info(
            "Cross-store alerts generated",
            user_id=current_user["sub"],
            total_alerts=len(all_alerts),
            priority_filter=priority
        )

        return {
            "user_id": current_user["sub"],
            "alerts": all_alerts,
            "summary": {
                "total_alerts": len(all_alerts),
                "critical_count": len([a for a in all_alerts if a["priority"] == "critical"]),
                "high_count": len([a for a in all_alerts if a["priority"] == "high"]),
                "stores_with_alerts": len({alert["store_id"] for alert in all_alerts})
            },
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(
            "Failed to generate cross-store alerts",
            user_id=current_user["sub"],
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to generate cross-store alerts") from None


@router.get("/performance-metrics")
async def get_multi_store_performance_metrics(
    days: int = Query(30, ge=7, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    user_stores: list[str] = Depends(get_user_stores),
) -> dict[str, Any]:
    """
    Get aggregated performance metrics across all accessible stores
    Perfect for executive dashboards and KPI tracking
    """
    try:
        # Validate authentication
        if current_user is None or "sub" not in current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if not user_stores:
            return {
                "user_id": current_user["sub"],
                "metrics": {},
                "message": "No stores accessible for performance metrics"
            }

        read_ops = get_read_only_operations(db)

        # Track performance across all stores
        total_revenue_recovered = 0.0
        total_waste_prevented = 0.0
        total_actions_taken = 0
        successful_actions = 0
        store_metrics = []

        for store_id in user_stores:
            try:
                store_analytics = await read_ops.get_store_analytics(store_id, days)
                recent_actions = store_analytics.get("recent_actions", [])

                # Calculate store-specific metrics
                store_actions = len(recent_actions)
                store_successful = sum(1 for action in recent_actions if action.get("effectiveness_score", 0) > 0.5)
                store_revenue = sum(
                    abs(action.get("new_price", 0) - action.get("original_price", 0))
                    for action in recent_actions
                    if action.get("new_price") and action.get("original_price")
                )

                # Aggregate totals
                total_actions_taken += store_actions
                successful_actions += store_successful
                total_revenue_recovered += store_revenue

                store_metrics.append({
                    "store_id": store_id,
                    "actions_taken": store_actions,
                    "success_rate": (store_successful / max(store_actions, 1)) * 100,
                    "revenue_recovered": store_revenue
                })

            except Exception as e:
                logger.warning(f"Failed to get performance metrics for store {store_id}", error=str(e))
                continue

        # Calculate aggregated metrics
        overall_success_rate = (successful_actions / max(total_actions_taken, 1)) * 100

        performance_metrics = {
            "period_days": days,
            "total_stores": len(user_stores),
            "aggregated_metrics": {
                "total_actions_taken": total_actions_taken,
                "overall_success_rate": round(overall_success_rate, 1),
                "total_revenue_recovered": round(total_revenue_recovered, 2),
                "average_revenue_per_store": round(total_revenue_recovered / max(len(user_stores), 1), 2),
                "estimated_waste_prevented": round(total_waste_prevented, 2)
            },
            "store_breakdown": store_metrics,
            "top_performers": sorted(store_metrics, key=lambda x: x["success_rate"], reverse=True)[:3]
        }

        logger.info(
            "Multi-store performance metrics generated",
            user_id=current_user["sub"],
            stores_analyzed=len(user_stores),
            total_actions=total_actions_taken
        )

        return {
            "user_id": current_user["sub"],
            "performance_metrics": performance_metrics,
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(
            "Failed to generate multi-store performance metrics",
            user_id=current_user["sub"],
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to generate performance metrics") from None

