"""
Simplified Donation Decision Engine
Integrates with simple action tracking system (migration 017)
Provides basic donation recommendations based on expiry and scoring
"""

from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any

import structlog
from pydantic import BaseModel

from app.database.inventory_models import ActionType, DonationRecipientType

logger = structlog.get_logger()


class DonationPriority(Enum):
    """Priority levels for donation decisions"""

    CRITICAL = "critical"  # Must act within 24 hours
    HIGH = "high"  # Should act within 48 hours
    MEDIUM = "medium"  # Can act within 1 week
    LOW = "low"  # Optional action


class SimpleActionRecommendation(BaseModel):
    """Simplified action recommendation matching migration 017 schema"""

    batch_id: str
    recommended_action: ActionType
    priority: DonationPriority
    ai_score: float  # 0.0-1.0 score that triggered the recommendation

    # Simple tracking details
    quantity_affected: float
    notes: str  # Simple reasoning for the recommendation

    # Financial tracking (for ROI calculations)
    original_value: float
    estimated_recovered_value: float  # Expected value after action

    # Timing
    recommended_action_by: datetime

    # Donation specifics (when applicable)
    suggested_recipient_types: list[DonationRecipientType]

    # Simple reasoning
    decision_factors: list[str]
    urgency_reason: str


class SimplifiedDonationEngine:
    """
    Simplified donation decision engine matching migration 017 implementation
    Focuses on basic action recommendations without complex EU compliance
    """

    def __init__(self):
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
    ) -> SimpleActionRecommendation:
        """
        Evaluate action recommendation based on simplified criteria

        Args:
            batch_data: Batch information including expiry, pricing, quantity
            ai_score: LIFO AI score that triggered the evaluation (0.0-1.0)

        Returns:
            Simple action recommendation matching migration 017 schema
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

            # Make simple action decision
            action_analysis = self._determine_simple_action(
                category=category,
                days_to_expiry=days_to_expiry,
                margin_percent=margin_percent,
                ai_score=ai_score,
                current_quantity=current_quantity,
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
            return self._create_simple_fallback_recommendation(batch_data, str(e))

    def _determine_simple_action(
        self,
        category: str,
        days_to_expiry: int,
        margin_percent: float,
        ai_score: float,
        current_quantity: float,
    ) -> dict[str, Any]:
        """Determine simple action based on basic business rules"""

        factors = []

        # Primary decision logic based on expiry and business factors
        if days_to_expiry <= 0:
            action = ActionType.DISPOSE
            reasoning = "Product has expired and must be disposed of"
            factors.append("Expired product")

        elif days_to_expiry <= self.action_thresholds["critical_days_threshold"]:
            # Very urgent - need immediate action
            if margin_percent > self.action_thresholds["discount_margin_threshold"]:
                action = ActionType.DISCOUNT
                reasoning = (
                    "High margin product expiring soon - try discount to recover value"
                )
                factors.append(f"High margin ({margin_percent:.1f}%)")
            elif category in self.donation_suitable_categories:
                action = ActionType.DONATE
                reasoning = "Low margin product expiring soon - donation provides tax benefit and social value"
                factors.append("Donation suitable category")
            else:
                action = ActionType.DISCOUNT
                reasoning = "Special handling category - try discount before disposal"
                factors.append("Special handling required")

            factors.append(f"Expires in {days_to_expiry} days - critical timing")

        elif days_to_expiry <= self.action_thresholds["high_priority_days_threshold"]:
            # Moderately urgent
            if ai_score >= 0.8:
                # High AI score suggests urgent action needed
                if margin_percent > self.action_thresholds["discount_margin_threshold"]:
                    action = ActionType.DISCOUNT
                    reasoning = "High AI score and good margin - apply discount to move inventory"
                    factors.append(f"High AI urgency score ({ai_score:.2f})")
                elif category in self.donation_suitable_categories:
                    action = ActionType.DONATE
                    reasoning = "High AI score but low margin - donation recommended"
                    factors.append("Low margin favors donation")
                else:
                    action = ActionType.DISCOUNT
                    reasoning = "High AI score - discount recommended for special handling category"
                    factors.append("Special handling category")
            else:
                action = ActionType.MAINTAIN
                reasoning = "Monitor closely but no immediate action needed"
                factors.append(f"Moderate AI score ({ai_score:.2f})")

            factors.append(f"Expires in {days_to_expiry} days")

        else:
            # Not urgent - based on AI score and business factors
            if ai_score >= 0.7:
                action = ActionType.DISCOUNT
                reasoning = "AI suggests proactive discounting"
                factors.append(f"Elevated AI score ({ai_score:.2f})")
            else:
                action = ActionType.MAINTAIN
                reasoning = "No immediate action needed - continue normal sales"
                factors.append("Normal sales conditions")

            factors.append(
                f"Expires in {days_to_expiry} days - planning time available"
            )

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
        """Calculate estimated recovered value based on action"""

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
        """Determine timing and priority for simple actions"""

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

    def _get_suitable_recipients(self, category: str) -> list[DonationRecipientType]:
        """Get suitable recipient types for a product category"""

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
        self, batch_data: dict[str, Any], error: str
    ) -> SimpleActionRecommendation:
        """Create safe fallback recommendation when evaluation fails"""

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


# Factory function for easy instantiation
def create_simplified_donation_engine() -> SimplifiedDonationEngine:
    """Create simplified donation decision engine instance"""
    return SimplifiedDonationEngine()
