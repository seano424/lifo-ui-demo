"""
Integration tests for donation-first enhancement
Tests the full system integration from API to database
"""

import pytest
import asyncio
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
from httpx import AsyncClient
from fastapi import status

from app.main import app
from app.database.models import User
from app.database.inventory_models import StoreSettings
from app.core.scoring import ScoringService, InventoryScorer
from app.core.donation_engine import SimplifiedDonationEngine


class TestDonationFirstScoringIntegration:
    """Test full integration of donation-first scoring system"""

    @pytest.fixture
    async def client(self):
        """Create test client"""
        async with AsyncClient(app=app, base_url="http://testserver") as ac:
            yield ac

    @pytest.fixture
    def mock_auth_user(self):
        """Mock authenticated user"""
        user = Mock(spec=User)
        user.id = "test_user_123"
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def sample_inventory_data(self):
        """Sample inventory data for testing"""
        return [
            {
                "batch_id": "batch_001",
                "sku": "PROD_001",
                "category": "fresh_produce",
                "product_name": "Fresh Apples",
                "current_quantity": 15.0,
                "selling_price": 3.99,
                "cost_price": 2.50,
                "expiry_date": date.today() + timedelta(days=2),
                "days_to_expiry": 2
            },
            {
                "batch_id": "batch_002", 
                "sku": "PROD_002",
                "category": "bakery_fresh",
                "product_name": "Fresh Bread",
                "current_quantity": 8.0,
                "selling_price": 4.50,
                "cost_price": 2.00,
                "expiry_date": date.today() + timedelta(days=1),
                "days_to_expiry": 1
            },
            {
                "batch_id": "batch_003",
                "sku": "PROD_003", 
                "category": "dairy",
                "product_name": "Milk",
                "current_quantity": 12.0,
                "selling_price": 2.99,
                "cost_price": 2.20,
                "expiry_date": date.today() + timedelta(days=3),
                "days_to_expiry": 3
            }
        ]

    @pytest.mark.asyncio
    async def test_enhanced_scoring_api_with_donation_rationale(self, client, mock_auth_user, sample_inventory_data):
        """Test scoring API with donation rationale enabled"""
        store_id = "test_store_001"
        
        with patch('app.auth.secure_dependencies.get_current_user', return_value=mock_auth_user):
            with patch('app.core.scoring.create_scoring_service') as mock_create_service:
                # Mock scoring service
                mock_service = Mock(spec=ScoringService)
                mock_service.score_store_inventory = AsyncMock()
                
                # Mock the response with donation insights
                mock_response = {
                    "store_id": store_id,
                    "total_items": 3,
                    "processed": 3,
                    "high_priority_count": 2,
                    "processing_time_ms": 150,
                    "errors": [],
                    "donation_insights": {
                        "total_donation_suitable": 2,
                        "total_discount_recommended": 1,
                        "donation_value": 95.85,
                        "discount_value": 35.88,
                        "donation_percentage": 66.7,
                        "strategy_applied": "balanced",
                        "category_breakdown": {
                            "fresh_produce": {"count": 1, "value": 59.85},
                            "bakery_fresh": {"count": 1, "value": 36.0}
                        }
                    },
                    "donation_suitable_categories": ["fresh_produce", "bakery_fresh"],
                    "recommended_actions": {
                        "immediate_donations": [
                            {
                                "batch_id": "batch_002",
                                "days_to_expiry": 1,
                                "rationale": "High donation score with balanced strategy"
                            }
                        ],
                        "planned_donations": [
                            {
                                "batch_id": "batch_001", 
                                "days_to_expiry": 2,
                                "rationale": "Good donation opportunity"
                            }
                        ]
                    }
                }
                
                mock_service.score_store_inventory.return_value = mock_response
                mock_create_service.return_value = mock_service
                
                # Make API request with donation rationale
                response = await client.post(
                    f"/api/v1/scoring/batch/{store_id}",
                    params={
                        "include_donation_rationale": True,
                        "save_to_database": False
                    }
                )
                
                assert response.status_code == status.HTTP_200_OK
                
                data = response.json()
                assert data["store_id"] == store_id
                assert "donation_insights" in data
                assert data["donation_insights"]["total_donation_suitable"] == 2
                assert data["donation_insights"]["strategy_applied"] == "balanced"
                assert "recommended_actions" in data
                assert len(data["recommended_actions"]["immediate_donations"]) == 1

    @pytest.mark.asyncio
    async def test_donation_preference_api_integration(self, client, mock_auth_user):
        """Test donation preference API endpoints integration"""
        store_id = "test_store_002"
        
        with patch('app.auth.secure_dependencies.get_current_user', return_value=mock_auth_user):
            with patch('app.api.v1.donation_preferences.validate_store_access'):
                with patch('app.database.connection.get_db') as mock_get_db:
                    # Mock database session
                    mock_db = AsyncMock()
                    mock_get_db.return_value = mock_db
                    
                    # Mock store settings query result
                    mock_result = Mock()
                    mock_result.scalar_one_or_none.return_value = None  # No existing settings
                    mock_db.execute.return_value = mock_result
                    
                    # Test GET - should create default preferences
                    get_response = await client.get(f"/api/v1/donation-preferences/stores/{store_id}/donation-preferences")
                    
                    assert get_response.status_code == status.HTTP_200_OK
                    get_data = get_response.json()
                    assert get_data["store_id"] == store_id
                    assert get_data["donation_preference_config"]["strategy"] == "balanced"
                    
                    # Test PUT - update preferences
                    update_payload = {
                        "strategy": "donation_first",
                        "donation_first_threshold": 0.4,
                        "force_donation_categories": ["fresh_produce"],
                        "min_margin_for_discount": 8.0,
                        "donation_weight_multiplier": 1.5,
                        "social_impact_weight": 0.2
                    }
                    
                    # Mock updated store settings
                    mock_updated_settings = Mock(spec=StoreSettings)
                    mock_updated_settings.updated_at = datetime.now()
                    mock_db.refresh = AsyncMock()
                    
                    put_response = await client.put(
                        f"/api/v1/donation-preferences/stores/{store_id}/donation-preferences",
                        json=update_payload
                    )
                    
                    assert put_response.status_code == status.HTTP_200_OK
                    put_data = put_response.json()
                    assert put_data["donation_preference_config"]["strategy"] == "donation_first"
                    assert put_data["donation_preference_config"]["donation_first_threshold"] == 0.4

    @pytest.mark.asyncio 
    async def test_donation_strategies_endpoint(self, client):
        """Test donation strategies information endpoint"""
        response = await client.get("/api/v1/donation-preferences/donation-strategies")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "strategies" in data
        assert len(data["strategies"]) == 3
        assert "donation_first" in data["strategies"]
        assert "balanced" in data["strategies"]
        assert "discount_first" in data["strategies"]
        assert data["default"] == "balanced"

    @pytest.mark.asyncio
    async def test_donation_categories_endpoint(self, client):
        """Test donation categories information endpoint"""
        response = await client.get("/api/v1/donation-preferences/donation-categories")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "categories" in data
        assert "excellent" in data["categories"]
        assert "good" in data["categories"] 
        assert "suitable" in data["categories"]
        assert "limited" in data["categories"]

    @pytest.mark.asyncio
    async def test_end_to_end_donation_workflow(self, client, mock_auth_user, sample_inventory_data):
        """Test complete end-to-end donation workflow"""
        store_id = "test_store_e2e"
        
        with patch('app.auth.secure_dependencies.get_current_user', return_value=mock_auth_user):
            with patch('app.api.v1.donation_preferences.validate_store_access'):
                with patch('app.database.connection.get_db') as mock_get_db:
                    mock_db = AsyncMock()
                    mock_get_db.return_value = mock_db
                    
                    # Step 1: Set up donation-first preferences
                    preferences_payload = {
                        "strategy": "donation_first",
                        "donation_first_threshold": 0.4,
                        "force_donation_categories": ["fresh_produce", "bakery_fresh"],
                        "min_margin_for_discount": 10.0
                    }
                    
                    # Mock store settings for preferences
                    mock_result = Mock()
                    mock_result.scalar_one_or_none.return_value = None
                    mock_db.execute.return_value = mock_result
                    mock_db.refresh = AsyncMock()
                    
                    prefs_response = await client.put(
                        f"/api/v1/donation-preferences/stores/{store_id}/donation-preferences",
                        json=preferences_payload
                    )
                    assert prefs_response.status_code == status.HTTP_200_OK
                    
                    # Step 2: Run scoring with donation rationale
                    with patch('app.core.scoring.create_scoring_service') as mock_create_service:
                        mock_service = Mock()
                        
                        # Create realistic donation-first scoring results
                        mock_scoring_response = {
                            "store_id": store_id,
                            "total_items": 3,
                            "processed": 3,
                            "high_priority_count": 3,  # All high priority due to donation-first
                            "processing_time_ms": 200,
                            "errors": [],
                            "donation_insights": {
                                "total_donation_suitable": 3,  # All suitable for donation
                                "total_discount_recommended": 0,
                                "donation_value": 131.73,  # Total value suitable for donation
                                "discount_value": 0.0,
                                "donation_percentage": 100.0,
                                "strategy_applied": "donation_first",
                                "category_breakdown": {
                                    "fresh_produce": {"count": 1, "value": 59.85},
                                    "bakery_fresh": {"count": 1, "value": 36.0},
                                    "dairy": {"count": 1, "value": 35.88}
                                }
                            },
                            "donation_suitable_categories": ["fresh_produce", "bakery_fresh", "dairy"],
                            "recommended_actions": {
                                "immediate_donations": [
                                    {
                                        "batch_id": "batch_002",
                                        "category": "bakery_fresh",
                                        "days_to_expiry": 1,
                                        "rationale": "Store policy: forced donation for this category"
                                    }
                                ],
                                "planned_donations": [
                                    {
                                        "batch_id": "batch_001",
                                        "category": "fresh_produce", 
                                        "days_to_expiry": 2,
                                        "rationale": "Store policy: forced donation for this category"
                                    },
                                    {
                                        "batch_id": "batch_003",
                                        "category": "dairy",
                                        "days_to_expiry": 3,
                                        "rationale": "Donation-first strategy with low threshold"
                                    }
                                ]
                            }
                        }
                        
                        mock_service.score_store_inventory = AsyncMock(return_value=mock_scoring_response)
                        mock_create_service.return_value = mock_service
                        
                        # Mock StoreSettings query for scoring API
                        scoring_response = await client.post(
                            f"/api/v1/scoring/batch/{store_id}",
                            params={
                                "include_donation_rationale": True,
                                "save_to_database": False
                            }
                        )
                        
                        assert scoring_response.status_code == status.HTTP_200_OK
                        scoring_data = scoring_response.json()
                        
                        # Verify donation-first strategy results
                        assert scoring_data["donation_insights"]["total_donation_suitable"] == 3
                        assert scoring_data["donation_insights"]["donation_percentage"] == 100.0
                        assert scoring_data["donation_insights"]["strategy_applied"] == "donation_first"
                        assert len(scoring_data["recommended_actions"]["immediate_donations"]) == 1
                        assert len(scoring_data["recommended_actions"]["planned_donations"]) == 2


class TestDonationEngineIntegration:
    """Test donation engine integration with scoring system"""

    @pytest.fixture
    def donation_engine(self):
        """Create donation engine instance"""
        return SimplifiedDonationEngine()

    @pytest.fixture
    def inventory_scorer(self):
        """Create inventory scorer instance"""
        mock_db = AsyncMock()
        return InventoryScorer(mock_db)

    def test_donation_engine_scorer_integration(self, donation_engine, inventory_scorer):
        """Test integration between donation engine and scorer"""
        # Sample batch data
        batch_data = {
            "batch_id": "integration_test_001",
            "category": "fresh_produce",
            "expiry_date": date.today() + timedelta(days=2),
            "cost_price": 3.0,
            "selling_price": 5.0,
            "current_quantity": 10.0
        }
        
        # Store configuration
        store_config = {
            "strategy": "donation_first",
            "donation_first_threshold": 0.4,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0,
            "donation_weight_multiplier": 1.3
        }
        
        # Test donation scoring
        donation_score = inventory_scorer.calculate_donation_score(
            category="fresh_produce",
            margin_percent=40.0,  # (5-3)/5 * 100
            days_to_expiry=2,
            store_donation_strategy="donation_first",
            donation_multiplier=1.3
        )
        
        # Test action recommendation
        recommendation = donation_engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=donation_score,
            store_donation_config=store_config
        )
        
        # Verify integration
        assert donation_score >= 0.6, f"Donation score should be high for fresh produce: {donation_score}"
        assert recommendation.recommended_action.value in ["donate", "discount"], f"Should recommend donation or discount: {recommendation.recommended_action}"
        assert recommendation.ai_score == donation_score
        assert len(recommendation.decision_factors) > 0

    def test_category_specific_integration(self, donation_engine, inventory_scorer):
        """Test category-specific integration logic"""
        categories_to_test = [
            ("fresh_produce", "excellent donation category"),
            ("bakery_fresh", "excellent donation category"),
            ("dairy", "good donation category with special handling"),
            ("fresh_meat_fish", "limited donation options"),
            ("household", "suitable for specific programs")
        ]
        
        for category, description in categories_to_test:
            # Calculate donation score
            donation_score = inventory_scorer.calculate_donation_score(
                category=category,
                margin_percent=20.0,
                days_to_expiry=2,
                store_donation_strategy="balanced"
            )
            
            # Get recipient suggestions
            recipients = donation_engine._get_suitable_recipients(category)
            
            # Verify category-appropriate handling
            assert isinstance(donation_score, float), f"Donation score should be float for {category}"
            assert 0.0 <= donation_score <= 1.0, f"Donation score should be 0-1 for {category}: {donation_score}"
            assert len(recipients) > 0, f"Should have recipient suggestions for {category}"
            
            # Special handling categories should have limited recipients
            if category in ["fresh_meat_fish", "dairy", "frozen"]:
                assert len(recipients) <= 3, f"Special handling category {category} should have limited recipients"

    def test_scoring_weights_integration(self, inventory_scorer):
        """Test integration of enhanced scoring weights"""
        # Test that all components are properly weighted
        test_scores = {
            "expiry_score": 0.8,
            "velocity_score": 0.6,
            "margin_score": 0.4,
            "donation_score": 0.9
        }
        
        composite_score = inventory_scorer._calculate_composite_score_with_donation(**test_scores)
        
        # Calculate expected score manually
        expected = (0.8 * 0.40) + (0.6 * 0.25) + (0.4 * 0.15) + (0.9 * 0.20)
        expected = 0.32 + 0.15 + 0.06 + 0.18  # = 0.71
        
        assert abs(composite_score - expected) < 0.01, f"Expected {expected}, got {composite_score}"

    def test_store_preference_impact_integration(self, donation_engine, inventory_scorer):
        """Test impact of store preferences on integrated scoring"""
        batch_data = {
            "batch_id": "pref_test_001",
            "category": "bakery_fresh", 
            "expiry_date": date.today() + timedelta(days=2),
            "cost_price": 2.0,
            "selling_price": 4.0,
            "current_quantity": 8.0
        }
        
        strategies = ["donation_first", "balanced", "discount_first"]
        recommendations = {}
        
        for strategy in strategies:
            store_config = {
                "strategy": strategy,
                "donation_first_threshold": {
                    "donation_first": 0.4,
                    "balanced": 0.6,
                    "discount_first": 0.8
                }[strategy],
                "force_donation_categories": [],
                "min_margin_for_discount": 5.0
            }
            
            # Calculate donation score with strategy
            donation_score = inventory_scorer.calculate_donation_score(
                category="bakery_fresh",
                margin_percent=50.0,
                days_to_expiry=2,
                store_donation_strategy=strategy
            )
            
            # Get recommendation
            recommendation = donation_engine.evaluate_action_recommendation(
                batch_data=batch_data,
                ai_score=donation_score,
                store_donation_config=store_config
            )
            
            recommendations[strategy] = {
                "donation_score": donation_score,
                "action": recommendation.recommended_action,
                "reasoning": recommendation.notes
            }
        
        # Verify strategy impacts
        donation_first_score = recommendations["donation_first"]["donation_score"]
        balanced_score = recommendations["balanced"]["donation_score"] 
        discount_first_score = recommendations["discount_first"]["donation_score"]
        
        assert donation_first_score >= balanced_score, "Donation-first should have higher donation scores"
        assert balanced_score >= discount_first_score, "Balanced should have higher donation scores than discount-first"


class TestErrorHandlingIntegration:
    """Test error handling in integrated donation system"""

    @pytest.mark.asyncio
    async def test_database_error_handling(self, client, mock_auth_user):
        """Test handling of database errors in donation preference API"""
        store_id = "error_test_store"
        
        with patch('app.auth.secure_dependencies.get_current_user', return_value=mock_auth_user):
            with patch('app.api.v1.donation_preferences.validate_store_access'):
                with patch('app.database.connection.get_db') as mock_get_db:
                    # Mock database error
                    mock_db = AsyncMock()
                    mock_db.execute.side_effect = Exception("Database connection failed")
                    mock_get_db.return_value = mock_db
                    
                    response = await client.get(f"/api/v1/donation-preferences/stores/{store_id}/donation-preferences")
                    
                    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
                    assert "Failed to retrieve donation preferences" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_scoring_service_error_handling(self, client, mock_auth_user):
        """Test handling of scoring service errors"""
        store_id = "scoring_error_store"
        
        with patch('app.auth.secure_dependencies.get_current_user', return_value=mock_auth_user):
            with patch('app.core.scoring.create_scoring_service') as mock_create_service:
                # Mock scoring service error
                mock_service = Mock()
                mock_service.score_store_inventory = AsyncMock(side_effect=Exception("Scoring failed"))
                mock_create_service.return_value = mock_service
                
                response = await client.post(f"/api/v1/scoring/batch/{store_id}")
                
                assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
                assert "Scoring failed" in response.json()["detail"]

    def test_invalid_data_fallback_integration(self):
        """Test fallback behavior with invalid data"""
        engine = SimplifiedDonationEngine()
        
        # Test with completely invalid data
        invalid_data = {
            "batch_id": None,
            "category": "",
            "expiry_date": "invalid_date",
            "cost_price": "not_a_number",
            "selling_price": -1,
            "current_quantity": None
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=invalid_data,
            ai_score=0.5
        )
        
        # Should return fallback recommendation
        assert recommendation.recommended_action.value == "maintain"
        assert "evaluation failed" in recommendation.notes.lower()
        assert recommendation.priority.value == "low"