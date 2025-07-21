"""
EU Food Safety Compliance Module
Implements European food safety regulations for donation system
EU Regulation 178/2002, 852/2004, 853/2004 compliance
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import structlog
from pydantic import BaseModel, validator

logger = structlog.get_logger()


class EUFoodCategory(Enum):
    """EU food category classifications with specific safety requirements"""

    FRESH_MEAT_FISH = "fresh_meat_fish"
    DAIRY = "dairy"
    FRESH_PRODUCE = "fresh_produce"
    BAKERY_FRESH = "bakery_fresh"
    DELI_PREPARED = "deli_prepared"
    FROZEN = "frozen"
    BEVERAGES = "beverages"
    DRY_GOODS = "dry_goods"
    CANNED_JARRED = "canned_jarred"
    SPICES_CONDIMENTS = "spices_condiments"


class DonationEligibility(Enum):
    """Donation eligibility status under EU regulations"""

    ELIGIBLE = "eligible"
    ELIGIBLE_WITH_CONDITIONS = "eligible_with_conditions"
    NOT_ELIGIBLE_EXPIRED = "not_eligible_expired"
    NOT_ELIGIBLE_SAFETY = "not_eligible_safety"
    NOT_ELIGIBLE_REGULATORY = "not_eligible_regulatory"


class EUComplianceResult(BaseModel):
    """Result of EU food safety compliance check"""

    eligible_for_donation: bool
    eligibility_status: DonationEligibility
    safety_requirements: List[str]
    regulatory_notes: List[str]
    donation_window_days: int
    required_recipient_type: Optional[str]
    temperature_requirements: Optional[str]
    handling_instructions: List[str]
    compliance_score: float
    expires_for_donation: Optional[date]


class EUFoodSafetyValidator:
    """
    European Union Food Safety Validator for donation compliance
    Implements EU Regulation 178/2002 (General Food Law), 852/2004 (Food Hygiene), 853/2004 (Animal Products)
    """

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="eu_food_safety")

        # EU Category-specific safety thresholds (days before expiry)
        self.eu_safety_thresholds = {
            EUFoodCategory.FRESH_MEAT_FISH: {
                "min_days_before_expiry": 2,  # Very strict for animal products
                "max_donation_window": 1,  # Must be donated within 1 day of reaching threshold
                "temperature_critical": True,
                "special_handling": True,
                "recipient_restrictions": [
                    "food_bank_certified",
                    "soup_kitchen_licensed",
                ],
            },
            EUFoodCategory.DAIRY: {
                "min_days_before_expiry": 3,
                "max_donation_window": 2,
                "temperature_critical": True,
                "special_handling": True,
                "recipient_restrictions": ["food_bank_certified"],
            },
            EUFoodCategory.FRESH_PRODUCE: {
                "min_days_before_expiry": 1,
                "max_donation_window": 3,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
            EUFoodCategory.BAKERY_FRESH: {
                "min_days_before_expiry": 1,
                "max_donation_window": 2,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
            EUFoodCategory.DELI_PREPARED: {
                "min_days_before_expiry": 2,
                "max_donation_window": 1,
                "temperature_critical": True,
                "special_handling": True,
                "recipient_restrictions": [
                    "food_bank_certified",
                    "soup_kitchen_licensed",
                ],
            },
            EUFoodCategory.FROZEN: {
                "min_days_before_expiry": 30,  # Longer window for frozen goods
                "max_donation_window": 14,
                "temperature_critical": True,
                "special_handling": True,
                "recipient_restrictions": ["food_bank_certified"],
            },
            EUFoodCategory.BEVERAGES: {
                "min_days_before_expiry": 7,
                "max_donation_window": 14,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
            EUFoodCategory.DRY_GOODS: {
                "min_days_before_expiry": 30,
                "max_donation_window": 60,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
            EUFoodCategory.CANNED_JARRED: {
                "min_days_before_expiry": 60,
                "max_donation_window": 90,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
            EUFoodCategory.SPICES_CONDIMENTS: {
                "min_days_before_expiry": 90,
                "max_donation_window": 180,
                "temperature_critical": False,
                "special_handling": False,
                "recipient_restrictions": [],
            },
        }

    def _map_category_to_eu_category(self, category: str) -> EUFoodCategory:
        """Map internal product category to EU food category"""
        category_mapping = {
            "fresh_meat_fish": EUFoodCategory.FRESH_MEAT_FISH,
            "dairy": EUFoodCategory.DAIRY,
            "fresh_produce": EUFoodCategory.FRESH_PRODUCE,
            "bakery_fresh": EUFoodCategory.BAKERY_FRESH,
            "deli_prepared": EUFoodCategory.DELI_PREPARED,
            "frozen": EUFoodCategory.FROZEN,
            "beverages": EUFoodCategory.BEVERAGES,
            "dry_goods": EUFoodCategory.DRY_GOODS,
            "canned_jarred": EUFoodCategory.CANNED_JARRED,
            "spices_condiments": EUFoodCategory.SPICES_CONDIMENTS,
        }
        return category_mapping.get(category, EUFoodCategory.DRY_GOODS)

    def validate_donation_eligibility(
        self,
        category: str,
        expiry_date: date,
        current_temperature: Optional[float] = None,
        packaging_condition: str = "good",
    ) -> EUComplianceResult:
        """
        Validate if product meets EU donation eligibility requirements

        Args:
            category: Product category
            expiry_date: Product expiry date
            current_temperature: Current storage temperature (°C)
            packaging_condition: Condition of packaging (good, damaged, opened)

        Returns:
            EUComplianceResult with full compliance assessment
        """
        try:
            eu_category = self._map_category_to_eu_category(category)
            safety_config = self.eu_safety_thresholds[eu_category]

            today = date.today()
            days_to_expiry = (expiry_date - today).days

            # Initialize result components
            eligible = True
            eligibility_status = DonationEligibility.ELIGIBLE
            safety_requirements = []
            regulatory_notes = []
            handling_instructions = []
            compliance_score = 1.0

            # Check basic expiry eligibility
            min_days = safety_config["min_days_before_expiry"]
            if days_to_expiry < min_days:
                eligible = False
                eligibility_status = DonationEligibility.NOT_ELIGIBLE_EXPIRED
                compliance_score = 0.0
                regulatory_notes.append(
                    f"Product must have at least {min_days} days before expiry for EU-compliant donation"
                )

            # Check if already expired
            if days_to_expiry < 0:
                eligible = False
                eligibility_status = DonationEligibility.NOT_ELIGIBLE_EXPIRED
                compliance_score = 0.0
                regulatory_notes.append(
                    "Expired products cannot be donated under EU food safety regulations"
                )

            # Check packaging condition
            if packaging_condition in ["damaged", "opened"]:
                if eu_category in [
                    EUFoodCategory.FRESH_MEAT_FISH,
                    EUFoodCategory.DAIRY,
                    EUFoodCategory.DELI_PREPARED,
                ]:
                    eligible = False
                    eligibility_status = DonationEligibility.NOT_ELIGIBLE_SAFETY
                    compliance_score = 0.0
                    regulatory_notes.append(
                        "Damaged or opened packaging not permitted for animal products under EU Regulation 853/2004"
                    )
                else:
                    eligible = True
                    eligibility_status = DonationEligibility.ELIGIBLE_WITH_CONDITIONS
                    compliance_score *= 0.7
                    safety_requirements.append(
                        "Visual inspection required before donation"
                    )
                    handling_instructions.append(
                        "Inspect product condition thoroughly before donation"
                    )

            # Temperature compliance checks
            if (
                safety_config["temperature_critical"]
                and current_temperature is not None
            ):
                temp_compliance = self._check_temperature_compliance(
                    eu_category, current_temperature
                )
                if not temp_compliance["compliant"]:
                    eligible = False
                    eligibility_status = DonationEligibility.NOT_ELIGIBLE_SAFETY
                    compliance_score = 0.0
                    regulatory_notes.append(
                        f"Temperature violation: {temp_compliance['violation']}"
                    )
                else:
                    safety_requirements.extend(temp_compliance["requirements"])

            # Add EU-specific safety requirements
            safety_requirements.extend(self._get_eu_safety_requirements(eu_category))

            # Add handling instructions
            handling_instructions.extend(self._get_handling_instructions(eu_category))

            # Calculate donation window
            donation_window = (
                min(
                    safety_config["max_donation_window"],
                    max(0, days_to_expiry - min_days),
                )
                if eligible
                else 0
            )

            # Calculate expires for donation date
            expires_for_donation = (
                today + timedelta(days=donation_window) if eligible else None
            )

            # Determine recipient type requirements
            recipient_restrictions = safety_config.get("recipient_restrictions", [])
            required_recipient_type = (
                recipient_restrictions[0] if recipient_restrictions else None
            )

            # Temperature requirements string
            temp_requirements = (
                self._get_temperature_requirements(eu_category)
                if safety_config["temperature_critical"]
                else None
            )

            # Add EU regulatory compliance notes
            if eligible:
                regulatory_notes.extend(
                    [
                        "Compliant with EU Regulation 178/2002 (General Food Law)",
                        "Compliant with EU Regulation 852/2004 (Food Hygiene)",
                    ]
                )

                if eu_category in [
                    EUFoodCategory.FRESH_MEAT_FISH,
                    EUFoodCategory.DAIRY,
                    EUFoodCategory.DELI_PREPARED,
                ]:
                    regulatory_notes.append(
                        "Compliant with EU Regulation 853/2004 (Animal Products)"
                    )

            self.logger.info(
                "EU donation eligibility assessed",
                category=category,
                days_to_expiry=days_to_expiry,
                eligible=eligible,
                eligibility_status=eligibility_status.value,
                compliance_score=compliance_score,
            )

            return EUComplianceResult(
                eligible_for_donation=eligible,
                eligibility_status=eligibility_status,
                safety_requirements=safety_requirements,
                regulatory_notes=regulatory_notes,
                donation_window_days=donation_window,
                required_recipient_type=required_recipient_type,
                temperature_requirements=temp_requirements,
                handling_instructions=handling_instructions,
                compliance_score=compliance_score,
                expires_for_donation=expires_for_donation,
            )

        except Exception as e:
            self.logger.error(
                "EU donation eligibility validation failed",
                category=category,
                error=str(e),
            )
            return EUComplianceResult(
                eligible_for_donation=False,
                eligibility_status=DonationEligibility.NOT_ELIGIBLE_REGULATORY,
                safety_requirements=[],
                regulatory_notes=[f"Validation error: {e!s}"],
                donation_window_days=0,
                required_recipient_type=None,
                temperature_requirements=None,
                handling_instructions=[],
                compliance_score=0.0,
                expires_for_donation=None,
            )

    def _check_temperature_compliance(
        self, eu_category: EUFoodCategory, temperature: float
    ) -> Dict[str, Any]:
        """Check temperature compliance for EU regulations"""
        temp_ranges = {
            EUFoodCategory.FRESH_MEAT_FISH: {"min": -2, "max": 4, "optimal": 2},
            EUFoodCategory.DAIRY: {"min": 0, "max": 6, "optimal": 4},
            EUFoodCategory.DELI_PREPARED: {"min": 0, "max": 5, "optimal": 3},
            EUFoodCategory.FROZEN: {"min": -25, "max": -15, "optimal": -18},
        }

        if eu_category not in temp_ranges:
            return {"compliant": True, "requirements": []}

        range_config = temp_ranges[eu_category]

        if temperature < range_config["min"] or temperature > range_config["max"]:
            return {
                "compliant": False,
                "violation": f"Temperature {temperature}°C outside safe range {range_config['min']}-{range_config['max']}°C",
                "requirements": [],
            }

        requirements = [
            f"Maintain temperature between {range_config['min']}-{range_config['max']}°C"
        ]
        if abs(temperature - range_config["optimal"]) > 2:
            requirements.append(f"Optimal temperature is {range_config['optimal']}°C")

        return {"compliant": True, "requirements": requirements}

    def _get_eu_safety_requirements(self, eu_category: EUFoodCategory) -> List[str]:
        """Get EU-specific safety requirements for category"""
        base_requirements = [
            "HACCP compliance required",
            "Traceability documentation must be maintained",
            "Donation recipient must be registered food business operator",
        ]

        category_specific = {
            EUFoodCategory.FRESH_MEAT_FISH: [
                "Veterinary health mark verification required",
                "Cold chain documentation mandatory",
                "Recipient must have appropriate storage facilities",
            ],
            EUFoodCategory.DAIRY: [
                "Pasteurization status must be verified",
                "Cold chain maintenance critical",
                "Allergen labeling must be preserved",
            ],
            EUFoodCategory.DELI_PREPARED: [
                "Preparation date and time documentation required",
                "Ingredient list and allergen information mandatory",
                "Microbiological safety assessment recommended",
            ],
            EUFoodCategory.FROZEN: [
                "Continuous frozen chain documentation required",
                "Defrost history must be clean",
                "Appropriate frozen storage at recipient mandatory",
            ],
        }

        return base_requirements + category_specific.get(eu_category, [])

    def _get_handling_instructions(self, eu_category: EUFoodCategory) -> List[str]:
        """Get handling instructions for donation compliance"""
        base_instructions = [
            "Transfer in appropriate food-grade containers",
            "Maintain original labeling where possible",
            "Document transfer with date and time",
        ]

        category_specific = {
            EUFoodCategory.FRESH_MEAT_FISH: [
                "Use insulated containers with ice packs",
                "Transport within 2 hours of removal from storage",
                "Verify recipient has adequate refrigeration immediately",
            ],
            EUFoodCategory.DAIRY: [
                "Keep refrigerated during transport",
                "Minimize temperature fluctuations",
                "Check packaging integrity before transfer",
            ],
            EUFoodCategory.DELI_PREPARED: [
                "Transport in sealed, food-grade containers",
                "Maintain cold chain throughout transfer",
                "Provide heating/serving instructions if applicable",
            ],
            EUFoodCategory.FROZEN: [
                "Use dry ice or frozen gel packs for transport",
                "Minimize defrost time during transfer",
                "Verify frozen storage availability at destination",
            ],
        }

        return base_instructions + category_specific.get(eu_category, [])

    def _get_temperature_requirements(self, eu_category: EUFoodCategory) -> str:
        """Get temperature requirement string for category"""
        temp_strings = {
            EUFoodCategory.FRESH_MEAT_FISH: "Keep at 0-4°C, transport in insulated containers",
            EUFoodCategory.DAIRY: "Maintain 2-6°C throughout handling and transport",
            EUFoodCategory.DELI_PREPARED: "Keep refrigerated at 0-5°C, minimize exposure time",
            EUFoodCategory.FROZEN: "Maintain at -18°C or below, use dry ice for transport",
        }
        return temp_strings.get(eu_category, "Follow standard food safety temperatures")

    def get_donation_priority_score(
        self, category: str, days_to_expiry: int, compliance_result: EUComplianceResult
    ) -> float:
        """
        Calculate donation priority score based on EU compliance and urgency
        Returns: 0.0 (low priority) to 1.0 (highest priority)
        """
        if not compliance_result.eligible_for_donation:
            return 0.0

        eu_category = self._map_category_to_eu_category(category)
        safety_config = self.eu_safety_thresholds[eu_category]

        # Base score from compliance
        base_score = compliance_result.compliance_score

        # Urgency multiplier based on donation window
        window_days = compliance_result.donation_window_days
        if window_days <= 1:
            urgency_multiplier = 1.0  # Highest urgency
        elif window_days <= 3:
            urgency_multiplier = 0.8
        elif window_days <= 7:
            urgency_multiplier = 0.6
        else:
            urgency_multiplier = 0.4

        # Category risk multiplier (higher risk categories get higher priority when donation-eligible)
        risk_multipliers = {
            EUFoodCategory.FRESH_MEAT_FISH: 1.0,
            EUFoodCategory.DAIRY: 0.9,
            EUFoodCategory.DELI_PREPARED: 0.95,
            EUFoodCategory.FRESH_PRODUCE: 0.7,
            EUFoodCategory.BAKERY_FRESH: 0.6,
            EUFoodCategory.FROZEN: 0.5,
            EUFoodCategory.BEVERAGES: 0.4,
            EUFoodCategory.DRY_GOODS: 0.3,
            EUFoodCategory.CANNED_JARRED: 0.2,
            EUFoodCategory.SPICES_CONDIMENTS: 0.1,
        }

        risk_multiplier = risk_multipliers.get(eu_category, 0.5)

        # Final priority score
        priority_score = base_score * urgency_multiplier * risk_multiplier

        return min(1.0, max(0.0, priority_score))


# Factory function for easy instantiation
def create_eu_food_safety_validator() -> EUFoodSafetyValidator:
    """Create EU food safety validator instance"""
    return EUFoodSafetyValidator()
