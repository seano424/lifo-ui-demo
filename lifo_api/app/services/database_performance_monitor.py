"""
Database Performance Monitor for Backend-Centric Write Operations
Monitors and optimizes write operation performance
Provides insights and automated optimizations for unified write services
"""

import asyncio
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text

from app.database.connection import async_session, get_db_manager
from app.monitoring.metrics import get_metrics_collector

logger = structlog.get_logger()
metrics = get_metrics_collector()


class DatabasePerformanceMonitor:
    """
    Advanced database performance monitoring for write operations

    Monitors:
    - Write operation latency and throughput
    - Transaction performance
    - Lock contention and deadlocks
    - Query execution plans
    - Connection pool health
    - Write operation patterns

    Provides automated optimization recommendations
    """

    def __init__(self):
        self.session_factory = async_session()
        self.db_manager = get_db_manager()

        # Performance metrics storage
        self.write_metrics = defaultdict(lambda: deque(maxlen=1000))
        self.transaction_metrics = defaultdict(lambda: deque(maxlen=500))
        self.query_patterns = defaultdict(int)
        self.slow_queries = deque(maxlen=100)

        # Performance thresholds
        self.thresholds = {
            "write_operation_ms": {"warning": 500, "critical": 2000},
            "transaction_ms": {"warning": 1000, "critical": 5000},
            "connection_pool": {
                "warning": 80,  # % utilization
                "critical": 95,
            },
            "lock_wait_ms": {"warning": 100, "critical": 1000},
        }

        # Start background monitoring
        self._monitoring_active = False

    async def start_monitoring(self):
        """Start background performance monitoring"""
        if not self._monitoring_active:
            self._monitoring_active = True
            asyncio.create_task(self._monitor_database_performance())
            logger.info("Database performance monitoring started")

    async def stop_monitoring(self):
        """Stop background performance monitoring"""
        self._monitoring_active = False
        logger.info("Database performance monitoring stopped")

    async def monitor_write_operation(
        self, operation_name: str, store_id: str, operation_func, *args, **kwargs
    ) -> tuple[Any, dict[str, Any]]:
        """
        Monitor a write operation and collect performance metrics

        Args:
            operation_name: Name of the operation for tracking
            store_id: Store ID for operation context
            operation_func: Function to execute and monitor
            *args, **kwargs: Arguments for the operation function

        Returns:
            Tuple of (operation_result, performance_metrics)
        """
        start_time = time.time()
        start_memory = self._get_memory_usage()

        performance_data = {
            "operation_name": operation_name,
            "store_id": store_id,
            "start_time": start_time,
            "start_memory_mb": start_memory,
        }

        try:
            # Execute the operation
            result = await operation_func(*args, **kwargs)

            # Calculate performance metrics
            execution_time = (time.time() - start_time) * 1000
            end_memory = self._get_memory_usage()
            memory_delta = end_memory - start_memory

            performance_data.update(
                {
                    "execution_time_ms": execution_time,
                    "end_memory_mb": end_memory,
                    "memory_delta_mb": memory_delta,
                    "success": True,
                    "error": None,
                }
            )

            # Store metrics
            self._record_write_operation_metrics(performance_data)

            # Check for performance issues
            await self._check_performance_thresholds(performance_data)

            logger.info(
                "Write operation monitored",
                operation=operation_name,
                execution_time_ms=execution_time,
                memory_delta_mb=memory_delta,
                store_id=store_id,
            )

            return result, performance_data

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000

            performance_data.update(
                {"execution_time_ms": execution_time, "success": False, "error": str(e)}
            )

            self._record_write_operation_metrics(performance_data)

            logger.error(
                "Write operation failed during monitoring",
                operation=operation_name,
                error=str(e),
                execution_time_ms=execution_time,
                store_id=store_id,
            )

            raise

    async def get_write_performance_report(
        self, store_id: str | None = None, hours: int = 24
    ) -> dict[str, Any]:
        """
        Generate comprehensive write performance report

        Args:
            store_id: Optional store filter
            hours: Time window for report

        Returns:
            Detailed performance report with recommendations
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        try:
            # Collect database performance statistics
            db_stats = await self._collect_database_statistics()

            # Analyze write operation patterns
            write_analysis = self._analyze_write_operations(store_id, cutoff_time)

            # Analyze transaction performance
            transaction_analysis = self._analyze_transaction_performance(cutoff_time)

            # Check for slow queries
            slow_query_analysis = self._analyze_slow_queries(cutoff_time)

            # Generate optimization recommendations
            recommendations = await self._generate_optimization_recommendations(
                db_stats, write_analysis, transaction_analysis, slow_query_analysis
            )

            report = {
                "report_generated": datetime.utcnow().isoformat(),
                "time_window_hours": hours,
                "store_filter": store_id,
                "database_statistics": db_stats,
                "write_operation_analysis": write_analysis,
                "transaction_analysis": transaction_analysis,
                "slow_query_analysis": slow_query_analysis,
                "optimization_recommendations": recommendations,
                "performance_health_score": self._calculate_health_score(
                    write_analysis, transaction_analysis, db_stats
                ),
            }

            logger.info(
                "Write performance report generated",
                store_id=store_id,
                health_score=report["performance_health_score"],
                recommendations_count=len(recommendations),
            )

            return report

        except Exception as e:
            logger.error(
                "Failed to generate performance report", error=str(e), store_id=store_id
            )
            raise

    async def optimize_write_operations(
        self, optimization_targets: list[str] = None
    ) -> dict[str, Any]:
        """
        Apply automated optimizations to write operations

        Args:
            optimization_targets: Specific areas to optimize

        Returns:
            Optimization results and applied changes
        """
        try:
            optimization_results = {
                "optimizations_applied": [],
                "performance_improvements": {},
                "recommendations_remaining": [],
            }

            # Get current performance baseline
            baseline_metrics = await self._get_performance_baseline()

            # Apply available optimizations
            if not optimization_targets:
                optimization_targets = [
                    "connection_pooling",
                    "query_optimization",
                    "transaction_batching",
                    "index_recommendations",
                ]

            for target in optimization_targets:
                try:
                    optimization = await self._apply_optimization(
                        target, baseline_metrics
                    )
                    if optimization["applied"]:
                        optimization_results["optimizations_applied"].append(
                            optimization
                        )
                    else:
                        optimization_results["recommendations_remaining"].append(
                            optimization
                        )

                except Exception as e:
                    logger.warning("Optimization failed", target=target, error=str(e))

            # Measure performance improvement
            post_optimization_metrics = await self._get_performance_baseline()
            optimization_results["performance_improvements"] = (
                self._calculate_improvements(
                    baseline_metrics, post_optimization_metrics
                )
            )

            logger.info(
                "Write operation optimization completed",
                optimizations_applied=len(
                    optimization_results["optimizations_applied"]
                ),
                improvements=optimization_results["performance_improvements"],
            )

            return optimization_results

        except Exception as e:
            logger.error("Write operation optimization failed", error=str(e))
            raise

    # Private monitoring methods

    async def _monitor_database_performance(self):
        """Background task to monitor database performance"""
        while self._monitoring_active:
            try:
                # Collect performance metrics
                await self._collect_real_time_metrics()

                # Check for performance issues
                await self._check_system_health()

                # Wait before next collection
                await asyncio.sleep(30)  # Monitor every 30 seconds

            except Exception as e:
                logger.error("Database performance monitoring error", error=str(e))
                await asyncio.sleep(60)  # Wait longer on error

    async def _collect_database_statistics(self) -> dict[str, Any]:
        """Collect current database performance statistics"""
        async with self.session_factory() as session:
            try:
                stats = {}

                # PostgreSQL-specific statistics
                queries = {
                    "connection_stats": """
                        SELECT 
                            count(*) as total_connections,
                            count(*) FILTER (WHERE state = 'active') as active_connections,
                            count(*) FILTER (WHERE state = 'idle') as idle_connections,
                            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                        FROM pg_stat_activity
                    """,
                    "lock_stats": """
                        SELECT 
                            mode,
                            count(*) as lock_count
                        FROM pg_locks 
                        WHERE NOT granted 
                        GROUP BY mode
                    """,
                    "table_stats": """
                        SELECT 
                            schemaname,
                            tablename,
                            n_tup_ins as inserts,
                            n_tup_upd as updates,
                            n_tup_del as deletes,
                            n_tup_hot_upd as hot_updates,
                            seq_scan,
                            idx_scan
                        FROM pg_stat_user_tables 
                        WHERE schemaname IN ('inventory', 'business')
                        ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
                        LIMIT 10
                    """,
                    "index_usage": """
                        SELECT 
                            schemaname,
                            tablename,
                            indexname,
                            idx_scan,
                            idx_tup_read,
                            idx_tup_fetch
                        FROM pg_stat_user_indexes 
                        WHERE schemaname IN ('inventory', 'business')
                        ORDER BY idx_scan DESC
                        LIMIT 10
                    """,
                }

                for stat_name, query in queries.items():
                    try:
                        result = await session.execute(text(query))
                        stats[stat_name] = [dict(row._mapping) for row in result]
                    except Exception as e:
                        logger.warning(f"Failed to collect {stat_name}", error=str(e))
                        stats[stat_name] = []

                return stats

            except Exception as e:
                logger.error("Failed to collect database statistics", error=str(e))
                return {}

    def _record_write_operation_metrics(self, performance_data: dict[str, Any]):
        """Record write operation metrics for analysis"""
        operation_name = performance_data["operation_name"]
        store_id = performance_data["store_id"]

        # Store in time-series format
        metric_key = f"{operation_name}_{store_id}"
        self.write_metrics[metric_key].append(
            {
                "timestamp": performance_data["start_time"],
                "execution_time_ms": performance_data["execution_time_ms"],
                "memory_delta_mb": performance_data.get("memory_delta_mb", 0),
                "success": performance_data["success"],
            }
        )

        # Track query patterns
        self.query_patterns[operation_name] += 1

        # Record in global metrics
        metrics.record_database_query(
            operation_name,
            performance_data["execution_time_ms"],
            1,  # operation count
            success=performance_data["success"],
            error=performance_data.get("error"),
        )

    async def _check_performance_thresholds(self, performance_data: dict[str, Any]):
        """Check if performance metrics exceed thresholds"""
        execution_time = performance_data["execution_time_ms"]
        operation_name = performance_data["operation_name"]

        # Check execution time thresholds
        if execution_time > self.thresholds["write_operation_ms"]["critical"]:
            await self._trigger_performance_alert(
                "critical",
                f"Write operation {operation_name} took {execution_time:.1f}ms",
                performance_data,
            )
        elif execution_time > self.thresholds["write_operation_ms"]["warning"]:
            await self._trigger_performance_alert(
                "warning",
                f"Write operation {operation_name} took {execution_time:.1f}ms",
                performance_data,
            )

    async def _trigger_performance_alert(
        self, severity: str, message: str, context: dict[str, Any]
    ):
        """Trigger performance alert"""
        alert = {
            "severity": severity,
            "message": message,
            "context": context,
            "timestamp": datetime.utcnow().isoformat(),
            "alert_type": "database_performance",
        }

        logger.warning("Database performance alert", **alert)

        # Record alert in metrics
        metrics.record_business_metric("database_performance_alert", 1, metadata=alert)

    def _analyze_write_operations(
        self, store_id: str | None, cutoff_time: datetime
    ) -> dict[str, Any]:
        """Analyze write operation performance patterns"""

        analysis = {
            "total_operations": 0,
            "avg_execution_time_ms": 0,
            "slowest_operations": [],
            "most_frequent_operations": [],
            "error_rate": 0,
            "performance_trends": {},
        }

        # Analyze stored metrics
        all_operations = []
        operation_counts = defaultdict(int)

        for metric_key, metric_data in self.write_metrics.items():
            # Filter by store if specified
            if store_id and not metric_key.endswith(store_id):
                continue

            for data_point in metric_data:
                if data_point["timestamp"] >= cutoff_time.timestamp():
                    all_operations.append(data_point)
                    operation_name = metric_key.split("_")[0]
                    operation_counts[operation_name] += 1

        if all_operations:
            analysis["total_operations"] = len(all_operations)
            analysis["avg_execution_time_ms"] = sum(
                op["execution_time_ms"] for op in all_operations
            ) / len(all_operations)

            # Find slowest operations
            analysis["slowest_operations"] = sorted(
                all_operations, key=lambda x: x["execution_time_ms"], reverse=True
            )[:10]

            # Most frequent operations
            analysis["most_frequent_operations"] = sorted(
                operation_counts.items(), key=lambda x: x[1], reverse=True
            )[:10]

            # Error rate
            failed_ops = sum(1 for op in all_operations if not op["success"])
            analysis["error_rate"] = failed_ops / len(all_operations) * 100

        return analysis

    def _analyze_transaction_performance(self, cutoff_time: datetime) -> dict[str, Any]:
        """Analyze transaction performance"""

        analysis = {
            "avg_transaction_time_ms": 0,
            "long_running_transactions": 0,
            "transaction_throughput": 0,
            "lock_contention_events": 0,
        }

        # Analyze transaction metrics
        # This would be implemented based on specific transaction tracking

        return analysis

    def _analyze_slow_queries(self, cutoff_time: datetime) -> dict[str, Any]:
        """Analyze slow query patterns"""

        analysis = {
            "slow_query_count": len(self.slow_queries),
            "most_problematic_queries": [],
            "query_optimization_opportunities": [],
        }

        # Analyze slow queries
        recent_slow_queries = [
            query
            for query in self.slow_queries
            if query.get("timestamp", 0) >= cutoff_time.timestamp()
        ]

        analysis["slow_query_count"] = len(recent_slow_queries)

        if recent_slow_queries:
            # Group by query pattern
            query_patterns = defaultdict(list)
            for query in recent_slow_queries:
                pattern = query.get("query_pattern", "unknown")
                query_patterns[pattern].append(query)

            # Find most problematic
            analysis["most_problematic_queries"] = [
                {
                    "pattern": pattern,
                    "count": len(queries),
                    "avg_time_ms": sum(q.get("execution_time_ms", 0) for q in queries)
                    / len(queries),
                }
                for pattern, queries in query_patterns.items()
            ]

        return analysis

    async def _generate_optimization_recommendations(
        self,
        db_stats: dict[str, Any],
        write_analysis: dict[str, Any],
        transaction_analysis: dict[str, Any],
        slow_query_analysis: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Generate optimization recommendations"""

        recommendations = []

        # Analyze execution time performance
        if write_analysis.get("avg_execution_time_ms", 0) > 1000:
            recommendations.append(
                {
                    "type": "performance",
                    "priority": "high",
                    "issue": "High average write operation time",
                    "recommendation": "Consider optimizing transaction boundaries and using bulk operations",
                    "estimated_improvement": "30-50% faster write operations",
                }
            )

        # Analyze error rates
        if write_analysis.get("error_rate", 0) > 5:
            recommendations.append(
                {
                    "type": "reliability",
                    "priority": "high",
                    "issue": f"High error rate: {write_analysis['error_rate']:.1f}%",
                    "recommendation": "Review error patterns and implement retry mechanisms",
                    "estimated_improvement": "Reduced operation failures",
                }
            )

        # Analyze connection usage
        connection_stats = db_stats.get("connection_stats", [])
        if connection_stats:
            conn_data = connection_stats[0]
            if conn_data.get("active_connections", 0) > 50:
                recommendations.append(
                    {
                        "type": "resource",
                        "priority": "medium",
                        "issue": "High active connection count",
                        "recommendation": "Review connection pooling configuration",
                        "estimated_improvement": "Better resource utilization",
                    }
                )

        # Analyze slow queries
        if slow_query_analysis.get("slow_query_count", 0) > 10:
            recommendations.append(
                {
                    "type": "query_optimization",
                    "priority": "medium",
                    "issue": "Multiple slow queries detected",
                    "recommendation": "Review and optimize frequently slow query patterns",
                    "estimated_improvement": "20-40% faster query execution",
                }
            )

        return recommendations

    def _calculate_health_score(
        self,
        write_analysis: dict[str, Any],
        transaction_analysis: dict[str, Any],
        db_stats: dict[str, Any],
    ) -> float:
        """Calculate overall database performance health score (0-100)"""

        score = 100.0

        # Deduct for high execution times
        avg_time = write_analysis.get("avg_execution_time_ms", 0)
        if avg_time > 500:
            score -= min(30, (avg_time - 500) / 50)

        # Deduct for high error rates
        error_rate = write_analysis.get("error_rate", 0)
        if error_rate > 1:
            score -= min(25, error_rate * 5)

        # Deduct for connection issues
        connection_stats = db_stats.get("connection_stats", [])
        if connection_stats:
            active_conns = connection_stats[0].get("active_connections", 0)
            if active_conns > 50:
                score -= min(20, (active_conns - 50) / 5)

        return max(0, score)

    async def _collect_real_time_metrics(self):
        """Collect real-time performance metrics"""
        # This would collect real-time metrics for monitoring
        pass

    async def _check_system_health(self):
        """Check overall system health"""
        # This would perform health checks
        pass

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            import psutil

            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0

    async def _get_performance_baseline(self) -> dict[str, Any]:
        """Get current performance baseline metrics"""
        return {
            "avg_write_time_ms": 0,
            "connection_count": 0,
            "error_rate": 0,
            "memory_usage_mb": self._get_memory_usage(),
        }

    async def _apply_optimization(
        self, target: str, baseline_metrics: dict[str, Any]
    ) -> dict[str, Any]:
        """Apply a specific optimization"""
        return {
            "target": target,
            "applied": False,
            "reason": "Not implemented in this version",
        }

    def _calculate_improvements(
        self, baseline: dict[str, Any], post_optimization: dict[str, Any]
    ) -> dict[str, Any]:
        """Calculate performance improvements"""
        return {
            "write_time_improvement": 0,
            "memory_improvement": 0,
            "error_rate_improvement": 0,
        }


# Global monitor instance
_performance_monitor = None


def get_database_performance_monitor() -> DatabasePerformanceMonitor:
    """Get the global database performance monitor"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = DatabasePerformanceMonitor()
    return _performance_monitor
