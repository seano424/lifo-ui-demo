"""
Comprehensive unit tests for donation-first enhancement logic
Tests the enhanced scoring algorithm, donation preference system, and store configuration
"""

import pytest
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, Mock

from app.core.scoring import InventoryScorer, ScoringWeights, ScoringResult
from app.core.donation_engine import SimplifiedDonationEngine, DonationPriority, SimpleActionRecommendation
from app.database.inventory_models import ActionType, DonationRecipientType


class TestDonationScoringAlgorithm:
    """Test the enhanced 4-component scoring algorithm with donation scoring"""

    @pytest.fixture
    def scorer(self):
        """Create InventoryScorer instance for testing"""
        mock_db = AsyncMock()
        return InventoryScorer(mock_db)

    def test_donation_score_calculation_fresh_produce(self, scorer):
        """Test donation scoring for fresh produce category"""
        # Fresh produce should have high donation scores
        score = scorer.calculate_donation_score(
            category="fresh_produce",
            margin_percent=15.0,
            days_to_expiry=2,
            store_donation_strategy="balanced",
            donation_multiplier=1.0
        )
        
        assert 0.7 <= score <= 1.0, f"Fresh produce should have high donation score, got {score}"

    def test_donation_score_calculation_special_handling(self, scorer):
        """Test donation scoring for special handling categories"""
        # Fresh meat should have lower donation scores due to handling requirements
        score = scorer.calculate_donation_score(
            category="fresh_meat_fish",
            margin_percent=25.0,
            days_to_expiry=1,
            store_donation_strategy="balanced",
            donation_multiplier=1.0
        )
        
        assert 0.3 <= score <= 0.6, f"Special handling categories should have moderate donation scores, got {score}"

    def test_donation_score_with_different_strategies(self, scorer):
        """Test donation scoring varies with store strategies"""
        test_params = {
            "category": "bakery_fresh",
            "margin_percent": 20.0,
            "days_to_expiry": 2,
            "donation_multiplier": 1.0
        }
        
        donation_first_score = scorer.calculate_donation_score(
            **test_params,
            store_donation_strategy="donation_first"
        )
        
        balanced_score = scorer.calculate_donation_score(
            **test_params,
            store_donation_strategy="balanced"
        )
        
        discount_first_score = scorer.calculate_donation_score(
            **test_params,
            store_donation_strategy="discount_first"
        )
        
        assert donation_first_score > balanced_score > discount_first_score, \
            f"Scores should decrease: donation_first ({donation_first_score}) > balanced ({balanced_score}) > discount_first ({discount_first_score})"

    def test_donation_score_with_multiplier(self, scorer):
        """Test donation scoring with different multipliers"""
        base_score = scorer.calculate_donation_score(
            category="dry_goods",
            margin_percent=10.0,
            days_to_expiry=3,
            store_donation_strategy="balanced",
            donation_multiplier=1.0
        )
        
        enhanced_score = scorer.calculate_donation_score(
            category="dry_goods",
            margin_percent=10.0,
            days_to_expiry=3,
            store_donation_strategy="balanced",
            donation_multiplier=2.0
        )
        
        assert enhanced_score > base_score, f"Enhanced multiplier should increase score: {enhanced_score} > {base_score}"

    def test_enhanced_composite_scoring_with_donation_component(self, scorer):
        """Test that composite scoring includes donation component"""
        # Mock the individual scoring methods
        scorer.calculate_expiry_score = Mock(return_value=0.8)
        scorer.calculate_velocity_score = Mock(return_value=0.6)
        scorer.calculate_margin_score = Mock(return_value=0.4)
        scorer.calculate_donation_score = Mock(return_value=0.9)
        
        # Test composite calculation
        composite_score = scorer._calculate_composite_score_with_donation(
            expiry_score=0.8,
            velocity_score=0.6,
            margin_score=0.4,
            donation_score=0.9,
            weights=ScoringWeights()
        )
        
        # Expected: (0.8 * 0.40) + (0.6 * 0.25) + (0.4 * 0.15) + (0.9 * 0.20) = 0.32 + 0.15 + 0.06 + 0.18 = 0.71
        expected_score = 0.71
        assert abs(composite_score - expected_score) < 0.01, f"Expected {expected_score}, got {composite_score}"

    def test_weighted_scoring_distribution(self, scorer):
        """Test that scoring weights are properly distributed"""
        weights = ScoringWeights()
        
        assert weights.expiry == 0.40, "Expiry weight should be 40%"
        assert weights.velocity == 0.25, "Velocity weight should be 25%"
        assert weights.margin == 0.15, "Margin weight should be 15%"
        assert weights.donation == 0.20, "Donation weight should be 20%"
        assert abs(sum([weights.expiry, weights.velocity, weights.margin, weights.donation]) - 1.0) < 0.01, "Weights should sum to 1.0"


class TestDonationEngine:
    """Test the SimplifiedDonationEngine with donation-first logic"""

    @pytest.fixture
    def engine(self):
        """Create SimplifiedDonationEngine instance for testing"""
        return SimplifiedDonationEngine()

    def test_donation_first_strategy_critical_timing(self, engine):
        """Test donation-first approach with critical timing (1 day to expiry)"""
        batch_data = {
            "batch_id": "test_batch_001",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=1),
            "cost_price": 8.0,
            "selling_price": 10.0,
            "current_quantity": 5.0
        }
        
        store_config = {
            "strategy": "donation_first",
            "donation_first_threshold": 0.4,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.7,
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DONATE, f"Should recommend donation, got {recommendation.recommended_action}"
        assert recommendation.priority == DonationPriority.CRITICAL, f"Should be critical priority, got {recommendation.priority}"
        assert "Donation-first approach" in recommendation.notes

    def test_balanced_strategy_logic(self, engine):
        """Test balanced strategy decision logic"""
        batch_data = {
            "batch_id": "test_batch_002",
            "category": "bakery_fresh",
            "expiry_date": date.today() + timedelta(days=2),
            "cost_price": 6.0,
            "selling_price": 10.0,  # 40% margin
            "current_quantity": 10.0
        }
        
        store_config = {
            "strategy": "balanced",
            "donation_first_threshold": 0.6,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        # High AI score should trigger donation with balanced strategy
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.8,
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DONATE, f"High score should recommend donation, got {recommendation.recommended_action}"

    def test_discount_first_strategy_high_margin(self, engine):
        """Test discount-first strategy with high margin products"""
        batch_data = {
            "batch_id": "test_batch_003",
            "category": "dry_goods",
            "expiry_date": date.today() + timedelta(days=1),
            "cost_price": 5.0,
            "selling_price": 10.0,  # 50% margin
            "current_quantity": 8.0
        }
        
        store_config = {
            "strategy": "discount_first",
            "donation_first_threshold": 0.8,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.7,
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DISCOUNT, f"High margin should recommend discount with discount_first strategy, got {recommendation.recommended_action}"

    def test_forced_donation_categories(self, engine):
        """Test forced donation categories override other logic"""
        batch_data = {
            "batch_id": "test_batch_004",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=1),
            "cost_price": 3.0,
            "selling_price": 10.0,  # High margin
            "current_quantity": 15.0
        }
        
        store_config = {
            "strategy": "discount_first",
            "donation_first_threshold": 0.8,
            "force_donation_categories": ["fresh_produce"],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.5,  # Low AI score
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DONATE, f"Forced donation category should override discount_first strategy, got {recommendation.recommended_action}"
        assert "Store policy: forced donation" in recommendation.notes

    def test_low_margin_favors_donation(self, engine):
        """Test that low margin products favor donation over discount"""
        batch_data = {
            "batch_id": "test_batch_005",
            "category": "dairy",
            "expiry_date": date.today() + timedelta(days=1),
            "cost_price": 9.5,
            "selling_price": 10.0,  # 5% margin
            "current_quantity": 6.0
        }
        
        store_config = {
            "strategy": "balanced",
            "donation_first_threshold": 0.6,
            "force_donation_categories": [],
            "min_margin_for_discount": 15.0  # Higher than actual margin
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.7,
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DONATE, f"Low margin should favor donation, got {recommendation.recommended_action}"

    def test_quantity_threshold_for_donation(self, engine):
        """Test minimum quantity threshold for donations"""
        batch_data = {
            "batch_id": "test_batch_006",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=1),
            "cost_price": 4.0,
            "selling_price": 6.0,
            "current_quantity": 0.5  # Below minimum threshold
        }
        
        store_config = {
            "strategy": "donation_first",
            "donation_first_threshold": 0.4,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.8,
            store_donation_config=store_config
        )
        
        assert recommendation.recommended_action == ActionType.DISCOUNT, f"Small quantity should switch to discount, got {recommendation.recommended_action}"
        assert "Quantity too small" in recommendation.notes

    def test_recipient_type_suggestions(self, engine):
        """Test appropriate recipient type suggestions for different categories"""
        # Fresh produce should have multiple recipient options
        fresh_recipients = engine._get_suitable_recipients("fresh_produce")
        assert DonationRecipientType.FOOD_BANK in fresh_recipients
        assert DonationRecipientType.SOUP_KITCHEN in fresh_recipients
        assert DonationRecipientType.ANIMAL_SHELTER in fresh_recipients
        
        # Special handling categories should have limited recipients
        meat_recipients = engine._get_suitable_recipients("fresh_meat_fish")
        assert meat_recipients == [DonationRecipientType.FOOD_BANK]
        
        # Bakery should have community-focused recipients
        bakery_recipients = engine._get_suitable_recipients("bakery_fresh")
        assert DonationRecipientType.SOUP_KITCHEN in bakery_recipients
        assert DonationRecipientType.ELDERLY_CARE in bakery_recipients

    def test_expired_product_disposal(self, engine):
        """Test that expired products are always marked for disposal"""
        batch_data = {
            "batch_id": "test_batch_007",
            "category": "fresh_produce",
            "expiry_date": date.today() - timedelta(days=1),  # Expired
            "cost_price": 4.0,
            "selling_price": 6.0,
            "current_quantity": 10.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.9,
            store_donation_config={"strategy": "donation_first"}
        )
        
        assert recommendation.recommended_action == ActionType.DISPOSE, f"Expired products should be disposed, got {recommendation.recommended_action}"
        assert recommendation.priority == DonationPriority.CRITICAL
        assert "expired" in recommendation.notes.lower()


class TestDonationPreferenceIntegration:
    """Test donation preference system integration"""

    def test_store_preference_config_validation(self):
        """Test store donation preference configuration validation"""
        from app.api.v1.donation_preferences import DonationPreferenceConfig
        
        # Test valid configuration
        valid_config = DonationPreferenceConfig(
            strategy="donation_first",
            donation_first_threshold=0.4,
            force_donation_categories=["fresh_produce"],
            min_margin_for_discount=10.0,
            donation_weight_multiplier=1.5,
            social_impact_weight=0.2
        )
        
        assert valid_config.strategy == "donation_first"
        assert valid_config.donation_first_threshold == 0.4
        assert valid_config.force_donation_categories == ["fresh_produce"]

    def test_donation_preference_defaults(self):
        """Test default values for donation preferences"""
        from app.api.v1.donation_preferences import DonationPreferenceConfig
        
        default_config = DonationPreferenceConfig()
        
        assert default_config.strategy == "balanced"
        assert default_config.donation_first_threshold == 0.6
        assert default_config.force_donation_categories == []
        assert default_config.min_margin_for_discount == 5.0
        assert default_config.donation_weight_multiplier == 1.0
        assert default_config.social_impact_weight == 0.15

    def test_category_donation_suitability(self):
        """Test category-based donation suitability ratings"""
        from app.api.v1.donation_preferences import get_donation_categories
        
        # This would test the endpoint but since it's async, 
        # we'll test the concept via the engine
        engine = SimplifiedDonationEngine()
        
        # Excellent donation categories
        excellent_categories = {"fresh_produce", "bakery_fresh", "dry_goods"}
        for category in excellent_categories:
            assert category in engine.donation_suitable_categories, f"{category} should be donation suitable"
        
        # Special handling categories
        special_categories = {"fresh_meat_fish", "dairy", "frozen"}
        for category in special_categories:
            assert category in engine.special_handling_categories, f"{category} should require special handling"


class TestScoringAPIEnhancement:
    """Test the enhanced scoring API with donation rationale"""

    @pytest.fixture
    def mock_scoring_service(self):
        """Mock scoring service for API testing"""
        service = Mock()
        service.score_store_inventory = AsyncMock()
        return service

    @pytest.mark.asyncio
    async def test_donation_insights_generation(self):
        """Test donation insights generation logic"""
        from app.core.scoring import ScoringService
        
        # Create mock data
        inventory_data = [
            {
                "batch_id": "batch_001",
                "category": "fresh_produce",
                "current_quantity": 10,
                "selling_price": 5.0,
                "cost_price": 3.0,
                "days_to_expiry": 2
            },
            {
                "batch_id": "batch_002", 
                "category": "bakery_fresh",
                "current_quantity": 8,
                "selling_price": 4.0,
                "cost_price": 2.0,
                "days_to_expiry": 1
            }
        ]
        
        score_results = [
            ScoringResult(
                batch_id="batch_001",
                composite_score=0.75,
                expiry_score=0.8,
                velocity_score=0.7,
                margin_score=0.6,
                donation_score=0.85,
                recommendation="donate",
                urgency_level="high",
                discount_percent=0,
                reason="High donation score with balanced strategy",
                ml_enhanced=False,
                confidence_level=0.9,
                calculated_at=datetime.now()
            ),
            ScoringResult(
                batch_id="batch_002",
                composite_score=0.65,
                expiry_score=0.9,
                velocity_score=0.6,
                margin_score=0.5,
                donation_score=0.8,
                recommendation="donate",
                urgency_level="critical",
                discount_percent=0,
                reason="Critical timing for donation",
                ml_enhanced=False,
                confidence_level=0.95,
                calculated_at=datetime.now()
            )
        ]
        
        # Create scorer instance
        mock_db = AsyncMock()
        scorer = InventoryScorer(mock_db)
        
        # Test insights generation
        donation_config = {"strategy": "balanced"}
        insights = await scorer._generate_donation_insights(
            inventory_data, score_results, donation_config
        )
        
        assert "donation_insights" in insights
        assert insights["donation_insights"]["total_donation_suitable"] == 2
        assert insights["donation_insights"]["strategy_applied"] == "balanced"
        assert "recommended_actions" in insights
        assert len(insights["recommended_actions"]["immediate_donations"]) > 0


class TestEdgeCases:
    """Test edge cases and error conditions"""

    def test_missing_store_config_fallback(self):
        """Test fallback behavior when store config is missing"""
        engine = SimplifiedDonationEngine()
        
        batch_data = {
            "batch_id": "test_batch",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=2),
            "cost_price": 4.0,
            "selling_price": 6.0,
            "current_quantity": 5.0
        }
        
        # No store config provided - should use defaults
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=0.7,
            store_donation_config=None
        )
        
        assert recommendation is not None
        assert recommendation.recommended_action in [ActionType.DONATE, ActionType.DISCOUNT, ActionType.MAINTAIN]

    def test_invalid_data_handling(self):
        """Test handling of invalid or missing data"""
        engine = SimplifiedDonationEngine()
        
        invalid_batch_data = {
            "batch_id": "test_batch",
            "category": "",  # Empty category
            "expiry_date": None,  # Missing expiry
            "cost_price": "invalid",  # Invalid price
            "selling_price": 0,  # Zero price
            "current_quantity": -1  # Negative quantity
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=invalid_batch_data,
            ai_score=0.5
        )
        
        # Should return a fallback recommendation
        assert recommendation.recommended_action == ActionType.MAINTAIN
        assert "evaluation failed" in recommendation.notes.lower()

    def test_extreme_values_handling(self):
        """Test handling of extreme values"""
        engine = SimplifiedDonationEngine()
        
        extreme_batch_data = {
            "batch_id": "extreme_test",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=365),  # Very far future
            "cost_price": 1000.0,  # Very high cost
            "selling_price": 2000.0,  # Very high price
            "current_quantity": 10000.0  # Very large quantity
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=extreme_batch_data,
            ai_score=1.0  # Maximum AI score
        )
        
        assert recommendation is not None
        assert recommendation.quantity_affected == 10000.0
        assert recommendation.original_value == 20000000.0  # 10000 * 2000