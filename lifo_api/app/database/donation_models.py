"""
Database models for simplified donation tracking system
Based on migration 017 - simplified schema in inventory namespace
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.models import Base


class ActionType(Enum):
    """Types of actions that can be taken on inventory batches"""
    DISCOUNT = "discount"
    DONATE = "donate"
    DISPOSE = "dispose"
    MAINTAIN = "maintain"
    IGNORED = "ignored"


class DonationRecipientType(Enum):
    """Simplified donation recipient types for MVP"""
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
    Track what users did with AI recommendations
    Simplified action tracking for LIFO.AI recommendations
    """
    __tablename__ = "batch_actions"
    __table_args__ = {"schema": "inventory"}

    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False)

    # What was recommended vs what was done
    recommended_action = Column(SQLEnum(ActionType), nullable=False)
    actual_action = Column(SQLEnum(ActionType), nullable=False)
    ai_score = Column(DECIMAL(3, 2))  # The AI score that triggered the recommendation (0.00-1.00)

    # Simple tracking details
    action_date = Column(DateTime, default=datetime.utcnow)
    quantity_affected = Column(DECIMAL(12, 4))
    notes = Column(Text)  # Simple notes from user (e.g., "donated to local food bank")

    # Financial tracking (for ROI calculations)
    original_value = Column(DECIMAL(10, 2))  # Value before action
    recovered_value = Column(DECIMAL(10, 2))  # Value after action (discount price, tax benefit, etc.)

    # User tracking
    performed_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Link to donation recipient (when applicable)
    donation_recipient_id = Column(UUID(as_uuid=True), ForeignKey("inventory.donation_recipients.recipient_id"))

    # Relationships
    donation_recipient = relationship("DonationRecipient", back_populates="batch_actions")


class DonationRecipient(Base):
    """
    Lightweight recipient tracking for MVP
    Simple donation recipients (just enough for compliance)
    """
    __tablename__ = "donation_recipients"
    __table_args__ = {"schema": "inventory"}

    recipient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    recipient_type = Column(SQLEnum(DonationRecipientType), nullable=False)

    # Minimal compliance fields
    is_certified = Column(Boolean, default=False)
    certification_notes = Column(Text)

    # Simple operational info
    accepts_pickups = Column(Boolean, default=True)
    max_distance_km = Column(Integer, default=10)

    # Store association
    store_id = Column(UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))

    # Relationships
    batch_actions = relationship("BatchAction", back_populates="donation_recipient")
