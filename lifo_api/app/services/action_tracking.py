"""
LIFO.AI Action Tracking Service
Handles tracking of AI recommendations vs actual user actions
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.inventory_models import ActionType, BatchAction, Batch


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
        # Fetch batch to get initial quantity
        batch_result = await self.db.execute(
            select(Batch).where(Batch.batch_id == uuid.UUID(batch_id))
        )
        batch = batch_result.scalar_one_or_none()

        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        action_record = BatchAction(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            recommended_action=ai_recommendation,
            action_type="maintain",  # Default until user takes action
            ai_score=Decimal(str(ai_score)),
            performed_at=datetime.now(UTC).replace(tzinfo=None),
            performed_by=uuid.UUID(user_id) if user_id else None,
            # Required fields with defaults
            quantity_affected=Decimal("0"),
            total_original_value=Decimal("0"),
            total_recovered_value=Decimal("0"),
            batch_initial_quantity=batch.initial_quantity,
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
        total_original_value: float | None = None,
        total_recovered_value: float | None = None,
        notes: str | None = None,
        donation_recipient_id: str | None = None,
    ) -> BatchAction:
        """
        Update the action record when user takes actual action
        This completes the AI recommendation vs actual action tracking
        """
        result = await self.db.execute(
            select(BatchAction).where(BatchAction.entry_id == uuid.UUID(action_id))
        )
        action_record = result.scalar_one_or_none()

        if not action_record:
            raise ValueError(f"Action record not found: {action_id}")

        # Update with actual action taken
        action_record.action_type = actual_action  # type: ignore
        action_record.performed_by = uuid.UUID(user_id)  # type: ignore
        action_record.performed_at = datetime.now(UTC).replace(tzinfo=None)  # type: ignore

        if quantity_affected is not None:
            action_record.quantity_affected = Decimal(str(quantity_affected))  # type: ignore
        if total_original_value is not None:
            action_record.total_original_value = Decimal(str(total_original_value))  # type: ignore
        if total_recovered_value is not None:
            action_record.total_recovered_value = Decimal(str(total_recovered_value))  # type: ignore
        if notes:
            action_record.notes = notes  # type: ignore
        if donation_recipient_id:
            action_record.donation_recipient_id = uuid.UUID(donation_recipient_id)  # type: ignore

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
        total_original_value: float | None = None,
        total_recovered_value: float | None = None,
        notes: str | None = None,
        donation_recipient_id: str | None = None,
    ) -> BatchAction:
        """
        Record when user immediately takes action based on AI recommendation
        This is for cases where recommendation and action happen at the same time
        """
        # Fetch batch to get initial quantity
        batch_result = await self.db.execute(
            select(Batch).where(Batch.batch_id == uuid.UUID(batch_id))
        )
        batch = batch_result.scalar_one_or_none()

        if not batch:
            raise ValueError(f"Batch not found: {batch_id}")

        action_record = BatchAction(
            batch_id=uuid.UUID(batch_id),
            store_id=uuid.UUID(store_id),
            recommended_action=recommended_action,
            action_type=actual_action,
            ai_score=Decimal(str(ai_score)),
            performed_at=datetime.now(UTC).replace(tzinfo=None),
            performed_by=uuid.UUID(user_id),
            quantity_affected=Decimal(str(quantity_affected)) if quantity_affected else Decimal("0"),
            total_original_value=Decimal(str(total_original_value)) if total_original_value else Decimal("0"),
            total_recovered_value=Decimal(str(total_recovered_value)) if total_recovered_value else Decimal("0"),
            batch_initial_quantity=batch.initial_quantity,
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
                BatchAction.action_type,
                func.count().label("count"),
                func.avg(BatchAction.ai_score).label("avg_ai_score"),
                func.sum(BatchAction.total_original_value).label("total_original_value"),
                func.sum(BatchAction.total_recovered_value).label("total_recovered_value"),
            )
            .where(
                and_(
                    BatchAction.store_id == uuid.UUID(store_id),
                    BatchAction.performed_at
                    >= datetime.now(UTC).replace(day=datetime.now(UTC).day - days_back),
                )
            )
            .group_by(BatchAction.recommended_action, BatchAction.action_type)
        )

        analytics_data = result.fetchall()

        return {
            "store_id": store_id,
            "period_days": days_back,
            "recommendation_effectiveness": [
                {
                    "recommended_action": row.recommended_action,
                    "actual_action": row.action_type,
                    "count": row.count,
                    "avg_ai_score": float(row.avg_ai_score) if row.avg_ai_score else 0,
                    "total_original_value": float(row.total_original_value)
                    if row.total_original_value
                    else 0,
                    "total_recovered_value": float(row.total_recovered_value)
                    if row.total_recovered_value
                    else 0,
                    "follow_rate": 1.0
                    if row.recommended_action == row.action_type
                    else 0.0,
                }
                for row in analytics_data
            ],
        }

    def map_scoring_action_to_enum(self, scoring_action: str) -> str:
        """
        Map scoring system action names to database enum values
        Handles both legacy and FastAPI recommendation formats
        """
        from app.utils.recommendation_migration import RecommendationMigrator

        # First migrate legacy recommendation to standard format
        standard_recommendation = RecommendationMigrator.migrate_recommendation(
            scoring_action
        )

        # Map standard recommendations to database enums
        action_mapping = {
            # FastAPI Standard Recommendations
            "discount_aggressive": ActionType.DISCOUNT.value,
            "discount_moderate": ActionType.DISCOUNT.value,
            "alert": ActionType.MAINTAIN.value,  # Alert means monitor closely
            "monitor": ActionType.MAINTAIN.value,
            "maintain": ActionType.MAINTAIN.value,
            "dispose": ActionType.DISPOSE.value,
            "donate": ActionType.DONATE.value,
            # Legacy support (in case migration missed something)
            "immediate_action": ActionType.DISCOUNT.value,
            "high_priority": ActionType.DISCOUNT.value,
            "medium_priority": ActionType.DISCOUNT.value,
            "discount_heavily": ActionType.DISCOUNT.value,
            "normal": ActionType.MAINTAIN.value,
        }

        return action_mapping.get(standard_recommendation, ActionType.MAINTAIN.value)
