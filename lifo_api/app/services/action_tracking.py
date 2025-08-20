"""
LIFO.AI Action Tracking Service
Handles tracking of AI recommendations vs actual user actions
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.inventory_models import ActionType, BatchAction


class ActionTrackingService:
    """Service for tracking AI recommendations and user actions"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_recommendation_record(
        self,
        batch_id: str,
        store_id: str,
        ai_recommendation: str,
        ai_score: float,
        user_id: str | None = None,
    ) -> BatchAction:
        """
        Create a record when AI generates a recommendation
        This tracks what the AI recommended before any user action
        """
        action_record = BatchAction(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            recommended_action=ai_recommendation,
            actual_action="maintain",  # Default until user takes action
            ai_score=Decimal(str(ai_score)),
            action_date=datetime.utcnow(),
            performed_by=uuid.UUID(user_id) if user_id else None,
        )

        self.db.add(action_record)
        await self.db.commit()
        await self.db.refresh(action_record)

        return action_record

    async def update_actual_action(
        self,
        action_id: str,
        actual_action: str,
        user_id: str,
        quantity_affected: float | None = None,
        original_value: float | None = None,
        recovered_value: float | None = None,
        notes: str | None = None,
        donation_recipient_id: str | None = None,
    ) -> BatchAction:
        """
        Update the action record when user takes actual action
        This completes the AI recommendation vs actual action tracking
        """
        result = await self.db.execute(
            select(BatchAction).where(BatchAction.action_id == uuid.UUID(action_id))
        )
        action_record = result.scalar_one_or_none()

        if not action_record:
            raise ValueError(f"Action record not found: {action_id}")

        # Update with actual action taken
        action_record.actual_action = actual_action
        action_record.performed_by = uuid.UUID(user_id)
        action_record.action_date = datetime.utcnow()

        if quantity_affected is not None:
            action_record.quantity_affected = Decimal(str(quantity_affected))
        if original_value is not None:
            action_record.original_value = Decimal(str(original_value))
        if recovered_value is not None:
            action_record.recovered_value = Decimal(str(recovered_value))
        if notes:
            action_record.notes = notes
        if donation_recipient_id:
            action_record.donation_recipient_id = uuid.UUID(donation_recipient_id)

        await self.db.commit()
        await self.db.refresh(action_record)

        return action_record

    async def record_immediate_action(
        self,
        batch_id: str,
        store_id: str,
        recommended_action: str,
        actual_action: str,
        ai_score: float,
        user_id: str,
        quantity_affected: float | None = None,
        original_value: float | None = None,
        recovered_value: float | None = None,
        notes: str | None = None,
        donation_recipient_id: str | None = None,
    ) -> BatchAction:
        """
        Record when user immediately takes action based on AI recommendation
        This is for cases where recommendation and action happen at the same time
        """
        action_record = BatchAction(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            recommended_action=recommended_action,
            actual_action=actual_action,
            ai_score=Decimal(str(ai_score)),
            action_date=datetime.utcnow(),
            performed_by=uuid.UUID(user_id),
            quantity_affected=Decimal(str(quantity_affected))
            if quantity_affected
            else None,
            original_value=Decimal(str(original_value)) if original_value else None,
            recovered_value=Decimal(str(recovered_value)) if recovered_value else None,
            notes=notes,
            donation_recipient_id=uuid.UUID(donation_recipient_id)
            if donation_recipient_id
            else None,
        )

        self.db.add(action_record)
        await self.db.commit()
        await self.db.refresh(action_record)

        return action_record

    async def get_recommendation_effectiveness(
        self, store_id: str, days_back: int = 30
    ) -> dict[str, Any]:
        """
        Get analytics on how well AI recommendations are being followed
        """
        from sqlalchemy import and_, func

        result = await self.db.execute(
            select(
                BatchAction.recommended_action,
                BatchAction.actual_action,
                func.count().label("count"),
                func.avg(BatchAction.ai_score).label("avg_ai_score"),
                func.sum(BatchAction.original_value).label("total_original_value"),
                func.sum(BatchAction.recovered_value).label("total_recovered_value"),
            )
            .where(
                and_(
                    BatchAction.store_id == uuid.UUID(store_id),
                    BatchAction.action_date
                    >= datetime.utcnow().replace(day=datetime.utcnow().day - days_back),
                )
            )
            .group_by(BatchAction.recommended_action, BatchAction.actual_action)
        )

        analytics_data = result.fetchall()

        return {
            "store_id": store_id,
            "period_days": days_back,
            "recommendation_effectiveness": [
                {
                    "recommended_action": row.recommended_action,
                    "actual_action": row.actual_action,
                    "count": row.count,
                    "avg_ai_score": float(row.avg_ai_score) if row.avg_ai_score else 0,
                    "total_original_value": float(row.total_original_value)
                    if row.total_original_value
                    else 0,
                    "total_recovered_value": float(row.total_recovered_value)
                    if row.total_recovered_value
                    else 0,
                    "follow_rate": 1.0
                    if row.recommended_action == row.actual_action
                    else 0.0,
                }
                for row in analytics_data
            ],
        }

    def map_scoring_action_to_enum(self, scoring_action: str) -> str:
        """
        Map scoring system action names to database enum values
        """
        action_mapping = {
            "discount_aggressive": ActionType.DISCOUNT.value,
            "discount_moderate": ActionType.DISCOUNT.value,
            "monitor": ActionType.MAINTAIN.value,
            "maintain": ActionType.MAINTAIN.value,
            "dispose": ActionType.DISPOSE.value,
            "donate": ActionType.DONATE.value,
        }

        return action_mapping.get(scoring_action, ActionType.MAINTAIN.value)
