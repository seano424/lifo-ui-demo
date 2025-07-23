"""
LIFO.AI Inventory Models - Simplified for AI-driven waste prevention
Focuses on scoring, recommendations, and action tracking rather than traditional inventory management
"""

import uuid
from datetime import datetime
from enum import Enum

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.models import Base


class Product(Base):
    """
    Normalized global product catalog for LIFO.AI
    One product definition shared across all stores - no duplication
    Barcode-ready for scanning workflows
    """

    __tablename__ = "products"
    __table_args__ = {"schema": "inventory"}

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core product identification
    sku = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)  # Maps to scoring category weights
    brand = Column(String(100))
    unit_type = Column(String(20), default="pcs")

    # Barcode support for scanning workflows
    barcode = Column(String(50), unique=True)  # EAN13, UPC, Code128, etc.
    barcode_type = Column(String(20))  # Type of barcode format

    # AI scoring support
    typical_shelf_life_days = Column(Integer, nullable=False)  # For expiry urgency calculation

    # Barcode verification tracking
    is_verified = Column(Boolean, default=False)
    verification_count = Column(Integer, default=0)
    last_scanned_at = Column(DateTime)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))

    # Relationships
    store_products = relationship("StoreProduct", back_populates="product")
    batches = relationship("Batch", back_populates="product")


class StoreProduct(Base):
    """
    Store-specific product settings for LIFO.AI
    Junction table between stores and products
    Contains pricing needed for AI scoring algorithms
    """

    __tablename__ = "store_products"
    __table_args__ = {"schema": "inventory"}

    store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("business.stores.store_id"),
        primary_key=True
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory.products.product_id"),
        primary_key=True
    )

    # Store-specific pricing (needed for margin calculations in AI scoring)
    cost_price = Column(DECIMAL(12, 4))  # For margin_impact scoring
    selling_price = Column(DECIMAL(12, 4))  # For revenue calculations

    # Store-specific settings
    is_active = Column(Boolean, default=True)
    store_sku = Column(String(100))  # Store's internal SKU if different
    supplier_code = Column(String(50))  # Store's supplier reference

    # Audit and tracking
    added_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="store_products")
    # store relationship handled by business models


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
    __table_args__ = {"schema": "inventory"}

    batch_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory.products.product_id"),
        nullable=False
    )
    store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("business.stores.store_id"),
        nullable=False
    )

    # Core batch information
    batch_number = Column(String(100), nullable=False)
    supplier = Column(String(255))

    # Critical dates for LIFO scoring
    manufacture_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)  # Core input for expiry_urgency score
    received_date = Column(Date, default=datetime.utcnow().date())

    # Quantities for tracking
    initial_quantity = Column(DECIMAL(12, 4), nullable=False)
    current_quantity = Column(DECIMAL(12, 4), nullable=False)
    reserved_quantity = Column(DECIMAL(12, 4), default=0)

    # Pricing (can override store defaults)
    cost_price = Column(DECIMAL(12, 4))
    selling_price = Column(DECIMAL(12, 4))

    # Storage and status
    location_code = Column(String(50))
    status = Column(String(20), default="active")

    # LIFO.AI barcode workflow support
    batch_source = Column(String(50), default="manual")  # BatchSource enum values
    scanned_barcode = Column(String(50))  # Barcode that created this batch
    scan_confidence = Column(DECIMAL(3, 2))  # Confidence score (0.00-1.00)
    verification_status = Column(String(20), default="verified")  # VerificationStatus enum values

    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="batches")
    actions = relationship("BatchAction", back_populates="batch")
    # store relationship handled by business models


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
    __table_args__ = {"schema": "inventory"}

    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory.batches.batch_id", ondelete="CASCADE"),
        nullable=False
    )
    store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("business.stores.store_id"),
        nullable=False
    )

    # What was recommended vs what was done
    recommended_action = Column(String(20), nullable=False)  # ActionType enum
    actual_action = Column(String(20), nullable=False)  # ActionType enum
    ai_score = Column(DECIMAL(3, 2))  # AI score that triggered recommendation (0.00-1.00)

    # Tracking details
    action_date = Column(DateTime, default=datetime.utcnow)
    quantity_affected = Column(DECIMAL(12, 4))
    notes = Column(Text)  # User notes (e.g., "donated to local food bank")

    # Financial tracking (for ROI calculations)
    original_value = Column(DECIMAL(10, 2))  # Value before action
    recovered_value = Column(DECIMAL(10, 2))  # Value after action

    # User and donation tracking
    performed_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    donation_recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory.donation_recipients.recipient_id")
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="actions")
    donation_recipient = relationship("DonationRecipient", back_populates="batch_actions")


class DonationRecipient(Base):
    """
    Simple donation recipients tracking for LIFO.AI
    Minimal compliance fields for EU donation tracking
    """

    __tablename__ = "donation_recipients"
    __table_args__ = {"schema": "inventory"}

    recipient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    recipient_type = Column(String(50), nullable=False)  # DonationRecipientType enum

    # Minimal compliance fields
    is_certified = Column(Boolean, default=False)
    certification_notes = Column(Text)

    # Operational info
    accepts_pickups = Column(Boolean, default=True)
    max_distance_km = Column(Integer, default=10)

    # Store association
    store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("business.stores.store_id"),
        nullable=False
    )

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))

    # Relationships
    batch_actions = relationship("BatchAction", back_populates="donation_recipient")
