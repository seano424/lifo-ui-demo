"""
Pydantic models for inventory-related API endpoints
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.models.base import (
    BatchStatus,
    ConfigurableModel,
    FilterParams,
    PaginationResponse,
    SortParams,
    TimestampMixin,
    UrgencyLevel,
)


# Request Models
class InventoryFilterParams(FilterParams):
    """Advanced filtering for inventory endpoints"""

    urgency_level: UrgencyLevel | None = None
    expiring_days: int | None = Field(
        None, ge=0, le=365, description="Items expiring within N days"
    )
    min_quantity: float | None = Field(
        None, ge=0, description="Minimum quantity filter"
    )
    max_quantity: float | None = Field(
        None, ge=0, description="Maximum quantity filter"
    )
    location_code: str | None = Field(
        None, max_length=50, description="Filter by location"
    )

    # Note: quantity range validation moved to business logic for OpenAPI compatibility


class InventorySortParams(SortParams):
    """Sorting options for inventory"""

    sort_field: str | None = Field(
        "expiry_date",
        description="Field to sort by",
        pattern="^(expiry_date|composite_score|product_name|quantity|created_at|urgency_level)$",
    )


class BatchUpdateRequest(BaseModel):
    """Request to update batch information"""

    current_quantity: float | None = Field(None, ge=0, description="New quantity")
    selling_price: Decimal | None = Field(None, gt=0, description="New selling price")
    location_code: str | None = Field(None, max_length=50, description="New location")
    status: BatchStatus | None = None

    # Note: quantity validation moved to business logic for OpenAPI compatibility


class DiscountRequest(BaseModel):
    """Request to apply discount to batch"""

    discount_percent: float = Field(
        ..., ge=0, le=90, description="Discount percentage (0-90)"
    )
    reason: str | None = Field(None, max_length=255, description="Reason for discount")

    class Config:
        schema_extra = {
            "example": {"discount_percent": 25.0, "reason": "Approaching expiry date"}
        }


class BulkActionRequest(BaseModel):
    """Request for bulk actions on multiple batches"""

    batch_ids: list[str] = Field(
        ..., min_length=1, max_length=100, description="List of batch IDs"
    )
    action_type: str = Field(..., description="Type of action to perform")
    parameters: dict[str, Any] | None = Field(
        None, description="Action-specific parameters"
    )

    class Config:
        schema_extra = {
            "example": {
                "batch_ids": ["123e4567-e89b-12d3-a456-426614174000"],
                "action_type": "apply_discount",
                "parameters": {"discount_percent": 20},
            }
        }


# Response Models
class ProductInfo(ConfigurableModel):
    """Product information in inventory responses"""

    product_id: str
    sku: str
    name: str
    description: str | None = None
    category: str
    brand: str | None = None
    unit_type: str = "pcs"
    typical_shelf_life_days: int | None = None


class PricingInfo(ConfigurableModel):
    """Pricing information for batch"""

    cost_price: float
    selling_price: float
    margin_percent: float
    total_value: float

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class QuantityInfo(ConfigurableModel):
    """Quantity information for batch"""

    initial: float
    current: float
    sold: float

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class DateInfo(ConfigurableModel):
    """Date information for batch"""

    manufacture_date: date | None = None
    expiry_date: date
    days_to_expiry: int
    is_expired: bool


class ScoringInfo(ConfigurableModel):
    """Scoring information for batch"""

    expiry_score: float | None = None
    velocity_score: float | None = None
    margin_score: float | None = None
    composite_score: float | None = None
    recommendation: str | None = None
    urgency_level: UrgencyLevel | None = None
    discount_percent: int | None = None
    reason: str | None = None
    ml_enhanced: bool = False
    confidence_level: float | None = None
    calculated_at: datetime | None = None


class BatchResponse(ConfigurableModel, TimestampMixin):
    """Complete batch information response"""

    batch_id: str
    batch_number: str
    product: ProductInfo
    quantities: QuantityInfo
    pricing: PricingInfo
    dates: DateInfo
    location_code: str
    status: BatchStatus
    store_id: str
    scoring: ScoringInfo | None = None

    class Config:
        schema_extra = {
            "example": {
                "batch_id": "123e4567-e89b-12d3-a456-426614174000",
                "batch_number": "MILK-001-20240115",
                "product": {
                    "product_id": "456e7890-e89b-12d3-a456-426614174001",
                    "sku": "DAIRY-001",
                    "name": "Organic Milk 1L",
                    "category": "dairy",
                    "brand": "Farm Fresh",
                    "unit_type": "bottles",
                },
                "quantities": {"initial": 24.0, "current": 18.0, "sold": 6.0},
                "pricing": {
                    "cost_price": 1.20,
                    "selling_price": 2.50,
                    "margin_percent": 52.0,
                    "total_value": 45.0,
                },
                "dates": {
                    "manufacture_date": "2024-01-10",
                    "expiry_date": "2024-01-17",
                    "days_to_expiry": 2,
                    "is_expired": False,
                },
                "location_code": "FRIDGE-A1",
                "status": "active",
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
            }
        }


class InventoryItemResponse(ConfigurableModel):
    """Simplified inventory item for list responses"""

    batch_id: str
    batch_number: str
    sku: str
    product_name: str
    category: str
    brand: str | None = None
    current_quantity: float
    selling_price: float
    expiry_date: date
    days_to_expiry: int
    urgency_level: UrgencyLevel
    total_value: float
    margin_percent: float
    location_code: str
    status: BatchStatus

    # Scoring fields (optional)
    composite_score: float | None = None
    recommendation: str | None = None
    discount_percent: int | None = None

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class InventoryListResponse(ConfigurableModel):
    """Paginated inventory list response"""

    items: list[InventoryItemResponse]
    pagination: PaginationResponse
    summary: dict[str, Any]
    filters_applied: dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "items": [
                    {
                        "batch_id": "123e4567-e89b-12d3-a456-426614174000",
                        "batch_number": "MILK-001-20240115",
                        "sku": "DAIRY-001",
                        "product_name": "Organic Milk 1L",
                        "category": "dairy",
                        "current_quantity": 18.0,
                        "selling_price": 2.50,
                        "expiry_date": "2024-01-17",
                        "days_to_expiry": 2,
                        "urgency_level": "high",
                        "total_value": 45.0,
                        "margin_percent": 52.0,
                        "location_code": "FRIDGE-A1",
                        "status": "active",
                    }
                ],
                "pagination": {
                    "page": 1,
                    "limit": 50,
                    "total": 127,
                    "pages": 3,
                    "has_next": True,
                    "has_prev": False,
                },
                "summary": {
                    "total_items": 127,
                    "total_value": 12500.50,
                    "expired_items": 3,
                    "critical_items": 8,
                },
                "filters_applied": {
                    "status": "active",
                    "store_id": "789e0123-e89b-12d3-a456-426614174002",
                },
            }
        }


class InventorySummaryResponse(ConfigurableModel):
    """Summary statistics for store inventory"""

    total_batches: int
    active_batches: int
    total_quantity: float
    total_value: float

    # Urgency breakdown
    critical_items: int
    high_urgency_items: int
    medium_urgency_items: int
    low_urgency_items: int

    # Expiry breakdown
    expired_items: int
    expiring_today: int
    expiring_this_week: int

    # Category breakdown
    categories: list[dict[str, Any]]

    # Recent activity
    recent_actions_count: int
    last_updated: datetime

    # Note: decimal conversion handled in business logic for OpenAPI compatibility


class ActionResult(ConfigurableModel):
    """Result of an inventory action"""

    batch_id: str
    action_type: str
    success: bool
    message: str
    details: dict[str, Any] | None = None
    executed_at: datetime = Field(default_factory=datetime.utcnow)


class BulkActionResponse(ConfigurableModel):
    """Response for bulk actions"""

    total_requested: int
    successful: int
    failed: int
    results: list[ActionResult]
    summary: dict[str, Any]
    executed_at: datetime = Field(default_factory=datetime.utcnow)
