"""
SQLAlchemy models for LIFO AI Engine
Mirrors the existing Supabase database schema with async support
Updated to use auth.users schema from Supabase authentication
"""
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Date, Boolean, 
    Text, ForeignKey, UniqueConstraint, CheckConstraint, JSON, NUMERIC
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.database.connection import Base

# Import forward references for global models
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.database.global_models import GlobalProduct, StoreProduct


class User(Base):
    """
    User profiles - maps to auth.users schema
    
    Custom user fields (full_name, phone, etc.) are stored in raw_user_meta_data JSON
    and accessed via properties for backward compatibility.
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    encrypted_password = Column(String(255))
    email_confirmed_at = Column(DateTime)
    raw_user_meta_data = Column(JSONB, default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Properties to access custom fields from raw_user_meta_data
    @property
    def full_name(self):
        return self.raw_user_meta_data.get('full_name') if self.raw_user_meta_data else None
    
    @property
    def phone(self):
        return self.raw_user_meta_data.get('phone') if self.raw_user_meta_data else None
    
    @property
    def timezone(self):
        return self.raw_user_meta_data.get('timezone', 'Europe/Paris') if self.raw_user_meta_data else 'Europe/Paris'
    
    @property
    def language(self):
        return self.raw_user_meta_data.get('language', 'fr') if self.raw_user_meta_data else 'fr'


class Role(Base):
    """Role definitions - custom role management in user_mgmt schema"""
    __tablename__ = "roles"
    __table_args__ = {"schema": "user_mgmt"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(JSONB, default={})
    created_at = Column(DateTime, default=func.now())


class UserRole(Base):
    """User role assignments"""
    __tablename__ = "user_roles"
    __table_args__ = (
        {"schema": "user_mgmt"},
    )
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("user_mgmt.roles.id"), primary_key=True)
    assigned_at = Column(DateTime, default=func.now())
    assigned_by = Column(UUID(as_uuid=True))


class Store(Base):
    """Core stores table (multi-tenant foundation)"""
    __tablename__ = "stores"
    __table_args__ = {"schema": "business"}
    
    store_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    default_markup_percent = Column(NUMERIC(5, 2), default=30.00)
    waste_reduction_target_percent = Column(NUMERIC(5, 2), default=25.00)
    
    # Ownership & Access
    owner_id = Column(UUID(as_uuid=True))
    is_active = Column(Boolean, default=True)
    onboarding_completed = Column(Boolean, default=False)
    
    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    products = relationship("Product", back_populates="store")  # Legacy products
    batches = relationship("Batch", back_populates="store")
    store_products = relationship("StoreProduct", back_populates="store")  # Global products junction


class StoreUser(Base):
    """Store staff access and permissions"""
    __tablename__ = "store_users"
    __table_args__ = (
        {"schema": "business"},
    )
    
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    role_in_store = Column(String(50), default="staff")
    permissions = Column(JSONB, default={
        "can_upload_inventory": True,
        "can_apply_discounts": False,
        "can_view_analytics": True
    })
    assigned_at = Column(DateTime, default=func.now())
    assigned_by = Column(UUID(as_uuid=True))
    is_active = Column(Boolean, default=True)


class StoreSettings(Base):
    """Store configuration"""
    __tablename__ = "store_settings"
    __table_args__ = {"schema": "business"}
    
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"), primary_key=True)
    scoring_weights = Column(JSONB, default={"expiry": 0.5, "velocity": 0.3, "margin": 0.2})
    critical_threshold = Column(NUMERIC(3, 2), default=0.80)
    warning_threshold = Column(NUMERIC(3, 2), default=0.60)
    opening_hours = Column(JSONB, default={"monday": {"open": "08:00", "close": "20:00"}})
    peak_hours = Column(JSONB, default={"morning": "08:00-10:00", "evening": "17:00-19:00"})
    weather_location_lat = Column(NUMERIC(10, 8))
    weather_location_lon = Column(NUMERIC(11, 8))
    currency = Column(String(3), default="EUR")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Product(Base):
    """Product master data"""
    __tablename__ = "products"
    __table_args__ = {"schema": "inventory"}
    
    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    brand = Column(String(100))
    unit_type = Column(String(20), default="pcs")
    
    # Pricing
    base_cost_price = Column(NUMERIC(12, 4))
    base_selling_price = Column(NUMERIC(12, 4))
    
    # Product characteristics
    typical_shelf_life_days = Column(Integer)
    storage_temperature_min = Column(NUMERIC(5, 2))
    storage_temperature_max = Column(NUMERIC(5, 2))
    
    # Multi-tenant support
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    
    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))
    
    # Relationships
    store = relationship("Store", back_populates="products")
    batches = relationship("Batch", back_populates="product")


class Batch(Base):
    """Inventory batches - the core of LIFO tracking with global products support"""
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("store_id", "batch_number", name="uq_store_batch_number"),
        CheckConstraint("status IN ('active', 'sold', 'expired', 'damaged', 'returned')", name="chk_batch_status"),
        CheckConstraint("batch_source IN ('manual', 'ocr', 'barcode', 'import', 'api')", name="chk_batch_source"),
        CheckConstraint("verification_status IN ('verified', 'pending', 'flagged', 'rejected')", name="chk_verification_status"),
        CheckConstraint("recognition_confidence IS NULL OR (recognition_confidence >= 0.0 AND recognition_confidence <= 1.0)", name="chk_confidence_range"),
        CheckConstraint("product_id IS NOT NULL OR global_product_id IS NOT NULL", name="chk_product_reference"),
        CheckConstraint("(cost_price IS NOT NULL AND selling_price IS NOT NULL) OR (inherited_from_store_product = TRUE AND global_product_id IS NOT NULL)", name="chk_pricing_availability"),
        {"schema": "inventory"}
    )
    
    batch_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Product references - either legacy or global products
    product_id = Column(UUID(as_uuid=True), ForeignKey("inventory.products.product_id"))
    global_product_id = Column(UUID(as_uuid=True), ForeignKey("global.products.product_id"))
    
    batch_number = Column(String(100), nullable=False)
    
    # Quantities
    initial_quantity = Column(NUMERIC(12, 4), nullable=False)
    current_quantity = Column(NUMERIC(12, 4), nullable=False)
    reserved_quantity = Column(NUMERIC(12, 4), default=0)
    available_quantity = Column(NUMERIC(12, 4))  # Computed: current - reserved
    
    # Dates
    manufacture_date = Column(Date)
    expiry_date = Column(Date, nullable=False)
    received_date = Column(Date, default=func.current_date())
    
    # Pricing (can inherit from store_product or be overridden)
    cost_price = Column(NUMERIC(12, 4))  # Optional - can inherit from store_product
    selling_price = Column(NUMERIC(12, 4))  # Optional - can inherit from store_product
    inherited_from_store_product = Column(Boolean, default=True)
    
    # Supplier and sourcing
    supplier = Column(String(100))
    
    # Enhanced batch tracking
    batch_source = Column(String(50), default='manual')  # manual, ocr, barcode, import, api
    recognition_confidence = Column(NUMERIC(3, 2))  # For OCR/barcode recognized batches
    verification_status = Column(String(20), default='verified')  # verified, pending, flagged, rejected
    barcode_scanned = Column(String(50))  # Barcode used to create this batch
    ocr_session_id = Column(UUID(as_uuid=True), ForeignKey("global.ocr_extraction_log.log_id"))
    
    # Location and status
    location_code = Column(String(50), default="MAIN")
    status = Column(String(20), default="active")
    
    # Multi-tenant support
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    
    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))
    
    # Relationships
    store = relationship("Store", back_populates="batches")
    product = relationship("Product", back_populates="batches")  # Legacy relationship
    global_product = relationship("GlobalProduct", back_populates="batches", foreign_keys=[global_product_id])  # New global relationship
    scores = relationship("ProductScore", back_populates="batch")


class CategoryWeight(Base):
    """Category-specific scoring weights"""
    __tablename__ = "category_weights"
    __table_args__ = (
        CheckConstraint("spoilage_risk_weight >= 0 AND spoilage_risk_weight <= 1", name="chk_spoilage_weight"),
        CheckConstraint("value_impact_weight >= 0 AND value_impact_weight <= 1", name="chk_value_weight"),
        CheckConstraint("turnover_speed_weight >= 0 AND turnover_speed_weight <= 1", name="chk_turnover_weight"),
        CheckConstraint("spoilage_risk_weight + value_impact_weight + turnover_speed_weight = 1.0", name="chk_weights_sum"),
        {"schema": "scoring"}
    )
    
    category = Column(String(100), primary_key=True)
    spoilage_risk_weight = Column(NUMERIC(3, 2), nullable=False)
    value_impact_weight = Column(NUMERIC(3, 2), nullable=False)
    turnover_speed_weight = Column(NUMERIC(3, 2), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ProductScore(Base):
    """Product scores results"""
    __tablename__ = "product_scores"
    __table_args__ = (
        UniqueConstraint("batch_id", name="uq_batch_score"),
        CheckConstraint("expiry_score >= 0 AND expiry_score <= 1", name="chk_expiry_score"),
        CheckConstraint("velocity_score >= 0 AND velocity_score <= 1", name="chk_velocity_score"),
        CheckConstraint("margin_score >= 0 AND margin_score <= 1", name="chk_margin_score"),
        CheckConstraint("composite_score >= 0 AND composite_score <= 1", name="chk_composite_score"),
        CheckConstraint("confidence_level >= 0 AND confidence_level <= 1", name="chk_confidence_level"),
        CheckConstraint("recommendation IN ('hold', 'discount_light', 'discount_moderate', 'discount_aggressive', 'remove')", name="chk_recommendation"),
        {"schema": "scoring"}
    )
    
    score_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"))
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    
    # Component scores
    expiry_score = Column(NUMERIC(3, 2))
    velocity_score = Column(NUMERIC(3, 2))
    margin_score = Column(NUMERIC(3, 2))
    composite_score = Column(NUMERIC(3, 2))
    
    # Recommendations
    recommendation = Column(String(50))
    urgency_level = Column(String(20))
    discount_percent = Column(Integer, default=0)
    reason = Column(Text)
    
    # ML enhancement
    ml_enhanced = Column(Boolean, default=False)
    confidence_level = Column(NUMERIC(3, 2))
    
    # Audit
    calculated_at = Column(DateTime, default=func.now())
    
    # Relationships
    batch = relationship("Batch", back_populates="scores")


class Action(Base):
    """Actions taken and their results"""
    __tablename__ = "actions"
    __table_args__ = (
        CheckConstraint("action_type IN ('discount_light', 'discount_moderate', 'discount_aggressive', 'alert', 'remove')", name="chk_action_type"),
        {"schema": "analytics"}
    )
    
    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"))
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    action_type = Column(String(50))
    original_price = Column(NUMERIC(12, 4))
    new_price = Column(NUMERIC(12, 4))
    discount_percent = Column(NUMERIC(5, 2))
    executed_at = Column(DateTime, default=func.now())
    executed_by = Column(UUID(as_uuid=True))
    
    # Results tracking (updated later)
    quantity_sold_24h = Column(NUMERIC(12, 4))
    quantity_sold_48h = Column(NUMERIC(12, 4))
    revenue_recovered = Column(NUMERIC(12, 4))
    effectiveness_score = Column(NUMERIC(3, 2))


class InventorySnapshot(Base):
    """Inventory snapshots for pattern analysis"""
    __tablename__ = "inventory_snapshots"
    __table_args__ = {"schema": "timeseries"}
    
    snapshot_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"))
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    sku = Column(String(100))
    quantity = Column(NUMERIC(12, 4))
    price = Column(NUMERIC(12, 4))
    days_to_expiry = Column(Integer)
    snapshot_timestamp = Column(DateTime, default=func.now())
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)
    is_weekend = Column(Boolean)
    temperature = Column(NUMERIC(5, 2))
    is_holiday = Column(Boolean)


class SalesEvent(Base):
    """Sales events tracking"""
    __tablename__ = "sales_events"
    __table_args__ = {"schema": "timeseries"}
    
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"))
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    sku = Column(String(100))
    quantity_sold = Column(NUMERIC(12, 4))
    sale_price = Column(NUMERIC(12, 4))
    sale_timestamp = Column(DateTime, default=func.now())
    channel = Column(String(50), default="in_store")
    customer_type = Column(String(50), default="regular")


class ExternalFactor(Base):
    """External factors for correlation analysis"""
    __tablename__ = "external_factors"
    __table_args__ = {"schema": "timeseries"}
    
    factor_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    recorded_at = Column(DateTime, default=func.now())
    temperature = Column(NUMERIC(5, 2))
    humidity = Column(NUMERIC(5, 2))
    is_rainy = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)
    local_events = Column(JSON)  # Array of events
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)
    week_of_year = Column(Integer)