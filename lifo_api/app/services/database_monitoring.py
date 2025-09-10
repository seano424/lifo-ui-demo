"""
Database Monitoring and Alerting Service for LIFO.AI
Enterprise-grade monitoring for operational excellence
"""

import asyncio
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import text

from lifo_api.app.database.connection import get_db_manager

logger = structlog.get_logger()

class DatabaseMonitor:
    """
    Comprehensive database monitoring for LIFO.AI
    Monitors performance, connections, replication, and alerts on issues
    """

    def __init__(self):
        self.logger = logger.bind(component="db_monitor")
        self.db_manager = get_db_manager()

        # Alert thresholds
        self.thresholds = {
            "connection_count_warning": 80,  # % of max connections
            "connection_count_critical": 95,
            "query_time_warning_ms": 1000,  # 1 second
            "query_time_critical_ms": 5000,  # 5 seconds
            "replication_lag_warning_sec": 60,
            "replication_lag_critical_sec": 300,
            "table_size_warning_gb": 10,
            "table_size_critical_gb": 50,
            "deadlock_count_warning": 5,  # per hour
            "deadlock_count_critical": 20,
            "cache_hit_ratio_warning": 0.90,  # 90%
            "cache_hit_ratio_critical": 0.80  # 80%
        }

    async def get_connection_stats(self) -> dict[str, Any]:
        """Monitor database connections and connection pooling"""
        try:
            async with self.db_manager.session_factory() as session:
                # Get connection statistics
                connection_stats = await session.execute(text("""
                    SELECT
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections,
                        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
                        count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as idle_in_transaction_aborted,
                        max(EXTRACT(EPOCH FROM (now() - query_start))) as longest_query_seconds,
                        avg(EXTRACT(EPOCH FROM (now() - query_start))) as avg_query_time_seconds
                    FROM pg_stat_activity
                    WHERE pid != pg_backend_pid()
                """))

                stats = connection_stats.fetchone()

                # Get max connections setting
                max_connections_result = await session.execute(text("SHOW max_connections"))
                max_connections = int(max_connections_result.scalar())

                # Calculate connection utilization
                utilization_pct = (stats.total_connections / max_connections) * 100

                return {
                    "total_connections": stats.total_connections,
                    "max_connections": max_connections,
                    "utilization_percent": round(utilization_pct, 2),
                    "active_connections": stats.active_connections,
                    "idle_connections": stats.idle_connections,
                    "idle_in_transaction": stats.idle_in_transaction,
                    "idle_in_transaction_aborted": stats.idle_in_transaction_aborted,
                    "longest_query_seconds": round(stats.longest_query_seconds or 0, 2),
                    "avg_query_time_seconds": round(stats.avg_query_time_seconds or 0, 2),
                    "status": self._assess_connection_health(utilization_pct, stats.longest_query_seconds or 0),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            self.logger.error("Failed to get connection stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_query_performance_stats(self) -> dict[str, Any]:
        """Monitor query performance and identify slow queries"""
        try:
            async with self.db_manager.session_factory() as session:
                # Get slow queries from pg_stat_statements if available
                slow_queries = await session.execute(text("""
                    SELECT
                        query,
                        calls,
                        total_exec_time as total_time_ms,
                        mean_exec_time as avg_time_ms,
                        max_exec_time as max_time_ms,
                        rows,
                        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                    FROM pg_stat_statements
                    WHERE mean_exec_time > 100  -- queries taking more than 100ms on average
                    ORDER BY mean_exec_time DESC
                    LIMIT 10
                """))

                slow_query_list = []
                for row in slow_queries:
                    slow_query_list.append({
                        "query": row.query[:200] + "..." if len(row.query) > 200 else row.query,
                        "calls": row.calls,
                        "avg_time_ms": round(row.avg_time_ms, 2),
                        "max_time_ms": round(row.max_time_ms, 2),
                        "total_time_ms": round(row.total_time_ms, 2),
                        "cache_hit_percent": round(row.hit_percent or 0, 2)
                    })

                # Get current active queries
                active_queries = await session.execute(text("""
                    SELECT
                        pid,
                        state,
                        EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds,
                        query
                    FROM pg_stat_activity
                    WHERE state = 'active'
                        AND pid != pg_backend_pid()
                        AND query NOT LIKE '%pg_stat_activity%'
                    ORDER BY duration_seconds DESC
                    LIMIT 5
                """))

                active_query_list = []
                for row in active_queries:
                    active_query_list.append({
                        "pid": row.pid,
                        "duration_seconds": round(row.duration_seconds, 2),
                        "query": row.query[:200] + "..." if len(row.query) > 200 else row.query
                    })

                return {
                    "slow_queries": slow_query_list,
                    "active_queries": active_query_list,
                    "slow_query_count": len(slow_query_list),
                    "long_running_query_count": len([q for q in active_query_list if q["duration_seconds"] > 30]),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            # pg_stat_statements might not be enabled, that's OK
            self.logger.warning("Could not get query performance stats", error=str(e))
            return {
                "slow_queries": [],
                "active_queries": [],
                "note": "pg_stat_statements extension may not be enabled",
                "timestamp": datetime.utcnow().isoformat()
            }

    async def get_table_size_stats(self) -> dict[str, Any]:
        """Monitor table sizes and growth"""
        try:
            async with self.db_manager.session_factory() as session:
                # Get table sizes for LIFO.AI schemas
                table_stats = await session.execute(text("""
                    SELECT
                        schemaname,
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
                        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
                    FROM pg_tables
                    WHERE schemaname IN ('business', 'inventory', 'analytics', 'auth')
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                    LIMIT 20
                """))

                tables = []
                total_size_bytes = 0

                for row in table_stats:
                    table_info = {
                        "schema": row.schemaname,
                        "table": row.tablename,
                        "total_size": row.total_size,
                        "size_bytes": row.size_bytes,
                        "table_size": row.table_size,
                        "index_size": row.index_size,
                        "size_gb": round(row.size_bytes / (1024**3), 2)
                    }
                    tables.append(table_info)
                    total_size_bytes += row.size_bytes

                # Get database total size
                db_size = await session.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))

                return {
                    "tables": tables,
                    "total_database_size": db_size.scalar(),
                    "total_monitored_size_gb": round(total_size_bytes / (1024**3), 2),
                    "largest_table": tables[0] if tables else None,
                    "table_count": len(tables),
                    "tables_over_1gb": len([t for t in tables if t["size_gb"] > 1]),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            self.logger.error("Failed to get table size stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_replication_stats(self) -> dict[str, Any]:
        """Monitor replication lag and status"""
        try:
            async with self.db_manager.session_factory() as session:
                # Check if this is a replica
                is_replica = await session.execute(text("SELECT pg_is_in_recovery()"))
                is_replica_bool = is_replica.scalar()

                if is_replica_bool:
                    # This is a replica - check lag
                    lag_query = await session.execute(text("""
                        SELECT
                            CASE
                                WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
                                ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
                            END as lag_seconds,
                            pg_last_xact_replay_timestamp() as last_replay_time
                    """))

                    lag_info = lag_query.fetchone()

                    return {
                        "is_replica": True,
                        "lag_seconds": round(lag_info.lag_seconds or 0, 2),
                        "last_replay_time": lag_info.last_replay_time.isoformat() if lag_info.last_replay_time else None,
                        "status": "healthy" if (lag_info.lag_seconds or 0) < self.thresholds["replication_lag_warning_sec"] else "warning",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    # This is primary - check for replicas
                    replica_stats = await session.execute(text("""
                        SELECT
                            client_addr,
                            state,
                            pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) as flush_lag_bytes,
                            pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as replay_lag_bytes
                        FROM pg_stat_replication
                    """))

                    replicas = []
                    for row in replica_stats:
                        replicas.append({
                            "client_addr": row.client_addr,
                            "state": row.state,
                            "flush_lag_mb": round((row.flush_lag_bytes or 0) / (1024*1024), 2),
                            "replay_lag_mb": round((row.replay_lag_bytes or 0) / (1024*1024), 2)
                        })

                    return {
                        "is_replica": False,
                        "is_primary": True,
                        "replica_count": len(replicas),
                        "replicas": replicas,
                        "timestamp": datetime.utcnow().isoformat()
                    }

        except Exception as e:
            self.logger.error("Failed to get replication stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_lock_stats(self) -> dict[str, Any]:
        """Monitor database locks and deadlocks"""
        try:
            async with self.db_manager.session_factory() as session:
                # Get current locks
                locks = await session.execute(text("""
                    SELECT
                        mode,
                        locktype,
                        granted,
                        COUNT(*) as count
                    FROM pg_locks
                    GROUP BY mode, locktype, granted
                    ORDER BY count DESC
                """))

                lock_stats = []
                total_locks = 0
                blocked_locks = 0

                for row in locks:
                    lock_info = {
                        "mode": row.mode,
                        "type": row.locktype,
                        "granted": row.granted,
                        "count": row.count
                    }
                    lock_stats.append(lock_info)
                    total_locks += row.count
                    if not row.granted:
                        blocked_locks += row.count

                # Get deadlock stats if available
                deadlock_stats = await session.execute(text("""
                    SELECT
                        deadlocks as total_deadlocks
                    FROM pg_stat_database
                    WHERE datname = current_database()
                """))

                deadlock_row = deadlock_stats.fetchone()

                return {
                    "total_locks": total_locks,
                    "blocked_locks": blocked_locks,
                    "lock_types": lock_stats,
                    "total_deadlocks": deadlock_row.total_deadlocks if deadlock_row else 0,
                    "status": "warning" if blocked_locks > 10 else "healthy",
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            self.logger.error("Failed to get lock stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_cache_stats(self) -> dict[str, Any]:
        """Monitor buffer cache hit ratios"""
        try:
            async with self.db_manager.session_factory() as session:
                # Get cache hit ratio
                cache_stats = await session.execute(text("""
                    SELECT
                        sum(heap_blks_read) as heap_read,
                        sum(heap_blks_hit) as heap_hit,
                        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read) + 1) as hit_ratio,
                        sum(idx_blks_read) as idx_read,
                        sum(idx_blks_hit) as idx_hit,
                        sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read) + 1) as idx_hit_ratio
                    FROM pg_statio_user_tables
                """))

                cache_row = cache_stats.fetchone()

                # Get shared buffer stats
                buffer_stats = await session.execute(text("""
                    SELECT
                        setting as shared_buffers_setting,
                        unit
                    FROM pg_settings
                    WHERE name = 'shared_buffers'
                """))

                buffer_row = buffer_stats.fetchone()

                hit_ratio = float(cache_row.hit_ratio or 0)
                idx_hit_ratio = float(cache_row.idx_hit_ratio or 0)

                return {
                    "heap_blocks_read": cache_row.heap_read or 0,
                    "heap_blocks_hit": cache_row.heap_hit or 0,
                    "heap_hit_ratio": round(hit_ratio, 4),
                    "index_blocks_read": cache_row.idx_read or 0,
                    "index_blocks_hit": cache_row.idx_hit or 0,
                    "index_hit_ratio": round(idx_hit_ratio, 4),
                    "shared_buffers": f"{buffer_row.setting}{buffer_row.unit}" if buffer_row else "unknown",
                    "overall_hit_ratio": round((hit_ratio + idx_hit_ratio) / 2, 4),
                    "status": self._assess_cache_health(hit_ratio),
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            self.logger.error("Failed to get cache stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_lifo_specific_stats(self) -> dict[str, Any]:
        """Get LIFO.AI specific database statistics"""
        try:
            async with self.db_manager.session_factory() as session:
                # Store and product counts
                counts = await session.execute(text("""
                    SELECT
                        (SELECT COUNT(*) FROM business.stores) as store_count,
                        (SELECT COUNT(*) FROM inventory.products) as product_count,
                        (SELECT COUNT(*) FROM inventory.batches WHERE status = 'active') as active_batch_count,
                        (SELECT COUNT(*) FROM inventory.batches WHERE expiry_date < CURRENT_DATE) as expired_batch_count,
                        (SELECT COUNT(*) FROM analytics.product_scores WHERE calculated_at > NOW() - INTERVAL '24 hours') as recent_scores_count
                """))

                count_row = counts.fetchone()

                # Recent activity
                activity = await session.execute(text("""
                    SELECT
                        DATE(created_at) as date,
                        COUNT(*) as batches_created
                    FROM inventory.batches
                    WHERE created_at > NOW() - INTERVAL '7 days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                """))

                recent_activity = []
                for row in activity:
                    recent_activity.append({
                        "date": row.date.isoformat(),
                        "batches_created": row.batches_created
                    })

                # CSV upload errors (if tracking table exists)
                try:
                    error_stats = await session.execute(text("""
                        SELECT
                            COUNT(*) FILTER (WHERE status = 'failed') as failed_uploads,
                            COUNT(*) FILTER (WHERE status = 'success') as successful_uploads,
                            COUNT(*) as total_uploads
                        FROM csv_upload_logs
                        WHERE created_at > NOW() - INTERVAL '24 hours'
                    """))

                    error_row = error_stats.fetchone()
                    upload_stats = {
                        "failed_uploads_24h": error_row.failed_uploads or 0,
                        "successful_uploads_24h": error_row.successful_uploads or 0,
                        "total_uploads_24h": error_row.total_uploads or 0
                    }
                except Exception as e:
                    self.logger.warning("CSV upload logging table not available", error=str(e))
                    upload_stats = {"note": "CSV upload logging table not available"}

                return {
                    "business_metrics": {
                        "store_count": count_row.store_count,
                        "product_count": count_row.product_count,
                        "active_batch_count": count_row.active_batch_count,
                        "expired_batch_count": count_row.expired_batch_count,
                        "recent_scores_count": count_row.recent_scores_count
                    },
                    "recent_activity": recent_activity,
                    "csv_upload_stats": upload_stats,
                    "data_health": {
                        "expired_batch_ratio": round(count_row.expired_batch_count / max(count_row.active_batch_count, 1), 3),
                        "scoring_coverage": round(count_row.recent_scores_count / max(count_row.active_batch_count, 1), 3)
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            self.logger.error("Failed to get LIFO-specific stats", error=str(e))
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    def _assess_connection_health(self, utilization_pct: float, longest_query_sec: float) -> str:
        """Assess connection health based on utilization and query times"""
        if utilization_pct > self.thresholds["connection_count_critical"] or longest_query_sec > self.thresholds["query_time_critical_ms"] / 1000:
            return "critical"
        elif utilization_pct > self.thresholds["connection_count_warning"] or longest_query_sec > self.thresholds["query_time_warning_ms"] / 1000:
            return "warning"
        else:
            return "healthy"

    def _assess_cache_health(self, hit_ratio: float) -> str:
        """Assess cache health based on hit ratio"""
        if hit_ratio < self.thresholds["cache_hit_ratio_critical"]:
            return "critical"
        elif hit_ratio < self.thresholds["cache_hit_ratio_warning"]:
            return "warning"
        else:
            return "healthy"

    async def get_comprehensive_health_check(self) -> dict[str, Any]:
        """Get comprehensive database health assessment"""
        health_checks = await asyncio.gather(
            self.get_connection_stats(),
            self.get_query_performance_stats(),
            self.get_table_size_stats(),
            self.get_replication_stats(),
            self.get_lock_stats(),
            self.get_cache_stats(),
            self.get_lifo_specific_stats(),
            return_exceptions=True
        )

        connection_stats, query_stats, table_stats, replication_stats, lock_stats, cache_stats, lifo_stats = health_checks

        # Determine overall health status
        statuses = []
        if isinstance(connection_stats, dict) and "status" in connection_stats:
            statuses.append(connection_stats["status"])
        if isinstance(cache_stats, dict) and "status" in cache_stats:
            statuses.append(cache_stats["status"])
        if isinstance(lock_stats, dict) and "status" in lock_stats:
            statuses.append(lock_stats["status"])

        overall_status = "critical" if "critical" in statuses else "warning" if "warning" in statuses else "healthy"

        return {
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "connections": connection_stats if isinstance(connection_stats, dict) else {"error": str(connection_stats)},
                "query_performance": query_stats if isinstance(query_stats, dict) else {"error": str(query_stats)},
                "table_sizes": table_stats if isinstance(table_stats, dict) else {"error": str(table_stats)},
                "replication": replication_stats if isinstance(replication_stats, dict) else {"error": str(replication_stats)},
                "locks": lock_stats if isinstance(lock_stats, dict) else {"error": str(lock_stats)},
                "cache": cache_stats if isinstance(cache_stats, dict) else {"error": str(cache_stats)},
                "lifo_metrics": lifo_stats if isinstance(lifo_stats, dict) else {"error": str(lifo_stats)}
            },
            "recommendations": self._generate_recommendations(statuses, health_checks)
        }

    def _generate_recommendations(self, statuses: list[str], health_data: list[Any]) -> list[str]:
        """Generate actionable recommendations based on health data"""
        recommendations = []

        if "critical" in statuses:
            recommendations.append("🚨 CRITICAL: Immediate attention required")

        # Connection-specific recommendations
        connection_data = health_data[0] if len(health_data) > 0 and isinstance(health_data[0], dict) else {}
        if connection_data.get("utilization_percent", 0) > 90:
            recommendations.append("Consider increasing max_connections or implementing connection pooling")

        # Cache-specific recommendations
        cache_data = health_data[5] if len(health_data) > 5 and isinstance(health_data[5], dict) else {}
        if cache_data.get("overall_hit_ratio", 1) < 0.85:
            recommendations.append("Consider increasing shared_buffers to improve cache hit ratio")

        # Table size recommendations
        table_data = health_data[2] if len(health_data) > 2 and isinstance(health_data[2], dict) else {}
        if table_data.get("tables_over_1gb", 0) > 5:
            recommendations.append("Consider implementing table partitioning for large tables")

        if not recommendations:
            recommendations.append("✅ Database is operating within healthy parameters")

        return recommendations

# Global monitor instance
_db_monitor = None

def get_db_monitor() -> DatabaseMonitor:
    """Get or create the global database monitor instance"""
    global _db_monitor
    if _db_monitor is None:
        _db_monitor = DatabaseMonitor()
    return _db_monitor
