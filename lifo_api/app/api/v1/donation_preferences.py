"""Donation Preference API Endpoints.

Manages store-level donation vs discount preferences for the donation-first
enhancement system.
"""

from typing import Any, Dict

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from lifo_api.app.auth.secure_dependencies import (
    get_current_user,
    validate_store_access,
)
from lifo_api.app.database.connection import get_db
from lifo_api.app.database.models import StoreSettings, User

logger = structlog.get_logger()
router = APIRouter()


class DonationPreferenceConfig(BaseModel):
    """Donation preference configuration model.

    Defines store-level preferences for donation vs discount decisions.
    """

    strategy: str = Field(
        default="balanced",
        description="Donation strategy: donation_first, balanced, or discount_first"
    )
    donation_first_threshold: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="AI score threshold for donation priority (0.0-1.0)"
    )
    force_donation_categories: list[str] = Field(
        default_factory=list,
        description="Categories that should always prefer donation"
    )
    min_margin_for_discount: float = Field(
        default=5.0,
        ge=0.0,
        le=100.0,
        description="Minimum profit margin % required for discounting"
    )
    donation_weight_multiplier: float = Field(
        default=1.0,
        ge=0.0,
        le=3.0,
        description="Multiplier for donation scoring weight"
    )
    social_impact_weight: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Weight for social impact in scoring"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "strategy": "donation_first",
                "donation_first_threshold": 0.4,
                "force_donation_categories": ["fresh_produce", "bakery_fresh"],
                "min_margin_for_discount": 8.0,
                "donation_weight_multiplier": 1.5,
                "social_impact_weight": 0.2
            }
        }


class DonationPreferenceResponse(BaseModel):
    """Response model for donation preference API.

    Standard response format for donation preference operations.
    """

    store_id: str
    donation_preference_config: DonationPreferenceConfig
    updated_at: str
    message: str = "Donation preferences retrieved successfully"


@router.get(
    "/stores/{store_id}/donation-preferences",
    response_model=DonationPreferenceResponse,
    summary="Get store donation preferences",
    description="Retrieve the current donation vs discount preferences for a specific store"
)
async def get_donation_preferences(
    store_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DonationPreferenceResponse:
    """Get donation preferences for a store.

    Args:
        store_id: Store identifier
        current_user: Authenticated user
        db: Database session

    Returns:
        DonationPreferenceResponse with current settings

    Raises:
        HTTPException: If store access is denied or operation fails
    """

    # Validate store access
    await validate_store_access(store_id, current_user, db)

    try:
        # Query store settings
        result = await db.execute(
            select(StoreSettings).where(StoreSettings.store_id == store_id)
        )
        store_settings = result.scalar_one_or_none()

        if not store_settings:
            # Create default settings if none exist
            default_config = DonationPreferenceConfig()
            store_settings = StoreSettings(
                store_id=store_id,
                donation_preference_config=default_config.model_dump()
            )
            db.add(store_settings)
            await db.commit()

            logger.info(
                "Created default donation preferences for store",
                store_id=store_id,
                user_id=current_user.id
            )

        # Extract donation preferences with defaults
        donation_config: Dict[str, Any] = store_settings.donation_preference_config or {}
        preferences = DonationPreferenceConfig(**donation_config)

        return DonationPreferenceResponse(
            store_id=store_id,
            donation_preference_config=preferences,
            updated_at=store_settings.updated_at.isoformat(),
            message="Donation preferences retrieved successfully"
        )

    except Exception as e:
        logger.error(
            "Failed to get donation preferences",
            store_id=store_id,
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve donation preferences: {str(e)}"
        ) from e


@router.put(
    "/stores/{store_id}/donation-preferences",
    response_model=DonationPreferenceResponse,
    summary="Update store donation preferences",
    description="Update the donation vs discount preferences for a specific store"
)
async def update_donation_preferences(
    store_id: str,
    preferences: DonationPreferenceConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DonationPreferenceResponse:
    """Update donation preferences for a store.

    Args:
        store_id: Store identifier
        preferences: New donation preference configuration
        current_user: Authenticated user
        db: Database session

    Returns:
        DonationPreferenceResponse with updated settings

    Raises:
        HTTPException: If validation fails or operation fails
    """

    # Validate store access
    await validate_store_access(store_id, current_user, db)

    try:
        # Validate strategy value
        valid_strategies = {"donation_first", "balanced", "discount_first"}
        if preferences.strategy not in valid_strategies:
            strategy_list = ", ".join(valid_strategies)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid strategy. Must be one of: {strategy_list}"
            )

        # Check if store settings exist
        result = await db.execute(
            select(StoreSettings).where(StoreSettings.store_id == store_id)
        )
        store_settings = result.scalar_one_or_none()

        if store_settings:
            # Update existing settings
            await db.execute(
                update(StoreSettings)
                .where(StoreSettings.store_id == store_id)
                .values(donation_preference_config=preferences.model_dump())
            )
        else:
            # Create new settings
            store_settings = StoreSettings(
                store_id=store_id,
                donation_preference_config=preferences.model_dump()
            )
            db.add(store_settings)

        await db.commit()

        # Refresh to get updated timestamp
        await db.refresh(store_settings)

        logger.info(
            "Updated donation preferences for store",
            store_id=store_id,
            user_id=current_user.id,
            strategy=preferences.strategy,
            threshold=preferences.donation_first_threshold
        )

        return DonationPreferenceResponse(
            store_id=store_id,
            donation_preference_config=preferences,
            updated_at=store_settings.updated_at.isoformat(),
            message="Donation preferences updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "Failed to update donation preferences",
            store_id=store_id,
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update donation preferences: {str(e)}"
        ) from e


@router.get(
    "/donation-strategies",
    summary="Get available donation strategies",
    description="Get list of available donation strategies with descriptions"
)
async def get_donation_strategies() -> dict[str, Any]:
    """Get available donation strategies and their descriptions.

    Returns:
        Dictionary with available strategies and their details
    """

    strategies = {
        "donation_first": {
            "name": "Donation First",
            "description": "Prioritize donation over discounting for maximum social impact",
            "donation_threshold": 0.4,
            "recommended_for": "Stores focused on social responsibility and community impact"
        },
        "balanced": {
            "name": "Balanced Approach",
            "description": "Balance donation and discount based on business factors",
            "donation_threshold": 0.6,
            "recommended_for": "Most stores seeking optimal balance of profit and social impact"
        },
        "discount_first": {
            "name": "Discount First",
            "description": "Prioritize discounting for revenue recovery, donate when margin is low",
            "donation_threshold": 0.8,
            "recommended_for": "Stores with tight margins requiring maximum revenue recovery"
        }
    }

    return {
        "strategies": strategies,
        "default": "balanced",
        "message": "Available donation strategies"
    }


@router.get(
    "/donation-categories",
    summary="Get donation suitable categories",
    description="Get list of product categories suitable for different types of donations"
)
async def get_donation_categories() -> dict[str, Any]:
    """Get product categories and their donation suitability.

    Returns:
        Dictionary with categories grouped by donation suitability level
    """

    categories = {
        "excellent": {
            "categories": [
                "fresh_produce", "bakery_fresh", "dry_goods", "canned_jarred",
                "beverages", "spices_condiments", "snacks", "pantry"
            ],
            "description": "Ideal for donation - high community value, easy handling",
            "donation_score_bonus": 0.4
        },
        "good": {
            "categories": ["dairy", "frozen", "deli_prepared"],
            "description": "Good for donation with proper handling and certified partners",
            "donation_score_bonus": 0.3
        },
        "suitable": {
            "categories": ["household", "personal_care", "baby_products"],
            "description": "Suitable for specific donation partners and programs",
            "donation_score_bonus": 0.2
        },
        "limited": {
            "categories": ["fresh_meat_fish", "alcohol", "tobacco"],
            "description": "Limited donation options due to regulations or handling requirements",
            "donation_score_bonus": 0.1
        }
    }

    return {
        "categories": categories,
        "message": "Product categories and donation suitability"
    }
