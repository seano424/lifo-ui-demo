"""
Analytics Write Service for Backend-Centric Architecture
Optimized for high-frequency analytics writes and scoring operations
Consolidates analytics data persistence to reduce HTTP overhead
"""

import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List

import structlog
from sqlalchemy import and_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.database.inventory_models import BatchAction
from app.monitoring.metrics import get_metrics_collector
from app.services.unified_write_service import TransactionManager, WriteOperationError

logger = structlog.get_logger()
metrics = get_metrics_collector()


class AnalyticsWriteService:
    """
    High-performance analytics write service for backend-centric architecture
    
    Optimizes:
    - Scoring result persistence
    - Analytics event batching
    - Performance metrics recording
    - User behavior tracking
    - Business intelligence data writes
    
    Designed for high-frequency, low-latency analytics writes
    """
    
    def __init__(self):
        self.session_factory = async_session()
        
    async def bulk_write_scoring_results(
        self,
        store_id: str,
        scoring_results: List[Dict[str, Any]],
        include_recommendations: bool = True,
        update_actions: bool = True
    ) -> Dict[str, Any]:
        """
        OPTIMIZED: Bulk write scoring results with consolidated operations
        
        Handles:
        - Product score upserts
        - Batch action updates
        - Recommendation generation
        - Performance metrics
        
        Single transaction for consistency and performance
        """
        start_time = time.time()
        
        async with self.session_factory() as session:
            async with TransactionManager(session) as tx:
                try:
                    results = {
                        "scores_written": 0,
                        "actions_updated": 0,
                        "recommendations_created": 0,
                        "high_urgency_items": 0,
                        "avg_urgency_score": 0.0
                    }
                    
                    # Calculate analytics
                    total_urgency = 0.0
                    high_urgency_count = 0
                    
                    # Step 1: Bulk upsert product scores
                    scores_data = []
                    for result in scoring_results:
                        urgency_score = result["urgency_score"]
                        total_urgency += urgency_score
                        
                        if urgency_score >= 0.7:
                            high_urgency_count += 1
                        
                        scores_data.append({
                            "batch_id": result["batch_id"],
                            "store_id": store_id,
                            "urgency_score": Decimal(str(urgency_score)),
                            "recommendation": result.get("recommendation", "maintain"),
                            "calculated_at": datetime.utcnow(),
                            "days_to_expiry": result.get("days_to_expiry"),
                            "margin_impact": result.get("margin_impact", 0.0),
                            "waste_risk": result.get("waste_risk", 0.0)
                        })
                    
                    results["scores_written"] = await self._bulk_upsert_product_scores(
                        session, scores_data, tx
                    )
                    
                    # Step 2: Update batch actions if requested
                    if update_actions:
                        results["actions_updated"] = await self._bulk_update_batch_actions(
                            session, store_id, scoring_results, tx
                        )
                    
                    # Step 3: Create recommendations if requested
                    if include_recommendations:
                        results["recommendations_created"] = await self._create_urgency_recommendations(
                            session, store_id, scoring_results, tx
                        )
                    
                    # Calculate analytics
                    results["high_urgency_items"] = high_urgency_count
                    results["avg_urgency_score"] = total_urgency / len(scoring_results) if scoring_results else 0.0
                    
                    execution_time = (time.time() - start_time) * 1000
                    results["execution_time_ms"] = execution_time
                    
                    # Record performance metrics
                    metrics.record_database_query(
                        "bulk_scoring_write",
                        execution_time,
                        len(scoring_results),
                        success=True
                    )
                    
                    logger.info(
                        "Bulk scoring results written",
                        store_id=store_id,
                        **results
                    )
                    
                    return results
                    
                except Exception as e:
                    logger.error(
                        "Bulk scoring write failed",
                        error=str(e),
                        store_id=store_id,
                        results_count=len(scoring_results)
                    )
                    raise WriteOperationError(
                        f"Failed to write scoring results: {str(e)}",
                        "bulk_write_scoring_results",
                        {"store_id": store_id}
                    )
    
    async def batch_analytics_events(
        self,
        events: List[Dict[str, Any]],
        flush_interval_seconds: int = 5
    ) -> Dict[str, Any]:
        """
        OPTIMIZED: Batch analytics events for efficient writes
        
        Collects and writes analytics events in batches to reduce
        database round trips and improve performance
        """
        start_time = time.time()
        
        try:
            # Group events by type and store for optimal processing
            grouped_events = self._group_events_for_processing(events)
            
            results = {
                "total_events": len(events),
                "events_processed": 0,
                "event_types": len(grouped_events),
                "failed_events": 0
            }
            
            # Process each group
            for event_group, event_list in grouped_events.items():
                try:
                    await self._process_event_group(event_group, event_list)
                    results["events_processed"] += len(event_list)
                except Exception as e:
                    logger.warning(
                        "Failed to process event group",
                        event_group=event_group,
                        event_count=len(event_list),
                        error=str(e)
                    )
                    results["failed_events"] += len(event_list)
            
            execution_time = (time.time() - start_time) * 1000
            results["execution_time_ms"] = execution_time
            
            # Record metrics
            metrics.record_business_metric(
                "analytics_events_batched",
                len(events),
                metadata={
                    "event_types": len(grouped_events),
                    "execution_time_ms": execution_time
                }
            )
            
            logger.info("Analytics events batched", **results)
            return results
            
        except Exception as e:
            logger.error(
                "Analytics event batching failed",
                error=str(e),
                events_count=len(events)
            )
            raise
    
    async def write_performance_metrics(
        self,
        store_id: str,
        metrics_data: Dict[str, Any],
        time_window: timedelta = timedelta(minutes=5)
    ) -> Dict[str, Any]:
        """
        OPTIMIZED: Write performance metrics with aggregation
        
        Aggregates and persists performance metrics for:
        - API response times
        - Database query performance
        - Scoring operation metrics
        - User interaction analytics
        """
        start_time = time.time()
        
        async with self.session_factory() as session:
            async with TransactionManager(session) as tx:
                try:
                    # Aggregate metrics for the time window
                    aggregated_metrics = await self._aggregate_performance_metrics(
                        session, store_id, metrics_data, time_window, tx
                    )
                    
                    # Write aggregated metrics using direct SQL for performance
                    metrics_written = await self._write_aggregated_metrics(
                        session, store_id, aggregated_metrics, tx
                    )
                    
                    execution_time = (time.time() - start_time) * 1000
                    
                    result = {
                        "store_id": store_id,
                        "metrics_written": metrics_written,
                        "time_window_minutes": time_window.total_seconds() / 60,
                        "execution_time_ms": execution_time
                    }
                    
                    logger.info("Performance metrics written", **result)
                    return result
                    
                except Exception as e:
                    logger.error(
                        "Performance metrics write failed",
                        error=str(e),
                        store_id=store_id
                    )
                    raise
    
    async def track_user_actions_bulk(
        self,
        user_id: str,
        store_id: str,
        actions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        OPTIMIZED: Bulk track user actions with analytics
        
        Efficiently records user actions and generates analytics:
        - Action patterns
        - Performance measurements
        - User behavior insights
        - Business impact tracking
        """
        start_time = time.time()
        
        async with self.session_factory() as session:
            async with TransactionManager(session) as tx:
                try:
                    # Group actions by type for optimized processing
                    action_groups = self._group_actions_by_type(actions)
                    
                    results = {
                        "actions_tracked": 0,
                        "action_types": len(action_groups),
                        "total_value_impact": 0.0,
                        "total_quantity_impact": 0.0
                    }
                    
                    # Process each action group
                    for action_type, action_list in action_groups.items():
                        group_result = await self._process_user_action_group(
                            session, user_id, store_id, action_type, action_list, tx
                        )
                        
                        results["actions_tracked"] += group_result["tracked"]
                        results["total_value_impact"] += group_result["value_impact"]
                        results["total_quantity_impact"] += group_result["quantity_impact"]
                    
                    execution_time = (time.time() - start_time) * 1000
                    results["execution_time_ms"] = execution_time
                    
                    # Record analytics
                    metrics.record_business_metric(
                        "user_actions_bulk_tracked",
                        len(actions),
                        store_id=store_id,
                        metadata={
                            "user_id": user_id,
                            "action_types": len(action_groups),
                            "value_impact": results["total_value_impact"]
                        }
                    )
                    
                    logger.info(
                        "User actions tracked in bulk",
                        user_id=user_id,
                        store_id=store_id,
                        **results
                    )
                    
                    return results
                    
                except Exception as e:
                    logger.error(
                        "Bulk user action tracking failed",
                        error=str(e),
                        user_id=user_id,
                        store_id=store_id,
                        actions_count=len(actions)
                    )
                    raise
    
    # Private helper methods
    
    async def _bulk_upsert_product_scores(
        self,
        session: AsyncSession,
        scores_data: List[Dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Bulk upsert product scores with conflict resolution"""
        
        scores_written = 0
        
        # Use batch processing for better performance
        batch_size = 100
        for i in range(0, len(scores_data), batch_size):
            batch = scores_data[i:i + batch_size]
            
            for score_data in batch:
                try:
                    # Use ON CONFLICT for PostgreSQL (upsert)
                    upsert_query = text("""
                        INSERT INTO inventory.product_scores (
                            batch_id, store_id, urgency_score, recommendation,
                            calculated_at, days_to_expiry, margin_impact, waste_risk
                        ) VALUES (
                            :batch_id, :store_id, :urgency_score, :recommendation,
                            :calculated_at, :days_to_expiry, :margin_impact, :waste_risk
                        )
                        ON CONFLICT (batch_id, store_id) DO UPDATE SET
                            urgency_score = EXCLUDED.urgency_score,
                            recommendation = EXCLUDED.recommendation,
                            calculated_at = EXCLUDED.calculated_at,
                            days_to_expiry = EXCLUDED.days_to_expiry,
                            margin_impact = EXCLUDED.margin_impact,
                            waste_risk = EXCLUDED.waste_risk
                    """)
                    
                    await session.execute(upsert_query, score_data)
                    scores_written += 1
                    tx.increment_operation()
                    
                except Exception as e:
                    logger.warning(
                        "Failed to upsert score",
                        batch_id=score_data.get("batch_id"),
                        error=str(e)
                    )
            
            # Flush in batches
            await session.flush()
        
        return scores_written
    
    async def _bulk_update_batch_actions(
        self,
        session: AsyncSession,
        store_id: str,
        scoring_results: List[Dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Bulk update batch actions based on scoring results"""
        
        actions_updated = 0
        
        for result in scoring_results:
            try:
                # Update existing action recommendations
                update_query = (
                    update(BatchAction)
                    .where(
                        and_(
                            BatchAction.batch_id == result["batch_id"],
                            BatchAction.store_id == store_id,
                            BatchAction.actual_action == "maintain"
                        )
                    )
                    .values(
                        recommended_action=result.get("recommendation", "maintain"),
                        ai_score=Decimal(str(result["urgency_score"]))
                    )
                )
                
                update_result = await session.execute(update_query)
                actions_updated += update_result.rowcount
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to update batch action",
                    batch_id=result.get("batch_id"),
                    error=str(e)
                )
        
        return actions_updated
    
    async def _create_urgency_recommendations(
        self,
        session: AsyncSession,
        store_id: str,
        scoring_results: List[Dict[str, Any]],
        tx: TransactionManager
    ) -> int:
        """Create recommendation records for high urgency items"""
        
        recommendations_created = 0
        
        for result in scoring_results:
            try:
                urgency_score = result["urgency_score"]
                
                # Only create recommendations for high urgency items
                if urgency_score >= 0.7:
                    # Check if recommendation already exists
                    existing_check = await session.execute(
                        select(BatchAction)
                        .where(
                            and_(
                                BatchAction.batch_id == result["batch_id"],
                                BatchAction.store_id == store_id
                            )
                        )
                    )
                    
                    if not existing_check.scalar_one_or_none():
                        recommendation = BatchAction(
                            batch_id=result["batch_id"],
                            store_id=store_id,
                            recommended_action=result.get("recommendation", "discount"),
                            actual_action="maintain",
                            ai_score=Decimal(str(urgency_score)),
                            action_date=datetime.utcnow()
                        )
                        session.add(recommendation)
                        recommendations_created += 1
                        tx.increment_operation()
                        
            except Exception as e:
                logger.warning(
                    "Failed to create recommendation",
                    batch_id=result.get("batch_id"),
                    error=str(e)
                )
        
        await session.flush()
        return recommendations_created
    
    def _group_events_for_processing(
        self, 
        events: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group events by type and store for optimal processing"""
        
        grouped = {}
        for event in events:
            event_type = event.get("event_type", "unknown")
            store_id = event.get("store_id", "unknown")
            group_key = f"{event_type}_{store_id}"
            
            if group_key not in grouped:
                grouped[group_key] = []
            grouped[group_key].append(event)
        
        return grouped
    
    async def _process_event_group(
        self,
        event_group: str,
        events: List[Dict[str, Any]]
    ):
        """Process a group of similar events"""
        
        # For now, use the metrics collector
        # In production, you might want dedicated analytics tables
        for event in events:
            metrics.record_business_metric(
                metric_name=event.get("metric_name", "analytics_event"),
                value=event.get("value", 1),
                store_id=event.get("store_id"),
                metadata=event.get("metadata", {})
            )
    
    async def _aggregate_performance_metrics(
        self,
        session: AsyncSession,
        store_id: str,
        metrics_data: Dict[str, Any],
        time_window: timedelta,
        tx: TransactionManager
    ) -> Dict[str, Any]:
        """Aggregate performance metrics for the time window"""
        
        # Simple aggregation for now
        # In production, you might want more sophisticated aggregation
        aggregated = {
            "store_id": store_id,
            "time_window": time_window.total_seconds(),
            "metrics_count": len(metrics_data),
            "avg_response_time": metrics_data.get("avg_response_time", 0),
            "max_response_time": metrics_data.get("max_response_time", 0),
            "error_rate": metrics_data.get("error_rate", 0),
            "calculated_at": datetime.utcnow()
        }
        
        tx.increment_operation()
        return aggregated
    
    async def _write_aggregated_metrics(
        self,
        session: AsyncSession,
        store_id: str,
        aggregated_metrics: Dict[str, Any],
        tx: TransactionManager
    ) -> int:
        """Write aggregated metrics to storage"""
        
        # For now, record in metrics collector
        # In production, you might want dedicated metrics tables
        metrics.record_business_metric(
            "performance_metrics_aggregated",
            aggregated_metrics["metrics_count"],
            store_id=store_id,
            metadata=aggregated_metrics
        )
        
        tx.increment_operation()
        return 1
    
    def _group_actions_by_type(
        self, 
        actions: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group actions by type for optimized processing"""
        
        grouped = {}
        for action in actions:
            action_type = action.get("action_type", "unknown")
            
            if action_type not in grouped:
                grouped[action_type] = []
            grouped[action_type].append(action)
        
        return grouped
    
    async def _process_user_action_group(
        self,
        session: AsyncSession,
        user_id: str,
        store_id: str,
        action_type: str,
        actions: List[Dict[str, Any]],
        tx: TransactionManager
    ) -> Dict[str, Any]:
        """Process a group of user actions of the same type"""
        
        tracked = 0
        value_impact = 0.0
        quantity_impact = 0.0
        
        for action in actions:
            try:
                # Track action in BatchAction table
                action_record = BatchAction(
                    batch_id=action.get("batch_id"),
                    store_id=store_id,
                    recommended_action=action.get("recommended_action", "maintain"),
                    actual_action=action.get("actual_action", action_type),
                    ai_score=Decimal(str(action.get("ai_score", 0.5))),
                    action_date=datetime.utcnow(),
                    performed_by=user_id,
                    quantity_affected=Decimal(str(action.get("quantity_affected", 0))),
                    original_value=Decimal(str(action.get("original_value", 0))),
                    recovered_value=Decimal(str(action.get("recovered_value", 0))),
                    notes=action.get("notes")
                )
                
                session.add(action_record)
                tracked += 1
                
                # Aggregate impacts
                value_impact += action.get("original_value", 0.0)
                quantity_impact += action.get("quantity_affected", 0.0)
                
                tx.increment_operation()
                
            except Exception as e:
                logger.warning(
                    "Failed to track user action",
                    action=action,
                    error=str(e)
                )
        
        await session.flush()
        
        return {
            "tracked": tracked,
            "value_impact": value_impact,
            "quantity_impact": quantity_impact
        }


# Global service instance
_analytics_write_service = None


def get_analytics_write_service() -> AnalyticsWriteService:
    """Get the global analytics write service instance"""
    global _analytics_write_service
    if _analytics_write_service is None:
        _analytics_write_service = AnalyticsWriteService()
    return _analytics_write_service