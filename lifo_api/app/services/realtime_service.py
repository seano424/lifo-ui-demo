"""
Real-time integration service for MVP
Handles real-time updates and notifications for mobile scanning workflows
"""

import asyncio
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import structlog

from app.models.scan_models import RealtimeUpdate

logger = structlog.get_logger()


class UpdateType(str, Enum):
    """Types of real-time updates"""

    SCORE_CHANGE = "score_change"
    NEW_BATCH = "new_batch"
    STATUS_CHANGE = "status_change"
    URGENCY_ALERT = "urgency_alert"
    ACTION_COMPLETED = "action_completed"
    BATCH_UPDATED = "batch_updated"
    SCAN_COMPLETED = "scan_completed"


class UpdatePriority(str, Enum):
    """Priority levels for updates"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class RealtimeService:
    """
    Service for managing real-time updates and notifications
    Integrates with Supabase real-time subscriptions
    """

    def __init__(self):
        self.active_subscriptions: Dict[
            str, List[str]
        ] = {}  # store_id -> list of user_ids
        self.update_queue: List[RealtimeUpdate] = []
        self.logger = structlog.get_logger().bind(component="realtime_service")

    async def subscribe_to_store(self, store_id: str, user_id: str):
        """Subscribe user to store updates"""
        if store_id not in self.active_subscriptions:
            self.active_subscriptions[store_id] = []

        if user_id not in self.active_subscriptions[store_id]:
            self.active_subscriptions[store_id].append(user_id)
            self.logger.info(
                "User subscribed to store updates", store_id=store_id, user_id=user_id
            )

    async def unsubscribe_from_store(self, store_id: str, user_id: str):
        """Unsubscribe user from store updates"""
        if store_id in self.active_subscriptions:
            if user_id in self.active_subscriptions[store_id]:
                self.active_subscriptions[store_id].remove(user_id)
                self.logger.info(
                    "User unsubscribed from store updates",
                    store_id=store_id,
                    user_id=user_id,
                )

    async def broadcast_update(self, update: RealtimeUpdate):
        """Broadcast update to subscribed users"""
        store_id = update.store_id

        if store_id not in self.active_subscriptions:
            return

        subscribers = self.active_subscriptions[store_id]
        if not subscribers:
            return

        # Add to update queue for processing
        self.update_queue.append(update)

        # Log the broadcast
        self.logger.info(
            "Update broadcast",
            store_id=store_id,
            update_type=update.update_type,
            priority=update.priority,
            subscriber_count=len(subscribers),
        )

        # In production, this would integrate with Supabase real-time
        await self._send_to_supabase_realtime(update, subscribers)

    async def _send_to_supabase_realtime(
        self, update: RealtimeUpdate, subscribers: List[str]
    ):
        """Send update to Supabase real-time (placeholder for actual integration)"""
        try:
            # Prepare payload for Supabase real-time
            payload = {
                "type": update.update_type,
                "store_id": update.store_id,
                "batch_id": update.batch_id,
                "data": update.data,
                "priority": update.priority,
                "timestamp": update.timestamp.isoformat(),
            }

            # In actual implementation, this would use Supabase client
            # supabase.realtime.send(channel=f"store:{update.store_id}", payload=payload)

            self.logger.debug(
                "Real-time payload prepared",
                store_id=update.store_id,
                payload_size=len(json.dumps(payload)),
            )

        except Exception as e:
            self.logger.error(
                "Failed to send real-time update",
                store_id=update.store_id,
                error=str(e),
            )

    async def trigger_score_update(
        self,
        store_id: str,
        batch_id: str,
        score_data: Dict[str, Any],
        priority: str = "normal",
    ):
        """Trigger score change update"""
        update = RealtimeUpdate(
            store_id=store_id,
            batch_id=batch_id,
            update_type=UpdateType.SCORE_CHANGE,
            data={
                "new_score": score_data.get("composite_score"),
                "urgency_level": score_data.get("urgency_level"),
                "recommendation": score_data.get("recommendation"),
                "calculated_at": datetime.utcnow().isoformat(),
            },
            priority=priority,
        )

        await self.broadcast_update(update)

    async def trigger_scan_completion(
        self, store_id: str, batch_id: str, scan_data: Dict[str, Any], scan_type: str
    ):
        """Trigger scan completion update"""
        update = RealtimeUpdate(
            store_id=store_id,
            batch_id=batch_id,
            update_type=UpdateType.SCAN_COMPLETED,
            data={
                "scan_type": scan_type,  # "scan_in" or "scan_out"
                "success": scan_data.get("success", False),
                "processing_time_ms": scan_data.get("processing_time_ms"),
                "user_message": scan_data.get("user_message", "Scan completed"),
            },
            priority="normal",
        )

        await self.broadcast_update(update)

    async def trigger_urgency_alert(
        self, store_id: str, batch_id: str, alert_data: Dict[str, Any]
    ):
        """Trigger urgency alert for immediate attention"""
        update = RealtimeUpdate(
            store_id=store_id,
            batch_id=batch_id,
            update_type=UpdateType.URGENCY_ALERT,
            data={
                "urgency_level": alert_data.get("urgency_level", "high"),
                "days_to_expiry": alert_data.get("days_to_expiry"),
                "sku": alert_data.get("sku"),
                "product_name": alert_data.get("product_name"),
                "recommended_action": alert_data.get("recommended_action"),
                "potential_loss": alert_data.get("potential_loss"),
            },
            priority="critical"
            if alert_data.get("urgency_level") == "critical"
            else "high",
        )

        await self.broadcast_update(update)

    async def trigger_batch_status_change(
        self, store_id: str, batch_id: str, status_change: Dict[str, Any]
    ):
        """Trigger batch status change update"""
        update = RealtimeUpdate(
            store_id=store_id,
            batch_id=batch_id,
            update_type=UpdateType.STATUS_CHANGE,
            data={
                "old_status": status_change.get("old_status"),
                "new_status": status_change.get("new_status"),
                "old_quantity": status_change.get("old_quantity"),
                "new_quantity": status_change.get("new_quantity"),
                "action_taken": status_change.get("action_taken"),
                "effectiveness_score": status_change.get("effectiveness_score"),
            },
            priority="normal",
        )

        await self.broadcast_update(update)

    async def trigger_new_batch_alert(
        self, store_id: str, batch_id: str, batch_data: Dict[str, Any]
    ):
        """Trigger new batch creation alert"""
        update = RealtimeUpdate(
            store_id=store_id,
            batch_id=batch_id,
            update_type=UpdateType.NEW_BATCH,
            data={
                "sku": batch_data.get("sku"),
                "product_name": batch_data.get("product_name"),
                "category": batch_data.get("category"),
                "quantity": batch_data.get("quantity"),
                "days_to_expiry": batch_data.get("days_to_expiry"),
                "initial_urgency_score": batch_data.get("initial_score"),
                "created_via": "scan_in",  # Indicates mobile scan creation
            },
            priority="normal",
        )

        await self.broadcast_update(update)

    def get_active_subscriptions(self) -> Dict[str, int]:
        """Get count of active subscriptions per store"""
        return {
            store_id: len(users)
            for store_id, users in self.active_subscriptions.items()
        }

    def get_update_queue_size(self) -> int:
        """Get current update queue size"""
        return len(self.update_queue)

    async def process_update_queue(self, max_batch_size: int = 50):
        """Process queued updates in batches"""
        if not self.update_queue:
            return

        # Process updates in batches
        batch = self.update_queue[:max_batch_size]
        self.update_queue = self.update_queue[max_batch_size:]

        # Group by store for efficient processing
        store_updates = {}
        for update in batch:
            store_id = update.store_id
            if store_id not in store_updates:
                store_updates[store_id] = []
            store_updates[store_id].append(update)

        # Process each store's updates
        for store_id, updates in store_updates.items():
            await self._process_store_updates(store_id, updates)

        self.logger.info(
            "Update queue processed",
            batch_size=len(batch),
            remaining_queue_size=len(self.update_queue),
        )

    async def _process_store_updates(
        self, store_id: str, updates: List[RealtimeUpdate]
    ):
        """Process updates for a specific store"""
        try:
            # Sort by priority and timestamp
            priority_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}
            updates.sort(key=lambda u: (priority_order.get(u.priority, 4), u.timestamp))

            # Send updates to Supabase real-time
            for update in updates:
                subscribers = self.active_subscriptions.get(store_id, [])
                if subscribers:
                    await self._send_to_supabase_realtime(update, subscribers)

        except Exception as e:
            self.logger.error(
                "Failed to process store updates", store_id=store_id, error=str(e)
            )


# Global realtime service instance
realtime_service = RealtimeService()


# Helper functions for easy integration


async def notify_score_change(store_id: str, batch_id: str, score_data: Dict[str, Any]):
    """Convenience function to notify score changes"""
    await realtime_service.trigger_score_update(store_id, batch_id, score_data)


async def notify_scan_completion(
    store_id: str, batch_id: str, scan_result: Dict[str, Any], scan_type: str
):
    """Convenience function to notify scan completion"""
    await realtime_service.trigger_scan_completion(
        store_id, batch_id, scan_result, scan_type
    )


async def notify_urgency_alert(
    store_id: str, batch_id: str, alert_info: Dict[str, Any]
):
    """Convenience function to send urgency alerts"""
    await realtime_service.trigger_urgency_alert(store_id, batch_id, alert_info)


async def notify_batch_change(
    store_id: str, batch_id: str, change_info: Dict[str, Any]
):
    """Convenience function to notify batch changes"""
    await realtime_service.trigger_batch_status_change(store_id, batch_id, change_info)


async def notify_new_batch(store_id: str, batch_id: str, batch_info: Dict[str, Any]):
    """Convenience function to notify new batch creation"""
    await realtime_service.trigger_new_batch_alert(store_id, batch_id, batch_info)


# Real-time health monitoring
class RealtimeHealthMonitor:
    """Monitor real-time service health"""

    def __init__(self):
        self.message_count = 0
        self.error_count = 0
        self.last_message_time = None
        self.start_time = datetime.utcnow()

    def record_message(self, success: bool = True):
        """Record a real-time message"""
        self.message_count += 1
        if not success:
            self.error_count += 1
        self.last_message_time = datetime.utcnow()

    def get_health_status(self) -> Dict[str, Any]:
        """Get real-time service health status"""
        uptime = datetime.utcnow() - self.start_time
        error_rate = self.error_count / max(self.message_count, 1)

        return {
            "status": "healthy" if error_rate < 0.05 else "degraded",
            "uptime_seconds": uptime.total_seconds(),
            "total_messages": self.message_count,
            "error_count": self.error_count,
            "error_rate": error_rate,
            "last_message": self.last_message_time.isoformat()
            if self.last_message_time
            else None,
            "active_subscriptions": realtime_service.get_active_subscriptions(),
            "queue_size": realtime_service.get_update_queue_size(),
        }


# Global health monitor
realtime_health = RealtimeHealthMonitor()


# Background task for processing updates
async def realtime_background_processor():
    """Background task to process real-time updates"""
    while True:
        try:
            await realtime_service.process_update_queue()
            await asyncio.sleep(1)  # Process every second
        except Exception as e:
            logger.error("Real-time background processor error", error=str(e))
            await asyncio.sleep(5)  # Wait longer on error


# Integration with mobile workflows
async def integrate_realtime_with_scan_workflow(
    workflow_type: str, store_id: str, batch_id: str, workflow_data: Dict[str, Any]
):
    """Integrate real-time updates with scan workflows"""
    try:
        if workflow_type == "scan_in":
            await notify_scan_completion(store_id, batch_id, workflow_data, "scan_in")

            # If high urgency, send alert
            if workflow_data.get("initial_score", 0) >= 0.8:
                await notify_urgency_alert(
                    store_id,
                    batch_id,
                    {
                        "urgency_level": "critical",
                        "sku": workflow_data.get("sku"),
                        "days_to_expiry": workflow_data.get("days_to_expiry"),
                        "recommended_action": "Immediate discount required",
                    },
                )

        elif workflow_type == "scan_out":
            await notify_scan_completion(store_id, batch_id, workflow_data, "scan_out")
            await notify_batch_change(
                store_id,
                batch_id,
                {
                    "new_quantity": workflow_data.get("remaining_quantity"),
                    "action_taken": workflow_data.get("action"),
                    "effectiveness_score": workflow_data.get("effectiveness_score"),
                },
            )

        realtime_health.record_message(success=True)

    except Exception as e:
        logger.error(
            "Real-time integration failed",
            workflow_type=workflow_type,
            store_id=store_id,
            error=str(e),
        )
        realtime_health.record_message(success=False)
