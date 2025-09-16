"""
SQLAlchemy models for LIFO AI Engine
Mirrors the existing Supabase database schema with async support
Updated to use auth.users schema from Supabase authentication
"""

import os
import uuid

# Import forward references for global models
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    NUMERIC,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import String as SQLString
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


def get_auth_users_fk() -> str:
    """Get the correct foreign key reference for auth.users table based on environment"""
    return "users.id" if os.getenv("ENVIRONMENT") == "testing" else "auth.users.id"


def get_uuid_type():
    """Get the correct UUID type based on environment (String for SQLite, UUID for PostgreSQL)"""
    return (
        SQLString(36) if os.getenv("ENVIRONMENT") == "testing" else UUID(as_uuid=True)
    )


def get_json_type():
    """Get the correct JSON type based on environment (JSON for SQLite, JSON for PostgreSQL)"""
    return JSON


if TYPE_CHECKING:
    pass


class User(Base):
    """
    User profiles - maps to auth.users schema

    Custom user fields (full_name, phone, etc.) are stored in raw_user_meta_data JSON
    and accessed via properties for backward compatibility.
    """

    __tablename__ = "users"
    # Only use auth schema in production/staging, not in tests with SQLite
    __table_args__ = {"schema": "auth"} if os.getenv("ENVIRONMENT") != "testing" else {}

    id = Column(get_uuid_type(), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    encrypted_password = Column(String(255))
    email_confirmed_at = Column(DateTime)
    raw_user_meta_data = Column(get_json_type(), default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Properties to access custom fields from raw_user_meta_data
    @property
    def full_name(self):
        return (
            self.raw_user_meta_data.get("full_name")
            if self.raw_user_meta_data
            else None
        )

    @property
    def phone(self):
        return self.raw_user_meta_data.get("phone") if self.raw_user_meta_data else None

    @property
    def timezone(self):
        return (
            self.raw_user_meta_data.get("timezone", "Europe/Paris")
            if self.raw_user_meta_data
            else "Europe/Paris"
        )

    @property
    def language(self):
        return (
            self.raw_user_meta_data.get("language", "fr")
            if self.raw_user_meta_data
            else "fr"
        )


class Role(Base):
    """Role definitions - custom role management in user_mgmt schema"""

    __tablename__ = "roles"
    __table_args__ = (
        {"schema": "user_mgmt"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(get_json_type(), default={})
    created_at = Column(DateTime, default=func.now())


class UserRole(Base):
    """User role assignments"""

    __tablename__ = "user_roles"
    __table_args__ = (
        {"schema": "user_mgmt"} if os.getenv("ENVIRONMENT") != "testing" else {},
    )

    user_id = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
        primary_key=True,
    )
    role_id = Column(
        get_uuid_type(),
        ForeignKey(
            "roles.id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "user_mgmt.roles.id"
        ),
        primary_key=True,
    )
    assigned_at = Column(DateTime, default=func.now())
    assigned_by = Column(get_uuid_type())


class Store(Base):
    """Core stores table (multi-tenant foundation)"""

    __tablename__ = "stores"
    __table_args__ = (
        {"schema": "business"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    store_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    store_name = Column(String(255), nullable=False)
    store_code = Column(String(50), unique=True, nullable=False)
    business_name = Column(String(255))

    # Location
    address = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="France")
    timezone = Column(String(50), default="Europe/Paris")

    # Business details
    store_type = Column(String(50))
    size_category = Column(String(20))

    # Configuration
    default_markup_percent: Column[NUMERIC] = Column(NUMERIC(5, 2), default=30.00)
    waste_reduction_target_percent: Column[NUMERIC] = Column(
        NUMERIC(5, 2), default=25.00
    )

    # Ownership & Access
    owner_id = Column(get_uuid_type())
    is_active = Column(Boolean, default=True)
    onboarding_completed = Column(Boolean, default=False)

    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    batches = relationship("Batch", back_populates="store")
    store_products = relationship(
        "StoreProduct", back_populates="store"
    )  # Global products junction


class StoreUser(Base):
    """Store staff access and permissions"""

    __tablename__ = "store_users"
    __table_args__ = (
        {"schema": "business"} if os.getenv("ENVIRONMENT") != "testing" else {},
    )

    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
        primary_key=True,
    )
    user_id = Column(get_uuid_type(), primary_key=True)
    role_in_store = Column(String(50), default="staff")
    permissions = Column(
        get_json_type(),
        default={
            "can_upload_inventory": True,
            "can_apply_discounts": False,
            "can_view_analytics": True,
        },
    )
    assigned_at = Column(DateTime, default=func.now())
    assigned_by = Column(get_uuid_type())
    is_active = Column(Boolean, default=True)


class StoreSettings(Base):
    """Store configuration"""

    __tablename__ = "store_settings"
    __table_args__ = (
        {"schema": "business"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
        primary_key=True,
    )
    scoring_weights = Column(
        get_json_type(), default={"expiry": 0.5, "velocity": 0.3, "margin": 0.2}
    )
    donation_preference_config = Column(
        get_json_type(), 
        default={
            "strategy": "balanced",
            "donation_first_threshold": 0.6,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0,
            "donation_weight_multiplier": 1.0,
            "social_impact_weight": 0.15
        }
    )
    critical_threshold: Column[NUMERIC] = Column(NUMERIC(3, 2), default=0.80)
    warning_threshold: Column[NUMERIC] = Column(NUMERIC(3, 2), default=0.60)
    opening_hours = Column(
        get_json_type(), default={"monday": {"open": "08:00", "close": "20:00"}}
    )
    peak_hours = Column(
        get_json_type(), default={"morning": "08:00-10:00", "evening": "17:00-19:00"}
    )
    weather_location_lat: Column[NUMERIC] = Column(NUMERIC(10, 8))
    weather_location_lon: Column[NUMERIC] = Column(NUMERIC(11, 8))
    currency = Column(String(3), default="EUR")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# Product model moved to inventory_models.py to match normalized schema
# This legacy model conflicted with the new normalized products table


# Batch model moved to inventory_models.py to avoid duplication


class CategoryWeight(Base):
    """Category-specific scoring weights"""

    __tablename__ = "category_weights"
    __table_args__ = (
        CheckConstraint(
            "spoilage_risk_weight >= 0 AND spoilage_risk_weight <= 1",
            name="chk_spoilage_weight",
        ),
        CheckConstraint(
            "value_impact_weight >= 0 AND value_impact_weight <= 1",
            name="chk_value_weight",
        ),
        CheckConstraint(
            "turnover_speed_weight >= 0 AND turnover_speed_weight <= 1",
            name="chk_turnover_weight",
        ),
        CheckConstraint(
            "spoilage_risk_weight + value_impact_weight + turnover_speed_weight = 1.0",
            name="chk_weights_sum",
        ),
        {"schema": "scoring"} if os.getenv("ENVIRONMENT") != "testing" else {},
    )

    category = Column(String(100), primary_key=True)
    spoilage_risk_weight: Column[NUMERIC] = Column(NUMERIC(3, 2), nullable=False)
    value_impact_weight: Column[NUMERIC] = Column(NUMERIC(3, 2), nullable=False)
    turnover_speed_weight: Column[NUMERIC] = Column(NUMERIC(3, 2), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ProductScore(Base):
    """Product scores results"""

    __tablename__ = "product_scores"
    __table_args__ = (
        UniqueConstraint("batch_id", name="uq_batch_score"),
        CheckConstraint(
            "expiry_score >= 0 AND expiry_score <= 1", name="chk_expiry_score"
        ),
        CheckConstraint(
            "velocity_score >= 0 AND velocity_score <= 1", name="chk_velocity_score"
        ),
        CheckConstraint(
            "margin_score >= 0 AND margin_score <= 1", name="chk_margin_score"
        ),
        CheckConstraint(
            "composite_score >= 0 AND composite_score <= 1", name="chk_composite_score"
        ),
        CheckConstraint(
            "confidence_level >= 0 AND confidence_level <= 1",
            name="chk_confidence_level",
        ),
        CheckConstraint(
            "recommendation IN ('dispose', 'discount_aggressive', 'discount_moderate', 'alert', 'monitor', 'maintain')",
            name="chk_recommendation",
        ),
        {"schema": "scoring"} if os.getenv("ENVIRONMENT") != "testing" else {},
    )

    score_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        get_uuid_type(),
        ForeignKey(
            "batches.batch_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.batches.batch_id"
        ),
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
    )

    # Component scores
    expiry_score: Column[NUMERIC] = Column(NUMERIC(3, 2))
    velocity_score: Column[NUMERIC] = Column(NUMERIC(3, 2))
    margin_score: Column[NUMERIC] = Column(NUMERIC(3, 2))
    composite_score: Column[NUMERIC] = Column(NUMERIC(3, 2))

    # Recommendations
    recommendation = Column(String(50))
    urgency_level = Column(String(20))
    discount_percent = Column(Integer, default=0)
    reason = Column(Text)

    # ML enhancement
    ml_enhanced = Column(Boolean, default=False)
    confidence_level: Column[NUMERIC] = Column(NUMERIC(3, 2))

    # Audit
    calculated_at = Column(DateTime, default=func.now())

    # Relationships
    batch = relationship("Batch", back_populates="scores")


class Action(Base):
    """Actions taken and their results"""

    __tablename__ = "actions"
    __table_args__ = (
        CheckConstraint(
            "action_type IN ('discount_light', 'discount_moderate', 'discount_aggressive', 'alert', 'remove')",
            name="chk_action_type",
        ),
        {"schema": "analytics"} if os.getenv("ENVIRONMENT") != "testing" else {},
    )

    action_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        get_uuid_type(),
        ForeignKey(
            "batches.batch_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.batches.batch_id"
        ),
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
    )
    action_type = Column(String(50))
    original_price: Column[NUMERIC] = Column(NUMERIC(12, 4))
    new_price: Column[NUMERIC] = Column(NUMERIC(12, 4))
    discount_percent: Column[NUMERIC] = Column(NUMERIC(5, 2))
    executed_at = Column(DateTime, default=func.now())
    executed_by = Column(get_uuid_type())

    # Results tracking (updated later)
    quantity_sold_24h: Column[NUMERIC] = Column(NUMERIC(12, 4))
    quantity_sold_48h: Column[NUMERIC] = Column(NUMERIC(12, 4))
    revenue_recovered: Column[NUMERIC] = Column(NUMERIC(12, 4))
    effectiveness_score: Column[NUMERIC] = Column(NUMERIC(3, 2))


class InventorySnapshot(Base):
    """Inventory snapshots for pattern analysis"""

    __tablename__ = "inventory_snapshots"
    __table_args__ = (
        {"schema": "timeseries"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    snapshot_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        get_uuid_type(),
        ForeignKey(
            "batches.batch_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.batches.batch_id"
        ),
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
    )
    sku = Column(String(100))
    quantity: Column[NUMERIC] = Column(NUMERIC(12, 4))
    price: Column[NUMERIC] = Column(NUMERIC(12, 4))
    days_to_expiry = Column(Integer)
    snapshot_timestamp = Column(DateTime, default=func.now())
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)
    is_weekend = Column(Boolean)
    temperature: Column[NUMERIC] = Column(NUMERIC(5, 2))
    is_holiday = Column(Boolean)


class SalesEvent(Base):
    """Sales events tracking"""

    __tablename__ = "sales_events"
    __table_args__ = (
        {"schema": "timeseries"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    event_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        get_uuid_type(),
        ForeignKey(
            "batches.batch_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.batches.batch_id"
        ),
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
    )
    sku = Column(String(100))
    quantity_sold: Column[NUMERIC] = Column(NUMERIC(12, 4))
    sale_price: Column[NUMERIC] = Column(NUMERIC(12, 4))
    sale_timestamp = Column(DateTime, default=func.now())
    channel = Column(String(50), default="in_store")
    customer_type = Column(String(50), default="regular")


class ExternalFactor(Base):
    """External factors for correlation analysis"""

    __tablename__ = "external_factors"
    __table_args__ = (
        {"schema": "timeseries"} if os.getenv("ENVIRONMENT") != "testing" else {}
    )

    factor_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
    )
    recorded_at = Column(DateTime, default=func.now())
    temperature: Column[NUMERIC] = Column(NUMERIC(5, 2))
    humidity: Column[NUMERIC] = Column(NUMERIC(5, 2))
    is_rainy = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)
    local_events = Column(JSON)  # Array of events
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)
    week_of_year = Column(Integer)
