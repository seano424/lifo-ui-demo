"""
Pydantic models for analytics-related API endpoints
"""

from datetime import date, datetime
from typing import Any, Optional, Union

from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models.base import ConfigurableModel, decimal_to_float


# Request Models
class AnalyticsRequest(BaseModel):
    """Request parameters for analytics"""

    days: int = Field(30, ge=1, le=365, description="Analysis period in days")
    include_detailed: bool = Field(False, description="Include detailed breakdown")
    categories: Optional[list[str]] = Field(None, description="Filter by categories")


class TrendAnalysisRequest(BaseModel):
    """Request for trend analysis"""

    metric: str = Field("waste", description="Metric to analyze (waste, revenue, velocity)")
    days: int = Field(90, ge=30, le=365, description="Analysis period in days")
    granularity: str = Field("daily", description="Data granularity (daily, weekly, monthly)")


# Response Models
class InventorySummary(ConfigurableModel):
    """Inventory summary statistics"""

    total_batches: int
    active_batches: int
    total_quantity: float
    total_value: float
    expired_count: int
    expiring_soon_count: int

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class CategoryBreakdown(ConfigurableModel):
    """Category-wise breakdown"""

    category: str
    batch_count: int
    total_quantity: float
    total_value: float
    expired_items: int = 0
    high_urgency_items: int = 0

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class UrgencyDistribution(ConfigurableModel):
    """Distribution of items by urgency level"""

    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    unscored: int = 0


class RecentAction(ConfigurableModel):
    """Recent action taken on inventory"""

    action_id: str
    action_type: str
    batch_id: Optional[str] = None
    original_price: Optional[float] = None
    new_price: Optional[float] = None
    discount_percent: Optional[float] = None
    executed_at: datetime
    executed_by: Optional[str] = None
    effectiveness_score: Optional[float] = None

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class StoreAnalyticsResponse(ConfigurableModel):
    """Comprehensive store analytics response"""

    store_id: str
    analysis_period: str
    period_days: int
    inventory_summary: InventorySummary
    category_breakdown: list[CategoryBreakdown]
    urgency_distribution: UrgencyDistribution
    recent_actions: list[RecentAction]
    generated_at: datetime

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "analysis_period": "30 days",
                "period_days": 30,
                "inventory_summary": {
                    "total_batches": 127,
                    "active_batches": 120,
                    "total_quantity": 2456.5,
                    "total_value": 12500.75,
                    "expired_count": 3,
                    "expiring_soon_count": 8,
                },
                "category_breakdown": [
                    {
                        "category": "dairy",
                        "batch_count": 45,
                        "total_quantity": 850.0,
                        "total_value": 4250.0,
                        "expired_items": 1,
                        "high_urgency_items": 3,
                    }
                ],
                "urgency_distribution": {
                    "critical": 5,
                    "high": 12,
                    "medium": 35,
                    "low": 68,
                    "unscored": 7,
                },
                "recent_actions": [
                    {
                        "action_id": "act_123",
                        "action_type": "discount_moderate",
                        "original_price": 2.50,
                        "new_price": 2.00,
                        "discount_percent": 20.0,
                        "executed_at": "2024-01-15T10:30:00Z",
                        "effectiveness_score": 0.75,
                    }
                ],
                "generated_at": "2024-01-15T14:30:00Z",
            }
        }


class DashboardAlert(ConfigurableModel):
    """Dashboard alert information"""

    type: str = Field(..., description="Alert type (expired, expiring, high_urgency)")
    count: int = Field(..., description="Number of items")
    severity: str = Field(..., description="Alert severity (low, medium, high, critical)")
    message: str = Field(..., description="Alert message")


class DashboardSummary(ConfigurableModel):
    """Dashboard summary statistics"""

    total_batches: int
    total_value: float
    active_inventory: int
    revenue_at_risk: float

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class DashboardResponse(ConfigurableModel):
    """Dashboard data response"""

    store_id: str
    summary: DashboardSummary
    alerts: list[DashboardAlert]
    top_categories: list[CategoryBreakdown]
    recent_activity: list[RecentAction]
    last_updated: datetime

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "summary": {
                    "total_batches": 127,
                    "total_value": 12500.75,
                    "active_inventory": 120,
                    "revenue_at_risk": 1250.50,
                },
                "alerts": [
                    {
                        "type": "expired",
                        "count": 3,
                        "severity": "critical",
                        "message": "3 items have expired and need immediate attention",
                    },
                    {
                        "type": "expiring",
                        "count": 8,
                        "severity": "high",
                        "message": "8 items are expiring within 24 hours",
                    },
                ],
                "top_categories": [
                    {
                        "category": "dairy",
                        "batch_count": 45,
                        "total_quantity": 850.0,
                        "total_value": 4250.0,
                    }
                ],
                "recent_activity": [
                    {
                        "action_id": "act_123",
                        "action_type": "discount_moderate",
                        "executed_at": "2024-01-15T10:30:00Z",
                    }
                ],
                "last_updated": "2024-01-15T14:30:00Z",
            }
        }


class PerformanceMetrics(ConfigurableModel):
    """Performance metrics for waste reduction"""

    total_actions_taken: int
    successful_actions: int
    action_success_rate: float
    waste_reduction_percent: float
    revenue_recovered: float
    inventory_turnover: float
    average_margin: float

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class TrendPoint(ConfigurableModel):
    """Single point in trend analysis"""

    date: date
    value: float
    category: Optional[str] = None

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class PerformanceResponse(ConfigurableModel):
    """Performance metrics response"""

    store_id: str
    period_days: int
    metrics: PerformanceMetrics
    trends: dict[str, Any]
    generated_at: datetime

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "period_days": 30,
                "metrics": {
                    "total_actions_taken": 45,
                    "successful_actions": 38,
                    "action_success_rate": 84.4,
                    "waste_reduction_percent": 15.2,
                    "revenue_recovered": 2500.75,
                    "inventory_turnover": 2.1,
                    "average_margin": 42.5,
                },
                "trends": {
                    "urgency_distribution": {
                        "critical": 5,
                        "high": 12,
                        "medium": 35,
                        "low": 68,
                    },
                    "category_performance": [],
                },
                "generated_at": "2024-01-15T14:30:00Z",
            }
        }


class TrendAnalysisResponse(ConfigurableModel):
    """Trend analysis response"""

    store_id: str
    metric: str
    period_days: int
    trend_points: list[TrendPoint]
    trend_direction: str = Field(..., description="Trend direction: up, down, stable")
    percentage_change: float
    insights: list[str]
    generated_at: datetime

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "metric": "waste",
                "period_days": 90,
                "trend_points": [
                    {"date": "2024-01-01", "value": 125.5},
                    {"date": "2024-01-02", "value": 118.2},
                ],
                "trend_direction": "down",
                "percentage_change": -12.5,
                "insights": [
                    "Waste levels have decreased by 12.5% over the analysis period",
                    "Most improvement seen in dairy and bakery categories",
                    "Recommended to maintain current discount strategy",
                ],
                "generated_at": "2024-01-15T14:30:00Z",
            }
        }


class ExportMetadata(ConfigurableModel):
    """Export data metadata"""

    export_type: str
    export_format: str
    period_days: int
    total_records: int
    file_size_bytes: Optional[int] = None
    exported_at: datetime
    exported_by: str


class ExportResponse(ConfigurableModel):
    """Export data response"""

    store_id: str
    metadata: ExportMetadata
    data: Union[dict[str, Any], list[dict[str, Any]]]
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "metadata": {
                    "export_type": "analytics",
                    "export_format": "json",
                    "period_days": 30,
                    "total_records": 127,
                    "exported_at": "2024-01-15T14:30:00Z",
                    "exported_by": "user123",
                },
                "data": {"inventory_summary": {}, "category_breakdown": []},
                "download_url": "/api/v1/exports/download/export_123",
                "expires_at": "2024-01-16T14:30:00Z",
            }
        }
