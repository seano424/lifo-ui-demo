"""
Scoring Models Module

Pydantic models for scoring inputs, outputs, and configuration.
Extracted from the original monolithic scoring.py for better modularity.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ScoringWeights(BaseModel):
    """
    Scoring weights configuration
    """

    expiry: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Weight for expiry factor (0-1)"
    )
    velocity: float = Field(
        default=0.3, ge=0.0, le=1.0, description="Weight for velocity factor (0-1)"
    )
    margin: float = Field(
        default=0.2, ge=0.0, le=1.0, description="Weight for margin factor (0-1)"
    )

    def validate_sum(self):
        """Ensure weights sum to 1.0"""
        total = self.expiry + self.velocity + self.margin
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total}")


class ScoringInput(BaseModel):
    """
    Input data for scoring calculation
    """

    batch_id: str
    product_id: str
    store_id: str
    sku: str
    product_name: str
    category: str
    days_to_expiry: int
    shelf_life_days: int
    current_quantity: float
    initial_quantity: float
    cost_price: Decimal
    selling_price: Decimal
    location_code: str
    avg_daily_sales: float = 0.0
    temperature: float | None = None
    humidity: float | None = None


class ScoringResult(BaseModel):
    """
    Result of scoring calculation
    """

    store_id: str
    batch_id: str
    sku: str
    product_name: str
    category: str
    expiry_score: float
    velocity_score: float
    margin_score: float
    composite_score: float
    recommendation: str
    urgency_level: str
    discount_percent: int
    reason: str
    confidence_level: float
    ml_enhanced: bool = False
    calculated_at: datetime

    # Additional metadata
    days_to_expiry: int
    current_quantity: float
    potential_loss: float
    margin_percent: float
