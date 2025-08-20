"""
Comprehensive unit tests for the simplified expired product recommendation logic
Tests EU-compliant disposal requirements for all expired products
"""

import pytest

from app.core.scoring import InventoryScorer


class TestExpiredProductRecommendations:
    """Test comprehensive expired product recommendation logic"""

    def test_expired_product_always_returns_disposal(self):
        """Test that all expired products return disposal recommendation"""
        scorer = InventoryScorer()

        # Test various expired scenarios - all should return identical disposal recommendation
        expired_scenarios = [
            (-1, 50.0, 10.0),  # 1 day expired, high margin, normal quantity
            (-7, 30.0, 5.0),  # 1 week expired, medium margin, small quantity
            (-30, 80.0, 100.0),  # 1 month expired, very high margin, large quantity
            (-365, 10.0, 1.0),  # 1 year expired, low margin, tiny quantity
            (0, 0.0, 0.0),  # Just expired, no margin, no quantity
            (-1000, 1000.0, 1000.0),  # Very old, extreme values
        ]

        expected_recommendation = {
            "action": "dispose",
            "urgency": "critical",
            "reason": "product expired",
            "discount_percent": 0,
            "priority": 1,
        }

        for days_expired, margin_percent, quantity in expired_scenarios:
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=days_expired,
                current_margin_percent=margin_percent,
                current_quantity=quantity,
            )

            assert recommendation == expected_recommendation, (
                f"Failed for scenario: {days_expired} days, {margin_percent}% margin, {quantity} qty. "
                f"Got: {recommendation}"
            )

    def test_expired_product_eu_compliance_requirements(self):
        """Test EU compliance requirements for expired products"""
        scorer = InventoryScorer()

        # Test zero days to expiry (just expired)
        recommendation = scorer._generate_expired_recommendation(
            days_to_expiry=0, current_margin_percent=75.0, current_quantity=50.0
        )

        # Verify EU compliance requirements
        assert recommendation["action"] == "dispose", (
            "EU law requires disposal of expired products"
        )
        assert recommendation["urgency"] == "critical", (
            "Expired products must be highest urgency"
        )
        assert recommendation["reason"] == "product expired", (
            "Must clearly state expiration reason"
        )
        assert recommendation["discount_percent"] == 0, (
            "No discounts allowed on expired products"
        )
        assert recommendation["priority"] == 1, (
            "Expired products must be highest priority"
        )

    def test_expired_product_ignores_financial_factors(self):
        """Test that expired product recommendations ignore financial considerations"""
        scorer = InventoryScorer()

        # Test that high-value, high-margin products still get disposal recommendation
        high_value_scenario = scorer._generate_expired_recommendation(
            days_to_expiry=-1,
            current_margin_percent=90.0,  # Very high margin
            current_quantity=1000.0,  # Very large quantity
        )

        # Test that low-value, low-margin products get same recommendation
        low_value_scenario = scorer._generate_expired_recommendation(
            days_to_expiry=-1,
            current_margin_percent=5.0,  # Very low margin
            current_quantity=0.1,  # Very small quantity
        )

        # Both scenarios should return identical recommendations
        assert high_value_scenario == low_value_scenario, (
            "Expired product recommendations must ignore financial factors"
        )

    def test_expired_product_recommendation_immutability(self):
        """Test that expired product recommendations are immutable"""
        scorer = InventoryScorer()

        # Get baseline recommendation
        baseline = scorer._generate_expired_recommendation(
            days_to_expiry=-1, current_margin_percent=50.0, current_quantity=10.0
        )

        # Test multiple calls with same parameters
        for _ in range(10):
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=-1, current_margin_percent=50.0, current_quantity=10.0
            )
            assert recommendation == baseline, "Recommendations should be deterministic"

        # Test different scorer instances
        for _ in range(5):
            new_scorer = InventoryScorer()
            recommendation = new_scorer._generate_expired_recommendation(
                days_to_expiry=-1, current_margin_percent=50.0, current_quantity=10.0
            )
            assert recommendation == baseline, (
                "Recommendations should be consistent across instances"
            )

    def test_expired_product_integration_with_generate_recommendation(self):
        """Test integration of expired logic with main generate_recommendation function"""
        scorer = InventoryScorer()

        # Test that generate_recommendation calls _generate_expired_recommendation for expired products
        expired_recommendation = scorer.generate_recommendation(
            composite_score=0.5,  # Should be ignored for expired products
            days_to_expiry=0,
            current_margin_percent=60.0,
            current_quantity=25.0,
        )

        # Should match direct call to _generate_expired_recommendation
        direct_recommendation = scorer._generate_expired_recommendation(
            days_to_expiry=0, current_margin_percent=60.0, current_quantity=25.0
        )

        # Core fields should match
        assert expired_recommendation["action"] == direct_recommendation["action"]
        assert expired_recommendation["urgency"] == direct_recommendation["urgency"]
        assert expired_recommendation["reason"] == direct_recommendation["reason"]
        assert (
            expired_recommendation["discount_percent"]
            == direct_recommendation["discount_percent"]
        )
        assert expired_recommendation["priority"] == direct_recommendation["priority"]

    def test_expired_vs_non_expired_distinction(self):
        """Test clear distinction between expired and non-expired product recommendations"""
        scorer = InventoryScorer()

        # Test expired product (0 days)
        expired_rec = scorer.generate_recommendation(
            composite_score=0.9,  # High urgency
            days_to_expiry=0,
            current_margin_percent=50.0,
            current_quantity=10.0,
        )

        # Test non-expired product (1 day)
        non_expired_rec = scorer.generate_recommendation(
            composite_score=0.9,  # Same high urgency
            days_to_expiry=1,
            current_margin_percent=50.0,
            current_quantity=10.0,
        )

        # Expired should be disposal
        assert expired_rec["action"] == "dispose"
        assert expired_rec["urgency"] == "critical"
        assert expired_rec["discount_percent"] == 0

        # Non-expired should allow discounting
        assert non_expired_rec["action"] != "dispose"
        assert (
            non_expired_rec.get("discount_percent", 0) > 0
        )  # Should have discount option

    def test_expired_product_edge_cases(self):
        """Test edge cases for expired product logic"""
        scorer = InventoryScorer()

        edge_cases = [
            # (days_to_expiry, description)
            (0, "exactly expired"),
            (-0.1, "slightly past expiry"),
            (-1, "one day expired"),
            (-0.5, "half day expired"),
            (-999999, "extremely expired"),
        ]

        for days, description in edge_cases:
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=days, current_margin_percent=50.0, current_quantity=10.0
            )

            assert recommendation["action"] == "dispose", f"Failed for {description}"
            assert recommendation["urgency"] == "critical", f"Failed for {description}"
            assert recommendation["discount_percent"] == 0, f"Failed for {description}"
            assert recommendation["priority"] == 1, f"Failed for {description}"

    def test_expired_product_parameter_validation(self):
        """Test that expired product function handles various parameter types"""
        scorer = InventoryScorer()

        # Test with various parameter types
        test_parameters = [
            # (days_to_expiry, margin_percent, quantity)
            (-1, 50, 10),  # Integer values
            (-1.0, 50.0, 10.0),  # Float values
            (0, None, None),  # None values for optional params
            (-1, 0, 0),  # Zero values
        ]

        for days, margin, quantity in test_parameters:
            try:
                recommendation = scorer._generate_expired_recommendation(
                    days_to_expiry=days,
                    current_margin_percent=margin,
                    current_quantity=quantity,
                )

                # Should always return valid disposal recommendation
                assert isinstance(recommendation, dict)
                assert recommendation["action"] == "dispose"
                assert recommendation["urgency"] == "critical"

            except Exception as e:
                pytest.fail(
                    f"Expired recommendation failed with parameters {days}, {margin}, {quantity}: {e}"
                )


class TestExpiredProductCompliance:
    """Test compliance and regulatory requirements for expired products"""

    def test_no_revenue_recovery_from_expired_products(self):
        """Test that system never suggests revenue recovery from expired products"""
        scorer = InventoryScorer()

        # Test with very high value expired products
        high_value_scenarios = [
            (-1, 1000.0, 500.0),  # High margin, high quantity
            (-1, 900.0, 1000.0),  # Very high margin, very high quantity
        ]

        for days, margin, quantity in high_value_scenarios:
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=days,
                current_margin_percent=margin,
                current_quantity=quantity,
            )

            # Must never suggest discounting or selling expired products
            assert recommendation["discount_percent"] == 0, (
                "Must never suggest discounting expired products"
            )
            assert recommendation["action"] == "dispose", (
                "Must only suggest disposal for expired products"
            )

    def test_expired_product_traceability_requirements(self):
        """Test that expired product recommendations include proper reason tracking"""
        scorer = InventoryScorer()

        recommendation = scorer._generate_expired_recommendation(
            days_to_expiry=-5, current_margin_percent=40.0, current_quantity=20.0
        )

        # Must have clear expiration reason for audit trails
        assert "reason" in recommendation, (
            "Must include reason for regulatory compliance"
        )
        assert recommendation["reason"] == "product expired", (
            "Reason must clearly state product expiration"
        )

        # Must have priority for disposal queue management
        assert "priority" in recommendation, (
            "Must include priority for disposal workflow"
        )
        assert recommendation["priority"] == 1, (
            "Expired products must be highest priority"
        )

    def test_expired_product_food_safety_compliance(self):
        """Test food safety compliance for expired products"""
        scorer = InventoryScorer()

        # Test different food categories - all should get same disposal treatment
        food_categories = ["fresh_meat_fish", "dairy", "fresh_produce", "bakery_fresh"]

        for category in food_categories:
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=-1, current_margin_percent=50.0, current_quantity=10.0
            )

            # Food safety requires immediate disposal regardless of category
            assert recommendation["action"] == "dispose", (
                f"Food safety requires disposal for expired {category}"
            )
            assert recommendation["urgency"] == "critical", (
                f"Food safety requires critical urgency for expired {category}"
            )
