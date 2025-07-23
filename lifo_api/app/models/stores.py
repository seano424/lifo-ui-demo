"""
Pydantic models for store-related API endpoints
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.models.base import ConfigurableModel, StoreType, TimestampMixin, UserRole


# Request Models
class StoreUpdateRequest(BaseModel):
    """Request to update store information"""

    store_name: Optional[str] = Field(None, max_length=255, description="Store name")
    business_name: Optional[str] = Field(
        None, max_length=255, description="Business name"
    )
    address: Optional[str] = Field(None, description="Store address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    store_type: Optional[StoreType] = None
    default_markup_percent: Optional[float] = Field(
        None, ge=0, le=100, description="Default markup percentage"
    )


class StoreUserRequest(BaseModel):
    """Request to add/update store user"""

    user_email: str = Field(..., description="User email to add to store")
    role_in_store: UserRole = Field(default=UserRole.STAFF, description="Role in store")
    permissions: Optional[dict[str, bool]] = Field(
        default={
            "can_upload_inventory": True,
            "can_apply_discounts": False,
            "can_view_analytics": True,
        },
        description="User permissions",
    )


class StoreSettingsRequest(BaseModel):
    """Request to update store settings"""

    scoring_weights: Optional[dict[str, float]] = Field(
        None, description="Scoring weights configuration"
    )
    thresholds: Optional[dict[str, float]] = Field(None, description="Alert thresholds")
    notifications: Optional[dict[str, bool]] = Field(
        None, description="Notification settings"
    )
    business_hours: Optional[dict[str, dict[str, str]]] = Field(
        None, description="Business hours"
    )
    currency: Optional[str] = Field(None, max_length=3, description="Store currency")
    timezone: Optional[str] = Field(None, max_length=50, description="Store timezone")

    @validator("scoring_weights")
    def validate_scoring_weights(cls, v):
        if v is not None:
            required_keys = {"expiry", "velocity", "margin"}
            if not all(key in v for key in required_keys):
                raise ValueError(
                    f"Missing required weights: {required_keys - set(v.keys())}"
                )

            total = sum(v.values())
            if abs(total - 1.0) > 0.01:
                raise ValueError(f"Weights must sum to 1.0, got {total}")
        return v


# Response Models
class StoreInfo(ConfigurableModel):
    """Basic store information"""

    store_id: str
    store_name: str
    store_code: str
    business_name: Optional[str] = None
    store_type: Optional[StoreType] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_active: bool = True


class UserStoreAccess(ConfigurableModel):
    """User's access to a store"""

    store_id: str
    store_name: str
    store_code: str
    business_name: Optional[str] = None
    store_type: Optional[StoreType] = None
    city: Optional[str] = None
    country: Optional[str] = None
    user_role: UserRole
    permissions: dict[str, bool]
    is_owner: bool = False
    assigned_at: Optional[datetime] = None


class StoreDetailsResponse(ConfigurableModel, TimestampMixin):
    """Detailed store information"""

    store_id: str
    store_name: str
    store_code: str
    business_name: Optional[str] = None

    # Location
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None

    # Business details
    store_type: Optional[StoreType] = None
    size_category: Optional[str] = None

    # Configuration
    default_markup_percent: Optional[float] = None
    waste_reduction_target_percent: Optional[float] = None

    # Status
    is_active: bool = True
    onboarding_completed: bool = False

    # Access information
    user_role: UserRole
    permissions: dict[str, bool]
    is_owner: bool = False

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "store_name": "Fresh Market Downtown",
                "store_code": "FM-DT-001",
                "business_name": "Fresh Market LLC",
                "address": "123 Main Street",
                "city": "Paris",
                "postal_code": "75001",
                "country": "France",
                "timezone": "Europe/Paris",
                "store_type": "supermarket",
                "size_category": "medium",
                "default_markup_percent": 30.0,
                "waste_reduction_target_percent": 25.0,
                "is_active": True,
                "onboarding_completed": True,
                "user_role": "manager",
                "permissions": {
                    "can_upload_inventory": True,
                    "can_apply_discounts": True,
                    "can_view_analytics": True,
                },
                "is_owner": False,
            }
        }


class StoreUserResponse(ConfigurableModel):
    """Store user information"""

    user_id: str
    user_email: Optional[str] = None
    full_name: Optional[str] = None
    role_in_store: UserRole
    permissions: dict[str, bool]
    assigned_at: datetime
    assigned_by: Optional[str] = None
    is_active: bool = True


class StoreUsersListResponse(ConfigurableModel):
    """List of store users"""

    store_id: str
    users: list[StoreUserResponse]
    total_users: int

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "users": [
                    {
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "user_email": "manager@example.com",
                        "full_name": "John Manager",
                        "role_in_store": "manager",
                        "permissions": {
                            "can_upload_inventory": True,
                            "can_apply_discounts": True,
                            "can_view_analytics": True,
                        },
                        "assigned_at": "2024-01-01T00:00:00Z",
                        "is_active": True,
                    }
                ],
                "total_users": 1,
            }
        }


class StoreSettingsResponse(ConfigurableModel):
    """Store configuration settings"""

    store_id: str
    scoring_weights: dict[str, float]
    thresholds: dict[str, float]
    notifications: dict[str, bool]
    business_hours: dict[str, dict[str, str]]
    currency: str = "EUR"
    timezone: str = "Europe/Paris"
    last_updated: datetime

    class Config:
        schema_extra = {
            "example": {
                "store_id": "789e0123-e89b-12d3-a456-426614174002",
                "scoring_weights": {"expiry": 0.5, "velocity": 0.3, "margin": 0.2},
                "thresholds": {"critical": 0.8, "warning": 0.6},
                "notifications": {
                    "email_alerts": True,
                    "daily_summary": True,
                    "urgent_notifications": True,
                },
                "business_hours": {
                    "monday": {"open": "08:00", "close": "20:00"},
                    "tuesday": {"open": "08:00", "close": "20:00"},
                    "wednesday": {"open": "08:00", "close": "20:00"},
                    "thursday": {"open": "08:00", "close": "20:00"},
                    "friday": {"open": "08:00", "close": "20:00"},
                    "saturday": {"open": "09:00", "close": "18:00"},
                    "sunday": {"open": "10:00", "close": "17:00"},
                },
                "currency": "EUR",
                "timezone": "Europe/Paris",
                "last_updated": "2024-01-15T14:30:00Z",
            }
        }


class MyStoresResponse(ConfigurableModel):
    """User's accessible stores"""

    user_id: str
    stores: list[UserStoreAccess]
    total_stores: int

    class Config:
        schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "stores": [
                    {
                        "store_id": "789e0123-e89b-12d3-a456-426614174002",
                        "store_name": "Fresh Market Downtown",
                        "store_code": "FM-DT-001",
                        "business_name": "Fresh Market LLC",
                        "store_type": "supermarket",
                        "city": "Paris",
                        "country": "France",
                        "user_role": "manager",
                        "permissions": {
                            "can_upload_inventory": True,
                            "can_apply_discounts": True,
                            "can_view_analytics": True,
                        },
                        "is_owner": False,
                    }
                ],
                "total_stores": 1,
            }
        }


class StoreAccessValidationResponse(ConfigurableModel):
    """Store access validation result"""

    store_id: str
    user_id: str
    required_role: str
    has_access: bool
    current_role: Optional[str] = None
    permissions: Optional[dict[str, bool]] = None
    checked_at: datetime
