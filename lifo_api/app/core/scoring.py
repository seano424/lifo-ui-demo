"""
Enhanced LIFO AI Scoring Engine
Port and enhancement of existing scoring engine with FastAPI integration
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

import structlog
from pydantic import BaseModel, validator
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_scoring_weights

logger = structlog.get_logger()


class ScoringWeights(BaseModel):
    """
    Scoring weights configuration
    """

    expiry: float = 0.5
    velocity: float = 0.3
    margin: float = 0.2

    @validator("expiry", "velocity", "margin")
    def weights_must_be_positive(cls, v):
        if v < 0 or v > 1:
            raise ValueError("Weights must be between 0 and 1")
        return v

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
    temperature: Optional[float] = None
    humidity: Optional[float] = None


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


class InventoryScorer:
    """
    Enhanced inventory scoring engine with ML-ready architecture
    Calculates urgency scores based on multiple factors
    """

    def __init__(
        self, weights: Optional[ScoringWeights] = None, category: Optional[str] = None
    ):
        """
        Initialize scorer with custom weights or category-specific weights
        """
        if weights:
            weights.validate_sum()
            self.weights = weights
        elif category:
            category_weights = get_scoring_weights(category)
            self.weights = ScoringWeights(**category_weights)
        else:
            default_weights = get_scoring_weights()
            self.weights = ScoringWeights(**default_weights)

        self.logger = structlog.get_logger().bind(component="scorer")

    def calculate_expiry_score(
        self, days_to_expiry: int, shelf_life_days: int
    ) -> float:
        """
        Calculate urgency based on expiry date with enhanced logic
        Returns: 0.0 (no urgency) to 1.0 (critical)
        """
        if days_to_expiry <= 0:
            return 1.0  # Already expired

        # Critical thresholds for immediate action
        if days_to_expiry <= 1:
            return 0.95  # Critical - expires tomorrow

        if days_to_expiry <= 2:
            return 0.9  # Critical - expires in 2 days

        if days_to_expiry <= 3:
            return 0.8  # High urgency - expires in 3 days

        if days_to_expiry <= 7:
            return 0.6  # Medium urgency - expires within a week

        # For longer shelf life items, use ratio-based scoring
        if shelf_life_days > 0:
            ratio = days_to_expiry / shelf_life_days
            if ratio <= 0.1:  # Less than 10% of shelf life left
                return 0.7
            elif ratio <= 0.2:  # Less than 20% of shelf life left
                return 0.5
            elif ratio <= 0.3:  # Less than 30% of shelf life left
                return 0.3

        # Enhanced scoring for very short vs very long shelf life
        if shelf_life_days <= 3:  # Very perishable items
            if days_to_expiry <= shelf_life_days * 0.5:
                return 0.6
        elif shelf_life_days >= 365:  # Long shelf life items
            if days_to_expiry <= 30:  # Less than a month left
                return 0.4

        return 0.1  # Low urgency for long shelf life items

    def _calculate_disposal_urgency(
        self, days_to_expiry: int, category: str = None
    ) -> float:
        """
        Calculate disposal urgency for expired products based on category and days past expiry
        Returns: 0.0 (can wait) to 1.0 (immediate disposal required)
        """
        # Category-specific disposal urgency thresholds
        category_disposal_profiles = {
            "fresh_meat_fish": {"immediate": -1, "urgent": -2, "moderate": -7},
            "dairy": {"immediate": -2, "urgent": -5, "moderate": -14},
            "fresh_produce": {"immediate": -3, "urgent": -7, "moderate": -14},
            "bakery_fresh": {"immediate": -2, "urgent": -5, "moderate": -10},
            "deli_prepared": {"immediate": -1, "urgent": -3, "moderate": -7},
            "frozen": {"immediate": -7, "urgent": -30, "moderate": -90},
            "beverages": {"immediate": -30, "urgent": -90, "moderate": -180},
            "dry_goods": {"immediate": -60, "urgent": -180, "moderate": -365},
            "canned_jarred": {"immediate": -90, "urgent": -365, "moderate": -730},
            "spices_condiments": {"immediate": -180, "urgent": -365, "moderate": -1095},
        }

        # Get category profile or use default
        profile = category_disposal_profiles.get(
            category, {"immediate": -7, "urgent": -30, "moderate": -90}
        )

        # Calculate urgency based on how long the product has been expired
        if days_to_expiry <= profile["immediate"]:
            return 1.0  # Immediate disposal required
        elif days_to_expiry <= profile["urgent"]:
            return 0.8  # Urgent disposal needed
        elif days_to_expiry <= profile["moderate"]:
            return 0.6  # Moderate disposal urgency
        else:
            return 0.4  # Lower disposal urgency but still expired

    def _calculate_expired_margin_score(
        self, margin_percent: float, days_to_expiry: int, category: str = None
    ) -> float:
        """
        Calculate margin score for expired products
        For expired products, margin is much less important - focus is on recovery vs disposal
        Returns: 0.0 (can still recover some value) to 1.0 (total loss)
        """
        # Category-specific recovery potential after expiry
        category_recovery_potential = {
            "fresh_meat_fish": 0.0,  # No recovery - safety issue
            "dairy": 0.1,  # Very limited recovery
            "fresh_produce": 0.3,  # Some recovery potential
            "bakery_fresh": 0.4,  # Good recovery potential
            "deli_prepared": 0.1,  # Limited recovery
            "frozen": 0.6,  # Good recovery if thawed recently
            "beverages": 0.7,  # Good recovery potential
            "dry_goods": 0.8,  # High recovery potential
            "canned_jarred": 0.9,  # Very high recovery potential
            "spices_condiments": 0.8,  # High recovery potential
        }

        base_recovery = category_recovery_potential.get(category, 0.5)

        # Reduce recovery potential based on how long expired
        if days_to_expiry <= -30:
            recovery_factor = base_recovery * 0.1  # Minimal recovery after 30 days
        elif days_to_expiry <= -14:
            recovery_factor = base_recovery * 0.3  # Limited recovery after 2 weeks
        elif days_to_expiry <= -7:
            recovery_factor = base_recovery * 0.5  # Moderate recovery after 1 week
        elif days_to_expiry <= -3:
            recovery_factor = base_recovery * 0.7  # Good recovery within 3 days
        else:
            recovery_factor = base_recovery * 0.9  # High recovery within 3 days

        # Convert recovery potential to margin score (inverse relationship)
        return 1.0 - recovery_factor

    def _generate_expired_recommendation(
        self,
        days_to_expiry: int,
        current_margin_percent: float,
        current_quantity: float = None,
    ) -> dict[str, Any]:
        """
        Generate recommendations for expired products based on days past expiry and category
        """
        # Determine action based on how long expired
        if days_to_expiry <= -30:
            return {
                "action": "dispose",
                "urgency": "critical",
                "reason": f"Product expired {abs(days_to_expiry)} days ago - dispose immediately for safety",
                "discount_percent": 0,
                "priority": 1,
            }
        elif days_to_expiry <= -14:
            return {
                "action": "dispose",
                "urgency": "critical",
                "reason": f"Product expired {abs(days_to_expiry)} days ago - disposal recommended",
                "discount_percent": 0,
                "priority": 1,
            }
        elif days_to_expiry <= -7:
            return {
                "action": "heavy_discount_or_dispose",
                "urgency": "critical",
                "reason": f"Product expired {abs(days_to_expiry)} days ago - heavy discount or dispose",
                "discount_percent": min(80, max(60, int(current_margin_percent * 0.9))),
                "priority": 1,
            }
        elif days_to_expiry <= -3:
            return {
                "action": "discount_aggressive",
                "urgency": "critical",
                "reason": f"Product expired {abs(days_to_expiry)} days ago - aggressive discount needed",
                "discount_percent": min(70, max(40, int(current_margin_percent * 0.8))),
                "priority": 1,
            }
        else:  # -1 to -3 days
            return {
                "action": "discount_immediate",
                "urgency": "critical",
                "reason": f"Product expired {abs(days_to_expiry)} day(s) ago - immediate discount required",
                "discount_percent": min(60, max(30, int(current_margin_percent * 0.7))),
                "priority": 1,
            }

    def calculate_velocity_score(
        self,
        current_quantity: float,
        avg_daily_sales: float,
        days_to_expiry: int,
        category: str = None,
    ) -> float:
        """
        Enhanced velocity score calculation with improved algorithms
        For fresh products: Returns 0.0 (selling fast enough) to 1.0 (too slow)
        For expired products: Returns disposal urgency based on category and days past expiry
        """
        if days_to_expiry <= 0:
            # For expired products, return disposal urgency based on category and days past expiry
            return self._calculate_disposal_urgency(days_to_expiry, category)

        if avg_daily_sales <= 0:
            return 0.8  # No sales data, assume moderate risk

        # Calculate days needed to sell current stock
        days_to_sell = current_quantity / avg_daily_sales

        # Enhanced thresholds based on expiry urgency
        safety_buffer = max(
            0.7, 1 - (days_to_expiry / 30)
        )  # More aggressive for shorter expiry

        # If we can sell all stock before expiry with buffer
        if days_to_sell <= days_to_expiry * safety_buffer:
            return 0.1  # Low risk - selling fast enough

        # If we can sell most stock before expiry
        elif days_to_sell <= days_to_expiry * 0.9:
            return 0.3  # Moderate risk

        # If we can barely sell all stock before expiry
        elif days_to_sell <= days_to_expiry:
            return 0.6  # High risk - cutting it close

        # If we cannot sell all stock before expiry
        else:
            excess_ratio = (days_to_sell - days_to_expiry) / days_to_expiry
            return min(1.0, 0.8 + excess_ratio * 0.2)  # Very high risk

    def calculate_margin_score(
        self,
        cost_price: float,
        selling_price: float,
        days_to_expiry: int,
        category: str = None,
    ) -> float:
        """
        Enhanced margin score with urgency-based adjustments
        Returns: 0.0 (high margin, can afford discounts) to 1.0 (low margin)
        """
        if selling_price <= cost_price:
            return 1.0  # No profit margin

        margin_percent = ((selling_price - cost_price) / selling_price) * 100

        # For expired products, margin becomes much less important
        if days_to_expiry <= 0:
            return self._calculate_expired_margin_score(
                margin_percent, days_to_expiry, category
            )

        # Adjust margin importance based on urgency for fresh products
        urgency_multiplier = 1.0
        if days_to_expiry <= 1:
            urgency_multiplier = 0.5  # Margin less important when critical
        elif days_to_expiry <= 3:
            urgency_multiplier = 0.7  # Reduced margin importance
        elif days_to_expiry <= 7:
            urgency_multiplier = 0.9  # Slightly reduced margin importance

        # Enhanced margin thresholds
        if margin_percent >= 50:
            return 0.05 * urgency_multiplier  # Very high margin
        elif margin_percent >= 40:
            return 0.1 * urgency_multiplier  # High margin - can afford deep discounts
        elif margin_percent >= 25:
            return (
                0.3 * urgency_multiplier
            )  # Good margin - can afford moderate discounts
        elif margin_percent >= 15:
            return (
                0.5 * urgency_multiplier
            )  # Moderate margin - limited discount options
        elif margin_percent >= 10:
            return 0.7 * urgency_multiplier  # Low margin - minimal discount options
        else:
            return 0.9 * urgency_multiplier  # Very low margin - avoid discounts

    def calculate_composite_score(
        self,
        expiry_score: float,
        velocity_score: float,
        margin_score: float,
        category_weights: Optional[dict[str, float]] = None,
    ) -> float:
        """
        Calculate weighted composite score with enhanced logic
        """
        weights = category_weights or {
            "expiry": self.weights.expiry,
            "velocity": self.weights.velocity,
            "margin": self.weights.margin,
        }

        composite = (
            expiry_score * weights.get("expiry", 0.5)
            + velocity_score * weights.get("velocity", 0.3)
            + margin_score * weights.get("margin", 0.2)
        )

        # Apply non-linear scaling for more decisive recommendations without ceiling effects
        if composite >= 0.8:
            # Use sigmoid-like amplification that doesn't exceed 1.0
            amplification = 0.8 + (composite - 0.8) * 2.5  # Steeper curve above 0.8
            composite = min(1.0, amplification)
        elif composite <= 0.2:
            # Dampen very low scores slightly
            composite = composite * 0.9

        return min(1.0, max(0.0, composite))

    def generate_recommendation(
        self,
        composite_score: float,
        days_to_expiry: int,
        current_margin_percent: float,
        current_quantity: float = None,
    ) -> dict[str, Any]:
        """
        Generate enhanced AI-powered action recommendations
        """

        if days_to_expiry <= 0:
            return self._generate_expired_recommendation(
                days_to_expiry, current_margin_percent, current_quantity
            )

        # Critical urgency - immediate action required
        if composite_score >= 0.8:
            discount = min(50, max(20, int(composite_score * 60)))
            # Don't discount below cost price
            max_discount = max(0, int(current_margin_percent * 0.8))
            discount = min(discount, max_discount)

            return {
                "action": "discount_aggressive",
                "discount_percent": discount,
                "urgency": "critical",
                "reason": f"Critical urgency score: {composite_score:.2f}. Immediate action required.",
                "priority": 2,
                "estimated_time_to_act": "< 4 hours",
            }

        # High urgency - action needed soon
        elif composite_score >= 0.6:
            discount = min(30, max(10, int(composite_score * 40)))
            max_discount = max(0, int(current_margin_percent * 0.6))
            discount = min(discount, max_discount)

            return {
                "action": "discount_moderate",
                "discount_percent": discount,
                "urgency": "high",
                "reason": f"High urgency score: {composite_score:.2f}. Action needed within 24 hours.",
                "priority": 3,
                "estimated_time_to_act": "< 24 hours",
            }

        # Medium urgency - monitor closely
        elif composite_score >= 0.4:
            return {
                "action": "alert",
                "urgency": "medium",
                "reason": f"Medium urgency score: {composite_score:.2f}. Monitor closely for changes.",
                "discount_percent": 0,
                "priority": 4,
                "estimated_time_to_act": "< 48 hours",
            }

        # Low urgency - routine monitoring
        elif composite_score >= 0.2:
            return {
                "action": "monitor",
                "urgency": "low",
                "reason": f"Low urgency score: {composite_score:.2f}. Routine monitoring sufficient.",
                "discount_percent": 0,
                "priority": 5,
                "estimated_time_to_act": "< 1 week",
            }

        # No action needed
        else:
            return {
                "action": "maintain",
                "urgency": "none",
                "reason": f"Low score: {composite_score:.2f}. No action needed.",
                "discount_percent": 0,
                "priority": 6,
                "estimated_time_to_act": "none",
            }


class ScoringService:
    """
    Async service for batch scoring operations with database integration
    Enhanced with better error handling and performance optimizations
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.logger = structlog.get_logger().bind(component="scoring_service")

    async def get_category_weights(self, category: str) -> dict[str, float]:
        """Get category-specific weights from database with fallback"""
        try:
            # Import models here to avoid circular imports
            from app.database.models import CategoryWeight

            result = await self.db.execute(
                select(CategoryWeight).where(
                    and_(
                        CategoryWeight.category == category,
                        CategoryWeight.is_active,
                    )
                )
            )
            category_weight = result.scalar_one_or_none()

            if category_weight:
                return {
                    "expiry": float(category_weight.spoilage_risk_weight),
                    "velocity": float(category_weight.turnover_speed_weight),
                    "margin": float(category_weight.value_impact_weight),
                }
            else:
                # Return default weights from config
                return get_scoring_weights(category)

        except Exception as e:
            self.logger.error(
                "Error getting category weights", category=category, error=str(e)
            )
            return get_scoring_weights()  # Fallback to default

    async def calculate_days_to_expiry(self, expiry_date: date) -> int:
        """Calculate days until expiry"""
        if isinstance(expiry_date, str):
            expiry_date = datetime.fromisoformat(expiry_date).date()
        elif isinstance(expiry_date, datetime):
            expiry_date = expiry_date.date()

        today = datetime.utcnow().date()
        delta = expiry_date - today
        return delta.days

    async def estimate_daily_sales(
        self, product_id: str, category: str, store_id: str, batch_id: str = None
    ) -> float:
        """
        Enhanced daily sales estimation with proper product relationship queries
        Fixed: Use actual product category relationships instead of SKU string matching
        """
        try:
            # Import models here to avoid circular imports
            from app.database.inventory_models import Product
            from app.database.models import Batch, SalesEvent

            # Try to get actual sales data for this specific batch
            if batch_id:
                result = await self.db.execute(
                    select(func.avg(SalesEvent.quantity_sold)).where(
                        and_(
                            SalesEvent.batch_id == batch_id,
                            SalesEvent.sale_timestamp
                            >= datetime.utcnow() - timedelta(days=30),
                        )
                    )
                )
                avg_sales = result.scalar()
                if avg_sales and avg_sales > 0:
                    return float(avg_sales)

            # Try to get sales data for similar products in the same category
            # FIX: Use proper JOIN with Products table instead of SKU string matching
            result = await self.db.execute(
                select(func.avg(SalesEvent.quantity_sold))
                .select_from(SalesEvent.join(Batch).join(Product))
                .where(
                    and_(
                        SalesEvent.store_id == store_id,
                        Product.category == category,
                        SalesEvent.sale_timestamp
                        >= datetime.utcnow() - timedelta(days=30),
                    )
                )
            )
            avg_sales = result.scalar()
            if avg_sales and avg_sales > 0:
                return float(avg_sales)

            # If no batch-level data, try product-level sales for same category
            result = await self.db.execute(
                select(func.avg(SalesEvent.quantity_sold))
                .select_from(SalesEvent.join(Batch).join(Product))
                .where(
                    and_(
                        SalesEvent.store_id == store_id,
                        Product.category == category,
                        SalesEvent.sale_timestamp
                        >= datetime.utcnow() - timedelta(days=90),  # Wider time window
                    )
                )
            )
            avg_sales = result.scalar()
            if avg_sales and avg_sales > 0:
                return float(avg_sales)

            # Fallback to category-based estimates
            category_velocities = {
                "fresh_produce": 4.0,
                "dairy": 2.5,
                "bakery_fresh": 3.0,
                "fresh_meat_fish": 1.5,
                "frozen": 1.0,
                "canned_jarred": 0.5,
                "dry_goods": 0.8,
                "beverages": 2.0,
                "deli_prepared": 2.5,
                "spices_condiments": 0.3,
            }

            return category_velocities.get(category, 1.0)

        except Exception as e:
            self.logger.error(
                "Error estimating daily sales",
                product_id=product_id,
                category=category,
                error=str(e),
            )
            return 1.0  # Conservative fallback

    async def score_batch(
        self, batch_id: str, category_weights: dict[str, float] = None, track_recommendation: bool = True
    ) -> Optional[ScoringResult]:
        """Score a single batch with enhanced error handling - SECURE READ-ONLY VERSION"""
        try:
            # Import secure read-only operations
            from app.database.read_only_operations import get_read_only_operations

            # Get read-only operations instance
            read_ops = get_read_only_operations(self.db)

            # Get batch data using secure read-only view
            batch_data = await read_ops.get_batch_for_scoring(batch_id)

            if not batch_data:
                self.logger.error("Batch not found", batch_id=batch_id)
                return None

            # Calculate days to expiry from batch data
            days_to_expiry = batch_data["days_to_expiry"]

            # Get category weights (use provided or fetch from DB)
            if not category_weights:
                category_weights = await read_ops.get_category_weights(
                    batch_data["category"]
                )

            # Create scorer with category-specific weights
            scorer = InventoryScorer(category=batch_data["category"])

            # Get sales velocity data
            velocity_data = await read_ops.get_sales_velocity_data(
                batch_data["store_id"], batch_data["product_id"], days=30
            )
            daily_sales = velocity_data.get("avg_daily_sales", 1.0)

            # Calculate individual scores
            expiry_score = scorer.calculate_expiry_score(
                days_to_expiry, batch_data["typical_shelf_life_days"]
            )

            velocity_score = scorer.calculate_velocity_score(
                batch_data["current_quantity"],
                daily_sales,
                days_to_expiry,
                batch_data["category"],
            )

            margin_percent = (
                (batch_data["selling_price"] - batch_data["cost_price"])
                / batch_data["selling_price"]
            ) * 100
            margin_score = scorer.calculate_margin_score(
                batch_data["cost_price"],
                batch_data["selling_price"],
                days_to_expiry,
                batch_data["category"],
            )

            # Calculate composite score
            composite_score = scorer.calculate_composite_score(
                expiry_score, velocity_score, margin_score, category_weights
            )

            # Generate recommendation
            recommendation = scorer.generate_recommendation(
                composite_score,
                days_to_expiry,
                margin_percent,
                float(batch_data["current_quantity"]),
            )

            # Determine urgency level
            urgency_level = self._get_urgency_level(days_to_expiry, composite_score)

            # Create result
            result = ScoringResult(
                batch_id=batch_data["batch_id"],
                sku=batch_data["sku"],
                product_name=batch_data.get("product_name", "Unknown"),
                category=batch_data["category"],
                expiry_score=expiry_score,
                velocity_score=velocity_score,
                margin_score=margin_score,
                composite_score=composite_score,
                recommendation=recommendation["action"],
                urgency_level=urgency_level,
                discount_percent=recommendation.get("discount_percent", 0),
                reason=recommendation["reason"],
                confidence_level=1.0,  # Rule-based scoring has high confidence
                ml_enhanced=False,
                calculated_at=datetime.utcnow(),
                days_to_expiry=days_to_expiry,
                current_quantity=batch_data["current_quantity"],
                potential_loss=batch_data["current_quantity"]
                * batch_data["selling_price"],
                margin_percent=margin_percent,
            )

            # Track AI recommendation in database for analytics
            if track_recommendation:
                try:
                    await self._track_recommendation(result, batch_data.get("store_id"))
                except Exception as e:
                    self.logger.warning("Failed to track recommendation", error=str(e))

            return result

        except Exception as e:
            self.logger.error("Error scoring batch", batch_id=batch_id, error=str(e))
            return None

    def _get_urgency_level(self, days_to_expiry: int, composite_score: float) -> str:
        """Determine urgency level based on days to expiry and score"""
        if days_to_expiry <= 0 or composite_score >= 0.9:
            return "critical"
        elif days_to_expiry <= 1 or composite_score >= 0.8:
            return "high"
        elif days_to_expiry <= 3 or composite_score >= 0.6:
            return "medium"
        elif days_to_expiry <= 7 or composite_score >= 0.4:
            return "low"
        else:
            return "none"

    async def score_store_inventory(
        self, store_id: str, recalculate_all: bool = False
    ) -> dict[str, Any]:
        """Score all active batches for a store with enhanced performance - SECURE READ-ONLY VERSION"""
        start_time = datetime.utcnow()

        try:
            # Import secure read-only operations
            from app.database.read_only_operations import get_read_only_operations

            # Get read-only operations instance
            read_ops = get_read_only_operations(self.db)

            # Get inventory data for scoring using secure read-only view
            inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

            if not inventory_data:
                self.logger.warning(
                    "No inventory data found for store", store_id=store_id
                )
                return {
                    "store_id": store_id,
                    "total_items": 0,
                    "processed": 0,
                    "high_priority_count": 0,
                    "results": [],
                    "errors": [],
                    "processing_time_ms": 0,
                }

            # Filter for batches that need scoring (if not recalculating all)
            batch_ids = [item["batch_id"] for item in inventory_data]

            # Score each batch
            results = []
            errors = []
            high_priority_count = 0

            for batch_id in batch_ids:
                score_result = await self.score_batch(batch_id)
                if score_result:
                    results.append(score_result)
                    if score_result.composite_score >= 0.6:
                        high_priority_count += 1
                else:
                    errors.append(f"Failed to score batch {batch_id}")

            # Save all score results to database using secure write operation
            if results:
                scores_data = []
                for result in results:
                    scores_data.append(
                        {
                            "batch_id": result.batch_id,
                            "store_id": store_id,
                            "expiry_score": result.expiry_score,
                            "velocity_score": result.velocity_score,
                            "margin_score": result.margin_score,
                            "composite_score": result.composite_score,
                            "recommendation": result.recommendation,
                            "urgency_level": result.urgency_level,
                            "discount_percent": result.discount_percent,
                            "reason": result.reason,
                            "ml_enhanced": result.ml_enhanced,
                            "confidence_level": result.confidence_level,
                            "calculated_at": result.calculated_at,
                        }
                    )

                # Use secure write operation for scores only
                await read_ops.store_score_results(scores_data)

            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            self.logger.info(
                "Store inventory scoring completed",
                store_id=store_id,
                total_batches=len(batch_ids),
                processed=len(results),
                high_priority=high_priority_count,
                processing_time_ms=processing_time,
            )

            return {
                "store_id": store_id,
                "total_items": len(batch_ids),
                "processed": len(results),
                "high_priority_count": high_priority_count,
                "results": results,
                "errors": errors,
                "processing_time_ms": processing_time,
            }

        except Exception as e:
            await self.db.rollback()
            self.logger.error(
                "Error scoring store inventory", store_id=store_id, error=str(e)
            )
            return {
                "store_id": store_id,
                "total_items": 0,
                "processed": 0,
                "high_priority_count": 0,
                "results": [],
                "errors": [str(e)],
                "processing_time_ms": 0,
            }

    async def _save_score_result(self, result: ScoringResult):
        """Save scoring result to database"""
        try:
            from app.database.models import ProductScore

            # Delete existing score for this batch
            await self.db.execute(
                ProductScore.__table__.delete().where(
                    ProductScore.batch_id == result.batch_id
                )
            )

            # Insert new score
            score = ProductScore(
                batch_id=result.batch_id,
                store_id=result.store_id,
                expiry_score=Decimal(str(result.expiry_score)),
                velocity_score=Decimal(str(result.velocity_score)),
                margin_score=Decimal(str(result.margin_score)),
                composite_score=Decimal(str(result.composite_score)),
                recommendation=result.recommendation,
                urgency_level=result.urgency_level,
                discount_percent=result.discount_percent,
                reason=result.reason,
                ml_enhanced=result.ml_enhanced,
                confidence_level=Decimal(str(result.confidence_level)),
                calculated_at=result.calculated_at,
            )

            self.db.add(score)

        except Exception as e:
            self.logger.error(
                "Error saving score result", batch_id=result.batch_id, error=str(e)
            )
            raise

    async def _track_recommendation(self, result: ScoringResult, store_id: Optional[str] = None):
        """Track AI recommendation for analytics"""
        try:
            from app.services.action_tracking import ActionTrackingService

            tracker = ActionTrackingService(self.db)

            # Map scoring recommendation to database enum
            db_action = tracker.map_scoring_action_to_enum(result.recommendation)

            # Create recommendation record
            await tracker.create_recommendation_record(
                batch_id=result.batch_id,
                store_id=store_id or result.store_id,
                ai_recommendation=db_action,
                ai_score=result.composite_score,
                user_id=None,  # System-generated recommendation
            )

        except Exception as e:
            # Don't let tracking errors break the scoring
            self.logger.warning("Failed to track AI recommendation", error=str(e))


# Factory function for easy instantiation
def create_scoring_service(db: AsyncSession) -> ScoringService:
    """Create a scoring service instance"""
    return ScoringService(db)
