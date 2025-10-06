"""
Donation Queries API - Simplified for MVP
Read-only operations for donation tracking and analytics
Based on simplified schema from migration 017
"""

from datetime import datetime, timedelta
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user
from app.database.connection import get_database
from app.database.inventory_models import (
    ActionType,
    BatchAction,
    DonationRecipient,
    DonationRecipientType,
)

logger = structlog.get_logger()
router = APIRouter()


@router.get("/recipients")
async def get_donation_recipients(
    store_id: str | None = Query(None, description="Filter by store ID"),
    recipient_type: DonationRecipientType | None = Query(
        None, description="Filter by recipient type"
    ),
    is_active: bool = Query(True, description="Filter by active status"),
    db: AsyncSession = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get donation recipients for a store
    Simplified version for MVP
    """
    try:
        query = select(DonationRecipient).where(
            DonationRecipient.is_active == is_active
        )

        if store_id:
            query = query.where(DonationRecipient.store_id == store_id)

        if recipient_type:
            query = query.where(DonationRecipient.recipient_type == recipient_type)

        query = query.order_by(DonationRecipient.name)

        result = await db.execute(query)
        recipients = result.scalars().all()

        return {
            "recipients": [
                {
                    "recipient_id": str(recipient.recipient_id),
                    "name": recipient.name,
                    "contact_email": recipient.contact_email,
                    "contact_phone": recipient.contact_phone,
                    "recipient_type": recipient.recipient_type.value,
                    "is_certified": recipient.is_certified,
                    "certification_notes": recipient.certification_notes,
                    "accepts_pickups": recipient.accepts_pickups,
                    "max_distance_km": recipient.max_distance_km,
                    "store_id": str(recipient.store_id),
                    "created_at": recipient.created_at.isoformat()
                    if recipient.created_at
                    else None,
                }
                for recipient in recipients
            ],
            "total_count": len(recipients),
        }

    except Exception as e:
        logger.error("Failed to get donation recipients", error=str(e))
        raise HTTPException(
            status_code=500, detail="Failed to retrieve donation recipients"
        ) from e


@router.get("/actions")
async def get_batch_actions(
    store_id: str | None = Query(None, description="Filter by store ID"),
    action_type: ActionType | None = Query(None, description="Filter by action type"),
    days: int = Query(30, description="Number of days to look back"),
    limit: int = Query(100, description="Maximum number of results"),
    db: AsyncSession = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get batch actions (what users did with AI recommendations)
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        query = select(BatchAction).where(BatchAction.performed_at >= cutoff_date)

        if store_id:
            query = query.where(BatchAction.store_id == store_id)

        if action_type:
            query = query.where(BatchAction.action_type == action_type)

        query = query.order_by(desc(BatchAction.performed_at)).limit(limit)

        result = await db.execute(query)
        actions = result.scalars().all()

        return {
            "actions": [
                {
                    "action_id": str(action.entry_id),
                    "batch_id": str(action.batch_id),
                    "store_id": str(action.store_id),
                    "recommended_action": action.recommended_action.value,
                    "actual_action": action.action_type.value,
                    "ai_score": float(action.ai_score) if action.ai_score else None,
                    "action_date": action.performed_at.isoformat()
                    if action.performed_at
                    else None,
                    "quantity_affected": float(action.quantity_affected)
                    if action.quantity_affected
                    else None,
                    "notes": action.notes,
                    "original_value": float(action.total_original_value)
                    if action.total_original_value
                    else None,
                    "recovered_value": float(action.total_recovered_value)
                    if action.total_recovered_value
                    else None,
                    "donation_recipient_id": str(action.donation_recipient_id)
                    if action.donation_recipient_id
                    else None,
                }
                for action in actions
            ],
            "total_count": len(actions),
            "period_days": days,
        }

    except Exception as e:
        logger.error("Failed to get batch actions", error=str(e))
        raise HTTPException(
            status_code=500, detail="Failed to retrieve batch actions"
        ) from e


@router.get("/analytics/summary")
async def get_donation_analytics_summary(
    store_id: str | None = Query(None, description="Filter by store ID"),
    days: int = Query(30, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get donation analytics summary
    Simplified analytics for MVP
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Base query
        query = select(BatchAction).where(BatchAction.performed_at >= cutoff_date)

        if store_id:
            query = query.where(BatchAction.store_id == store_id)

        result = await db.execute(query)
        actions = result.scalars().all()

        # Calculate summary statistics
        total_actions = len(actions)
        donation_actions = [a for a in actions if a.action_type == ActionType.DONATE]

        total_donated_value = sum(
            float(action.total_original_value)
            for action in donation_actions
            if action.total_original_value
        )

        total_recovered_value = sum(
            float(action.total_recovered_value)
            for action in donation_actions
            if action.total_recovered_value
        )

        # Action type breakdown
        action_breakdown = {}
        for action_type in ActionType:
            count = len([a for a in actions if a.action_type == action_type])
            action_breakdown[action_type.value] = count

        # Recommendation vs actual analysis
        followed_recommendations = len(
            [a for a in actions if a.recommended_action == a.action_type]
        )

        recommendation_accuracy = (
            (followed_recommendations / total_actions * 100) if total_actions > 0 else 0
        )

        return {
            "summary": {
                "period_days": days,
                "total_actions": total_actions,
                "donation_count": len(donation_actions),
                "total_donated_value": total_donated_value,
                "total_recovered_value": total_recovered_value,
                "recommendation_accuracy_percent": round(recommendation_accuracy, 2),
            },
            "action_breakdown": action_breakdown,
            "donation_impact": {
                "items_donated": len(donation_actions),
                "estimated_tax_benefit": total_recovered_value,
                "waste_prevented_value": total_donated_value,
            },
        }

    except Exception as e:
        logger.error("Failed to get donation analytics", error=str(e))
        raise HTTPException(
            status_code=500, detail="Failed to retrieve donation analytics"
        ) from e


# Legacy endpoints removed - functionality consolidated into /analytics/summary
