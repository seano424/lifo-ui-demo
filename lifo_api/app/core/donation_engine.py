"""Simplified Donation Decision Engine.

Integrates with simple action tracking system (migration 017).
Provides basic donation recommendations based on expiry and scoring.
"""

from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any

import structlog
from pydantic import BaseModel, Field

from app.database.inventory_models import (
    ActionType,
    DonationRecipientType,
)

logger = structlog.get_logger()


class DonationPriority(Enum):
    """Priority levels for donation decisions.

    Attributes:
        CRITICAL: Must act within 24 hours
        HIGH: Should act within 48 hours
        MEDIUM: Can act within 1 week
        LOW: Optional action
    """

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SimpleActionRecommendation(BaseModel):
    """Simplified action recommendation matching migration 017 schema.

    Attributes:
        batch_id: Unique identifier for the batch
        recommended_action: The recommended action to take
        priority: Priority level for the action
        ai_score: 0.0-1.0 score that triggered the recommendation
        quantity_affected: Amount of product affected
        notes: Simple reasoning for the recommendation
        original_value: Original monetary value of the batch
        estimated_recovered_value: Expected value after action
        recommended_action_by: Deadline for taking action
        suggested_recipient_types: Suitable donation recipients
        decision_factors: List of factors that influenced the decision
        urgency_reason: Explanation for the urgency level
    """

    batch_id: str
    recommended_action: ActionType
    priority: DonationPriority
    ai_score: float = Field(ge=0.0, le=1.0, description="AI score 0.0-1.0")

    # Simple tracking details
    quantity_affected: float = Field(ge=0.0)
    notes: str = Field(description="Simple reasoning for the recommendation")

    # Financial tracking (for ROI calculations)
    original_value: float = Field(ge=0.0)
    estimated_recovered_value: float

    # Timing
    recommended_action_by: datetime

    # Donation specifics (when applicable)
    suggested_recipient_types: list[DonationRecipientType]

    # Simple reasoning
    decision_factors: list[str]
    urgency_reason: str


class SimplifiedDonationEngine:
    """Simplified donation decision engine for migration 017 implementation.

    Focuses on basic action recommendations without complex EU compliance.
    Provides donation-first logic with European pilot adjustments.
    """

    def __init__(self) -> None:
        """Initialize the simplified donation engine."""
        self.logger = structlog.get_logger().bind(
            component="simplified_donation_engine"
        )

        # Simplified business configuration
        self.action_thresholds = {
            "discount_margin_threshold": 20.0,  # % - above this, try discount before donation
            "min_quantity_for_donation": 1.0,  # Minimum quantity worth donating
            "critical_days_threshold": 1,  # Days to expiry for critical action
            "high_priority_days_threshold": 3,  # Days to expiry for high priority
        }

        # Category-specific donation suitability
        self.donation_suitable_categories = {
            "fresh_produce",
            "bakery_fresh",
            "dry_goods",
            "canned_jarred",
            "beverages",
            "spices_condiments",
            "dairy",  # Added dairy - suitable for donation with proper handling
        }

        # Categories requiring special handling
        self.special_handling_categories = {
            "fresh_meat_fish",
            "dairy",
            "deli_prepared",
            "frozen",
        }

    def evaluate_action_recommendation(
        self,
        batch_data: dict[str, Any],
        ai_score: float,
        store_donation_config: dict[str, Any] | None = None,
    ) -> SimpleActionRecommendation:
        """Evaluate action recommendation based on simplified criteria.

        Args:
            batch_data: Batch information including expiry, pricing, quantity
            ai_score: LIFO AI score that triggered the evaluation (0.0-1.0)
            store_donation_config: Optional store donation configuration

        Returns:
            Simple action recommendation matching migration 017 schema

        Raises:
            ValueError: If batch_data is missing required fields
            TypeError: If ai_score is not a valid float
        """
        try:
            # Extract key data
            category = batch_data.get("category", "dry_goods")
            expiry_date = batch_data.get("expiry_date")
            if isinstance(expiry_date, str):
                expiry_date = datetime.fromisoformat(expiry_date).date()
            elif isinstance(expiry_date, datetime):
                expiry_date = expiry_date.date()

            cost_price = float(batch_data.get("cost_price", 0))
            selling_price = float(batch_data.get("selling_price", 0))
            current_quantity = float(batch_data.get("current_quantity", 0))

            # Calculate days to expiry
            days_to_expiry = (expiry_date - date.today()).days if expiry_date else 0

            # Calculate financial metrics
            margin_percent = (
                ((selling_price - cost_price) / selling_price) * 100
                if selling_price > 0
                else 0
            )
            original_value = current_quantity * selling_price

            # Make simple action decision with store preferences
            action_analysis = self._determine_simple_action(
                category=category,
                days_to_expiry=days_to_expiry,
                margin_percent=margin_percent,
                ai_score=ai_score,
                current_quantity=current_quantity,
                store_donation_config=store_donation_config,
            )

            # Calculate estimated recovered value
            recovered_value = self._calculate_simple_recovery_value(
                original_value=original_value,
                action=action_analysis["action"],
                margin_percent=margin_percent,
            )

            # Determine timing and priority
            timing_analysis = self._determine_simple_timing(
                days_to_expiry=days_to_expiry,
                action=action_analysis["action"],
            )

            # Get suggested recipient types for donations
            recipient_types = self._get_suitable_recipients(category)

            # Create recommendation
            recommendation = SimpleActionRecommendation(
                batch_id=batch_data.get("batch_id", "unknown"),
                recommended_action=action_analysis["action"],
                priority=timing_analysis["priority"],
                ai_score=ai_score,
                quantity_affected=current_quantity,
                notes=action_analysis["reasoning"],
                original_value=original_value,
                estimated_recovered_value=recovered_value,
                recommended_action_by=timing_analysis["action_by"],
                suggested_recipient_types=recipient_types,
                decision_factors=action_analysis["factors"],
                urgency_reason=timing_analysis["urgency_reason"],
            )

            self.logger.info(
                "Action recommendation generated",
                batch_id=batch_data.get("batch_id"),
                action=action_analysis["action"].value,
                priority=timing_analysis["priority"].value,
                ai_score=ai_score,
                days_to_expiry=days_to_expiry,
            )

            return recommendation

        except Exception as e:
            self.logger.error(
                "Action recommendation failed",
                batch_id=batch_data.get("batch_id"),
                error=str(e),
            )

            # Return safe fallback recommendation
            return self._create_simple_fallback_recommendation(
                batch_data, str(e)
            )

    def _determine_simple_action(
        self,
        category: str,
        days_to_expiry: int,
        margin_percent: float,
        ai_score: float,
        current_quantity: float,
        store_donation_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Determine action using donation-first approach with store preferences.

        Args:
            category: Product category code
            days_to_expiry: Days until product expires
            margin_percent: Profit margin as percentage
            ai_score: AI urgency score (0.0-1.0)
            current_quantity: Current stock quantity
            store_donation_config: Optional store donation configuration

        Returns:
            Dictionary containing action, reasoning, and decision factors
        """

        factors: list[str] = []

        # Extract store donation preferences with defaults
        donation_config = store_donation_config or {}
        strategy = donation_config.get("strategy", "balanced")
        # Get threshold for donation decisions (currently unused but may be needed)
        _donation_first_threshold = donation_config.get(
            "donation_first_threshold", 0.6
        )
        force_donation_categories = donation_config.get(
            "force_donation_categories", []
        )
        min_margin_for_discount = donation_config.get(
            "min_margin_for_discount", 5.0
        )

        # CRITICAL: Check for bulk quantity vs velocity mismatch
        # More realistic daily sales estimation based on quantity ranges
        if current_quantity <= 20:
            # Small quantities - good turnover expected
            estimated_daily_sales = max(1.0, current_quantity * 0.15)
        elif current_quantity <= 50:
            # Medium quantities - moderate turnover, category-dependent
            if category in ["specialty_items"]:
                # Specialty items sell much slower
                estimated_daily_sales = max(0.3, current_quantity * 0.02)
            else:
                estimated_daily_sales = max(0.8, current_quantity * 0.08)
        elif current_quantity <= 100:
            # Large quantities - slower turnover
            estimated_daily_sales = max(0.5, current_quantity * 0.05)
        else:
            # Bulk quantities - very slow turnover, especially for specialty
            if category in ["specialty_items", "dry_goods"]:
                # Even slower for specialty/bulk items
                estimated_daily_sales = max(0.5, current_quantity * 0.005)
            else:
                # General bulk items
                estimated_daily_sales = max(1.0, current_quantity * 0.01)

        sellout_days = current_quantity / estimated_daily_sales

        # BULK QUANTITY OVERRIDE - If sellout time > expiry time, act
        # Focus on bulk quantities (20+) or medium with severe time pressure
        is_bulk_quantity = (
            current_quantity >= 20 or (
                current_quantity >= 15
                and days_to_expiry <= 2
                and sellout_days > days_to_expiry * 2
            )
        )
        if sellout_days > days_to_expiry and is_bulk_quantity:
            if category in self.donation_suitable_categories:
                reasoning = (
                    f"Bulk quantity ({current_quantity:.0f} units) will "
                    f"expire before sellout ({sellout_days:.0f} days needed "
                    f"vs {days_to_expiry} available) - donation recommended"
                )
                return {
                    "action": ActionType.DONATE,
                    "reasoning": reasoning,
                    "factors": [
                        "Bulk quantity mismatch",
                        f"Sellout time: {sellout_days:.0f} days",
                        f"Expiry time: {days_to_expiry} days"
                    ]
                }
            elif margin_percent > 30:  # European threshold
                reasoning = (
                    f"Bulk quantity with good margin ({margin_percent:.1f}%) - "
                    f"discount to accelerate sales before expiry"
                )
                return {
                    "action": ActionType.DISCOUNT,
                    "reasoning": reasoning,
                    "factors": [
                        "Bulk quantity with decent margin",
                        "Accelerated clearance needed"
                    ]
                }
            else:
                reasoning = (
                    "Bulk quantity with low margin - donation avoids disposal "
                    "costs and provides tax benefit"
                )
                return {
                    "action": ActionType.DONATE,
                    "reasoning": reasoning,
                    "factors": [
                        "Bulk quantity with low margin",
                        "Disposal cost avoidance"
                    ]
                }

        # Store preference thresholds for donation recommendation (European pilot adjusted)
        donation_thresholds = {
            "donation_first": 0.4,    # Aggressive donation preference
            "balanced": 0.6,          # Standard threshold
            "discount_first": 0.8     # Conservative donation approach
        }

        donation_threshold = donation_thresholds.get(strategy, 0.6)

        # European pilot adjustment - lower tax benefits but higher disposal costs
        # Donation becomes viable at higher margins due to disposal cost avoidance
        european_disposal_threshold = 35.0  # Donate if margin ≤35% (vs US 20%)

        # Primary decision logic with donation-first approach
        if days_to_expiry <= 0:
            action = ActionType.DISPOSE
            reasoning = "Product has expired and must be disposed of (EU compliance)"
            factors.append("Expired product - legal requirement")

        elif days_to_expiry <= self.action_thresholds["critical_days_threshold"]:
            # Critical timing (1 day) - donation-first logic

            if category in force_donation_categories:
                action = ActionType.DONATE
                reasoning = "Store policy: forced donation for this category"
                factors.append("Force donation category")
            elif ai_score >= donation_threshold and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"Donation-first approach: AI score {ai_score:.2f} exceeds threshold for {strategy} strategy"
                factors.append(f"Donation suitable (threshold: {donation_threshold})")
            elif margin_percent > 40.0:  # European threshold - higher margin needed for discount
                action = ActionType.DISCOUNT
                reasoning = f"High margin ({margin_percent:.1f}%) allows profitable discounting (European threshold)"
                factors.append("High margin enables discount")
            elif margin_percent <= european_disposal_threshold and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"Margin {margin_percent:.1f}% ≤ {european_disposal_threshold}% - donation avoids European disposal costs"
                factors.append("European disposal cost avoidance")
            else:
                action = ActionType.DISCOUNT
                reasoning = "Special handling category - discount before disposal"
                factors.append("Special handling - discount fallback")

            factors.append(f"Critical timing: expires in {days_to_expiry} day(s)")

        elif days_to_expiry <= self.action_thresholds["high_priority_days_threshold"]:
            # High priority (2-3 days) - donation planning window

            if category in force_donation_categories:
                action = ActionType.DONATE
                reasoning = "Store policy: forced donation for this category"
                factors.append("Force donation category")
            elif margin_percent > 40.0:  # Check margin FIRST for European thresholds
                action = ActionType.DISCOUNT
                reasoning = f"High margin ({margin_percent:.1f}%) enables profitable discounting (European threshold)"
                factors.append("European high margin discount opportunity")
            elif ai_score >= donation_threshold and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"Good donation timing with {strategy} strategy (score: {ai_score:.2f})"
                factors.append("Perfect donation planning window")
            elif margin_percent <= european_disposal_threshold and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"Margin {margin_percent:.1f}% ≤ {european_disposal_threshold}% - donation preferred over unprofitable discount"
                factors.append("European disposal cost threshold")
            elif ai_score >= 0.6 and margin_percent > 35.0:  # European adjusted
                action = ActionType.DISCOUNT
                reasoning = "High AI score with good margin - discount recommended (European threshold)"
                factors.append(f"High urgency score ({ai_score:.2f})")
            elif ai_score >= 0.5 and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"Moderate AI score ({ai_score:.2f}) with donation-suitable category"
                factors.append("Donation suitable category with moderate urgency")
            else:
                action = ActionType.MAINTAIN
                reasoning = "Monitor closely - prepare for action"
                factors.append(f"Moderate urgency (score: {ai_score:.2f})")

            factors.append(f"High priority: expires in {days_to_expiry} days")

        elif days_to_expiry <= 7:
            # Medium priority (4-7 days) - donation preparation phase

            if strategy == "donation_first" and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = "Donation-first store: prepare donation pickup"
                factors.append("Advance donation planning")
            elif ai_score >= donation_threshold and category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = f"AI score ({ai_score:.2f}) exceeds {strategy} threshold with donation-suitable category"
                factors.append("Good donation opportunity")
            elif ai_score >= 0.6 and margin_percent > 15.0:
                action = ActionType.DISCOUNT
                reasoning = "Medium urgency with decent margin"
                factors.append(f"Medium urgency (score: {ai_score:.2f})")
            elif margin_percent <= min_margin_for_discount and ai_score >= 0.4:
                action = ActionType.DONATE
                reasoning = f"Low margin ({margin_percent:.1f}%) with moderate urgency - donation preferred"
                factors.append("Low margin favors donation")
            else:
                action = ActionType.MAINTAIN
                reasoning = "Monitor product - no immediate action needed"
                factors.append("Low urgency")

            factors.append(f"Medium priority: expires in {days_to_expiry} days")

        else:
            # Long-term (8+ days) - minimal urgency
            if strategy == "donation_first" and ai_score >= 0.4:
                action = ActionType.MAINTAIN
                reasoning = "Donation-first store: monitor for donation opportunities"
                factors.append("Future donation planning")
            elif ai_score >= 0.7:
                action = ActionType.DISCOUNT
                reasoning = "AI suggests proactive discounting despite long shelf life"
                factors.append(f"Elevated AI score ({ai_score:.2f})")
            else:
                action = ActionType.MAINTAIN
                reasoning = "No immediate action needed - continue normal sales"
                factors.append("Normal sales conditions")

            factors.append(f"Low urgency: expires in {days_to_expiry} days")

        # Quantity considerations
        if (
            current_quantity < self.action_thresholds["min_quantity_for_donation"]
            and action == ActionType.DONATE
        ):
            action = ActionType.DISCOUNT
            reasoning = "Quantity too small for efficient donation - discount instead"
            factors.append("Small quantity")

        return {
            "action": action,
            "reasoning": reasoning,
            "factors": factors,
        }

    def _calculate_simple_recovery_value(
        self,
        original_value: float,
        action: ActionType,
        margin_percent: float,
    ) -> float:
        """Calculate estimated recovered value based on action.

        Args:
            original_value: Original monetary value of the product
            action: The recommended action type
            margin_percent: Profit margin as percentage

        Returns:
            Estimated recovered value after taking the action
        """

        if action == ActionType.DISCOUNT:
            # Assume discount will recover 60-80% of value depending on margin
            if margin_percent > 30:
                return original_value * 0.8  # High margin - can afford bigger discount
            elif margin_percent > 15:
                return original_value * 0.7  # Medium margin
            else:
                return original_value * 0.6  # Low margin - limited discount ability

        elif action == ActionType.DONATE:
            # Tax benefit estimated at 60% of cost basis (German tax law)
            cost_basis = original_value * (1 - margin_percent / 100)
            return cost_basis * 0.6

        elif action == ActionType.DISPOSE:
            # Disposal costs money
            return -original_value * 0.1  # Negative value for disposal costs

        else:  # MAINTAIN or IGNORED
            # Assume normal sales will eventually recover most value
            return original_value * 0.9

    def _determine_simple_timing(
        self,
        days_to_expiry: int,
        action: ActionType,
    ) -> dict[str, Any]:
        """Determine timing and priority for simple actions.

        Args:
            days_to_expiry: Days until product expires
            action: The recommended action type

        Returns:
            Dictionary with priority, action_by datetime, and urgency reason
        """

        now = datetime.now()

        if days_to_expiry <= 0:
            priority = DonationPriority.CRITICAL
            action_by = now + timedelta(hours=2)  # Immediate action required
            urgency_reason = "Product has expired - immediate disposal required"

        elif days_to_expiry <= self.action_thresholds["critical_days_threshold"]:
            priority = DonationPriority.CRITICAL
            action_by = now + timedelta(hours=6)  # Within 6 hours
            urgency_reason = "Product expires within 24 hours - urgent action needed"

        elif days_to_expiry <= self.action_thresholds["high_priority_days_threshold"]:
            if action == ActionType.DONATE:
                priority = DonationPriority.HIGH
                action_by = now + timedelta(hours=24)  # Within 24 hours
                urgency_reason = "Good donation opportunity - act within 24 hours"
            else:
                priority = DonationPriority.HIGH
                action_by = now + timedelta(hours=12)  # Within 12 hours
                urgency_reason = "Product expires soon - timely action recommended"

        else:
            if action == ActionType.DISCOUNT:
                priority = DonationPriority.MEDIUM
                action_by = now + timedelta(days=1)
                urgency_reason = "Proactive discounting recommended"
            else:
                priority = DonationPriority.LOW
                action_by = now + timedelta(days=2)
                urgency_reason = "Monitor and reassess"

        return {
            "priority": priority,
            "action_by": action_by,
            "urgency_reason": urgency_reason,
        }

    def _get_suitable_recipients(
        self, category: str
    ) -> list[DonationRecipientType]:
        """Get suitable recipient types for a product category.

        Args:
            category: Product category code

        Returns:
            List of suitable donation recipient types
        """

        # Base recipients suitable for most categories
        base_recipients = [
            DonationRecipientType.FOOD_BANK,
            DonationRecipientType.CHARITY,
            DonationRecipientType.COMMUNITY_GROUP,
        ]

        # Special handling categories have limited recipients
        if category in self.special_handling_categories:
            return [DonationRecipientType.FOOD_BANK]  # Only certified food banks

        # Fresh produce can go to more recipients
        if category == "fresh_produce":
            return base_recipients + [
                DonationRecipientType.SOUP_KITCHEN,
                DonationRecipientType.ANIMAL_SHELTER,
                DonationRecipientType.SCHOOL,
            ]

        # Bakery items are popular with many recipients
        if category == "bakery_fresh":
            return base_recipients + [
                DonationRecipientType.SOUP_KITCHEN,
                DonationRecipientType.ELDERLY_CARE,
                DonationRecipientType.HOMELESS_SHELTER,
            ]

        return base_recipients

    def _create_simple_fallback_recommendation(
        self,
        batch_data: dict[str, Any],
        error: str
    ) -> SimpleActionRecommendation:
        """Create safe fallback recommendation when evaluation fails.

        Args:
            batch_data: Original batch data that caused the error
            error: Error message describing what went wrong

        Returns:
            Safe fallback recommendation for manual review
        """

        return SimpleActionRecommendation(
            batch_id=batch_data.get("batch_id", "unknown"),
            recommended_action=ActionType.MAINTAIN,
            priority=DonationPriority.LOW,
            ai_score=0.0,
            quantity_affected=float(batch_data.get("current_quantity", 0)),
            notes=f"Automated evaluation failed: {error}. Manual review required.",
            original_value=0.0,
            estimated_recovered_value=0.0,
            recommended_action_by=datetime.now() + timedelta(hours=24),
            suggested_recipient_types=[],
            decision_factors=[f"System error: {error}"],
            urgency_reason="Manual evaluation required due to system error",
        )


def create_simplified_donation_engine() -> SimplifiedDonationEngine:
    """Create simplified donation decision engine instance.

    Returns:
        Configured SimplifiedDonationEngine instance
    """
    return SimplifiedDonationEngine()
