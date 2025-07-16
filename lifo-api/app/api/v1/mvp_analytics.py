"""
MVP-specific analytics endpoints for validation and success measurement
Focus on key metrics mentioned in MVP goals
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
import structlog
import time

from app.auth.secure_dependencies import get_current_user, validate_store_id_format
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.models.scan_models import MVPMetrics, BatchInsights
from app.middleware.rate_limiting import ai_endpoint_rate_limit

router = APIRouter()
logger = structlog.get_logger()


@router.get("/mvp-metrics/{store_id}", response_model=MVPMetrics)
@ai_endpoint_rate_limit("20/minute")
async def get_mvp_metrics(
    store_id: str,
    request: Request,
    date_range: int = Query(7, ge=1, le=30, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Metrics specifically designed for MVP validation and success measurement
    Focus on the key metrics mentioned in MVP goals:
    - Batch visibility improvement
    - Scan workflow adoption
    - Waste prevention value
    - Time to action improvements
    """
    start_time = time.time()
    
    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)
        
        # Get base analytics data
        analytics_data = await read_ops.get_analytics_data(store_id, date_range)
        
        # Calculate MVP-specific metrics
        metrics = await _calculate_mvp_metrics(store_id, date_range, analytics_data, read_ops)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info("MVP metrics calculated",
                   store_id=store_id,
                   date_range=date_range,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return metrics
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("MVP metrics calculation failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="MVP metrics calculation failed"
        )


@router.get("/batch-insights/{store_id}", response_model=BatchInsights)
@ai_endpoint_rate_limit("15/minute")
async def get_batch_insights(
    store_id: str,
    request: Request,
    analysis_depth: str = Query("standard", description="Analysis depth: quick, standard, deep"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Reveal previously unknown inventory patterns (MVP goal)
    Focus on batch-level data aggregation and insights
    """
    start_time = time.time()
    
    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)
        
        # Get inventory data for pattern analysis
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)
        
        if not inventory_data:
            return BatchInsights()
        
        # Generate insights based on analysis depth
        insights = await _generate_batch_insights(
            inventory_data, 
            analysis_depth, 
            store_id, 
            read_ops
        )
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info("Batch insights generated",
                   store_id=store_id,
                   analysis_depth=analysis_depth,
                   insights_count=len(insights.optimization_opportunities),
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return insights
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Batch insights generation failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Batch insights generation failed"
        )


@router.get("/scan-workflow-stats/{store_id}")
@ai_endpoint_rate_limit("30/minute")
async def get_scan_workflow_stats(
    store_id: str,
    request: Request,
    days: int = Query(7, ge=1, le=30, description="Analysis period"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analytics specific to scan workflow performance
    Measures adoption and effectiveness of scan-in/scan-out workflows
    """
    start_time = time.time()
    
    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)
        
        # Calculate scan workflow statistics
        scan_stats = await _calculate_scan_workflow_stats(store_id, days, read_ops)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info("Scan workflow stats calculated",
                   store_id=store_id,
                   days=days,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return {
            "store_id": store_id,
            "analysis_period_days": days,
            "scan_statistics": scan_stats,
            "workflow_adoption": {
                "scan_in_usage_rate": scan_stats.get("scan_in_rate", 0.0),
                "scan_out_usage_rate": scan_stats.get("scan_out_rate", 0.0),
                "mobile_vs_manual_ratio": scan_stats.get("mobile_ratio", 0.0)
            },
            "efficiency_metrics": {
                "average_scan_time_seconds": scan_stats.get("avg_scan_time", 0.0),
                "error_rate_percent": scan_stats.get("error_rate", 0.0),
                "user_satisfaction_score": scan_stats.get("satisfaction", 0.0)
            },
            "generated_at": datetime.utcnow().isoformat(),
            "processing_time_ms": processing_time_ms
        }
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Scan workflow stats failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Scan workflow stats calculation failed"
        )


@router.get("/waste-prevention-impact/{store_id}")
@ai_endpoint_rate_limit("10/minute")
async def get_waste_prevention_impact(
    store_id: str,
    request: Request,
    comparison_period: int = Query(30, ge=7, le=90, description="Days to compare"),
    baseline_period: int = Query(30, ge=7, le=90, description="Baseline period days"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Calculate waste prevention impact and ROI
    Key MVP metric for demonstrating value
    """
    start_time = time.time()
    
    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)
        
        # Calculate waste prevention impact
        impact_analysis = await _calculate_waste_prevention_impact(
            store_id, 
            comparison_period, 
            baseline_period, 
            read_ops
        )
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info("Waste prevention impact calculated",
                   store_id=store_id,
                   comparison_period=comparison_period,
                   baseline_period=baseline_period,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return impact_analysis
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Waste prevention impact calculation failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Waste prevention impact calculation failed"
        )


@router.get("/action-effectiveness/{store_id}")
@ai_endpoint_rate_limit("15/minute")
async def get_action_effectiveness(
    store_id: str,
    request: Request,
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    days: int = Query(14, ge=3, le=60, description="Analysis period"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze effectiveness of different actions taken
    Helps optimize recommendation algorithms
    """
    start_time = time.time()
    
    try:
        store_id = validate_store_id_format(store_id)
        read_ops = get_read_only_operations(db)
        
        # Calculate action effectiveness
        effectiveness_analysis = await _calculate_action_effectiveness(
            store_id, 
            action_type, 
            days, 
            read_ops
        )
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info("Action effectiveness calculated",
                   store_id=store_id,
                   action_type=action_type,
                   days=days,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return effectiveness_analysis
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Action effectiveness calculation failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Action effectiveness calculation failed"
        )


# Helper functions

async def _calculate_mvp_metrics(
    store_id: str, 
    date_range: int, 
    analytics_data: Dict[str, Any], 
    read_ops
) -> MVPMetrics:
    """Calculate MVP validation metrics"""
    
    # Simulate scan workflow data (in production, this would come from database)
    # These metrics would be calculated from actual scan events and user actions
    
    batches_scanned_today = 15  # Would query scan events from today
    products_added_via_scan = 8  # Would query new products added via scan workflow
    
    # Waste prevention value calculation
    total_value = analytics_data.get("total_value", 0)
    critical_items = analytics_data.get("critical_items", 0)
    high_urgency_items = analytics_data.get("high_urgency_items", 0)
    
    # Estimate waste prevented through AI recommendations
    waste_prevented_value_eur = (critical_items + high_urgency_items) * 25.0  # Avg product value
    
    # Donation opportunities (items past sell-by but before use-by)
    donation_opportunities = max(0, critical_items - 2)
    
    # Recommendation metrics
    discount_recommendations_given = critical_items + high_urgency_items
    discount_recommendations_acted_on = int(discount_recommendations_given * 0.6)  # 60% action rate
    
    # Batch visibility improvement (estimated)
    total_batches = analytics_data.get("total_batches", 0)
    average_batch_visibility_improvement = min(100.0, (total_batches / max(1, total_batches - 10)) * 15.0)
    
    # Time to action (estimated based on urgency scoring)
    time_to_action_hours = 4.5  # Average time from alert to action
    
    # Scan efficiency score
    scan_efficiency_score = 0.75  # Based on scan speed and accuracy
    
    # User adoption rate
    user_adoption_rate = 0.65  # Percentage of eligible users actively using scan workflows
    
    return MVPMetrics(
        batches_scanned_today=batches_scanned_today,
        products_added_via_scan=products_added_via_scan,
        waste_prevented_value_eur=waste_prevented_value_eur,
        donation_opportunities=donation_opportunities,
        discount_recommendations_given=discount_recommendations_given,
        discount_recommendations_acted_on=discount_recommendations_acted_on,
        average_batch_visibility_improvement=average_batch_visibility_improvement,
        time_to_action_hours=time_to_action_hours,
        scan_efficiency_score=scan_efficiency_score,
        user_adoption_rate=user_adoption_rate
    )


async def _generate_batch_insights(
    inventory_data: List[Dict], 
    analysis_depth: str, 
    store_id: str, 
    read_ops
) -> BatchInsights:
    """Generate insights from batch data analysis"""
    
    if not inventory_data:
        return BatchInsights()
    
    # Category performance analysis
    category_performance = {}
    category_stats = {}
    
    for item in inventory_data:
        category = item["category"]
        if category not in category_stats:
            category_stats[category] = {
                "items": 0,
                "urgent_items": 0,
                "total_value": 0,
                "avg_days_to_expiry": []
            }
        
        category_stats[category]["items"] += 1
        category_stats[category]["total_value"] += item["current_quantity"] * item["selling_price"]
        category_stats[category]["avg_days_to_expiry"].append(item["days_to_expiry"])
        
        if item["days_to_expiry"] <= 3:
            category_stats[category]["urgent_items"] += 1
    
    # Convert to performance metrics
    for category, stats in category_stats.items():
        urgent_ratio = stats["urgent_items"] / max(stats["items"], 1)
        avg_days = sum(stats["avg_days_to_expiry"]) / max(len(stats["avg_days_to_expiry"]), 1)
        
        category_performance[category] = {
            "urgency_ratio": round(urgent_ratio, 3),
            "average_days_to_expiry": round(avg_days, 1),
            "total_value": round(stats["total_value"], 2),
            "risk_score": round(urgent_ratio * 0.7 + (1 / max(avg_days, 1)) * 0.3, 3)
        }
    
    # Expiry pattern analysis
    expiry_patterns = {
        "expired_count": len([i for i in inventory_data if i["days_to_expiry"] <= 0]),
        "expiring_today": len([i for i in inventory_data if i["days_to_expiry"] == 0]),
        "expiring_this_week": len([i for i in inventory_data if 0 < i["days_to_expiry"] <= 7]),
        "avg_time_to_expiry": sum(i["days_to_expiry"] for i in inventory_data) / len(inventory_data)
    }
    
    # Waste hotspots identification
    waste_hotspots = []
    for category, perf in category_performance.items():
        if perf["risk_score"] > 0.6:
            waste_hotspots.append({
                "category": category,
                "risk_score": perf["risk_score"],
                "urgent_items": category_stats[category]["urgent_items"],
                "total_value_at_risk": perf["total_value"] * perf["urgency_ratio"],
                "recommendation": f"Immediate attention needed for {category} category"
            })
    
    # Optimization opportunities
    optimization_opportunities = []
    
    # High-value expiring items
    high_value_expiring = [
        i for i in inventory_data 
        if i["days_to_expiry"] <= 7 and i["current_quantity"] * i["selling_price"] > 50
    ]
    
    if high_value_expiring:
        total_value_at_risk = sum(i["current_quantity"] * i["selling_price"] for i in high_value_expiring)
        optimization_opportunities.append({
            "type": "high_value_expiring",
            "description": f"{len(high_value_expiring)} high-value items expiring soon",
            "potential_savings": round(total_value_at_risk * 0.7, 2),
            "action": "Apply targeted discounts immediately",
            "priority": "high"
        })
    
    # Category rebalancing
    high_risk_categories = [cat for cat, perf in category_performance.items() if perf["risk_score"] > 0.5]
    if high_risk_categories:
        optimization_opportunities.append({
            "type": "category_rebalancing",
            "description": f"Categories with high waste risk: {', '.join(high_risk_categories)}",
            "potential_savings": 150.0,  # Estimated
            "action": "Review ordering patterns and shelf placement",
            "priority": "medium"
        })
    
    # Inventory visibility gaps
    visibility_gaps = []
    old_batches = [i for i in inventory_data if i["days_to_expiry"] < 0]
    if old_batches:
        visibility_gaps.append({
            "type": "expired_inventory",
            "description": f"{len(old_batches)} expired items still in system",
            "impact": "High",
            "recommendation": "Immediate removal and process review"
        })
    
    return BatchInsights(
        category_performance=category_performance,
        expiry_pattern_analysis=expiry_patterns,
        waste_hotspots=waste_hotspots,
        optimization_opportunities=optimization_opportunities,
        inventory_visibility_gaps=visibility_gaps,
        seasonal_patterns={}  # Would be calculated from historical data
    )


async def _calculate_scan_workflow_stats(store_id: str, days: int, read_ops) -> Dict[str, float]:
    """Calculate scan workflow statistics"""
    # In production, these would be calculated from actual scan event logs
    return {
        "scan_in_rate": 0.75,  # 75% of new inventory added via scan
        "scan_out_rate": 0.60,  # 60% of sales tracked via scan-out
        "mobile_ratio": 0.85,  # 85% of scans done on mobile
        "avg_scan_time": 2.3,   # 2.3 seconds average scan time
        "error_rate": 0.05,     # 5% error rate
        "satisfaction": 0.80    # 80% user satisfaction
    }


async def _calculate_waste_prevention_impact(
    store_id: str, 
    comparison_period: int, 
    baseline_period: int, 
    read_ops
) -> Dict[str, Any]:
    """Calculate waste prevention impact and ROI"""
    # In production, this would compare actual data from different periods
    return {
        "store_id": store_id,
        "analysis_period": {
            "comparison_days": comparison_period,
            "baseline_days": baseline_period
        },
        "waste_reduction": {
            "total_waste_prevented_kg": 45.6,
            "total_waste_prevented_value_eur": 234.50,
            "waste_reduction_percentage": 28.3,
            "items_saved_from_waste": 87
        },
        "revenue_impact": {
            "additional_revenue_eur": 156.75,
            "discount_revenue_eur": 89.25,
            "donation_tax_benefit_eur": 23.40,
            "total_financial_benefit_eur": 269.40
        },
        "operational_efficiency": {
            "time_saved_hours": 8.5,
            "inventory_accuracy_improvement": 15.2,
            "staff_productivity_gain": 12.8
        },
        "sustainability_impact": {
            "co2_emissions_prevented_kg": 23.4,
            "meals_provided_through_donation": 34,
            "sustainability_score_improvement": 18.7
        },
        "roi_analysis": {
            "implementation_cost_eur": 150.0,
            "monthly_savings_eur": 269.40,
            "payback_period_days": 16.7,
            "annual_roi_percentage": 1247.0
        },
        "generated_at": datetime.utcnow().isoformat()
    }


async def _calculate_action_effectiveness(
    store_id: str, 
    action_type: Optional[str], 
    days: int, 
    read_ops
) -> Dict[str, Any]:
    """Calculate effectiveness of different actions"""
    # In production, this would analyze actual action outcomes
    return {
        "store_id": store_id,
        "analysis_period_days": days,
        "action_filter": action_type,
        "effectiveness_summary": {
            "total_actions_analyzed": 45,
            "successful_actions": 38,
            "overall_success_rate": 84.4,
            "average_effectiveness_score": 0.73
        },
        "action_breakdown": {
            "discount_moderate": {
                "count": 18,
                "success_rate": 88.9,
                "avg_revenue_recovery": 67.3,
                "effectiveness_score": 0.81
            },
            "discount_aggressive": {
                "count": 12,
                "success_rate": 75.0,
                "avg_revenue_recovery": 45.2,
                "effectiveness_score": 0.69
            },
            "donation": {
                "count": 8,
                "success_rate": 100.0,
                "social_impact_score": 0.95,
                "effectiveness_score": 0.88
            },
            "remove": {
                "count": 7,
                "success_rate": 100.0,
                "waste_prevention_score": 0.45,
                "effectiveness_score": 0.45
            }
        },
        "recommendations": [
            "Moderate discounts show highest overall effectiveness",
            "Donation pathway very successful when applicable",
            "Consider earlier intervention to avoid removal",
            "Aggressive discounts effective for high-margin items"
        ],
        "generated_at": datetime.utcnow().isoformat()
    }