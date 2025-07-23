"""
Database models for EU-compliant donation tracking system
Supports full donation lifecycle with European food safety compliance
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
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database.models import Base


class DonationStatus(Enum):
    """Status of donation process"""

    ELIGIBLE = "eligible"
    PENDING_PICKUP = "pending_pickup"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class RecipientType(Enum):
    """
    Types of donation recipients under EU Food Donation Guidelines (2017)
    Categorized by distribution role and regulatory status
    """

    # === Intermediary Organizations (Redistribution) ===
    FOOD_BANK = "food_bank"  # Certified food redistribution centers
    FOOD_RESCUE_ORG = "food_rescue_org"  # Specialized food rescue organizations

    # === Front-line Organizations (Direct Distribution) ===
    SOUP_KITCHEN = "soup_kitchen"  # Licensed meal service facilities
    SOCIAL_SERVICE_AGENCY = "social_service_agency"  # Municipal/government services
    REGISTERED_CHARITY = "registered_charity"  # NGOs with tax-exempt status

    # === Community-Level Recipients ===
    LOCAL_SOLIDARITY_GROUP = "local_solidarity_group"  # Grassroots community groups
    RELIGIOUS_ORGANIZATION = "religious_organization"  # Churches, mosques, etc.

    # === Special Cases ===
    ANIMAL_WELFARE = "animal_welfare"  # For non-human food donations
    COMPOSTING_FACILITY = "composting_facility"  # Environmental waste reduction

    @classmethod
    def get_tax_benefit_eligible(cls):
        """Returns recipient types eligible for tax benefits in France"""
        return [
            cls.FOOD_BANK.value,
            cls.SOUP_KITCHEN.value,
            cls.REGISTERED_CHARITY.value,
            cls.SOCIAL_SERVICE_AGENCY.value,
        ]

    @classmethod
    def get_intermediary_types(cls):
        """Returns types that redistribute to other organizations"""
        return [cls.FOOD_BANK.value, cls.FOOD_RESCUE_ORG.value]

    @classmethod
    def get_frontline_types(cls):
        """Returns types that serve beneficiaries directly"""
        return [
            cls.SOUP_KITCHEN.value,
            cls.SOCIAL_SERVICE_AGENCY.value,
            cls.REGISTERED_CHARITY.value,
            cls.LOCAL_SOLIDARITY_GROUP.value,
            cls.RELIGIOUS_ORGANIZATION.value,
        ]

    @classmethod
    def get_environmental_types(cls):
        """Returns types focused on environmental impact"""
        return [cls.ANIMAL_WELFARE.value, cls.COMPOSTING_FACILITY.value]


class DonationMethod(Enum):
    """Method of donation delivery"""

    PICKUP = "pickup"
    DELIVERY = "delivery"
    DROP_OFF = "drop_off"
    THIRD_PARTY_LOGISTICS = "third_party_logistics"


class ComplianceStatus(Enum):
    """EU compliance validation status"""

    COMPLIANT = "compliant"
    CONDITIONALLY_COMPLIANT = "conditionally_compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_VALIDATION = "pending_validation"


class DonationRecipient(Base):
    """
    Certified donation recipients with EU compliance validation
    """

    __tablename__ = "donation_recipients"
    __table_args__ = {"schema": "donation"}

    recipient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_name = Column(String(255), nullable=False)
    recipient_type = Column(SQLEnum(RecipientType), nullable=False)

    # Contact information
    contact_person = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)

    # Address information
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="Germany")

    # EU compliance certifications
    food_business_registration = Column(
        String(100), nullable=False
    )  # EU food business operator number
    certification_number = Column(String(100))  # Additional certifications
    haccp_certified = Column(Boolean, default=False)

    # Operational capabilities
    accepts_frozen = Column(Boolean, default=False)
    accepts_chilled = Column(Boolean, default=True)
    accepts_ambient = Column(Boolean, default=True)
    max_pickup_distance_km = Column(Integer, default=50)

    # Capacity and scheduling
    weekly_capacity_kg = Column(Integer)
    pickup_days = Column(JSONB)  # ["monday", "wednesday", "friday"]
    preferred_pickup_times = Column(JSONB)  # ["09:00-12:00", "14:00-17:00"]

    # Compliance and validation
    compliance_status = Column(
        SQLEnum(ComplianceStatus), default=ComplianceStatus.PENDING_VALIDATION
    )
    last_inspection_date = Column(Date)
    compliance_notes = Column(Text)

    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))

    # Relationships
    donations = relationship("DonationRecord", back_populates="recipient")


class DonationRecord(Base):
    """
    Complete donation tracking with EU compliance documentation
    """

    __tablename__ = "donation_records"
    __table_args__ = {"schema": "donation"}

    donation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(
        UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"), nullable=False
    )
    store_id = Column(
        UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False
    )
    recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("donation.donation_recipients.recipient_id"),
        nullable=False,
    )

    # Donation details
    quantity_donated = Column(DECIMAL(10, 3), nullable=False)
    original_value = Column(
        DECIMAL(10, 2), nullable=False
    )  # Original selling price * quantity
    estimated_social_value = Column(DECIMAL(10, 2))  # Estimated social impact value

    # Timing
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_pickup_date = Column(DateTime)
    actual_pickup_date = Column(DateTime)
    delivery_date = Column(DateTime)
    completed_at = Column(DateTime)

    # Status tracking
    status = Column(SQLEnum(DonationStatus), default=DonationStatus.ELIGIBLE)
    donation_method = Column(SQLEnum(DonationMethod), default=DonationMethod.PICKUP)

    # EU compliance documentation
    compliance_status = Column(SQLEnum(ComplianceStatus), nullable=False)
    eu_eligibility_score = Column(Float)  # 0.0-1.0 from EUFoodSafetyValidator
    safety_requirements = Column(JSONB)  # List of safety requirements met
    regulatory_notes = Column(JSONB)  # EU regulatory compliance notes
    handling_instructions = Column(JSONB)  # Special handling instructions

    # Temperature and quality tracking
    temperature_at_donation = Column(Float)  # °C
    packaging_condition = Column(String(50))  # good, damaged, opened
    quality_assessment = Column(Text)

    # Logistics
    pickup_person = Column(String(100))
    pickup_organization = Column(String(255))
    transport_method = Column(String(100))
    delivery_confirmation = Column(Text)

    # Financial impact
    tax_deduction_value = Column(DECIMAL(10, 2))  # For donor tax benefits
    waste_cost_avoided = Column(DECIMAL(10, 2))  # Disposal cost savings

    # Documentation and traceability
    donation_certificate_issued = Column(Boolean, default=False)
    traceability_document = Column(String(255))  # File reference
    photos_taken = Column(JSONB)  # Photo references for documentation

    # User tracking
    created_by = Column(String(100))  # User who initiated donation
    approved_by = Column(String(100))  # User who approved donation
    completed_by = Column(String(100))  # User who completed donation

    # Notes and feedback
    donor_notes = Column(Text)
    recipient_feedback = Column(Text)
    internal_notes = Column(Text)

    # Relationships
    recipient = relationship("DonationRecipient", back_populates="donations")
    compliance_checks = relationship(
        "DonationComplianceCheck", back_populates="donation"
    )
    kpi_impacts = relationship("DonationKPIImpact", back_populates="donation")


class DonationComplianceCheck(Base):
    """
    Detailed EU compliance validation records for each donation
    """

    __tablename__ = "donation_compliance_checks"
    __table_args__ = {"schema": "donation"}

    check_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("donation.donation_records.donation_id"),
        nullable=False,
    )

    # Check details
    check_timestamp = Column(DateTime, default=datetime.utcnow)
    check_type = Column(
        String(100), nullable=False
    )  # "initial", "pre_pickup", "delivery"
    performed_by = Column(String(100), nullable=False)

    # EU regulation compliance
    regulation_178_2002_compliant = Column(Boolean)  # General Food Law
    regulation_852_2004_compliant = Column(Boolean)  # Food Hygiene
    regulation_853_2004_compliant = Column(Boolean)  # Animal Products (if applicable)

    # Specific checks performed
    temperature_check_passed = Column(Boolean)
    packaging_integrity_passed = Column(Boolean)
    labeling_accuracy_passed = Column(Boolean)
    traceability_documentation_complete = Column(Boolean)
    recipient_certification_verified = Column(Boolean)

    # Check results
    overall_compliance_status = Column(SQLEnum(ComplianceStatus), nullable=False)
    compliance_score = Column(Float)  # 0.0-1.0
    issues_identified = Column(JSONB)  # List of compliance issues
    corrective_actions_taken = Column(JSONB)  # Actions taken to resolve issues

    # Documentation
    check_notes = Column(Text)
    evidence_photos = Column(JSONB)  # Photo references
    certificates_verified = Column(JSONB)  # List of certificates checked

    # Relationships
    donation = relationship("DonationRecord", back_populates="compliance_checks")


class DonationKPIImpact(Base):
    """
    KPI tracking for donation impact measurement with EU compliance metrics
    """

    __tablename__ = "donation_kpi_impacts"
    __table_args__ = {"schema": "donation"}

    impact_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("donation.donation_records.donation_id"),
        nullable=False,
    )
    store_id = Column(
        UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False
    )

    # Financial impact
    waste_cost_avoided = Column(DECIMAL(10, 2), nullable=False)
    revenue_preserved = Column(DECIMAL(10, 2))  # Value that would have been lost
    tax_benefit_value = Column(DECIMAL(10, 2))  # Tax deduction value
    disposal_cost_saved = Column(DECIMAL(10, 2))

    # Environmental impact
    co2_emissions_avoided_kg = Column(Float)  # CO2 equivalent saved
    landfill_waste_avoided_kg = Column(Float)
    water_footprint_saved_liters = Column(Float)

    # Social impact
    meals_provided_estimate = Column(Integer)  # Estimated meals from donation
    people_served_estimate = Column(Integer)  # Estimated people helped
    social_value_eur = Column(DECIMAL(10, 2))  # Estimated social value in EUR

    # EU compliance metrics
    eu_regulation_adherence_score = Column(Float)  # 0.0-1.0
    food_safety_incidents = Column(Integer, default=0)
    compliance_violations = Column(Integer, default=0)
    successful_transfers = Column(Integer, default=1)

    # Operational efficiency
    time_to_donation_hours = Column(Float)  # Hours from identification to completion
    transportation_distance_km = Column(Float)
    handling_efficiency_score = Column(Float)  # 0.0-1.0

    # Quality metrics
    recipient_satisfaction_score = Column(Float)  # 1-5 rating from recipient
    food_quality_rating = Column(Float)  # 1-5 rating of donated food quality
    process_efficiency_rating = Column(Float)  # 1-5 internal process rating

    # Tracking metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    calculation_method = Column(String(100))  # Method used for calculations
    data_sources = Column(JSONB)  # Sources used for impact calculation

    # Relationships
    donation = relationship("DonationRecord", back_populates="kpi_impacts")


class DonationAlert(Base):
    """
    Automated alerts for donation opportunities and compliance issues
    """

    __tablename__ = "donation_alerts"
    __table_args__ = {"schema": "donation"}

    alert_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(
        UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False
    )
    batch_id = Column(UUID(as_uuid=True), ForeignKey("inventory.batches.batch_id"))

    # Alert details
    alert_type = Column(
        String(100), nullable=False
    )  # "donation_opportunity", "compliance_issue", "urgent_action"
    priority_level = Column(
        String(20), nullable=False
    )  # "low", "medium", "high", "critical"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # EU compliance context
    eu_regulation_context = Column(JSONB)  # Which EU regulations are relevant
    compliance_deadline = Column(DateTime)  # When compliance action is needed

    # Alert lifecycle
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    acknowledged_by = Column(String(100))
    resolved_by = Column(String(100))

    # Status and actions
    is_active = Column(Boolean, default=True)
    requires_immediate_action = Column(Boolean, default=False)
    suggested_actions = Column(JSONB)  # List of suggested actions
    taken_actions = Column(JSONB)  # Actions that were taken

    # Escalation
    escalation_level = Column(Integer, default=0)  # 0=normal, 1=escalated, 2=urgent
    escalated_at = Column(DateTime)
    escalation_reason = Column(Text)


class DonationAnalytics(Base):
    """
    Aggregated analytics for donation program performance
    """

    __tablename__ = "donation_analytics"
    __table_args__ = {"schema": "donation"}

    analytics_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(
        UUID(as_uuid=True), ForeignKey("business.stores.store_id"), nullable=False
    )

    # Time period
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    period_type = Column(String(20), nullable=False)  # "daily", "weekly", "monthly"

    # Volume metrics
    total_donations = Column(Integer, default=0)
    total_quantity_donated_kg = Column(DECIMAL(10, 3), default=0)
    total_value_donated_eur = Column(DECIMAL(10, 2), default=0)

    # Financial impact
    total_waste_cost_avoided = Column(DECIMAL(10, 2), default=0)
    total_tax_benefits = Column(DECIMAL(10, 2), default=0)
    total_disposal_savings = Column(DECIMAL(10, 2), default=0)

    # EU compliance metrics
    compliance_rate_percent = Column(
        Float, default=0
    )  # % of donations that were compliant
    regulation_violations = Column(Integer, default=0)
    food_safety_incidents = Column(Integer, default=0)

    # Environmental impact
    co2_emissions_avoided_kg = Column(Float, default=0)
    landfill_waste_avoided_kg = Column(Float, default=0)

    # Social impact
    estimated_meals_provided = Column(Integer, default=0)
    estimated_people_served = Column(Integer, default=0)
    total_social_value_eur = Column(DECIMAL(10, 2), default=0)

    # Efficiency metrics
    average_time_to_donation_hours = Column(Float)
    donation_success_rate_percent = Column(Float)
    recipient_satisfaction_average = Column(Float)

    # Calculated metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    calculation_version = Column(String(20))  # Version of calculation algorithm

    # Status
    is_final = Column(Boolean, default=False)  # True when period is complete
