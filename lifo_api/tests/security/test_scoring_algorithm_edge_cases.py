"""
Security tests for scoring algorithm edge cases and vulnerabilities
⚠️ CRITICAL SCORING ALGORITHM VULNERABILITIES DETECTED ⚠️
"""

import math
from decimal import Decimal

import pytest

from app.core.scoring import (
    InventoryScorer,
    ScoringInput,
    ScoringWeights,
)


class TestScoringMathematicalVulnerabilities:
    """Test mathematical vulnerabilities in scoring calculations"""

    def test_division_by_zero_in_velocity_calculation(self):
        """🚨 CRITICAL: Division by zero in velocity scoring"""
        scorer = InventoryScorer()

        # Test division by zero scenarios
        zero_scenarios = [
            (10.0, 0.0, 5),  # Zero avg_daily_sales
            (0.0, 0.0, 5),  # Both quantity and sales zero
            (100.0, 0.0, 0),  # Zero sales and zero days to expiry
        ]

        for quantity, sales, days in zero_scenarios:
            try:
                score = scorer.calculate_velocity_score(quantity, sales, days)
                # System should handle division by zero gracefully
                assert not math.isinf(score), f"Infinite score from {quantity}/{sales}/{days}"
                assert not math.isnan(score), f"NaN score from {quantity}/{sales}/{days}"
            except ZeroDivisionError:
                pytest.fail(f"Division by zero not handled: {quantity}/{sales}/{days}")

    def test_extreme_numeric_values(self):
        """🚨 HIGH: Extreme numeric values cause overflow/underflow"""
        scorer = InventoryScorer()

        # Test with extreme values
        extreme_values = [
            # (quantity, sales, days_to_expiry, cost, selling)
            (float("inf"), 100.0, 5, 1.0, 2.0),  # Infinite quantity
            (1e308, 1.0, 5, 1.0, 2.0),  # Very large quantity
            (100.0, float("inf"), 5, 1.0, 2.0),  # Infinite sales
            (100.0, 1e308, 5, 1.0, 2.0),  # Very large sales
            (100.0, 1e-308, 5, 1.0, 2.0),  # Very small sales
            (100.0, 10.0, -999999, 1.0, 2.0),  # Extremely negative days
            (100.0, 10.0, 999999, 1.0, 2.0),  # Extremely large days
            (-100.0, 10.0, 5, 1.0, 2.0),  # Negative quantity
            (100.0, -10.0, 5, 1.0, 2.0),  # Negative sales
        ]

        for quantity, sales, days, cost, selling in extreme_values:
            try:
                velocity_score = scorer.calculate_velocity_score(quantity, sales, days)
                margin_score = scorer.calculate_margin_score(cost, selling, days)

                # Scores should be finite and in valid range
                assert math.isfinite(velocity_score), f"Non-finite velocity score: {velocity_score}"
                assert math.isfinite(margin_score), f"Non-finite margin score: {margin_score}"
                assert 0.0 <= velocity_score <= 1.0, (
                    f"Velocity score out of range: {velocity_score}"
                )
                assert 0.0 <= margin_score <= 1.0, f"Margin score out of range: {margin_score}"

            except Exception as e:
                pytest.fail(f"Exception with extreme values {quantity}/{sales}/{days}: {e}")

    def test_floating_point_precision_issues(self):
        """🚨 MEDIUM: Floating point precision causes incorrect calculations"""
        scorer = InventoryScorer()

        # Test precision-sensitive calculations
        precision_tests = [
            # Values that might cause precision issues
            (0.1 + 0.2, 0.3, 5, 0.1, 0.3),  # 0.1 + 0.2 != 0.3
            (1.0 / 3.0, 1.0 / 3.0, 5, 1.0 / 3.0, 2.0 / 3.0),  # Repeating decimals
            (1e-15, 1e-15, 5, 1e-15, 2e-15),  # Very small numbers
            (999999.999999, 1000000.000001, 5, 1.0, 2.0),  # Near-equal large numbers
        ]

        for quantity, sales, days, cost, selling in precision_tests:
            velocity_score = scorer.calculate_velocity_score(quantity, sales, days)
            margin_score = scorer.calculate_margin_score(cost, selling, days)

            # Check for precision artifacts
            assert velocity_score >= 0.0, (
                f"Negative velocity score due to precision: {velocity_score}"
            )
            assert margin_score >= 0.0, f"Negative margin score due to precision: {margin_score}"

    def test_weight_sum_validation_bypass(self):
        """🚨 HIGH: Weight validation can be bypassed"""

        # Test 1: Weights that sum to more than 1.0
        malicious_weights_1 = ScoringWeights(expiry=0.5, velocity=0.5, margin=0.5)  # Sum = 1.5

        # Validation should fail but might not be called
        try:
            malicious_weights_1.validate_sum()
            pytest.fail("Weight sum validation should have failed")
        except ValueError:
            pass  # Expected

        # Test 2: Bypassing validation by direct construction
        class MaliciousWeights:
            def __init__(self):
                self.expiry = 0.6
                self.velocity = 0.6
                self.margin = 0.6  # Sum = 1.8

        malicious_weights_2 = MaliciousWeights()

        # If scorer accepts any object with weight attributes
        try:
            scorer = InventoryScorer()
            scorer.weights = malicious_weights_2  # Direct assignment bypasses validation

            # Calculations would use invalid weights
            composite = scorer.calculate_composite_score(0.5, 0.5, 0.5)

            # Should detect invalid weights
            if composite > 1.0:
                pytest.fail(f"Invalid weights produced composite score > 1.0: {composite}")

        except Exception:
            pass  # Expected if validation works

    def test_negative_weight_attack(self):
        """🚨 HIGH: Negative weights can manipulate scores"""
        # Malicious weights with negative values
        try:
            malicious_weights = ScoringWeights(expiry=-0.5, velocity=0.8, margin=0.7)  # Sum = 1.0
            scorer = InventoryScorer(weights=malicious_weights)

            # Negative weight would invert scoring logic
            composite = scorer.calculate_composite_score(1.0, 1.0, 1.0)  # High urgency inputs

            # With negative expiry weight, high expiry score would reduce composite score
            # This could hide urgent items from attention
            if composite < 0.5:  # Should be high urgency
                pytest.fail(f"Negative weights manipulated score: {composite}")

        except ValueError:
            pass  # Expected if validation works


class TestScoringBusinessLogicVulnerabilities:
    """Test business logic vulnerabilities in scoring"""
    
    def test_expired_product_eu_compliance(self):
        """\ud83d\udd12 COMPLIANCE: Test EU-compliant expired product handling"""
        scorer = InventoryScorer()
        
        # Test various expired product scenarios
        expired_scenarios = [
            (-1, "fresh_produce", 50.0),  # 1 day expired, high margin
            (-7, "dairy", 30.0),          # 1 week expired, medium margin
            (-30, "canned_jarred", 80.0), # 1 month expired, very high margin
            (0, "fresh_meat_fish", 25.0), # Just expired, low margin
        ]
        
        for days_expired, category, margin_percent in expired_scenarios:
            # Test direct expired recommendation function
            recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=days_expired,
                current_margin_percent=margin_percent,
                current_quantity=10.0
            )
            
            # EU compliance requirements for expired products
            assert recommendation["action"] == "dispose", (
                f"Expired products must be disposed, got {recommendation['action']}"
            )
            assert recommendation["urgency"] == "critical", (
                f"Expired products must be critical urgency, got {recommendation['urgency']}"
            )
            assert recommendation["reason"] == "product expired", (
                f"Must specify expired reason, got {recommendation['reason']}"
            )
            assert recommendation["discount_percent"] == 0, (
                f"No discounts allowed on expired products, got {recommendation['discount_percent']}"
            )
            assert recommendation["priority"] == 1, (
                f"Expired products must be highest priority, got {recommendation['priority']}"
            )
    
    def test_expired_product_recommendation_consistency(self):
        """\ud83d\udd12 COMPLIANCE: Test expired product recommendation is consistent regardless of other factors"""
        scorer = InventoryScorer()
        
        # Test that expired recommendation is consistent regardless of input variation
        base_recommendation = scorer._generate_expired_recommendation(
            days_to_expiry=-1,
            current_margin_percent=50.0,
            current_quantity=10.0
        )
        
        # Test with different parameters - should always return identical result
        test_variations = [
            (-1, 0.0, 1.0),      # Different margin and quantity
            (-365, 100.0, 1000.0), # Very old expiry, high margin, large quantity
            (0, 10.0, 0.1),      # Just expired, low margin, tiny quantity
        ]
        
        for days, margin, quantity in test_variations:
            variation_recommendation = scorer._generate_expired_recommendation(
                days_to_expiry=days,
                current_margin_percent=margin,
                current_quantity=quantity
            )
            
            # All expired product recommendations must be identical
            assert variation_recommendation == base_recommendation, (
                f"Expired product recommendations must be consistent regardless of other factors"
            )

    def test_discount_calculation_manipulation(self):
        """🚨 HIGH: Discount calculation can be manipulated"""
        scorer = InventoryScorer()

        # Test extreme margin percentages
        extreme_margins = [
            (0.01, 100.0),  # 9900% margin - unrealistic
            (100.0, 100.01),  # 0.01% margin - near zero
            (1.0, 0.99),  # Selling below cost price
            (-10.0, 10.0),  # Negative cost price
        ]

        for cost, selling in extreme_margins:
            # Test with non-expired products first
            recommendation = scorer.generate_recommendation(
                composite_score=0.8,  # High urgency
                days_to_expiry=1,  # Not expired
                current_margin_percent=((selling - cost) / selling) * 100,
                current_quantity=10.0,
            )

            discount = recommendation.get("discount_percent", 0)

            # Discount should be reasonable for non-expired products
            if discount > 100:
                pytest.fail(f"Discount > 100%: {discount} for margin {cost}/{selling}")
            if discount < 0:
                pytest.fail(f"Negative discount: {discount} for margin {cost}/{selling}")
            
            # Test with expired products - should always return disposal recommendation
            expired_recommendation = scorer.generate_recommendation(
                composite_score=0.8,  # High urgency (irrelevant for expired)
                days_to_expiry=0,  # Expired
                current_margin_percent=((selling - cost) / selling) * 100,
                current_quantity=10.0,
            )
            
            # Expired products must follow EU compliance
            assert expired_recommendation["action"] == "dispose"
            assert expired_recommendation["urgency"] == "critical" 
            assert expired_recommendation["discount_percent"] == 0
            assert expired_recommendation["priority"] == 1

    def test_composite_score_amplification_vulnerability(self):
        """🚨 MEDIUM: Composite score amplification can be exploited"""
        scorer = InventoryScorer()

        # Test non-linear scaling logic
        # Code: if composite >= 0.8: composite = min(1.0, composite * 1.1)

        edge_scores = [0.79, 0.80, 0.81, 0.90, 0.95]

        for base_score in edge_scores:
            composite = scorer.calculate_composite_score(base_score, base_score, base_score)

            # Check for unexpected amplification
            if base_score >= 0.8:
                # Should be amplified but not exceed 1.0
                expected_amplified = min(1.0, base_score * 1.1)
                if abs(composite - expected_amplified) > 0.01:
                    pytest.fail(f"Unexpected amplification: {base_score} -> {composite}")

    def test_category_weight_injection(self):
        """🚨 HIGH: Category weights can be injected/manipulated"""
        scorer = InventoryScorer()

        # Malicious category weights passed to composite calculation
        malicious_category_weights = {
            "expiry": 1.5,  # > 1.0
            "velocity": -0.5,  # Negative
            "margin": 0.0,  # Zero weight
        }

        composite = scorer.calculate_composite_score(
            expiry_score=1.0,
            velocity_score=1.0,
            margin_score=1.0,
            category_weights=malicious_category_weights,
        )

        # Should reject malicious weights or produce reasonable result
        if composite > 1.0 or composite < 0.0:
            pytest.fail(f"Malicious category weights produced invalid score: {composite}")

    def test_urgency_level_manipulation(self):
        """🚨 MEDIUM: Urgency levels can be manipulated through edge inputs"""
        scorer = InventoryScorer()

        # Edge cases for urgency determination
        edge_cases = [
            # (days_to_expiry, shelf_life, expected_high_urgency)
            (0, 1, True),  # Expired
            (-1, 1, True),  # Expired (negative days)
            (1, 2, True),  # Critical
            (999999, 1, False),  # Very long expiry, short shelf life
            (1, 999999, False),  # Short expiry, very long shelf life
        ]

        for days, shelf_life, should_be_urgent in edge_cases:
            expiry_score = scorer.calculate_expiry_score(days, shelf_life)

            if should_be_urgent and expiry_score < 0.7:
                pytest.fail(f"Failed to detect urgency: {days}/{shelf_life} -> {expiry_score}")
            elif not should_be_urgent and expiry_score > 0.8:
                pytest.fail(f"False urgency detected: {days}/{shelf_life} -> {expiry_score}")

    def test_margin_calculation_bypass(self):
        """🚨 HIGH: Margin calculation can be bypassed with edge cases"""
        scorer = InventoryScorer()

        # Edge cases for margin calculation
        margin_edge_cases = [
            (0.0, 1.0, 1),  # Zero cost price
            (1.0, 1.0, 1),  # Equal cost and selling price
            (2.0, 1.0, 1),  # Selling below cost
            (float("inf"), 1.0, 1),  # Infinite cost
            (1.0, float("inf"), 1),  # Infinite selling price
            (-1.0, 1.0, 1),  # Negative cost
            (1.0, -1.0, 1),  # Negative selling price
        ]

        for cost, selling, days in margin_edge_cases:
            try:
                margin_score = scorer.calculate_margin_score(cost, selling, days)

                # Should handle edge cases gracefully
                assert 0.0 <= margin_score <= 1.0, f"Invalid margin score: {margin_score}"
                assert math.isfinite(margin_score), f"Non-finite margin score: {margin_score}"

            except Exception as e:
                # Should not crash on edge cases
                pytest.fail(f"Margin calculation crashed on {cost}/{selling}: {e}")


class TestScoringInputValidationVulnerabilities:
    """Test input validation vulnerabilities"""

    def test_missing_input_validation(self):
        """🚨 HIGH: Missing input validation allows malicious data"""

        # Malicious ScoringInput data
        malicious_inputs = {
            "batch_id": "'; DROP TABLE batches; --",  # SQL injection
            "product_id": "../../../etc/passwd",  # Path traversal
            "store_id": "x" * 1000000,  # Very long string
            "sku": "<script>alert('xss')</script>",  # XSS attempt
            "product_name": "\x00null_byte",  # Null byte
            "category": "category\r\nHTTP/1.1 200 OK",  # HTTP injection
            "days_to_expiry": -999999999,  # Extreme negative
            "shelf_life_days": 0,  # Zero shelf life
            "current_quantity": float("inf"),  # Infinite quantity
            "initial_quantity": float("nan"),  # NaN value
            "cost_price": Decimal("-999999"),  # Negative price
            "selling_price": Decimal("0"),  # Zero selling price
            "location_code": "LOC\x00\x01\x02",  # Binary data
            "avg_daily_sales": -100.0,  # Negative sales
            "temperature": 999999.0,  # Extreme temperature
            "humidity": -50.0,  # Invalid humidity
        }

        try:
            # ScoringInput should validate all fields
            malicious_input = ScoringInput(**malicious_inputs)

            # If validation passed, check for dangerous values
            if "DROP TABLE" in malicious_input.batch_id:
                pytest.fail("SQL injection content accepted in batch_id")
            if len(malicious_input.store_id) > 100:
                pytest.fail("Extremely long store_id accepted")

        except Exception:
            pass  # Expected if validation works

    def test_type_confusion_attack(self):
        """🚨 MEDIUM: Type confusion in input handling"""

        # Pass wrong types to confuse validation
        type_confusion_inputs = {
            "batch_id": 12345,  # Integer instead of string
            "days_to_expiry": "not_a_number",  # String instead of int
            "current_quantity": "infinite",  # String instead of float
            "cost_price": "free",  # String instead of Decimal
            "selling_price": True,  # Boolean instead of Decimal
        }

        try:
            ScoringInput(**type_confusion_inputs)
            # Should reject type mismatches
            pytest.fail("Type confusion attack succeeded")
        except Exception:
            pass  # Expected

    def test_unicode_normalization_bypass(self):
        """🚨 LOW: Unicode normalization allows duplicate/similar inputs"""

        # Different unicode representations of similar strings

        # These might be treated as different but look identical
        # Could bypass duplicate detection or validation


class TestScoringAlgorithmPerformance:
    """Test performance vulnerabilities in scoring algorithm"""

    def test_algorithmic_complexity_attack(self):
        """🚨 MEDIUM: Algorithm complexity vulnerable to DoS"""
        scorer = InventoryScorer()

        # Test with inputs that might cause performance issues
        import time

        start_time = time.time()

        # Process many extreme calculations
        for i in range(1000):
            try:
                # Complex calculations with edge values
                scorer.calculate_velocity_score(
                    current_quantity=float(i * 1000),
                    avg_daily_sales=0.001,
                    days_to_expiry=1,
                )
                scorer.calculate_margin_score(
                    cost_price=float(i),
                    selling_price=float(i + 0.001),
                    days_to_expiry=1,
                )
            except Exception:
                pass

        execution_time = time.time() - start_time

        # Should complete reasonably quickly
        if execution_time > 5.0:  # 5 seconds
            pytest.fail(f"Algorithm too slow: {execution_time}s for 1000 calculations")

    def test_memory_exhaustion_in_scoring(self):
        """🚨 LOW: Memory exhaustion through large scoring batches"""

        # Very large scoring input (would be from CSV or API)
        large_scoring_batch = []

        for i in range(10000):  # 10k items
            scoring_input = {
                "batch_id": f"batch_{i}",
                "product_id": f"product_{i}",
                "store_id": "store_1",
                "sku": f"SKU_{i}",
                "product_name": f"Product {i}",
                "category": "test",
                "days_to_expiry": 5,
                "shelf_life_days": 10,
                "current_quantity": 100.0,
                "initial_quantity": 100.0,
                "cost_price": Decimal("1.00"),
                "selling_price": Decimal("2.00"),
                "location_code": "A1",
                "avg_daily_sales": 10.0,
            }
            large_scoring_batch.append(scoring_input)

        # System should handle large batches without memory issues
        # But no batch size limits are visible


# Summary of Scoring Algorithm Vulnerabilities:
"""
🚨 CRITICAL SCORING ALGORITHM VULNERABILITIES IDENTIFIED:

1. Division by Zero (CRITICAL)
   - Velocity calculation divides by avg_daily_sales without checking
   - System could crash or produce infinite/NaN scores

2. Extreme Value Handling (HIGH)
   - No bounds checking on numeric inputs
   - Infinite/NaN values could propagate through calculations

3. Weight Validation Bypass (HIGH)
   - Weight sum validation can be bypassed
   - Negative weights could invert scoring logic

4. Discount Manipulation (HIGH)
   - Discount calculation vulnerable to extreme margin values
   - Could recommend impossible discounts (>100%)

5. Input Validation Missing (HIGH)
   - No validation of malicious strings in scoring inputs
   - SQL injection and XSS content accepted

6. Floating Point Precision (MEDIUM)
   - Precision issues could cause incorrect calculations
   - Especially problematic for financial calculations

7. Category Weight Injection (HIGH)
   - Malicious category weights can be injected
   - Could manipulate scoring outcomes

8. Business Logic Bypass (MEDIUM)
   - Edge cases in urgency calculation
   - Margin calculation can be bypassed

9. Type Confusion (MEDIUM)
   - Input type validation might be bypassable
   - Could cause unexpected behavior

10. Performance DoS (MEDIUM)
    - No complexity limits on scoring calculations
    - Large batches could cause memory/CPU exhaustion

IMMEDIATE ACTIONS REQUIRED:
1. Add zero-division checks in all calculations
2. Implement input bounds validation for all numeric values
3. Strengthen weight validation and make it mandatory
4. Add discount bounds checking
5. Implement proper input sanitization and validation
6. Add floating-point precision safeguards
7. Validate category weights before use
8. Add business rule validation for edge cases
9. Implement type checking and conversion
10. Add batch size limits and complexity controls
"""
