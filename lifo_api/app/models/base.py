"""
Base Pydantic models and common schemas for LIFO AI Engine
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, Union

from pydantic import BaseModel, Field, validator


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ResponseBase(BaseModel):
    """Base response model"""

    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Error response model"""

    success: bool = False
    error: str
    details: Optional[str] = None
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(1, ge=1, description="Page number (1-based)")
    limit: int = Field(50, ge=1, le=100, description="Items per page (max 100)")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginationResponse(BaseModel):
    """Pagination metadata in responses"""

    page: int
    limit: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool

    @validator("pages", pre=True, always=True)
    def calculate_pages(cls, v: int, values: dict[str, Any]) -> int:
        total = values.get("total", 0)
        limit = values.get("limit", 1)
        return max(1, (total + limit - 1) // limit)

    @validator("has_next", pre=True, always=True)
    def calculate_has_next(cls, v: bool, values: dict[str, Any]) -> bool:
        page = values.get("page", 1)
        total = values.get("total", 0)
        limit = values.get("limit", 1)
        return page * limit < total

    @validator("has_prev", pre=True, always=True)
    def calculate_has_prev(cls, v: bool, values: dict[str, Any]) -> bool:
        page = values.get("page", 1)
        return page > 1


class SortParams(BaseModel):
    """Sorting parameters"""

    sort_field: Optional[str] = "created_at"
    sort_direction: str = Field("asc", pattern="^(asc|desc)$")


class FilterParams(BaseModel):
    """Base filtering parameters"""

    search: Optional[str] = Field(None, max_length=100, description="Search term")
    category: Optional[str] = Field(None, max_length=50, description="Filter by category")
    status: Optional[str] = Field("active", description="Filter by status")


class UrgencyLevel(str, Enum):
    """Urgency levels for inventory items"""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionType(str, Enum):
    """Types of inventory actions"""

    MAINTAIN = "maintain"
    MONITOR = "monitor"
    ALERT = "alert"
    DISCOUNT_LIGHT = "discount_light"
    DISCOUNT_MODERATE = "discount_moderate"
    DISCOUNT_AGGRESSIVE = "discount_aggressive"
    REMOVE = "remove"


class StoreType(str, Enum):
    """Types of stores"""

    SUPERMARKET = "supermarket"
    CONVENIENCE = "convenience"
    RESTAURANT = "restaurant"
    BAKERY = "bakery"
    BUTCHER = "butcher"
    ORGANIC = "organic"


class UserRole(str, Enum):
    """User roles within a store"""

    EMPLOYEE = "employee"
    STAFF = "staff"
    MANAGER = "manager"
    OWNER = "owner"


class BatchStatus(str, Enum):
    """Batch status options"""

    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"
    DAMAGED = "damaged"
    RETURNED = "returned"


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    database_connected: bool
    version: str
    uptime: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MetricsResponse(BaseModel):
    """Metrics response for monitoring"""

    inventory_count: int
    active_batches: int
    expired_items: int
    high_urgency_items: int
    total_value: Decimal
    last_updated: datetime


# Utility functions for model conversion
def decimal_to_float(value: Optional[Decimal]) -> Optional[float]:
    """Convert Decimal to float for JSON serialization"""
    return float(value) if value is not None else None


def ensure_decimal(value: Union[float, int, str, Decimal]) -> Decimal:
    """Ensure value is converted to Decimal"""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


class ConfigurableModel(BaseModel):
    """Base model with common configuration"""

    class Config:
        # Enable ORM mode for SQLAlchemy integration
        from_attributes = True

        # Use enum values instead of names
        use_enum_values = True

        # Validate assignment
        validate_assignment = True

        # JSON encoders for special types
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None,
            Decimal: lambda v: float(v) if v else None,
        }

        # Schema extra
        schema_extra: dict[str, dict[str, Any]] = {"example": {}}
