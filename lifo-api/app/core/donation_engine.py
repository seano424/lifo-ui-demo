"""
Donation Decision Engine
Integrates EU food safety compliance with LIFO.AI scoring system
Provides intelligent donation recommendations based on EU regulations
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import structlog
from pydantic import BaseModel

from app.core.eu_food_safety import (
    DonationEligibility,
    EUComplianceResult,
    EUFoodSafetyValidator,
)
from app.core.scoring import InventoryScorer, ScoringResult

logger = structlog.get_logger()


class DonationDecision(Enum):
    """Decision outcomes for donation vs other actions"""

    DONATE_IMMEDIATELY = "donate_immediately"
    DONATE_SCHEDULED = "donate_scheduled"
    DISCOUNT_THEN_DONATE = "discount_then_donate"
    DISCOUNT_ONLY = "discount_only"
    DISPOSE = "dispose"
    MONITOR = "monitor"


class DonationPriority(Enum):
    """Priority levels for donation decisions"""

    CRITICAL = "critical"  # Must donate within 24 hours
    HIGH = "high"  # Should donate within 48 hours
    MEDIUM = "medium"  # Can donate within 1 week
    LOW = "low"  # Optional donation


class DonationRecommendation(BaseModel):
    """Complete donation recommendation with EU compliance"""

    batch_id: str
    decision: DonationDecision
    priority: DonationPriority
    confidence_score: float  # 0.0-1.0

    # EU compliance
    eu_compliant: bool
    compliance_result: EUComplianceResult

    # Financial analysis
    estimated_donation_value: float
    estimated_waste_cost_avoided: float
    estimated_tax_benefit: float
    opportunity_cost: float  # Cost of donating vs discounting

    # Timing
    recommended_action_by: datetime
    donation_window_expires: Optional[datetime]

    # Logistics
    preferred_recipient_types: List[str]
    handling_requirements: List[str]
    transport_instructions: List[str]

    # Alternative actions
    fallback_action: str
    fallback_reasoning: str

    # Reasoning
    decision_factors: List[str]
    risk_assessment: str
    business_impact: str


class DonationDecisionEngine:
    """
    Intelligent donation decision engine integrating EU compliance with business logic
    """

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="donation_engine")
        self.eu_validator = EUFoodSafetyValidator()
        self.scorer = InventoryScorer()

        # Business configuration for donation decisions
        self.donation_thresholds = {
            "min_margin_for_donation": 15.0,  # % - below this, always donate if EU compliant
            "max_margin_for_immediate_donation": 40.0,  # % - above this, consider discount first
            "min_quantity_for_donation": 1.0,  # Minimum quantity worth donating
            "max_discount_before_donation": 60.0,  # % - max discount before considering donation
        }

        # EU compliance integration weights
        self.decision_weights = {
            "eu_compliance": 0.4,  # EU compliance is highest priority
            "business_impact": 0.3,  # Business financial impact
            "urgency": 0.2,  # Time urgency factor
            "social_impact": 0.1,  # Social value consideration
        }

    def evaluate_donation_opportunity(
        self,
        batch_data: Dict[str, Any],
        scoring_result: Optional[ScoringResult] = None,
        current_temperature: Optional[float] = None,
        packaging_condition: str = "good",
    ) -> DonationRecommendation:
        """
        Evaluate donation opportunity with EU compliance and business logic

        Args:
            batch_data: Batch information including expiry, pricing, quantity
            scoring_result: Existing LIFO scoring result (optional)
            current_temperature: Current storage temperature
            packaging_condition: Condition of packaging

        Returns:
            Complete donation recommendation with reasoning
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
            days_to_expiry = (expiry_date - date.today()).days

            # Get EU compliance assessment
            compliance_result = self.eu_validator.validate_donation_eligibility(
                category=category,
                expiry_date=expiry_date,
                current_temperature=current_temperature,
                packaging_condition=packaging_condition,
            )

            # Calculate financial metrics
            margin_percent = (
                ((selling_price - cost_price) / selling_price) * 100
                if selling_price > 0
                else 0
            )
            total_value = current_quantity * selling_price

            # Get or calculate scoring result
            if not scoring_result:
                scoring_result = self._calculate_quick_score(batch_data, days_to_expiry)

            # Make donation decision based on multiple factors
            decision_analysis = self._analyze_donation_vs_alternatives(
                compliance_result=compliance_result,
                margin_percent=margin_percent,
                days_to_expiry=days_to_expiry,
                total_value=total_value,
                scoring_result=scoring_result,
                current_quantity=current_quantity,
            )

            # Calculate financial impacts
            financial_analysis = self._calculate_financial_impact(
                cost_price=cost_price,
                selling_price=selling_price,
                current_quantity=current_quantity,
                margin_percent=margin_percent,
                decision=decision_analysis["decision"],
            )

            # Determine timing and priority
            timing_analysis = self._determine_timing_and_priority(
                compliance_result=compliance_result,
                days_to_expiry=days_to_expiry,
                decision=decision_analysis["decision"],
            )

            # Generate logistics requirements
            logistics = self._generate_logistics_requirements(
                compliance_result=compliance_result,
                category=category,
                current_quantity=current_quantity,
            )

            # Create recommendation
            recommendation = DonationRecommendation(
                batch_id=batch_data.get("batch_id", "unknown"),
                decision=decision_analysis["decision"],
                priority=timing_analysis["priority"],
                confidence_score=decision_analysis["confidence"],
                eu_compliant=compliance_result.eligible_for_donation,
                compliance_result=compliance_result,
                estimated_donation_value=financial_analysis["donation_value"],
                estimated_waste_cost_avoided=financial_analysis["waste_cost_avoided"],
                estimated_tax_benefit=financial_analysis["tax_benefit"],
                opportunity_cost=financial_analysis["opportunity_cost"],
                recommended_action_by=timing_analysis["action_by"],
                donation_window_expires=timing_analysis["window_expires"],
                preferred_recipient_types=logistics["recipient_types"],
                handling_requirements=logistics["handling"],
                transport_instructions=logistics["transport"],
                fallback_action=decision_analysis["fallback_action"],
                fallback_reasoning=decision_analysis["fallback_reasoning"],
                decision_factors=decision_analysis["factors"],
                risk_assessment=decision_analysis["risk_assessment"],
                business_impact=decision_analysis["business_impact"],
            )

            self.logger.info(
                "Donation opportunity evaluated",
                batch_id=batch_data.get("batch_id"),
                decision=decision_analysis["decision"].value,
                eu_compliant=compliance_result.eligible_for_donation,
                priority=timing_analysis["priority"].value,
                confidence=decision_analysis["confidence"],
            )

            return recommendation

        except Exception as e:
            self.logger.error(
                "Donation opportunity evaluation failed",
                batch_id=batch_data.get("batch_id"),
                error=str(e),
            )

            # Return safe fallback recommendation
            return self._create_fallback_recommendation(batch_data, str(e))

    def _analyze_donation_vs_alternatives(
        self,
        compliance_result: EUComplianceResult,
        margin_percent: float,
        days_to_expiry: int,
        total_value: float,
        scoring_result: Any,
        current_quantity: float,
    ) -> Dict[str, Any]:
        """Analyze donation vs discount/disposal alternatives"""

        factors = []
        confidence = 0.5

        # EU compliance is primary factor
        if not compliance_result.eligible_for_donation:
            if (
                compliance_result.eligibility_status
                == DonationEligibility.NOT_ELIGIBLE_EXPIRED
            ):
                decision = DonationDecision.DISPOSE
                fallback_action = "Immediate disposal required"
                fallback_reasoning = (
                    "Product violates EU food safety regulations for donation"
                )
                risk_assessment = "High regulatory risk - disposal mandatory"
                confidence = 0.9
            else:
                decision = DonationDecision.DISCOUNT_ONLY
                fallback_action = "Apply discount and monitor"
                fallback_reasoning = "EU compliance issues prevent donation"
                risk_assessment = "Medium risk - discount and sell quickly"
                confidence = 0.8

            factors.append(
                f"EU compliance: {compliance_result.eligibility_status.value}"
            )
        else:
            # Product is EU compliant for donation - analyze business factors

            # Factor 1: Margin analysis
            if margin_percent < self.donation_thresholds["min_margin_for_donation"]:
                factors.append(f"Low margin ({margin_percent:.1f}%) favors donation")
                donation_score = 0.8
            elif (
                margin_percent
                > self.donation_thresholds["max_margin_for_immediate_donation"]
            ):
                factors.append(
                    f"High margin ({margin_percent:.1f}%) suggests discount first"
                )
                donation_score = 0.3
            else:
                factors.append(
                    f"Moderate margin ({margin_percent:.1f}%) allows either option"
                )
                donation_score = 0.6

            # Factor 2: Urgency from days to expiry
            if days_to_expiry <= 0:
                urgency_score = 1.0
                factors.append("Expired - immediate action required")
            elif days_to_expiry <= 1:
                urgency_score = 0.9
                factors.append("Expires tomorrow - urgent action needed")
            elif days_to_expiry <= 3:
                urgency_score = 0.7
                factors.append("Expires within 3 days - action needed soon")
            else:
                urgency_score = 0.4
                factors.append(
                    f"Expires in {days_to_expiry} days - planning time available"
                )

            # Factor 3: Value and quantity considerations
            if total_value < 50:  # Low value items
                value_score = 0.8  # Favor donation
                factors.append("Low value item - donation recommended")
            elif total_value > 500:  # High value items
                value_score = 0.3  # Consider discount first
                factors.append("High value item - consider discount to recover revenue")
            else:
                value_score = 0.5
                factors.append("Moderate value - either option viable")

            # Factor 4: Quantity considerations
            if current_quantity < self.donation_thresholds["min_quantity_for_donation"]:
                factors.append("Quantity too small for efficient donation")
                donation_score *= 0.5

            # Combine factors with weights
            weighted_score = (
                donation_score * 0.4  # Business margin factor
                + urgency_score * 0.3  # Time urgency
                + value_score * 0.2  # Value consideration
                + compliance_result.compliance_score * 0.1  # EU compliance quality
            )

            # Make decision based on weighted score and specific conditions
            if weighted_score >= 0.8 or days_to_expiry <= 1:
                decision = DonationDecision.DONATE_IMMEDIATELY
                fallback_action = "Apply heavy discount if donation fails"
                fallback_reasoning = (
                    "Donation preferred but discount available as backup"
                )
                risk_assessment = "Low risk - donation captures social value"
                confidence = min(0.9, weighted_score + 0.1)

            elif weighted_score >= 0.6 or days_to_expiry <= 3:
                if margin_percent > 30:  # High margin products
                    decision = DonationDecision.DISCOUNT_THEN_DONATE
                    fallback_action = "Discount for 24-48 hours, then donate if unsold"
                    fallback_reasoning = (
                        "Try to recover revenue first, then capture social value"
                    )
                    risk_assessment = "Medium risk - balanced approach"
                    confidence = weighted_score
                else:
                    decision = DonationDecision.DONATE_SCHEDULED
                    fallback_action = "Schedule donation pickup within 48 hours"
                    fallback_reasoning = "Plan efficient donation logistics"
                    risk_assessment = "Low risk - planned donation approach"
                    confidence = weighted_score

            elif weighted_score >= 0.4:
                decision = DonationDecision.DISCOUNT_ONLY
                fallback_action = (
                    "Monitor closely and reconsider donation if discount unsuccessful"
                )
                fallback_reasoning = (
                    "Prioritize revenue recovery with donation as future option"
                )
                risk_assessment = "Medium risk - focus on business recovery"
                confidence = 1.0 - weighted_score

            else:
                decision = DonationDecision.MONITOR
                fallback_action = "Continue normal sales and reassess in 24 hours"
                fallback_reasoning = "Product not urgent for donation yet"
                risk_assessment = "Low risk - normal inventory management"
                confidence = 0.7

        # Business impact assessment
        if decision in [
            DonationDecision.DONATE_IMMEDIATELY,
            DonationDecision.DONATE_SCHEDULED,
        ]:
            business_impact = f"Tax benefit: ~€{total_value * 0.6:.2f}, Social value creation, Waste cost avoided"
        elif decision == DonationDecision.DISCOUNT_THEN_DONATE:
            business_impact = f"Revenue recovery attempt: €{total_value * 0.7:.2f}, then social value if needed"
        else:
            business_impact = f"Revenue focus: target €{total_value * 0.8:.2f} recovery through discounting"

        return {
            "decision": decision,
            "confidence": confidence,
            "factors": factors,
            "fallback_action": fallback_action,
            "fallback_reasoning": fallback_reasoning,
            "risk_assessment": risk_assessment,
            "business_impact": business_impact,
        }

    def _calculate_quick_score(
        self, batch_data: Dict[str, Any], days_to_expiry: int
    ) -> Any:
        """Calculate quick scoring result if not provided"""

        class QuickScore:
            def __init__(self):
                self.composite_score = 0.5
                self.urgency_level = "medium"

        if days_to_expiry <= 0:
            score = QuickScore()
            score.composite_score = 1.0
            score.urgency_level = "critical"
        elif days_to_expiry <= 1:
            score = QuickScore()
            score.composite_score = 0.9
            score.urgency_level = "critical"
        elif days_to_expiry <= 3:
            score = QuickScore()
            score.composite_score = 0.7
            score.urgency_level = "high"
        else:
            score = QuickScore()
            score.composite_score = 0.4
            score.urgency_level = "medium"

        return score

    def _calculate_financial_impact(
        self,
        cost_price: float,
        selling_price: float,
        current_quantity: float,
        margin_percent: float,
        decision: DonationDecision,
    ) -> Dict[str, float]:
        """Calculate financial impact of donation decision"""

        total_cost = cost_price * current_quantity
        total_selling_value = selling_price * current_quantity

        if decision in [
            DonationDecision.DONATE_IMMEDIATELY,
            DonationDecision.DONATE_SCHEDULED,
        ]:
            # Full donation scenario
            donation_value = total_cost  # Cost basis for tax purposes
            tax_benefit = donation_value * 0.6  # Estimated tax benefit in Germany
            waste_cost_avoided = total_cost * 0.2  # Estimated disposal cost
            opportunity_cost = (
                total_selling_value * 0.8
            )  # Revenue foregone (assuming 80% discount would sell)

        elif decision == DonationDecision.DISCOUNT_THEN_DONATE:
            # Hybrid approach - assume 50% sells at discount, 50% donated
            discount_revenue = (
                total_selling_value * 0.5 * 0.7
            )  # 50% quantity at 70% price
            donation_portion = total_cost * 0.5
            tax_benefit = donation_portion * 0.6
            waste_cost_avoided = donation_portion * 0.2
            opportunity_cost = total_selling_value - discount_revenue - donation_portion
            donation_value = donation_portion

        else:
            # Discount only or monitor
            donation_value = 0.0
            tax_benefit = 0.0
            waste_cost_avoided = 0.0
            opportunity_cost = (
                total_selling_value * 0.3
            )  # Assume 70% recovery through discounting

        return {
            "donation_value": donation_value,
            "tax_benefit": tax_benefit,
            "waste_cost_avoided": waste_cost_avoided,
            "opportunity_cost": opportunity_cost,
        }

    def _determine_timing_and_priority(
        self,
        compliance_result: EUComplianceResult,
        days_to_expiry: int,
        decision: DonationDecision,
    ) -> Dict[str, Any]:
        """Determine timing and priority for donation actions"""

        now = datetime.now()

        if decision == DonationDecision.DONATE_IMMEDIATELY:
            priority = DonationPriority.CRITICAL
            action_by = now + timedelta(hours=4)  # Within 4 hours
            window_expires = now + timedelta(hours=12)  # Must be done within 12 hours

        elif decision == DonationDecision.DONATE_SCHEDULED:
            if days_to_expiry <= 2:
                priority = DonationPriority.HIGH
                action_by = now + timedelta(hours=24)
                window_expires = now + timedelta(hours=48)
            else:
                priority = DonationPriority.MEDIUM
                action_by = now + timedelta(days=2)
                window_expires = now + timedelta(
                    days=compliance_result.donation_window_days
                )

        elif decision == DonationDecision.DISCOUNT_THEN_DONATE:
            priority = DonationPriority.HIGH
            action_by = now + timedelta(hours=12)  # Start discount process
            window_expires = now + timedelta(days=2)  # Complete by this time

        else:
            priority = DonationPriority.LOW
            action_by = now + timedelta(days=1)
            window_expires = None

        return {
            "priority": priority,
            "action_by": action_by,
            "window_expires": window_expires,
        }

    def _generate_logistics_requirements(
        self,
        compliance_result: EUComplianceResult,
        category: str,
        current_quantity: float,
    ) -> Dict[str, List[str]]:
        """Generate logistics requirements for donation"""

        recipient_types = []
        if compliance_result.required_recipient_type:
            recipient_types.append(compliance_result.required_recipient_type)
        else:
            recipient_types = ["food_bank_certified", "charity_registered"]

        handling = compliance_result.handling_instructions.copy()
        transport = []

        # Add quantity-specific handling
        if current_quantity > 50:
            handling.append("Large quantity - arrange appropriate transport capacity")
            transport.append("Consider commercial vehicle for large quantities")

        # Add category-specific transport instructions
        if category in ["fresh_meat_fish", "dairy", "deli_prepared"]:
            transport.extend(
                [
                    "Refrigerated transport mandatory",
                    "Minimize transport time (<2 hours)",
                    "Temperature monitoring required",
                ]
            )
        elif category == "frozen":
            transport.extend(
                [
                    "Frozen transport with dry ice",
                    "Continuous temperature monitoring",
                    "Direct transfer to recipient freezer",
                ]
            )
        else:
            transport.append("Standard food-grade transport acceptable")

        return {
            "recipient_types": recipient_types,
            "handling": handling,
            "transport": transport,
        }

    def _create_fallback_recommendation(
        self, batch_data: Dict[str, Any], error: str
    ) -> DonationRecommendation:
        """Create safe fallback recommendation when evaluation fails"""
        from app.core.eu_food_safety import DonationEligibility, EUComplianceResult

        fallback_compliance = EUComplianceResult(
            eligible_for_donation=False,
            eligibility_status=DonationEligibility.NOT_ELIGIBLE_REGULATORY,
            safety_requirements=[],
            regulatory_notes=[f"Evaluation error: {error}"],
            donation_window_days=0,
            required_recipient_type=None,
            temperature_requirements=None,
            handling_instructions=[],
            compliance_score=0.0,
            expires_for_donation=None,
        )

        return DonationRecommendation(
            batch_id=batch_data.get("batch_id", "unknown"),
            decision=DonationDecision.MONITOR,
            priority=DonationPriority.LOW,
            confidence_score=0.0,
            eu_compliant=False,
            compliance_result=fallback_compliance,
            estimated_donation_value=0.0,
            estimated_waste_cost_avoided=0.0,
            estimated_tax_benefit=0.0,
            opportunity_cost=0.0,
            recommended_action_by=datetime.now() + timedelta(hours=24),
            donation_window_expires=None,
            preferred_recipient_types=[],
            handling_requirements=[],
            transport_instructions=[],
            fallback_action="Manual review required",
            fallback_reasoning=f"Automated evaluation failed: {error}",
            decision_factors=[f"System error: {error}"],
            risk_assessment="Unknown - manual evaluation required",
            business_impact="Cannot determine - review needed",
        )


# Factory function for easy instantiation
def create_donation_decision_engine() -> DonationDecisionEngine:
    """Create donation decision engine instance"""
    return DonationDecisionEngine()
