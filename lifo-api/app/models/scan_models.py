"""
Scan workflow models for MVP implementation
Mobile-optimized models for scan-in/scan-out workflows
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class ScanOutAction(str, Enum):
    """Actions that can be taken when scanning out batches"""

    SOLD_FULL_PRICE = "sold_full_price"
    SOLD_DISCOUNTED = "sold_discounted"
    DONATED = "donated"
    DISCARDED = "discarded"
    MOVED_LOCATION = "moved_location"
    RETURNED_SUPPLIER = "returned_supplier"


class ScanInRequest(BaseModel):
    """Request model for scan-in workflow (proof of delivery)"""

    product_sku: str = Field(
        ..., min_length=1, max_length=100, description="Product SKU"
    )
    barcode: Optional[str] = Field(None, max_length=50, description="Product barcode")
    expiry_date: date = Field(..., description="Product expiry date")
    quantity: int = Field(..., gt=0, le=10000, description="Quantity received")
    location_code: Optional[str] = Field(
        "MAIN", max_length=50, description="Storage location"
    )
    cost_price: Optional[float] = Field(
        None, ge=0, le=10000, description="Cost price per unit"
    )
    selling_price: Optional[float] = Field(
        None, ge=0, le=10000, description="Selling price per unit"
    )
    batch_number: Optional[str] = Field(
        None, max_length=100, description="Optional batch number"
    )
    manufacture_date: Optional[date] = Field(None, description="Manufacture date")
    temperature: Optional[float] = Field(
        None, ge=-50, le=50, description="Storage temperature"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

    @validator("expiry_date")
    def validate_expiry_date(cls, v):
        """Ensure expiry date is reasonable"""
        today = date.today()
        if v < today:
            # Allow past dates with warning (for existing inventory)
            pass
        elif v > today.replace(year=today.year + 10):
            raise ValueError("Expiry date too far in future (max 10 years)")
        return v

    @validator("selling_price", "cost_price")
    def validate_prices(cls, v):
        """Validate price fields"""
        if v is not None and v < 0:
            raise ValueError("Prices cannot be negative")
        return v

    @validator("product_sku")
    def validate_sku(cls, v):
        """Validate SKU format"""
        if not v or not v.strip():
            raise ValueError("SKU cannot be empty")
        # Remove dangerous characters
        dangerous_chars = ["<", ">", '"', "'", "&", ";", "(", ")", "="]
        if any(char in v for char in dangerous_chars):
            raise ValueError("SKU contains invalid characters")
        return v.strip()


class ScanOutRequest(BaseModel):
    """Request model for scan-out workflow"""

    action: ScanOutAction = Field(..., description="Action being taken")
    quantity_moved: int = Field(..., gt=0, description="Quantity being moved/sold")
    actual_selling_price: Optional[float] = Field(
        None, ge=0, description="Actual selling price"
    )
    discount_percent: Optional[float] = Field(
        None, ge=0, le=100, description="Discount percentage applied"
    )
    destination_location: Optional[str] = Field(
        None, max_length=50, description="Destination location"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Action notes")
    customer_type: Optional[str] = Field(
        "regular", max_length=50, description="Customer type"
    )
    channel: Optional[str] = Field(
        "in_store", max_length=50, description="Sales channel"
    )

    @validator("discount_percent")
    def validate_discount(cls, v, values):
        """Validate discount is reasonable"""
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError("Discount must be between 0 and 100 percent")
            # Check if discount is applied for appropriate actions
            action = values.get("action")
            if action in [ScanOutAction.SOLD_DISCOUNTED] and v == 0:
                raise ValueError("Discount percentage required for discounted sales")
        return v


class ProcessScanRequest(BaseModel):
    """Request model for combined scan processing (future image recognition ready)"""

    barcode: str = Field(
        ..., min_length=1, max_length=50, description="Product barcode"
    )
    expiry_date: date = Field(..., description="Expiry date from scan/OCR")
    quantity: int = Field(..., gt=0, le=10000, description="Quantity scanned")
    confidence_score: Optional[float] = Field(
        1.0, ge=0, le=1, description="OCR confidence score"
    )
    location_code: Optional[str] = Field("MAIN", max_length=50, description="Location")
    scan_timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="When scan occurred"
    )
    image_url: Optional[str] = Field(
        None, max_length=500, description="Reference to scanned image"
    )
    ocr_data: Optional[Dict[str, Any]] = Field(
        None, description="Raw OCR extraction data"
    )


class ScanInResponse(BaseModel):
    """Response model for scan-in workflow"""

    success: bool
    batch_id: str
    batch_number: str
    product_info: Dict[str, Any]
    initial_score: Optional[float] = None
    urgency_level: Optional[str] = None
    recommendations: List[str] = []
    warnings: List[str] = []
    processing_time_ms: float


class ScanOutResponse(BaseModel):
    """Response model for scan-out workflow"""

    success: bool
    action_id: str
    batch_id: str
    remaining_quantity: float
    batch_status: str
    effectiveness_score: Optional[float] = None
    revenue_impact: Optional[float] = None
    waste_prevented: Optional[float] = None
    processing_time_ms: float


class MobileBatchSummary(BaseModel):
    """Mobile-optimized batch summary response"""

    urgent_batches: List[Dict[str, Any]] = []
    expiring_today: List[Dict[str, Any]] = []
    action_needed: List[Dict[str, Any]] = []
    total_active_batches: int = 0
    store_health_score: float = 0.0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    cache_expires_in: int = 300  # seconds


class QuickBatchScore(BaseModel):
    """Quick scoring response for mobile"""

    batch_id: str
    composite_score: float
    urgency_level: str
    recommendation: str
    days_to_expiry: int
    suggested_action: Optional[str] = None
    discount_suggestion: Optional[int] = None
    processing_time_ms: float


class MVPMetrics(BaseModel):
    """MVP validation metrics response"""

    batches_scanned_today: int = 0
    products_added_via_scan: int = 0
    waste_prevented_value_eur: float = 0.0
    donation_opportunities: int = 0
    discount_recommendations_given: int = 0
    discount_recommendations_acted_on: int = 0
    average_batch_visibility_improvement: float = 0.0
    time_to_action_hours: float = 0.0
    scan_efficiency_score: float = 0.0
    user_adoption_rate: float = 0.0


class BatchInsights(BaseModel):
    """Batch performance insights response"""

    category_performance: Dict[str, Dict[str, float]] = {}
    expiry_pattern_analysis: Dict[str, Any] = {}
    waste_hotspots: List[Dict[str, Any]] = []
    optimization_opportunities: List[Dict[str, Any]] = []
    inventory_visibility_gaps: List[Dict[str, Any]] = []
    seasonal_patterns: Dict[str, Any] = {}


class RealtimeUpdate(BaseModel):
    """Real-time update notification model"""

    store_id: str
    batch_id: str
    update_type: str  # 'score_change', 'new_batch', 'status_change'
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    priority: str = "normal"  # 'low', 'normal', 'high', 'critical'


class MVPException(Exception):
    """Base exception for MVP-specific errors"""

    def __init__(
        self, message: str, error_code: str = "MVP_ERROR", status_code: int = 400
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)


class ScanWorkflowException(MVPException):
    """Exception for scan workflow specific errors"""

    def __init__(
        self,
        message: str,
        workflow: str,
        error_code: str = "SCAN_ERROR",
        status_code: int = 400,
    ):
        self.workflow = workflow
        super().__init__(message, error_code, status_code)


class MobileOptimizedError(BaseModel):
    """Mobile-friendly error response"""

    success: bool = False
    error_code: str
    message: str
    user_message: str  # Simplified message for mobile UI
    retry_allowed: bool = True
    retry_after_seconds: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Response schemas for mobile optimization
class MobileBatchItem(BaseModel):
    """Optimized batch item for mobile displays"""

    batch_id: str
    sku: str
    product_name: str
    category: str
    quantity: float
    days_to_expiry: int
    urgency_score: float
    urgency_level: str
    location: str
    estimated_value: float
    recommended_action: Optional[str] = None


class MobileStoreHealth(BaseModel):
    """Store health metrics for mobile dashboard"""

    overall_score: float
    critical_items: int
    expiring_soon: int
    total_value_at_risk: float
    trends: Dict[str, float]
    last_action_taken: Optional[str] = None
    next_recommended_action: Optional[str] = None


# Validation helpers
def validate_uuid_format(value: str) -> str:
    """Validate UUID format for IDs"""
    try:
        uuid.UUID(value)
        return value
    except ValueError:
        raise ValueError(f"Invalid UUID format: {value}")


def sanitize_text_input(value: str) -> str:
    """Sanitize text input for security"""
    if not value:
        return value

    # Remove potentially dangerous characters
    dangerous_patterns = [
        "<script",
        "javascript:",
        "data:",
        "vbscript:",
        "onload=",
        "onerror=",
    ]
    value_lower = value.lower()

    for pattern in dangerous_patterns:
        if pattern in value_lower:
            raise ValueError(f"Invalid content detected in input")

    return value.strip()
