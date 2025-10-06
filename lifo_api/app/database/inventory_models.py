"""
LIFO.AI Inventory Models - Simplified for AI-driven waste prevention
Focuses on scoring, recommendations, and action tracking rather than traditional inventory management
"""

import os
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy import String as SQLString
from sqlalchemy.orm import relationship

from app.database.connection import Base

# Import Store model to resolve the relationship
if TYPE_CHECKING:
    pass


def get_auth_users_fk() -> str:
    """Get the correct foreign key reference for auth.users table based on environment"""
    return "users.id" if os.getenv("ENVIRONMENT") == "testing" else "auth.users.id"


def get_uuid_type():
    """Get the correct UUID type based on environment (String for SQLite, UUID for PostgreSQL)"""
    from sqlalchemy.dialects.postgresql import UUID
    return (
        SQLString(36) if os.getenv("ENVIRONMENT") == "testing" else UUID(as_uuid=True)
    )


class Category(Base):
    """
    Product categories table for LIFO.AI
    Maps to Supabase inventory.categories table
    """

    __tablename__ = "categories"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
    )

    category_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    category_code = Column(String(100), unique=True, nullable=False)
    display_name_en = Column(String(255))
    display_name_fr = Column(String(255))
    parent_category_id = Column(
        get_uuid_type(),
        ForeignKey(
            "categories.category_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.categories.category_id"
        ),
    )
    typical_shelf_life_days = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at = Column(
        DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), onupdate=lambda: datetime.now(UTC).replace(tzinfo=None)
    )

    # Self-referential relationship for parent categories
    parent_category = relationship(
        "Category", remote_side=[category_id], back_populates="subcategories"
    )
    subcategories = relationship("Category", back_populates="parent_category")

    # Products in this category
    products = relationship("Product", back_populates="category")


class Product(Base):
    """
    Normalized global product catalog for LIFO.AI
    One product definition shared across all stores - no duplication
    Barcode-ready for scanning workflows
    """

    __tablename__ = "products"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
    )

    product_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)

    # Core product identification
    sku = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(
        get_uuid_type(),
        ForeignKey(
            "categories.category_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.categories.category_id"
        ),
    )
    brand = Column(String(100))
    unit_type = Column(String(20), default="pcs")

    # Barcode support for scanning workflows
    barcode = Column(String(50), unique=True)  # EAN13, UPC, Code128, etc.
    barcode_type = Column(String(20))  # Type of barcode format

    # AI scoring support
    typical_shelf_life_days = Column(
        Integer, nullable=False
    )  # For expiry urgency calculation

    # Required pricing fields from Supabase schema
    base_cost_price: Column[DECIMAL] = Column(
        DECIMAL(12, 4), nullable=False, default=0.0000
    )
    base_selling_price: Column[DECIMAL] = Column(
        DECIMAL(12, 4), nullable=False, default=0.0000
    )

    # Barcode verification tracking
    is_verified = Column(Boolean, default=False)
    verification_count = Column(Integer, default=0)
    last_scanned_at = Column(DateTime)

    # Audit fields
    created_at = Column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at = Column(
        DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), onupdate=lambda: datetime.now(UTC).replace(tzinfo=None)
    )
    created_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )

    # Relationships
    category = relationship("Category", back_populates="products")
    store_products = relationship("StoreProduct", back_populates="product")
    batches = relationship("Batch", back_populates="product")


class StoreProduct(Base):
    """
    Store-specific product settings for LIFO.AI
    Junction table between stores and products
    Contains pricing needed for AI scoring algorithms
    """

    __tablename__ = "store_products"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
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
    product_id = Column(
        get_uuid_type(),
        ForeignKey(
            "products.product_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.products.product_id"
        ),
        primary_key=True,
    )

    # Store-specific pricing (needed for margin calculations in AI scoring)
    cost_price: Column[DECIMAL] = Column(DECIMAL(12, 4))  # For margin_impact scoring
    selling_price: Column[DECIMAL] = Column(DECIMAL(12, 4))  # For revenue calculations

    # Store-specific settings
    is_active = Column(Boolean, default=True)
    store_sku = Column(String(100))  # Store's internal SKU if different
    supplier_code = Column(String(50))  # Store's supplier reference

    # Audit and tracking
    added_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )
    updated_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )
    created_at = Column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at = Column(
        DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), onupdate=lambda: datetime.now(UTC).replace(tzinfo=None)
    )

    # Relationships
    product = relationship("Product", back_populates="store_products")
    # Use string reference to avoid circular import - Store is in app.database.models
    store = relationship("app.database.models.Store", back_populates="store_products")


class BatchSource(Enum):
    """Sources for batch creation in LIFO.AI workflows"""

    MANUAL = "manual"
    BARCODE = "barcode"
    CSV_IMPORT = "csv_import"
    API = "api"


class VerificationStatus(Enum):
    """Verification status for barcode scanning accuracy"""

    VERIFIED = "verified"
    PENDING = "pending"
    FLAGGED = "flagged"
    REJECTED = "rejected"


class Batch(Base):
    """
    Enhanced batches table for LIFO.AI scoring and recommendations
    The core unit for AI-driven waste prevention
    Each batch gets scored for urgency and recommended actions
    """

    __tablename__ = "batches"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
    )

    batch_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        get_uuid_type(),
        ForeignKey(
            "products.product_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.products.product_id"
        ),
        nullable=False,
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
        nullable=False,
    )

    # Core batch information
    batch_number = Column(String(100), nullable=False)
    supplier = Column(String(255))

    # Critical dates for LIFO scoring
    manufacture_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)  # Core input for expiry_urgency score
    received_date = Column(Date, default=lambda: datetime.now(UTC).date())

    # Quantities for tracking
    initial_quantity: Column[DECIMAL] = Column(DECIMAL(12, 4), nullable=False)
    current_quantity: Column[DECIMAL] = Column(DECIMAL(12, 4), nullable=False)
    reserved_quantity: Column[DECIMAL] = Column(DECIMAL(12, 4), default=0)

    # Pricing (can override store defaults)
    cost_price: Column[DECIMAL] = Column(DECIMAL(12, 4))
    selling_price: Column[DECIMAL] = Column(DECIMAL(12, 4))

    # Storage and status
    location_code = Column(String(50))
    status = Column(String(20), default="active")

    # LIFO.AI barcode workflow support
    batch_source = Column(String(50), default="manual")  # BatchSource enum values
    scanned_barcode = Column(String(50))  # Barcode that created this batch
    scan_confidence: Column[DECIMAL] = Column(
        DECIMAL(3, 2)
    )  # Confidence score (0.00-1.00)
    verification_status = Column(
        String(20), default="verified"
    )  # VerificationStatus enum values

    # OCR fields for expiry date extraction
    ocr_extracted_date = Column(String(255))  # Raw OCR text for expiry date
    ocr_confidence: Column[DECIMAL] = Column(
        DECIMAL(3, 2)
    )  # OCR confidence score (0.00-1.00)

    # Audit fields
    created_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )
    created_at = Column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at = Column(
        DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), onupdate=lambda: datetime.now(UTC).replace(tzinfo=None)
    )

    # Relationships
    product = relationship("Product", back_populates="batches")
    actions = relationship("BatchAction", back_populates="batch")
    # Use string reference to avoid circular import - Store is in app.database.models
    store = relationship("app.database.models.Store", back_populates="batches")
    scores = relationship("ProductScore", back_populates="batch")


class ActionType(Enum):
    """Action types for LIFO.AI recommendations"""

    DISCOUNT = "discount"
    DONATE = "donate"
    DISPOSE = "dispose"
    MAINTAIN = "maintain"
    IGNORED = "ignored"


class DonationRecipientType(Enum):
    """Types of donation recipients for better UX"""

    FOOD_BANK = "food_bank"
    SOUP_KITCHEN = "soup_kitchen"
    CHARITY = "charity"
    RELIGIOUS_ORG = "religious_org"
    COMMUNITY_GROUP = "community_group"
    ANIMAL_SHELTER = "animal_shelter"
    SCHOOL = "school"
    ELDERLY_CARE = "elderly_care"
    HOMELESS_SHELTER = "homeless_shelter"
    OTHER = "other"


class BatchAction(Base):
    """
    Track AI recommendations vs actual user actions
    Core table for measuring LIFO.AI effectiveness and ROI
    """

    __tablename__ = "batch_actions"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
    )

    entry_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        get_uuid_type(),
        ForeignKey(
            "batches.batch_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.batches.batch_id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
        nullable=False,
    )

    # What was recommended vs what was done
    action_type: Column[SQLEnum] = Column(SQLEnum(ActionType), nullable=False)
    recommended_action: Column[SQLEnum] = Column(SQLEnum(ActionType), nullable=True)
    ai_score: Column[DECIMAL] = Column(
        DECIMAL(3, 2)
    )  # AI score that triggered recommendation (0.00-1.00)

    # Tracking details (from actual database schema)
    quantity_affected: Column[DECIMAL] = Column(DECIMAL(12, 4), nullable=False)
    total_original_value: Column[DECIMAL] = Column(DECIMAL(10, 2), nullable=False)  # Value before action
    total_recovered_value: Column[DECIMAL] = Column(DECIMAL(10, 2), nullable=False)  # Value after action
    batch_initial_quantity: Column[DECIMAL] = Column(DECIMAL(12, 4), nullable=False)

    # Optional tracking fields
    discount_percentage: Column[DECIMAL] = Column(DECIMAL(5, 2))
    disposal_reason = Column(Text)
    notes = Column(Text)  # User notes (e.g., "donated to local food bank")

    # User and donation tracking
    performed_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )
    performed_at = Column(DateTime)  # When action was performed
    verified_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )
    verified_at = Column(DateTime)  # When action was verified

    donation_recipient_id = Column(
        get_uuid_type(),
        ForeignKey(
            "donation_recipients.recipient_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "inventory.donation_recipients.recipient_id"
        ),
    )

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(UTC))

    # Relationships
    batch = relationship("Batch", back_populates="actions")
    donation_recipient = relationship(
        "DonationRecipient", back_populates="batch_actions"
    )


class DonationRecipient(Base):
    """
    Simple donation recipients tracking for LIFO.AI
    Minimal compliance fields for EU donation tracking
    """

    __tablename__ = "donation_recipients"
    __table_args__ = (
        {"schema": "inventory", "extend_existing": True}
        if os.getenv("ENVIRONMENT") != "testing"
        else {"extend_existing": True}
    )

    recipient_id = Column(get_uuid_type(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    recipient_type: Column[SQLEnum] = Column(
        SQLEnum(DonationRecipientType), nullable=False
    )

    # Minimal compliance fields
    is_certified = Column(Boolean, default=False)
    certification_notes = Column(Text)

    # Operational info
    accepts_pickups = Column(Boolean, default=True)
    max_distance_km = Column(Integer, default=10)

    # Store association
    store_id = Column(
        get_uuid_type(),
        ForeignKey(
            "stores.store_id"
            if os.getenv("ENVIRONMENT") == "testing"
            else "business.stores.store_id"
        ),
        nullable=False,
    )

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    created_by = Column(
        get_uuid_type(),
        ForeignKey(get_auth_users_fk()),
    )

    # Relationships
    batch_actions = relationship("BatchAction", back_populates="donation_recipient")
