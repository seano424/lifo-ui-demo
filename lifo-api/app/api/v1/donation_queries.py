"""
Donation Queries API - Read-only operations for EU donation compliance
Provides endpoints for querying donation records and compliance data
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database.connection import get_database
from app.database.donation_models import (
    DonationAlert,
    DonationAnalytics,
    DonationComplianceCheck,
    DonationKPIImpact,
    DonationRecipient,
    DonationRecord,
)

logger = structlog.get_logger()

router = APIRouter()


@router.get("/recipients", response_model=Dict[str, Any])
async def get_donation_recipients(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    recipient_type: Optional[str] = Query(None, description="Filter by recipient type"),
    active_only: bool = Query(True, description="Show only active recipients"),
    search: Optional[str] = Query(None, description="Search by name or contact"),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get donation recipients with filtering and pagination"""
    try:
        query = select(DonationRecipient)

        # Apply filters
        if active_only:
            query = query.where(DonationRecipient.is_active == True)

        if recipient_type:
            query = query.where(DonationRecipient.recipient_type == recipient_type)

        if search:
            search_filter = or_(
                DonationRecipient.organization_name.ilike(f"%{search}%"),
                DonationRecipient.contact_person.ilike(f"%{search}%"),
                DonationRecipient.contact_email.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        query = query.order_by(DonationRecipient.organization_name)

        result = await db.execute(query)
        recipients = result.scalars().all()

        # Convert to dict format
        recipients_data = []
        for recipient in recipients:
            recipient_dict = {
                "recipient_id": str(recipient.recipient_id),
                "organization_name": recipient.organization_name,
                "recipient_type": recipient.recipient_type,
                "contact_person": recipient.contact_person,
                "contact_email": recipient.contact_email,
                "contact_phone": recipient.contact_phone,
                "address": recipient.address,
                "certification_number": recipient.certification_number,
                "tax_exempt_status": recipient.tax_exempt_status,
                "is_active": recipient.is_active,
                "created_at": recipient.created_at.isoformat()
                if recipient.created_at
                else None,
                "last_donation_date": recipient.last_donation_date.isoformat()
                if recipient.last_donation_date
                else None,
            }
            recipients_data.append(recipient_dict)

        return {
            "recipients": recipients_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit,
            },
        }

    except Exception as e:
        logger.error("Error fetching donation recipients", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/records", response_model=Dict[str, Any])
async def get_donation_records(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    store_id: Optional[str] = Query(None, description="Filter by store"),
    recipient_id: Optional[str] = Query(None, description="Filter by recipient"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get donation records with comprehensive filtering"""
    try:
        # Join with recipients for enriched data
        query = select(DonationRecord, DonationRecipient).join(
            DonationRecipient,
            DonationRecord.recipient_id == DonationRecipient.recipient_id,
        )

        # Apply filters
        if store_id:
            query = query.where(DonationRecord.store_id == store_id)

        if recipient_id:
            query = query.where(DonationRecord.recipient_id == recipient_id)

        if status:
            query = query.where(DonationRecord.status == status)

        if start_date:
            start_dt = datetime.fromisoformat(start_date)
            query = query.where(DonationRecord.donation_date >= start_dt)

        if end_date:
            end_dt = datetime.fromisoformat(end_date)
            query = query.where(DonationRecord.donation_date <= end_dt)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        query = query.order_by(desc(DonationRecord.donation_date))

        result = await db.execute(query)
        records = result.all()

        # Convert to dict format
        records_data = []
        for donation_record, recipient in records:
            record_dict = {
                "donation_id": str(donation_record.donation_id),
                "store_id": donation_record.store_id,
                "recipient": {
                    "recipient_id": str(recipient.recipient_id),
                    "organization_name": recipient.organization_name,
                    "recipient_type": recipient.recipient_type,
                },
                "donation_date": donation_record.donation_date.isoformat()
                if donation_record.donation_date
                else None,
                "total_items": donation_record.total_items,
                "total_weight_kg": float(donation_record.total_weight_kg)
                if donation_record.total_weight_kg
                else None,
                "estimated_value_eur": float(donation_record.estimated_value_eur)
                if donation_record.estimated_value_eur
                else None,
                "status": donation_record.status,
                "pickup_scheduled": donation_record.pickup_scheduled.isoformat()
                if donation_record.pickup_scheduled
                else None,
                "pickup_completed": donation_record.pickup_completed.isoformat()
                if donation_record.pickup_completed
                else None,
                "compliance_status": donation_record.compliance_status,
                "created_at": donation_record.created_at.isoformat()
                if donation_record.created_at
                else None,
            }
            records_data.append(record_dict)

        return {
            "donation_records": records_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit,
            },
        }

    except Exception as e:
        logger.error("Error fetching donation records", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/compliance-checks/{donation_id}")
async def get_compliance_checks(
    donation_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get compliance checks for a specific donation"""
    try:
        query = (
            select(DonationComplianceCheck)
            .where(DonationComplianceCheck.donation_id == donation_id)
            .order_by(DonationComplianceCheck.check_performed_at.desc())
        )

        result = await db.execute(query)
        checks = result.scalars().all()

        checks_data = []
        for check in checks:
            check_dict = {
                "check_id": str(check.check_id),
                "check_type": check.check_type,
                "check_status": check.check_status,
                "eu_regulation_reference": check.eu_regulation_reference,
                "check_details": check.check_details,
                "check_performed_at": check.check_performed_at.isoformat()
                if check.check_performed_at
                else None,
                "checked_by": check.checked_by,
                "corrective_actions": check.corrective_actions,
            }
            checks_data.append(check_dict)

        return {"compliance_checks": checks_data}

    except Exception as e:
        logger.error(
            "Error fetching compliance checks", donation_id=donation_id, error=str(e)
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/summary")
async def get_donation_analytics_summary(
    store_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get donation analytics summary"""
    try:
        # Base query for analytics
        query = select(DonationAnalytics)

        if store_id:
            query = query.where(DonationAnalytics.store_id == store_id)

        if start_date:
            start_dt = datetime.fromisoformat(start_date)
            query = query.where(DonationAnalytics.reporting_period_start >= start_dt)

        if end_date:
            end_dt = datetime.fromisoformat(end_date)
            query = query.where(DonationAnalytics.reporting_period_end <= end_dt)

        result = await db.execute(query)
        analytics = result.scalars().all()

        # Aggregate data
        total_donations = len(analytics)
        total_items_donated = sum(
            a.total_items_donated for a in analytics if a.total_items_donated
        )
        total_weight_donated = sum(
            float(a.total_weight_donated_kg or 0) for a in analytics
        )
        total_value_donated = sum(
            float(a.total_value_donated_eur or 0) for a in analytics
        )
        avg_compliance_score = (
            sum(float(a.compliance_score or 0) for a in analytics) / len(analytics)
            if analytics
            else 0
        )

        # Recent activity
        recent_query = (
            select(DonationRecord).order_by(desc(DonationRecord.donation_date)).limit(5)
        )
        if store_id:
            recent_query = recent_query.where(DonationRecord.store_id == store_id)

        recent_result = await db.execute(recent_query)
        recent_donations = recent_result.scalars().all()

        recent_data = []
        for donation in recent_donations:
            recent_data.append(
                {
                    "donation_id": str(donation.donation_id),
                    "donation_date": donation.donation_date.isoformat()
                    if donation.donation_date
                    else None,
                    "total_items": donation.total_items,
                    "status": donation.status,
                    "compliance_status": donation.compliance_status,
                }
            )

        return {
            "summary": {
                "total_donations": total_donations,
                "total_items_donated": total_items_donated,
                "total_weight_donated_kg": round(total_weight_donated, 2),
                "total_value_donated_eur": round(total_value_donated, 2),
                "average_compliance_score": round(avg_compliance_score, 2),
            },
            "recent_donations": recent_data,
        }

    except Exception as e:
        logger.error("Error fetching donation analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/kpi-impact/{donation_id}")
async def get_donation_kpi_impact(
    donation_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get KPI impact data for a specific donation"""
    try:
        query = select(DonationKPIImpact).where(
            DonationKPIImpact.donation_id == donation_id
        )

        result = await db.execute(query)
        kpi_impact = result.scalar_one_or_none()

        if not kpi_impact:
            raise HTTPException(status_code=404, detail="KPI impact data not found")

        return {
            "kpi_impact_id": str(kpi_impact.kpi_impact_id),
            "food_waste_reduction_kg": float(kpi_impact.food_waste_reduction_kg)
            if kpi_impact.food_waste_reduction_kg
            else None,
            "co2_emissions_saved_kg": float(kpi_impact.co2_emissions_saved_kg)
            if kpi_impact.co2_emissions_saved_kg
            else None,
            "social_impact_score": float(kpi_impact.social_impact_score)
            if kpi_impact.social_impact_score
            else None,
            "tax_benefit_eur": float(kpi_impact.tax_benefit_eur)
            if kpi_impact.tax_benefit_eur
            else None,
            "calculated_at": kpi_impact.calculated_at.isoformat()
            if kpi_impact.calculated_at
            else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching KPI impact", donation_id=donation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/alerts")
async def get_donation_alerts(
    store_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(
        None, description="Filter by severity: low, medium, high"
    ),
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Get donation system alerts"""
    try:
        query = select(DonationAlert)

        if store_id:
            query = query.where(DonationAlert.store_id == store_id)

        if severity:
            query = query.where(DonationAlert.severity == severity)

        if resolved is not None:
            query = query.where(DonationAlert.is_resolved == resolved)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        query = query.order_by(desc(DonationAlert.created_at))

        result = await db.execute(query)
        alerts = result.scalars().all()

        alerts_data = []
        for alert in alerts:
            alert_dict = {
                "alert_id": str(alert.alert_id),
                "store_id": alert.store_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "metadata": alert.metadata,
                "is_resolved": alert.is_resolved,
                "resolved_at": alert.resolved_at.isoformat()
                if alert.resolved_at
                else None,
                "resolved_by": alert.resolved_by,
                "created_at": alert.created_at.isoformat()
                if alert.created_at
                else None,
            }
            alerts_data.append(alert_dict)

        return {
            "alerts": alerts_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit,
            },
        }

    except Exception as e:
        logger.error("Error fetching donation alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
