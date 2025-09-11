"""
Unit tests for donation preference API endpoints
Tests the new donation preference management system
"""

import pytest
from unittest.mock import AsyncMock, Mock
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.donation_preferences import (
    DonationPreferenceConfig, 
    DonationPreferenceResponse,
    get_donation_preferences,
    update_donation_preferences,
    get_donation_strategies,
    get_donation_categories
)
from app.database.inventory_models import StoreSettings
from app.database.models import User


class TestDonationPreferenceConfig:
    """Test the DonationPreferenceConfig Pydantic model"""
    
    def test_default_values(self):
        """Test default configuration values"""
        config = DonationPreferenceConfig()
        
        assert config.strategy == "balanced"
        assert config.donation_first_threshold == 0.6
        assert config.force_donation_categories == []
        assert config.min_margin_for_discount == 5.0
        assert config.donation_weight_multiplier == 1.0
        assert config.social_impact_weight == 0.15

    def test_valid_configuration(self):
        """Test valid configuration creation"""
        config = DonationPreferenceConfig(
            strategy="donation_first",
            donation_first_threshold=0.4,
            force_donation_categories=["fresh_produce", "bakery_fresh"],
            min_margin_for_discount=8.0,
            donation_weight_multiplier=1.5,
            social_impact_weight=0.2
        )
        
        assert config.strategy == "donation_first"
        assert config.donation_first_threshold == 0.4
        assert len(config.force_donation_categories) == 2
        assert config.min_margin_for_discount == 8.0
        assert config.donation_weight_multiplier == 1.5
        assert config.social_impact_weight == 0.2

    def test_threshold_validation(self):
        """Test validation of threshold values"""
        # Valid thresholds
        valid_config = DonationPreferenceConfig(donation_first_threshold=0.5)
        assert valid_config.donation_first_threshold == 0.5
        
        # Test edge cases
        edge_config1 = DonationPreferenceConfig(donation_first_threshold=0.0)
        assert edge_config1.donation_first_threshold == 0.0
        
        edge_config2 = DonationPreferenceConfig(donation_first_threshold=1.0)
        assert edge_config2.donation_first_threshold == 1.0

    def test_margin_validation(self):
        """Test validation of margin values"""
        valid_config = DonationPreferenceConfig(min_margin_for_discount=10.0)
        assert valid_config.min_margin_for_discount == 10.0
        
        # Edge cases
        zero_config = DonationPreferenceConfig(min_margin_for_discount=0.0)
        assert zero_config.min_margin_for_discount == 0.0
        
        high_config = DonationPreferenceConfig(min_margin_for_discount=100.0)
        assert high_config.min_margin_for_discount == 100.0

    def test_multiplier_validation(self):
        """Test validation of multiplier values"""
        valid_config = DonationPreferenceConfig(donation_weight_multiplier=2.5)
        assert valid_config.donation_weight_multiplier == 2.5
        
        # Edge cases
        min_config = DonationPreferenceConfig(donation_weight_multiplier=0.0)
        assert min_config.donation_weight_multiplier == 0.0
        
        max_config = DonationPreferenceConfig(donation_weight_multiplier=3.0)
        assert max_config.donation_weight_multiplier == 3.0

    def test_social_impact_weight_validation(self):
        """Test validation of social impact weight values"""
        valid_config = DonationPreferenceConfig(social_impact_weight=0.25)
        assert valid_config.social_impact_weight == 0.25
        
        # Edge cases
        min_config = DonationPreferenceConfig(social_impact_weight=0.0)
        assert min_config.social_impact_weight == 0.0
        
        max_config = DonationPreferenceConfig(social_impact_weight=0.5)
        assert max_config.social_impact_weight == 0.5


class TestDonationPreferenceEndpoints:
    """Test donation preference API endpoints"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_user(self):
        """Mock user object"""
        user = Mock(spec=User)
        user.id = "test_user_123"
        return user

    @pytest.fixture
    def sample_store_settings(self):
        """Sample store settings with donation config"""
        settings = Mock(spec=StoreSettings)
        settings.store_id = "store_123"
        settings.donation_preference_config = {
            "strategy": "donation_first",
            "donation_first_threshold": 0.4,
            "force_donation_categories": ["fresh_produce"],
            "min_margin_for_discount": 10.0,
            "donation_weight_multiplier": 1.2,
            "social_impact_weight": 0.18
        }
        settings.updated_at = "2024-01-01T12:00:00"
        return settings

    @pytest.mark.asyncio
    async def test_get_donation_preferences_existing_settings(self, mock_db, mock_user, sample_store_settings):
        """Test retrieving existing donation preferences"""
        # Mock database query
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_store_settings
        mock_db.execute.return_value = mock_result
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        # Patch the validate_store_access function
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        response = await get_donation_preferences("store_123", mock_user, mock_db)
        
        assert isinstance(response, DonationPreferenceResponse)
        assert response.store_id == "store_123"
        assert response.donation_preference_config.strategy == "donation_first"
        assert response.donation_preference_config.donation_first_threshold == 0.4

    @pytest.mark.asyncio
    async def test_get_donation_preferences_create_default(self, mock_db, mock_user):
        """Test creating default preferences when none exist"""
        # Mock database query returning None
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        response = await get_donation_preferences("store_123", mock_user, mock_db)
        
        # Should create default settings
        assert mock_db.add.called
        assert mock_db.commit.called
        
        assert isinstance(response, DonationPreferenceResponse)
        assert response.store_id == "store_123"
        assert response.donation_preference_config.strategy == "balanced"  # Default
        assert response.donation_preference_config.donation_first_threshold == 0.6  # Default

    @pytest.mark.asyncio
    async def test_update_donation_preferences_existing_store(self, mock_db, mock_user, sample_store_settings):
        """Test updating existing store preferences"""
        new_preferences = DonationPreferenceConfig(
            strategy="balanced",
            donation_first_threshold=0.5,
            force_donation_categories=["bakery_fresh"],
            min_margin_for_discount=12.0
        )
        
        # Mock database operations
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_store_settings
        mock_db.execute.return_value = mock_result
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        response = await update_donation_preferences("store_123", new_preferences, mock_user, mock_db)
        
        # Should update existing settings
        assert mock_db.execute.call_count >= 2  # Query + Update
        assert mock_db.commit.called
        assert mock_db.refresh.called
        
        assert isinstance(response, DonationPreferenceResponse)
        assert response.store_id == "store_123"
        assert response.donation_preference_config.strategy == "balanced"
        assert response.donation_preference_config.donation_first_threshold == 0.5

    @pytest.mark.asyncio
    async def test_update_donation_preferences_new_store(self, mock_db, mock_user):
        """Test creating preferences for new store"""
        new_preferences = DonationPreferenceConfig(
            strategy="donation_first",
            donation_first_threshold=0.3
        )
        
        # Mock database query returning None (no existing settings)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Mock the created settings object
        mock_created_settings = Mock(spec=StoreSettings)
        mock_created_settings.updated_at = "2024-01-01T12:00:00"
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        response = await update_donation_preferences("store_123", new_preferences, mock_user, mock_db)
        
        # Should create new settings
        assert mock_db.add.called
        assert mock_db.commit.called
        
        assert isinstance(response, DonationPreferenceResponse)
        assert response.store_id == "store_123"
        assert response.donation_preference_config.strategy == "donation_first"

    @pytest.mark.asyncio
    async def test_update_donation_preferences_invalid_strategy(self, mock_db, mock_user):
        """Test validation of invalid strategy"""
        invalid_preferences = DonationPreferenceConfig()
        invalid_preferences.strategy = "invalid_strategy"  # Set invalid strategy manually
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        with pytest.raises(HTTPException) as exc_info:
            await update_donation_preferences("store_123", invalid_preferences, mock_user, mock_db)
        
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid strategy" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_donation_preferences_database_error(self, mock_db, mock_user):
        """Test handling of database errors during update"""
        valid_preferences = DonationPreferenceConfig(strategy="balanced")
        
        # Mock database error
        mock_db.execute.side_effect = Exception("Database connection failed")
        
        # Mock validation
        async def mock_validate_store_access(store_id, user_id, db):
            pass
        
        import app.api.v1.donation_preferences as dp_module
        dp_module.validate_store_access = mock_validate_store_access
        
        with pytest.raises(HTTPException) as exc_info:
            await update_donation_preferences("store_123", valid_preferences, mock_user, mock_db)
        
        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to update donation preferences" in str(exc_info.value.detail)
        assert mock_db.rollback.called

    @pytest.mark.asyncio
    async def test_get_donation_strategies(self):
        """Test getting available donation strategies"""
        strategies = await get_donation_strategies()
        
        assert "strategies" in strategies
        assert "donation_first" in strategies["strategies"]
        assert "balanced" in strategies["strategies"] 
        assert "discount_first" in strategies["strategies"]
        assert strategies["default"] == "balanced"
        
        # Check strategy details
        donation_first = strategies["strategies"]["donation_first"]
        assert donation_first["donation_threshold"] == 0.4
        assert "social responsibility" in donation_first["description"].lower()
        
        balanced = strategies["strategies"]["balanced"]
        assert balanced["donation_threshold"] == 0.6
        assert "balance" in balanced["description"].lower()
        
        discount_first = strategies["strategies"]["discount_first"]
        assert discount_first["donation_threshold"] == 0.8
        assert "revenue recovery" in discount_first["description"].lower()

    @pytest.mark.asyncio
    async def test_get_donation_categories(self):
        """Test getting donation suitable categories"""
        categories = await get_donation_categories()
        
        assert "categories" in categories
        assert "excellent" in categories["categories"]
        assert "good" in categories["categories"]
        assert "suitable" in categories["categories"]
        assert "limited" in categories["categories"]
        
        # Check category details
        excellent = categories["categories"]["excellent"]
        assert "fresh_produce" in excellent["categories"]
        assert "bakery_fresh" in excellent["categories"]
        assert excellent["donation_score_bonus"] == 0.4
        
        good = categories["categories"]["good"]
        assert "dairy" in good["categories"]
        assert "frozen" in good["categories"]
        assert good["donation_score_bonus"] == 0.3
        
        suitable = categories["categories"]["suitable"]
        assert "household" in suitable["categories"]
        assert "personal_care" in suitable["categories"]
        assert suitable["donation_score_bonus"] == 0.2
        
        limited = categories["categories"]["limited"]
        assert "fresh_meat_fish" in limited["categories"]
        assert "alcohol" in limited["categories"]
        assert limited["donation_score_bonus"] == 0.1


class TestDonationPreferenceValidation:
    """Test validation logic for donation preferences"""

    def test_strategy_validation(self):
        """Test strategy validation logic"""
        valid_strategies = {"donation_first", "balanced", "discount_first"}
        
        for strategy in valid_strategies:
            config = DonationPreferenceConfig(strategy=strategy)
            assert config.strategy == strategy

    def test_category_list_validation(self):
        """Test force donation categories validation"""
        valid_categories = ["fresh_produce", "bakery_fresh", "dairy", "frozen"]
        
        config = DonationPreferenceConfig(force_donation_categories=valid_categories)
        assert config.force_donation_categories == valid_categories
        
        # Empty list should be valid
        empty_config = DonationPreferenceConfig(force_donation_categories=[])
        assert empty_config.force_donation_categories == []

    def test_numeric_bounds_validation(self):
        """Test numeric value bounds validation"""
        # Test valid bounds
        config = DonationPreferenceConfig(
            donation_first_threshold=0.5,
            min_margin_for_discount=15.0,
            donation_weight_multiplier=2.0,
            social_impact_weight=0.3
        )
        
        assert config.donation_first_threshold == 0.5
        assert config.min_margin_for_discount == 15.0
        assert config.donation_weight_multiplier == 2.0
        assert config.social_impact_weight == 0.3

    def test_configuration_serialization(self):
        """Test configuration serialization to/from dict"""
        original_config = DonationPreferenceConfig(
            strategy="donation_first",
            donation_first_threshold=0.4,
            force_donation_categories=["fresh_produce", "bakery_fresh"],
            min_margin_for_discount=8.0,
            donation_weight_multiplier=1.5,
            social_impact_weight=0.2
        )
        
        # Convert to dict
        config_dict = original_config.dict()
        
        # Recreate from dict
        recreated_config = DonationPreferenceConfig(**config_dict)
        
        assert recreated_config.strategy == original_config.strategy
        assert recreated_config.donation_first_threshold == original_config.donation_first_threshold
        assert recreated_config.force_donation_categories == original_config.force_donation_categories
        assert recreated_config.min_margin_for_discount == original_config.min_margin_for_discount
        assert recreated_config.donation_weight_multiplier == original_config.donation_weight_multiplier
        assert recreated_config.social_impact_weight == original_config.social_impact_weight


class TestDonationPreferenceResponse:
    """Test the DonationPreferenceResponse model"""

    def test_response_model_creation(self):
        """Test creating response model"""
        config = DonationPreferenceConfig(strategy="balanced")
        
        response = DonationPreferenceResponse(
            store_id="store_123",
            donation_preference_config=config,
            updated_at="2024-01-01T12:00:00Z"
        )
        
        assert response.store_id == "store_123"
        assert response.donation_preference_config.strategy == "balanced"
        assert response.updated_at == "2024-01-01T12:00:00Z"
        assert response.message == "Donation preferences retrieved successfully"

    def test_response_model_with_custom_message(self):
        """Test response model with custom message"""
        config = DonationPreferenceConfig()
        
        response = DonationPreferenceResponse(
            store_id="store_456",
            donation_preference_config=config,
            updated_at="2024-01-01T12:00:00Z",
            message="Custom message"
        )
        
        assert response.message == "Custom message"