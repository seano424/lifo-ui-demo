"""
Inventory scoring engine with ML-ready architecture
Contains all scoring logic and algorithms
"""

from typing import Any

import structlog

from app.core.config import get_scoring_weights

from .models import ScoringWeights

logger = structlog.get_logger()


class InventoryScorer:
    """
    Enhanced inventory scoring engine with ML-ready architecture
    Calculates urgency scores based on multiple factors
    """

    def __init__(
        self, weights: ScoringWeights | None = None, category: str | None = None
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
        self, days_to_expiry: int, category: str | None = None
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
            category or "general", {"immediate": -7, "urgent": -30, "moderate": -90}
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
        self, margin_percent: float, days_to_expiry: int, category: str | None = None
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

        base_recovery = category_recovery_potential.get(category or "general", 0.5)

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
        current_quantity: float | None = None,
    ) -> dict[str, Any]:
        """
        Generate EU-compliant recommendations for expired products
        All expired products must be disposed for legal compliance
        """
        return {
            "action": "dispose",
            "urgency": "critical",
            "reason": "product expired",
            "discount_percent": 0,
            "priority": 1,
        }

    def calculate_velocity_score(
        self,
        current_quantity: float,
        avg_daily_sales: float,
        days_to_expiry: int,
        category: str | None = None,
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
        category: str | None = None,
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
        category_weights: dict[str, float] | None = None,
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
        current_quantity: float | None = None,
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
