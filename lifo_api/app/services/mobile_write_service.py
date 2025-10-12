"""
Mobile Write Service for Backend-Centric Architecture
Optimized specifically for mobile app data patterns and network conditions
"""

import time
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.database.inventory_models import Batch
from app.monitoring.metrics import get_metrics_collector
from app.services.advanced_write_optimizer import get_advanced_write_optimizer

logger = structlog.get_logger()
metrics = get_metrics_collector()


class MobileDataConflictResolver:
    """
    Handles conflicts between mobile app data and server state
    Implements intelligent merge strategies for offline-first mobile apps
    """

    def __init__(self):
        self.conflict_strategies = {
            "batch_quantity": self._resolve_quantity_conflict,
            "batch_status": self._resolve_status_conflict,
            "user_action": self._resolve_action_conflict,
            "scan_data": self._resolve_scan_conflict,
        }

    async def resolve_conflicts(
        self,
        session: AsyncSession,
        mobile_data: dict[str, Any],
        server_data: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Resolve conflicts between mobile and server data
        Returns merged data with conflict resolution details
        """
        conflicts_found = []
        resolved_data = server_data.copy()

        # Check for conflicts in each data type
        for data_type, mobile_items in mobile_data.items():
            if data_type in server_data:
                server_items = server_data[data_type]

                conflicts, merged_items = await self._check_data_conflicts(
                    session, data_type, mobile_items, server_items, sync_metadata
                )

                if conflicts:
                    conflicts_found.extend(conflicts)
                    resolved_data[data_type] = merged_items
                else:
                    resolved_data[data_type] = mobile_items

        return {
            "resolved_data": resolved_data,
            "conflicts_found": len(conflicts_found),
            "conflict_details": conflicts_found,
        }

    async def _check_data_conflicts(
        self,
        session: AsyncSession,
        data_type: str,
        mobile_items: list[dict[str, Any]],
        server_items: list[dict[str, Any]],
        sync_metadata: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Check for conflicts between mobile and server data items"""

        conflicts = []
        merged_items = []

        # Create lookup for server items
        server_lookup = {
            item.get("id", item.get("batch_id")): item for item in server_items
        }

        for mobile_item in mobile_items:
            item_id = mobile_item.get("id", mobile_item.get("batch_id"))

            if item_id in server_lookup:
                server_item = server_lookup[item_id]

                # Check timestamps for conflicts
                mobile_timestamp = self._parse_timestamp(
                    mobile_item.get("updated_at", mobile_item.get("timestamp"))
                )
                server_timestamp = self._parse_timestamp(server_item.get("updated_at"))
                client_last_sync = self._parse_timestamp(
                    sync_metadata.get("client_timestamp")
                )

                if (
                    server_timestamp
                    and client_last_sync
                    and server_timestamp > client_last_sync
                ):
                    # Server was updated after client's last sync - potential conflict
                    conflict_resolution = await self._resolve_item_conflict(
                        session, data_type, mobile_item, server_item, sync_metadata
                    )

                    conflicts.append(
                        {
                            "item_id": item_id,
                            "data_type": data_type,
                            "mobile_timestamp": mobile_timestamp.isoformat()
                            if mobile_timestamp
                            else None,
                            "server_timestamp": server_timestamp.isoformat()
                            if server_timestamp
                            else None,
                            "resolution_strategy": conflict_resolution["strategy"],
                            "resolved_item": conflict_resolution["resolved_item"],
                        }
                    )

                    merged_items.append(conflict_resolution["resolved_item"])
                else:
                    # No conflict - use mobile data
                    merged_items.append(mobile_item)
            else:
                # New item from mobile
                merged_items.append(mobile_item)

        return conflicts, merged_items

    async def _resolve_item_conflict(
        self,
        session: AsyncSession,
        data_type: str,
        mobile_item: dict[str, Any],
        server_item: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve conflict for a specific item"""

        if data_type in self.conflict_strategies:
            return await self.conflict_strategies[data_type](
                session, mobile_item, server_item, sync_metadata
            )
        else:
            # Default strategy: server wins with mobile metadata preserved
            return {
                "strategy": "server_priority_with_mobile_metadata",
                "resolved_item": {
                    **server_item,
                    "mobile_metadata": mobile_item.get("metadata", {}),
                    "conflict_resolved_at": datetime.utcnow().isoformat(),
                },
            }

    async def _resolve_quantity_conflict(
        self,
        session: AsyncSession,
        mobile_item: dict[str, Any],
        server_item: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve quantity conflicts using business logic"""

        mobile_qty = float(mobile_item.get("current_quantity", 0))
        server_qty = float(server_item.get("current_quantity", 0))

        # Use the lower quantity as it's more likely to be accurate for inventory
        resolved_qty = min(mobile_qty, server_qty)

        return {
            "strategy": "minimum_quantity_wins",
            "resolved_item": {
                **server_item,
                "current_quantity": resolved_qty,
                "conflict_metadata": {
                    "mobile_quantity": mobile_qty,
                    "server_quantity": server_qty,
                    "resolution_reason": "inventory_safety",
                },
            },
        }

    async def _resolve_status_conflict(
        self,
        session: AsyncSession,
        mobile_item: dict[str, Any],
        server_item: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve status conflicts with priority rules"""

        mobile_status = mobile_item.get("status")
        server_status = server_item.get("status")

        # Priority order: disposed > expired > sold > active
        status_priority = {"disposed": 4, "expired": 3, "sold": 2, "active": 1}

        mobile_priority = status_priority.get(mobile_status, 0)
        server_priority = status_priority.get(server_status, 0)

        resolved_status = (
            mobile_status if mobile_priority > server_priority else server_status
        )

        return {
            "strategy": "status_priority_resolution",
            "resolved_item": {
                **server_item,
                "status": resolved_status,
                "conflict_metadata": {
                    "mobile_status": mobile_status,
                    "server_status": server_status,
                    "resolution_reason": "status_priority",
                },
            },
        }

    async def _resolve_action_conflict(
        self,
        session: AsyncSession,
        mobile_item: dict[str, Any],
        server_item: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve user action conflicts"""

        # For user actions, mobile typically wins as user initiated the action
        return {
            "strategy": "mobile_action_priority",
            "resolved_item": {
                **mobile_item,
                "server_metadata": server_item,
                "sync_resolved_at": datetime.utcnow().isoformat(),
            },
        }

    async def _resolve_scan_conflict(
        self,
        session: AsyncSession,
        mobile_item: dict[str, Any],
        server_item: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve scan data conflicts"""

        # For scan data, use the one with higher confidence
        mobile_confidence = float(mobile_item.get("scan_confidence", 0))
        server_confidence = float(server_item.get("scan_confidence", 0))

        if mobile_confidence >= server_confidence:
            resolved_item = mobile_item
            strategy = "mobile_higher_confidence"
        else:
            resolved_item = server_item
            strategy = "server_higher_confidence"

        return {
            "strategy": strategy,
            "resolved_item": {
                **resolved_item,
                "confidence_comparison": {
                    "mobile_confidence": mobile_confidence,
                    "server_confidence": server_confidence,
                },
            },
        }

    def _parse_timestamp(self, timestamp_str: str | None) -> datetime | None:
        """Parse timestamp string to datetime"""
        if not timestamp_str:
            return None

        try:
            return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None


class MobileWriteService:
    """
    Specialized write service for mobile app data patterns
    Optimized for offline-first scenarios, sync operations, and mobile networks
    """

    def __init__(self):
        self.session_factory = async_session()
        self.conflict_resolver = MobileDataConflictResolver()
        self.write_optimizer = get_advanced_write_optimizer()
        self.sync_cache = {}
        self.batch_queue = []

    async def sync_mobile_data(
        self,
        user_id: str,
        store_id: str,
        mobile_data: dict[str, Any],
        sync_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        OPTIMIZED: Sync mobile app data with conflict resolution

        Handles:
        - Offline data synchronization
        - Conflict resolution between mobile and server
        - Batch uploads from mobile scanning
        - User action tracking
        - Network-optimized operations
        """
        start_time = time.time()

        async with self.write_optimizer.optimized_write_transaction(
            "mobile_sync", "mobile_data_sync"
        ) as (session, tx, bulk_optimizer):
            try:
                sync_results = {
                    "batch_updates_synced": 0,
                    "user_actions_synced": 0,
                    "analytics_events_recorded": 0,
                    "scans_processed": 0,
                    "conflicts_resolved": 0,
                    "sync_timestamp": datetime.utcnow().isoformat(),
                }

                # Step 1: Process batch updates from mobile
                if "batch_updates" in mobile_data:
                    await tx.create_savepoint("batch_updates")

                    batch_results = await self._sync_batch_updates(
                        session,
                        store_id,
                        mobile_data["batch_updates"],
                        sync_metadata,
                        tx,
                    )
                    sync_results["batch_updates_synced"] = batch_results["synced"]
                    sync_results["conflicts_resolved"] += batch_results["conflicts"]

                # Step 2: Process user actions from mobile
                if "user_actions" in mobile_data:
                    await tx.create_savepoint("user_actions")

                    action_results = await self._sync_user_actions(
                        session,
                        user_id,
                        store_id,
                        mobile_data["user_actions"],
                        bulk_optimizer,
                        tx,
                    )
                    sync_results["user_actions_synced"] = action_results["synced"]

                # Step 3: Process scan data from mobile
                if "scan_data" in mobile_data:
                    await tx.create_savepoint("scan_data")

                    scan_results = await self._process_mobile_scans(
                        session,
                        store_id,
                        user_id,
                        mobile_data["scan_data"],
                        bulk_optimizer,
                        tx,
                    )
                    sync_results["scans_processed"] = scan_results["processed"]

                # Step 4: Record analytics events
                if "analytics_events" in mobile_data:
                    events_recorded = await self._record_mobile_analytics(
                        session, user_id, store_id, mobile_data["analytics_events"], tx
                    )
                    sync_results["analytics_events_recorded"] = events_recorded

                execution_time = (time.time() - start_time) * 1000
                sync_results["execution_time_ms"] = execution_time

                # Record mobile sync metrics
                metrics.record_database_query(
                    "mobile_data_sync",
                    execution_time,
                    sum(
                        [
                            sync_results["batch_updates_synced"],
                            sync_results["user_actions_synced"],
                            sync_results["scans_processed"],
                        ]
                    ),
                    success=True,
                )

                logger.info(
                    "Mobile data sync completed",
                    user_id=user_id,
                    store_id=store_id,
                    **sync_results,
                )

                return sync_results

            except Exception as e:
                logger.error(
                    "Mobile data sync failed",
                    error=str(e),
                    user_id=user_id,
                    store_id=store_id,
                    data_types=list(mobile_data.keys()),
                )
                raise

    async def _sync_batch_updates(
        self,
        session: AsyncSession,
        store_id: str,
        batch_updates: list[dict[str, Any]],
        sync_metadata: dict[str, Any],
        tx,
    ) -> dict[str, int]:
        """Sync batch updates with conflict resolution"""

        synced_count = 0
        conflicts_resolved = 0

        # Get current server state for affected batches
        batch_ids = [
            uuid.UUID(update["batch_id"])
            for update in batch_updates
            if "batch_id" in update
        ]

        if batch_ids:
            server_batches_query = select(Batch).where(
                and_(Batch.batch_id.in_(batch_ids), Batch.store_id == store_id)
            )
            result = await session.execute(server_batches_query)
            server_batches = {str(batch.batch_id): batch for batch in result.scalars()}

            # Process each update with conflict resolution
            for update_data in batch_updates:
                batch_id = update_data.get("batch_id")

                if batch_id in server_batches:
                    server_batch = server_batches[batch_id]

                    # Check for conflicts
                    # mobile_timestamp = self._parse_mobile_timestamp(update_data.get("updated_at"))
                    client_last_sync = self._parse_mobile_timestamp(
                        sync_metadata.get("client_timestamp")
                    )

                    if (
                        server_batch.updated_at
                        and client_last_sync
                        and server_batch.updated_at > client_last_sync
                    ):
                        # Conflict detected - resolve it
                        conflicts_resolved += 1

                        # Use quantity conflict resolution
                        if "current_quantity" in update_data:
                            mobile_qty = Decimal(str(update_data["current_quantity"]))
                            server_qty = server_batch.current_quantity

                            # Use minimum quantity for safety
                            resolved_qty = min(mobile_qty, server_qty)
                            server_batch.current_quantity = resolved_qty

                            logger.info(
                                "Batch quantity conflict resolved",
                                batch_id=batch_id,
                                mobile_qty=float(mobile_qty),
                                server_qty=float(server_qty),
                                resolved_qty=float(resolved_qty),
                            )

                    # Apply non-conflicting updates
                    if "status" in update_data:
                        server_batch.status = update_data["status"]

                    server_batch.updated_at = datetime.utcnow()
                    synced_count += 1
                    tx.record_operation(1)

        return {"synced": synced_count, "conflicts": conflicts_resolved}

    async def _sync_user_actions(
        self,
        session: AsyncSession,
        user_id: str,
        store_id: str,
        user_actions: list[dict[str, Any]],
        bulk_optimizer,
        tx,
    ) -> dict[str, int]:
        """Sync user actions from mobile app"""

        actions_to_create = []

        for action_data in user_actions:
            try:
                actions_to_create.append(
                    {
                        "action_id": str(uuid.uuid4()),
                        "batch_id": uuid.UUID(action_data["batch_id"]),
                        "store_id": uuid.UUID(store_id),
                        "recommended_action": action_data.get(
                            "recommended_action", "maintain"
                        ),
                        "actual_action": action_data["actual_action"],
                        "ai_score": Decimal(str(action_data.get("ai_score", 0.5))),
                        "action_date": self._parse_mobile_timestamp(
                            action_data.get("action_date")
                        )
                        or datetime.utcnow(),
                        "performed_by": uuid.UUID(user_id),
                        "quantity_affected": Decimal(
                            str(action_data.get("quantity_affected", 0))
                        ),
                        "original_value": Decimal(
                            str(action_data.get("original_value", 0))
                        ),
                        "recovered_value": Decimal(
                            str(action_data.get("recovered_value", 0))
                        ),
                        "notes": action_data.get("notes"),
                    }
                )
            except (ValueError, KeyError) as e:
                logger.warning(
                    "Invalid mobile action data", action_data=action_data, error=str(e)
                )

        synced_count = 0
        if actions_to_create:
            synced_count = await bulk_optimizer.bulk_insert_ignore_duplicates(
                "inventory.batch_actions", actions_to_create
            )
            tx.record_operation(synced_count)

        return {"synced": synced_count}

    async def _process_mobile_scans(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        scan_data: list[dict[str, Any]],
        bulk_optimizer,
        tx,
    ) -> dict[str, int]:
        """Process scan data from mobile app"""

        # Convert scan data to batch creation requests
        batch_operations = []

        for scan in scan_data:
            if scan.get("barcode") and scan.get("product_name"):
                batch_operations.append(
                    {
                        "operation_type": "create",
                        "barcode": scan["barcode"],
                        "product_name": scan["product_name"],
                        "brand": scan.get("brand"),
                        "category": scan.get("category"),
                        "quantity": scan.get("quantity", 1),
                        "expiry_date": scan.get("expiry_date"),
                        "cost_price": scan.get("cost_price"),
                        "selling_price": scan.get("selling_price"),
                        "source": "mobile_scan",
                        "scan_confidence": scan.get("scan_confidence"),
                        "ocr_confidence": scan.get("ocr_confidence"),
                    }
                )

        processed_count = 0
        if batch_operations:
            # Use the advanced write optimizer for mobile scans
            results = await self.write_optimizer.unified_inventory_write_optimized(
                store_id=store_id,
                user_id=user_id,
                inventory_operations=batch_operations,
                auto_score=True,
                enable_caching=True,
            )
            processed_count = results["batches_created"]
            tx.record_operation(processed_count)

        return {"processed": processed_count}

    async def _record_mobile_analytics(
        self,
        session: AsyncSession,
        user_id: str,
        store_id: str,
        analytics_events: list[dict[str, Any]],
        tx,
    ) -> int:
        """Record analytics events from mobile app"""

        events_recorded = 0

        for event in analytics_events:
            try:
                # Record in metrics collector
                metrics.record_business_metric(
                    metric_name=f"mobile_{event.get('event_type', 'unknown')}",
                    value=event.get("value", 1),
                    store_id=store_id,
                    metadata={
                        "user_id": user_id,
                        "mobile_timestamp": event.get("timestamp"),
                        "event_data": event.get("data", {}),
                        "app_version": event.get("app_version"),
                        "device_info": event.get("device_info"),
                    },
                )

                events_recorded += 1
                tx.record_operation(1)

            except Exception as e:
                logger.warning(
                    "Failed to record mobile analytics event", event=event, error=str(e)
                )

        return events_recorded

    def _parse_mobile_timestamp(self, timestamp_str: str | None) -> datetime | None:
        """Parse mobile timestamp with various formats"""
        if not timestamp_str:
            return None

        formats_to_try = [
            "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO with microseconds and Z
            "%Y-%m-%dT%H:%M:%SZ",  # ISO without microseconds and Z
            "%Y-%m-%dT%H:%M:%S.%f",  # ISO with microseconds
            "%Y-%m-%dT%H:%M:%S",  # ISO without microseconds
            "%Y-%m-%d %H:%M:%S",  # SQL format
        ]

        for fmt in formats_to_try:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue

        logger.warning("Could not parse mobile timestamp", timestamp=timestamp_str)
        return None

    async def queue_mobile_writes(
        self, user_id: str, store_id: str, write_operations: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Queue mobile write operations for batch processing
        Useful for high-frequency mobile operations
        """
        queue_entry = {
            "user_id": user_id,
            "store_id": store_id,
            "operations": write_operations,
            "queued_at": datetime.utcnow(),
            "queue_id": str(uuid.uuid4()),
        }

        self.batch_queue.append(queue_entry)

        # Process queue if it's getting large or old entries exist
        if len(self.batch_queue) >= 100 or (
            self.batch_queue
            and datetime.utcnow() - self.batch_queue[0]["queued_at"]
            > timedelta(minutes=5)
        ):
            await self._process_mobile_write_queue()

        return {
            "queue_id": queue_entry["queue_id"],
            "queue_position": len(self.batch_queue),
            "estimated_processing_time": len(self.batch_queue)
            * 0.1,  # 100ms per operation estimate
        }

    async def _process_mobile_write_queue(self):
        """Process queued mobile write operations"""
        if not self.batch_queue:
            return

        logger.info("Processing mobile write queue", queue_size=len(self.batch_queue))

        # Group operations by store for optimal processing
        store_operations = {}
        for entry in self.batch_queue:
            store_id = entry["store_id"]
            if store_id not in store_operations:
                store_operations[store_id] = []
            store_operations[store_id].extend(entry["operations"])

        # Process each store's operations
        for store_id, operations in store_operations.items():
            try:
                # Find a user_id for this store (use first available)
                user_id = next(
                    entry["user_id"]
                    for entry in self.batch_queue
                    if entry["store_id"] == store_id
                )

                await self.write_optimizer.unified_inventory_write_optimized(
                    store_id=store_id,
                    user_id=user_id,
                    inventory_operations=operations,
                    auto_score=True,
                    enable_caching=True,
                )

            except Exception as e:
                logger.error(
                    "Failed to process mobile write queue for store",
                    store_id=store_id,
                    operations_count=len(operations),
                    error=str(e),
                )

        # Clear the queue
        self.batch_queue.clear()
        logger.info("Mobile write queue processed")

    async def get_mobile_sync_status(
        self, user_id: str, store_id: str
    ) -> dict[str, Any]:
        """Get mobile sync status and recommendations"""

        return {
            "sync_queue_size": len(
                [
                    entry
                    for entry in self.batch_queue
                    if entry["user_id"] == user_id and entry["store_id"] == store_id
                ]
            ),
            "last_sync_timestamp": self.sync_cache.get(f"{user_id}_{store_id}", {}).get(
                "last_sync"
            ),
            "recommended_sync_interval_seconds": 300,  # 5 minutes
            "offline_capability": True,
            "conflict_resolution_enabled": True,
        }


# Global service instance
_mobile_write_service = None


def get_mobile_write_service() -> MobileWriteService:
    """Get the global mobile write service instance"""
    global _mobile_write_service
    if _mobile_write_service is None:
        _mobile_write_service = MobileWriteService()
    return _mobile_write_service
