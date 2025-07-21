"""
Global products schema models for normalized product catalog
Supports global product catalog with store-specific pricing
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    DECIMAL,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from app.database.models import Base


class GlobalProduct(Base):
    """
    Global product catalog with OCR and barcode support
    """

    __tablename__ = "products"
    __table_args__ = {"schema": "global"}

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identification fields (prepared for OCR/barcode)
    barcode = Column(String(20), unique=True)  # EAN13, UPC, Code128, etc.
    sku = Column(String(100))  # Global SKU (optional)
    name = Column(String(255), nullable=False)
    brand = Column(String(100))
    category = Column(String(50))

    # OCR and Image Recognition fields
    image_url = Column(String(500))  # Product image for recognition training
    ocr_keywords = Column(JSONB)  # Keywords for OCR matching (stored as array)
    alternative_names = Column(JSONB)  # Common name variations (stored as array)

    # Product characteristics
    typical_shelf_life_days = Column(Integer)
    unit_type = Column(String(20), default="pcs")
    standard_weight_grams = Column(Integer)  # For weight-based calculations
    standard_volume_ml = Column(Integer)  # For volume-based calculations

    # Categorization (enhanced for AI scoring)
    primary_category = Column(String(50))  # Maps to existing scoring categories
    sub_category = Column(String(50))
    dietary_attributes = Column(
        JSONB, default={}
    )  # {"vegan": true, "gluten_free": false}

    # Metadata for OCR/Barcode functionality
    manufacturer = Column(String(100))
    country_of_origin = Column(String(50))
    product_description = Column(Text)

    # Global product status
    is_active = Column(Boolean, default=True)
    verification_status = Column(
        String(20), default="pending"
    )  # pending, verified, flagged

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("auth.users.id")
    )  # First user who added this product

    # Relationships
    store_products = relationship("StoreProduct", back_populates="global_product")
    batches = relationship(
        "Batch",
        back_populates="global_product",
        foreign_keys="[Batch.global_product_id]",
    )


class StoreProduct(Base):
    """
    Store-specific product pricing and inventory settings
    Junction table between stores and global products
    """

    __tablename__ = "store_product"
    __table_args__ = {"schema": "business"}

    store_id = Column(
        UUID(as_uuid=True), ForeignKey("business.stores.store_id"), primary_key=True
    )
    product_id = Column(
        UUID(as_uuid=True), ForeignKey("global.products.product_id"), primary_key=True
    )

    # Store-specific pricing (replaces product-level pricing)
    default_cost_price = Column(DECIMAL(12, 4), nullable=False)
    default_selling_price = Column(DECIMAL(12, 4), nullable=False)

    # Store-specific inventory management
    is_active = Column(Boolean, default=True)
    minimum_stock_level = Column(Integer, default=0)
    maximum_stock_level = Column(Integer)
    reorder_point = Column(Integer, default=5)

    # Store-specific product settings
    store_specific_sku = Column(String(100))  # Store's internal SKU if different
    supplier_code = Column(String(50))  # Store's supplier reference
    storage_location = Column(String(50))  # Default storage location in store

    # Pricing history and markup
    markup_percentage = Column(DECIMAL(5, 2))  # Store's typical markup for this product
    last_cost_update = Column(DateTime)  # When cost price was last updated
    price_change_reason = Column(String(100))  # Reason for last price change

    # Store performance metrics for this product
    total_sold_units = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 4), default=0)
    last_sale_date = Column(DateTime)

    # Audit and tracking
    added_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    global_product = relationship("GlobalProduct", back_populates="store_products")
    store = relationship("Store", back_populates="store_products")


class ProductCategory(Base):
    """
    Enhanced product categories with OCR hints and scoring defaults
    """

    __tablename__ = "product_categories"
    __table_args__ = {"schema": "global"}

    category_code = Column(String(50), primary_key=True)
    category_name = Column(String(100), nullable=False)
    category_description = Column(Text)

    # OCR Recognition hints
    common_keywords = Column(JSONB)  # Keywords commonly found on packages
    typical_shelf_life_range = Column(JSONB)  # {"min_days": 1, "max_days": 7}

    # Scoring defaults (links to existing scoring.category_weights)
    default_spoilage_risk_weight = Column(DECIMAL(3, 2), default=0.5)
    default_turnover_speed_weight = Column(DECIMAL(3, 2), default=0.3)
    default_value_impact_weight = Column(DECIMAL(3, 2), default=0.2)

    # Storage and handling
    requires_refrigeration = Column(Boolean, default=False)
    requires_freezing = Column(Boolean, default=False)
    typical_storage_temp_min = Column(DECIMAL(4, 1))
    typical_storage_temp_max = Column(DECIMAL(4, 1))

    # Regulatory and compliance
    requires_expiry_date = Column(Boolean, default=True)
    allows_donation = Column(Boolean, default=True)
    high_risk_category = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BarcodeFormat(Base):
    """
    Supported barcode formats for product identification
    """

    __tablename__ = "barcode_formats"
    __table_args__ = {"schema": "global"}

    format_code = Column(String(20), primary_key=True)
    format_name = Column(String(50), nullable=False)
    format_description = Column(Text)
    regex_pattern = Column(String(100))  # Validation pattern
    typical_length = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OCRExtractionLog(Base):
    """
    OCR processing history for training and improvement
    """

    __tablename__ = "ocr_extraction_log"
    __table_args__ = {"schema": "global"}

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("global.products.product_id"))

    # OCR session details
    image_url = Column(String(500))
    extracted_text = Column(Text)
    confidence_score = Column(DECIMAL(3, 2))  # 0.00 to 1.00
    processing_time_ms = Column(Integer)

    # Extracted data
    detected_barcode = Column(String(50))
    detected_expiry_date = Column(Date)
    detected_product_name = Column(String(255))
    detected_brand = Column(String(100))

    # Validation results
    barcode_match = Column(Boolean)
    name_match_score = Column(DECIMAL(3, 2))
    manual_verification = Column(Boolean)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))

    # Context
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"))
    extracted_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    global_product = relationship("GlobalProduct", backref="ocr_logs")
