"""
Mobile-optimized database queries for LIFO AI Engine
Specifically designed for <300ms response times on mobile devices
"""

import time
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class MobileQueryOptimizer:
    """
    Mobile-optimized query builder and executor
    Target: <200ms query execution for mobile endpoints
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_store_inventory_fast(
        self, store_id: str, limit: int = 200, urgency_filter: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Mobile-optimized store inventory query
        Uses indexes and limits results for mobile performance
        """
        start_time = time.time()

        # Base query optimized for mobile with proper indexes
        base_query = """
        SELECT
            b.batch_id,
            p.sku,
            p.category,
            b.current_quantity,
            b.selling_price,
            b.cost_price,
            COALESCE(b.location_code, 'MAIN') as location_code,
            (b.expiry_date - CURRENT_DATE) as days_to_expiry,
            p.typical_shelf_life_days
        FROM inventory.batches b
        INNER JOIN inventory.products p ON b.product_id = p.product_id
        WHERE b.store_id = :store_id
            AND b.status = 'active'
            AND b.current_quantity > 0
            AND b.expiry_date > (CURRENT_DATE - INTERVAL '7 days')
        """

        # Add urgency filtering for mobile performance
        if urgency_filter == "critical":
            base_query += " AND b.best_before_date <= (CURRENT_DATE + INTERVAL '1 day')"
        elif urgency_filter == "high":
            base_query += (
                " AND b.best_before_date <= (CURRENT_DATE + INTERVAL '3 days')"
            )
        elif urgency_filter == "medium":
            base_query += (
                " AND b.best_before_date <= (CURRENT_DATE + INTERVAL '7 days')"
            )

        # Mobile optimization: Order by urgency and limit results
        base_query += """
        ORDER BY
            b.best_before_date ASC,
            b.current_quantity * b.selling_price DESC
        LIMIT :limit
        """

        try:
            result = await self.session.execute(
                text(base_query), {"store_id": store_id, "limit": limit}
            )

            rows = result.fetchall()

            # Convert to mobile-friendly format
            mobile_data = []
            for row in rows:
                mobile_data.append(
                    {
                        "batch_id": row.batch_id,
                        "sku": row.sku,
                        "category": row.category,
                        "current_quantity": row.current_quantity,
                        "selling_price": float(row.selling_price),
                        "cost_price": float(row.cost_price),
                        "location_code": row.location_code,
                        "days_to_expiry": int(row.days_to_expiry)
                        if row.days_to_expiry
                        else 0,
                        "typical_shelf_life_days": row.typical_shelf_life_days,
                    }
                )

            execution_time = (time.time() - start_time) * 1000
            logger.info(
                "Mobile inventory query completed",
                store_id=store_id,
                result_count=len(mobile_data),
                execution_time_ms=execution_time,
                limit=limit,
                urgency_filter=urgency_filter,
            )

            return mobile_data

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(
                "Mobile inventory query failed",
                store_id=store_id,
                execution_time_ms=execution_time,
                error=str(e),
            )
            raise

    async def get_batch_quick_score_data(
        self, batch_id: str
    ) -> dict[str, Any] | None:
        """
        Ultra-fast batch data retrieval for mobile scoring
        Uses single query with all necessary data
        """
        start_time = time.time()

        query = """
        SELECT
            b.batch_id,
            p.sku,
            p.category,
            b.current_quantity,
            b.selling_price,
            b.cost_price,
            (b.expiry_date - CURRENT_DATE) as days_to_expiry,
            p.typical_shelf_life_days,
            COALESCE(b.location_code, 'MAIN') as location_code
        FROM inventory.batches b
        INNER JOIN inventory.products p ON b.product_id = p.product_id
        WHERE b.batch_id = :batch_id
            AND b.status = 'active'
        LIMIT 1
        """

        try:
            result = await self.session.execute(text(query), {"batch_id": batch_id})
            row = result.fetchone()

            if not row:
                return None

            batch_data = {
                "batch_id": row.batch_id,
                "sku": row.sku,
                "category": row.category,
                "current_quantity": row.current_quantity,
                "selling_price": float(row.selling_price),
                "cost_price": float(row.cost_price),
                "days_to_expiry": int(row.days_to_expiry) if row.days_to_expiry else 0,
                "typical_shelf_life_days": row.typical_shelf_life_days,
                "location_code": row.location_code,
            }

            execution_time = (time.time() - start_time) * 1000
            logger.debug(
                "Mobile batch score data retrieved",
                batch_id=batch_id,
                execution_time_ms=execution_time,
            )

            return batch_data

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(
                "Mobile batch score query failed",
                batch_id=batch_id,
                execution_time_ms=execution_time,
                error=str(e),
            )
            raise

    async def get_store_health_metrics(self, store_id: str) -> dict[str, Any]:
        """
        Single query to get all store health metrics for mobile
        Aggregates multiple metrics in one optimized query
        """
        start_time = time.time()

        query = """
        WITH store_metrics AS (
            SELECT
                COUNT(*) as total_batches,
                COUNT(CASE WHEN b.best_before_date <= CURRENT_DATE THEN 1 END) as expired_batches,
                COUNT(CASE WHEN b.best_before_date <= (CURRENT_DATE + INTERVAL '1 day') THEN 1 END) as critical_batches,
                COUNT(CASE WHEN b.best_before_date <= (CURRENT_DATE + INTERVAL '3 days') THEN 1 END) as expiring_soon,
                SUM(b.current_quantity * b.selling_price) as total_value,
                AVG(DATE_PART('day', b.best_before_date - CURRENT_DATE)) as avg_days_to_expiry
            FROM inventory.batches b
            WHERE b.store_id = :store_id
                AND b.status = 'active'
                AND b.current_quantity > 0
        )
        SELECT * FROM store_metrics
        """

        try:
            result = await self.session.execute(text(query), {"store_id": store_id})
            row = result.fetchone()

            if not row:
                return {
                    "total_batches": 0,
                    "expired_batches": 0,
                    "critical_batches": 0,
                    "expiring_soon": 0,
                    "total_value": 0.0,
                    "avg_days_to_expiry": 0,
                    "health_score": 1.0,
                }

            # Calculate health score
            total = row.total_batches or 1
            at_risk = (row.expired_batches or 0) + (row.critical_batches or 0)
            health_score = max(0.0, 1.0 - (at_risk / total) * 1.5)

            metrics = {
                "total_batches": row.total_batches or 0,
                "expired_batches": row.expired_batches or 0,
                "critical_batches": row.critical_batches or 0,
                "expiring_soon": row.expiring_soon or 0,
                "total_value": float(row.total_value or 0),
                "avg_days_to_expiry": float(row.avg_days_to_expiry or 0),
                "health_score": round(health_score, 2),
            }

            execution_time = (time.time() - start_time) * 1000
            logger.debug(
                "Mobile store health metrics retrieved",
                store_id=store_id,
                execution_time_ms=execution_time,
                metrics=metrics,
            )

            return metrics

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(
                "Mobile store health query failed",
                store_id=store_id,
                execution_time_ms=execution_time,
                error=str(e),
            )
            raise

    async def get_category_summary(self, store_id: str) -> list[dict[str, Any]]:
        """
        Mobile-optimized category breakdown for dashboard
        Returns only essential category metrics
        """
        start_time = time.time()

        query = """
        SELECT
            p.category,
            COUNT(*) as batch_count,
            COUNT(CASE WHEN b.expiry_date <= (CURRENT_DATE + INTERVAL '1 day') THEN 1 END) as urgent_count,
            SUM(b.current_quantity * b.selling_price) as category_value
        FROM inventory.batches b
        INNER JOIN inventory.products p ON b.product_id = p.product_id
        WHERE b.store_id = :store_id
            AND b.status = 'active'
            AND b.current_quantity > 0
        GROUP BY p.category
        ORDER BY urgent_count DESC, category_value DESC
        LIMIT 10
        """

        try:
            result = await self.session.execute(text(query), {"store_id": store_id})
            rows = result.fetchall()

            categories = []
            for row in rows:
                categories.append(
                    {
                        "category": row.category,
                        "batch_count": row.batch_count,
                        "urgent_count": row.urgent_count,
                        "category_value": float(row.category_value or 0),
                        "urgency_ratio": (row.urgent_count / row.batch_count)
                        if row.batch_count > 0
                        else 0,
                    }
                )

            execution_time = (time.time() - start_time) * 1000
            logger.debug(
                "Mobile category summary retrieved",
                store_id=store_id,
                execution_time_ms=execution_time,
                category_count=len(categories),
            )

            return categories

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(
                "Mobile category summary query failed",
                store_id=store_id,
                execution_time_ms=execution_time,
                error=str(e),
            )
            raise


def create_mobile_query_optimizer(session: AsyncSession) -> MobileQueryOptimizer:
    """
    Factory function to create mobile query optimizer
    """
    return MobileQueryOptimizer(session)


# Mobile query performance monitoring
class MobileQueryMonitor:
    """Monitor mobile query performance for optimization"""

    def __init__(self):
        self.query_stats = {}
        self.slow_query_threshold = 200  # 200ms threshold for mobile

    def record_query(
        self, query_name: str, execution_time_ms: float, result_count: int
    ):
        """Record query performance metrics"""
        if query_name not in self.query_stats:
            self.query_stats[query_name] = {
                "total_executions": 0,
                "total_time_ms": 0,
                "slow_queries": 0,
                "avg_results": 0,
                "fastest_ms": float("inf"),
                "slowest_ms": 0,
            }

        stats = self.query_stats[query_name]
        stats["total_executions"] += 1
        stats["total_time_ms"] += execution_time_ms
        stats["avg_results"] = (
            (stats["avg_results"] * (stats["total_executions"] - 1)) + result_count
        ) / stats["total_executions"]

        if execution_time_ms > self.slow_query_threshold:
            stats["slow_queries"] += 1

        stats["fastest_ms"] = min(stats["fastest_ms"], execution_time_ms)
        stats["slowest_ms"] = max(stats["slowest_ms"], execution_time_ms)

    def get_performance_report(self) -> dict[str, Any]:
        """Get mobile query performance report"""
        report = {}

        for query_name, stats in self.query_stats.items():
            if stats["total_executions"] > 0:
                report[query_name] = {
                    "avg_execution_ms": stats["total_time_ms"]
                    / stats["total_executions"],
                    "total_executions": stats["total_executions"],
                    "slow_query_rate": stats["slow_queries"]
                    / stats["total_executions"],
                    "avg_result_count": stats["avg_results"],
                    "fastest_ms": stats["fastest_ms"]
                    if stats["fastest_ms"] != float("inf")
                    else 0,
                    "slowest_ms": stats["slowest_ms"],
                    "meets_mobile_target": (
                        stats["total_time_ms"] / stats["total_executions"]
                    )
                    <= self.slow_query_threshold,
                }

        return report


# Global mobile query monitor
mobile_query_monitor = MobileQueryMonitor()
