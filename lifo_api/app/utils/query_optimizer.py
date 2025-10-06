"""
Database Query Optimizer for Phase 2 API Consolidations
Implements query optimization strategies for improved performance
"""

from typing import Any, List

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class QueryOptimizer:
    """
    Database query optimization utilities for high-performance operations
    """

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def get_inventory_with_scores_bulk(
        self, store_id: str, limit: int = 1000
    ) -> list[dict]:
        """
        Optimized query to get inventory with scores in a single query
        Avoids N+1 problem using JOIN and window functions
        """
        query = text("""
            WITH latest_scores AS (
                SELECT 
                    batch_id,
                    urgency_score,
                    recommendation,
                    calculated_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY batch_id 
                        ORDER BY calculated_at DESC
                    ) as rn
                FROM product_scores
            ),
            inventory_summary AS (
                SELECT 
                    ib.id as batch_id,
                    ib.sku,
                    ib.product_name,
                    ib.category,
                    ib.current_quantity,
                    ib.expiry_date,
                    ib.cost_price,
                    ib.selling_price,
                    ib.created_at,
                    EXTRACT(DAY FROM (ib.expiry_date - CURRENT_DATE)) as days_to_expiry,
                    ls.urgency_score,
                    ls.recommendation,
                    ls.calculated_at as score_calculated_at
                FROM inventory_batches ib
                LEFT JOIN latest_scores ls ON 
                    ib.id = ls.batch_id AND ls.rn = 1
                WHERE 
                    ib.store_id = :store_id
                    AND ib.is_active = true
                    AND ib.current_quantity > 0
                ORDER BY 
                    COALESCE(ls.urgency_score, 0.5) DESC,
                    ib.expiry_date ASC
                LIMIT :limit
            )
            SELECT * FROM inventory_summary;
        """)

        result = await self.db.execute(
            query, {"store_id": store_id, "limit": limit}
        )
        
        return [dict(row._mapping) for row in result]

    async def get_analytics_optimized(
        self, store_id: str, days: int = 30
    ) -> dict:
        """
        Get analytics using materialized view for performance
        """
        # First, try to get from materialized view
        mv_query = text("""
            SELECT 
                date,
                batch_count,
                urgent_count,
                avg_urgency,
                category_breakdown,
                value_at_risk
            FROM mv_store_analytics
            WHERE 
                store_id = :store_id 
                AND date >= CURRENT_DATE - INTERVAL ':days days'
            ORDER BY date DESC;
        """)
        
        try:
            result = await self.db.execute(
                mv_query, {"store_id": store_id, "days": days}
            )
            mv_data = [dict(row._mapping) for row in result]
            
            if mv_data:
                return self._aggregate_analytics(mv_data)
        except Exception as e:
            logger.warning(
                "Materialized view not available, falling back to direct query",
                error=str(e)
            )

        # Fallback to direct query if materialized view is not available
        return await self._get_analytics_direct(store_id, days)

    async def _get_analytics_direct(self, store_id: str, days: int) -> dict:
        """Direct analytics query with optimization"""
        analytics_query = text("""
            WITH date_range AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL ':days days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS date
            ),
            daily_metrics AS (
                SELECT 
                    DATE(ib.created_at) as date,
                    COUNT(*) as batch_count,
                    COUNT(CASE WHEN ps.urgency_score > 0.8 THEN 1 END) as urgent_count,
                    AVG(ps.urgency_score) as avg_urgency,
                    SUM(ib.current_quantity * ib.selling_price) as total_value,
                    json_object_agg(
                        ib.category, 
                        json_build_object(
                            'count', COUNT(*),
                            'value', SUM(ib.current_quantity * ib.selling_price)
                        )
                    ) as category_breakdown
                FROM inventory_batches ib
                LEFT JOIN LATERAL (
                    SELECT urgency_score 
                    FROM product_scores 
                    WHERE batch_id = ib.id 
                    ORDER BY calculated_at DESC 
                    LIMIT 1
                ) ps ON true
                WHERE 
                    ib.store_id = :store_id
                    AND ib.created_at >= CURRENT_DATE - INTERVAL ':days days'
                GROUP BY DATE(ib.created_at)
            )
            SELECT 
                dr.date,
                COALESCE(dm.batch_count, 0) as batch_count,
                COALESCE(dm.urgent_count, 0) as urgent_count,
                COALESCE(dm.avg_urgency, 0) as avg_urgency,
                COALESCE(dm.total_value, 0) as total_value,
                COALESCE(dm.category_breakdown, '{}'::json) as category_breakdown
            FROM date_range dr
            LEFT JOIN daily_metrics dm ON dr.date = dm.date
            ORDER BY dr.date DESC;
        """)

        result = await self.db.execute(
            analytics_query, {"store_id": store_id, "days": days}
        )
        
        data = [dict(row._mapping) for row in result]
        return self._aggregate_analytics(data)

    def _aggregate_analytics(self, daily_data: list[dict]) -> dict:
        """Aggregate daily analytics into summary"""
        if not daily_data:
            return {}

        total_batches = sum(d["batch_count"] for d in daily_data)
        total_urgent = sum(d["urgent_count"] for d in daily_data)
        avg_urgency = (
            sum(d["avg_urgency"] * d["batch_count"] for d in daily_data) 
            / total_batches
            if total_batches > 0 else 0
        )

        # Aggregate category breakdown
        category_totals = {}
        for day in daily_data:
            if day.get("category_breakdown"):
                for category, data in day["category_breakdown"].items():
                    if category not in category_totals:
                        category_totals[category] = {"count": 0, "value": 0}
                    category_totals[category]["count"] += data.get("count", 0)
                    category_totals[category]["value"] += data.get("value", 0)

        return {
            "summary": {
                "total_batches": total_batches,
                "urgent_batches": total_urgent,
                "average_urgency": round(avg_urgency, 3),
                "days_analyzed": len(daily_data),
            },
            "category_breakdown": category_totals,
            "daily_trends": daily_data[:7],  # Last 7 days for trending
        }

    async def bulk_insert_optimized(
        self, 
        table_name: str, 
        records: list[dict], 
        chunk_size: int = 100
    ) -> int:
        """
        Optimized bulk insertion using COPY command
        Target: <100ms per 25 items
        """
        if not records:
            return 0

        total_inserted = 0
        
        # Process in chunks for better memory management
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            
            # Build VALUES clause for bulk insert
            columns = list(chunk[0].keys())
            values_template = "({})".format(
                ",".join([f":{col}_{idx}" for col in columns])
            )
            
            # Create parameter dict
            params = {}
            values_clauses = []
            
            for idx, record in enumerate(chunk):
                values_clauses.append(
                    values_template.replace("{idx}", str(idx))
                )
                for col, val in record.items():
                    params[f"{col}_{idx}"] = val
            
            # Build and execute bulk insert query
            insert_query = text(f"""
                INSERT INTO {table_name} ({','.join(columns)})
                VALUES {','.join(values_clauses)}
                ON CONFLICT DO NOTHING
                RETURNING id;
            """)
            
            result = await self.db.execute(insert_query, params)
            total_inserted += result.rowcount
            
        await self.db.commit()
        return total_inserted

    async def create_indexes_if_not_exists(self):
        """Create performance-critical indexes if they don't exist"""
        indexes = [
            # Composite index for inventory queries
            """
            CREATE INDEX IF NOT EXISTS idx_inventory_store_expiry_active
            ON inventory_batches(store_id, expiry_date, is_active)
            WHERE is_active = true;
            """,
            
            # Index for score lookups
            """
            CREATE INDEX IF NOT EXISTS idx_scores_batch_calculated
            ON product_scores(batch_id, calculated_at DESC);
            """,
            
            # Index for category aggregations
            """
            CREATE INDEX IF NOT EXISTS idx_inventory_category_store
            ON inventory_batches(store_id, category)
            WHERE is_active = true AND current_quantity > 0;
            """,
            
            # Partial index for urgent items
            """
            CREATE INDEX IF NOT EXISTS idx_urgent_items
            ON inventory_batches(store_id, expiry_date)
            WHERE is_active = true 
            AND current_quantity > 0
            AND expiry_date <= CURRENT_DATE + INTERVAL '7 days';
            """,
        ]

        for index_sql in indexes:
            try:
                await self.db.execute(text(index_sql))
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Index creation skipped (may already exist): {e}")

    async def vacuum_analyze_tables(self, tables: list[str]):
        """Run VACUUM ANALYZE on specified tables for query optimization"""
        for table in tables:
            try:
                # Note: VACUUM cannot run inside a transaction
                await self.db.execute(text(f"VACUUM ANALYZE {table};"))
                logger.info(f"VACUUM ANALYZE completed for {table}")
            except Exception as e:
                logger.warning(f"VACUUM ANALYZE failed for {table}: {e}")


class ConnectionPoolManager:
    """
    Manages database connection pools for optimal performance
    """

    def __init__(self, database_url: str):
        self.pools = {}
        self.database_url = database_url

    async def get_pool(self, pool_type: str = "default"):
        """Get or create a connection pool for specific use case"""
        if pool_type not in self.pools:
            pool_config = self._get_pool_config(pool_type)
            
            from sqlalchemy.ext.asyncio import create_async_engine
            
            engine = create_async_engine(
                self.database_url,
                **pool_config
            )
            
            self.pools[pool_type] = engine
            logger.info(f"Created connection pool: {pool_type}", config=pool_config)
        
        return self.pools[pool_type]

    def _get_pool_config(self, pool_type: str) -> dict:
        """Get pool configuration based on use case"""
        configs = {
            "default": {
                "pool_size": 10,
                "max_overflow": 5,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
            },
            "mobile": {
                "pool_size": 20,  # Larger pool for mobile traffic
                "max_overflow": 10,
                "pool_timeout": 10,  # Faster timeout for mobile
                "pool_recycle": 300,  # More frequent recycling
                "pool_pre_ping": True,
            },
            "analytics": {
                "pool_size": 5,  # Smaller pool for analytics
                "max_overflow": 2,
                "pool_timeout": 60,  # Longer timeout for complex queries
                "pool_recycle": 3600,
                "pool_pre_ping": True,
            },
            "bulk": {
                "pool_size": 15,  # Medium pool for bulk operations
                "max_overflow": 5,
                "pool_timeout": 120,  # Long timeout for bulk ops
                "pool_recycle": 1800,
                "pool_pre_ping": True,
            },
        }
        
        return configs.get(pool_type, configs["default"])

    async def close_all_pools(self):
        """Close all connection pools"""
        for pool_name, engine in self.pools.items():
            await engine.dispose()
            logger.info(f"Closed connection pool: {pool_name}")
        self.pools.clear()


class QueryMonitor:
    """
    Monitor and log slow queries for optimization
    """

    def __init__(self, slow_query_threshold_ms: int = 500):
        self.slow_query_threshold_ms = slow_query_threshold_ms
        self.slow_queries = []

    async def execute_with_monitoring(
        self, 
        db: AsyncSession, 
        query: Any, 
        params: dict = None
    ):
        """Execute query with performance monitoring"""
        import time
        
        start_time = time.time()
        
        try:
            result = await db.execute(query, params or {})
            execution_time_ms = (time.time() - start_time) * 1000
            
            # Log slow queries
            if execution_time_ms > self.slow_query_threshold_ms:
                self.slow_queries.append({
                    "query": str(query),
                    "params": params,
                    "execution_time_ms": execution_time_ms,
                    "timestamp": time.time()
                })
                
                logger.warning(
                    "Slow query detected",
                    execution_time_ms=execution_time_ms,
                    query=str(query)[:200]  # Log first 200 chars
                )
            
            return result
            
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            logger.error(
                "Query execution failed",
                execution_time_ms=execution_time_ms,
                error=str(e),
                query=str(query)[:200]
            )
            raise

    def get_slow_query_report(self) -> dict:
        """Get report of slow queries"""
        if not self.slow_queries:
            return {"message": "No slow queries detected"}
        
        # Sort by execution time
        sorted_queries = sorted(
            self.slow_queries, 
            key=lambda x: x["execution_time_ms"], 
            reverse=True
        )
        
        return {
            "total_slow_queries": len(self.slow_queries),
            "slowest_query_ms": sorted_queries[0]["execution_time_ms"],
            "average_slow_time_ms": sum(
                q["execution_time_ms"] for q in self.slow_queries
            ) / len(self.slow_queries),
            "top_5_slowest": sorted_queries[:5]
        }