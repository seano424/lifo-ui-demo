"""
Write Performance Monitor for Database Optimization
Advanced monitoring and analysis of database write operations with EXPLAIN ANALYZE
"""

import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.monitoring.metrics import get_metrics_collector

logger = structlog.get_logger()
metrics = get_metrics_collector()


class QueryAnalyzer:
    """
    Advanced query analysis using EXPLAIN ANALYZE
    Provides detailed performance insights for write operations
    """
    
    def __init__(self):
        self.analysis_cache = {}
        self.cache_ttl = timedelta(hours=1)
        
    async def analyze_query_performance(
        self,
        session: AsyncSession,
        query: str,
        params: dict[str, Any] = None
    ) -> dict[str, Any]:
        """
        Analyze query performance using EXPLAIN ANALYZE
        Returns detailed execution plan and performance metrics
        """
        query_hash = hash(query + str(sorted((params or {}).items())))
        
        # Check cache first
        if query_hash in self.analysis_cache:
            cache_entry = self.analysis_cache[query_hash]
            if datetime.utcnow() - cache_entry["timestamp"] < self.cache_ttl:
                return cache_entry["analysis"]
        
        try:
            # Run EXPLAIN ANALYZE
            explain_query = text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}")
            result = await session.execute(explain_query, params or {})
            explain_result = result.fetchone()
            
            if explain_result and explain_result[0]:
                analysis = self._parse_explain_analyze(explain_result[0][0])
                
                # Cache the result
                self.analysis_cache[query_hash] = {
                    "analysis": analysis,
                    "timestamp": datetime.utcnow()
                }
                
                return analysis
            else:
                return {"error": "No EXPLAIN ANALYZE result available"}
                
        except Exception as e:
            logger.warning(
                "Query analysis failed",
                query=query[:200],
                error=str(e)
            )
            return {"error": f"Analysis failed: {str(e)}"}
    
    def _parse_explain_analyze(self, explain_json: dict[str, Any]) -> dict[str, Any]:
        """Parse EXPLAIN ANALYZE JSON output into performance metrics"""
        
        if not explain_json or "Plan" not in explain_json:
            return {"error": "Invalid EXPLAIN ANALYZE format"}
        
        plan = explain_json["Plan"]
        
        # Extract key performance metrics
        analysis = {
            "execution_time_ms": explain_json.get("Execution Time", 0),
            "planning_time_ms": explain_json.get("Planning Time", 0),
            "total_cost": plan.get("Total Cost", 0),
            "actual_rows": plan.get("Actual Rows", 0),
            "actual_loops": plan.get("Actual Loops", 1),
            "node_type": plan.get("Node Type"),
            "operation": plan.get("Operation"),
            "scan_direction": plan.get("Scan Direction"),
            "index_name": plan.get("Index Name"),
            "relation_name": plan.get("Relation Name"),
            "shared_hit_blocks": plan.get("Shared Hit Blocks", 0),
            "shared_read_blocks": plan.get("Shared Read Blocks", 0),
            "shared_dirtied_blocks": plan.get("Shared Dirtied Blocks", 0),
            "shared_written_blocks": plan.get("Shared Written Blocks", 0),
        }
        
        # Calculate derived metrics
        analysis["rows_per_ms"] = (
            analysis["actual_rows"] / analysis["execution_time_ms"] 
            if analysis["execution_time_ms"] > 0 else 0
        )
        
        analysis["buffer_hit_ratio"] = (
            analysis["shared_hit_blocks"] / 
            (analysis["shared_hit_blocks"] + analysis["shared_read_blocks"])
            if (analysis["shared_hit_blocks"] + analysis["shared_read_blocks"]) > 0 else 1.0
        )
        
        # Analyze child plans for complex queries
        if "Plans" in plan:
            analysis["child_plans"] = [
                self._analyze_child_plan(child_plan) 
                for child_plan in plan["Plans"]
            ]
            
            # Find bottlenecks
            analysis["bottlenecks"] = self._identify_bottlenecks(analysis)
        
        # Performance recommendations
        analysis["recommendations"] = self._generate_recommendations(analysis)
        
        return analysis
    
    def _analyze_child_plan(self, plan: dict[str, Any]) -> dict[str, Any]:
        """Analyze a child plan node"""
        return {
            "node_type": plan.get("Node Type"),
            "execution_time_ms": plan.get("Actual Total Time", 0),
            "actual_rows": plan.get("Actual Rows", 0),
            "total_cost": plan.get("Total Cost", 0),
            "relation_name": plan.get("Relation Name"),
            "index_name": plan.get("Index Name"),
            "filter": plan.get("Filter"),
            "join_type": plan.get("Join Type"),
            "shared_hit_blocks": plan.get("Shared Hit Blocks", 0),
            "shared_read_blocks": plan.get("Shared Read Blocks", 0)
        }
    
    def _identify_bottlenecks(self, analysis: dict[str, Any]) -> list[str]:
        """Identify performance bottlenecks from analysis"""
        bottlenecks = []
        
        # Slow execution
        if analysis["execution_time_ms"] > 1000:
            bottlenecks.append("slow_execution")
        
        # High planning time
        if analysis["planning_time_ms"] > analysis["execution_time_ms"] * 0.5:
            bottlenecks.append("high_planning_time")
        
        # Low buffer hit ratio
        if analysis["buffer_hit_ratio"] < 0.95:
            bottlenecks.append("low_buffer_hit_ratio")
        
        # Sequential scans on large tables
        if analysis["node_type"] == "Seq Scan" and analysis["actual_rows"] > 10000:
            bottlenecks.append("large_sequential_scan")
        
        # Many disk reads
        if analysis["shared_read_blocks"] > analysis["shared_hit_blocks"]:
            bottlenecks.append("high_disk_reads")
        
        return bottlenecks
    
    def _generate_recommendations(self, analysis: dict[str, Any]) -> list[str]:
        """Generate performance recommendations based on analysis"""
        recommendations = []
        
        # Index recommendations
        if analysis["node_type"] == "Seq Scan":
            recommendations.append("Consider adding an index for this query")
        
        # Buffer recommendations
        if analysis["buffer_hit_ratio"] < 0.9:
            recommendations.append("Consider increasing shared_buffers")
        
        # Query optimization
        if analysis["execution_time_ms"] > 500:
            recommendations.append("Query optimization needed - consider rewriting")
        
        # Join recommendations
        if "child_plans" in analysis:
            for child in analysis["child_plans"]:
                if child["node_type"] == "Nested Loop" and child["actual_rows"] > 1000:
                    recommendations.append("Consider using hash join instead of nested loop")
        
        return recommendations


class WriteOperationProfiler:
    """
    Profiles write operations to identify performance patterns and opportunities
    """
    
    def __init__(self):
        self.operation_profiles = defaultdict(list)
        self.slow_operations = deque(maxlen=100)
        self.operation_patterns = defaultdict(int)
        
    async def profile_write_operation(
        self,
        session: AsyncSession,
        operation_name: str,
        table_name: str,
        operation_type: str,  # insert, update, delete, upsert
        record_count: int,
        query: str,
        params: dict[str, Any] = None
    ) -> dict[str, Any]:
        """
        Profile a write operation with detailed analysis
        """
        start_time = time.time()
        
        # Get pre-execution table stats
        pre_stats = await self._get_table_stats(session, table_name)
        
        # Analyze the query
        analyzer = QueryAnalyzer()
        query_analysis = await analyzer.analyze_query_performance(session, query, params)
        
        execution_time = (time.time() - start_time) * 1000
        
        # Create operation profile
        profile = {
            "operation_name": operation_name,
            "table_name": table_name,
            "operation_type": operation_type,
            "record_count": record_count,
            "execution_time_ms": execution_time,
            "records_per_second": record_count / (execution_time / 1000) if execution_time > 0 else 0,
            "query_analysis": query_analysis,
            "pre_execution_stats": pre_stats,
            "timestamp": datetime.utcnow(),
            "performance_category": self._categorize_performance(execution_time, record_count)
        }
        
        # Store the profile
        self.operation_profiles[operation_name].append(profile)
        
        # Track slow operations
        if execution_time > 100:  # >100ms is considered slow
            self.slow_operations.append(profile)
        
        # Update patterns
        self.operation_patterns[f"{operation_type}_{table_name}"] += 1
        
        # Generate recommendations
        profile["recommendations"] = self._generate_operation_recommendations(profile)
        
        return profile
    
    async def _get_table_stats(self, session: AsyncSession, table_name: str) -> dict[str, Any]:
        """Get table statistics before operation"""
        try:
            stats_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins,
                    n_tup_upd,
                    n_tup_del,
                    n_live_tup,
                    n_dead_tup,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables 
                WHERE tablename = :table_name
            """)
            
            result = await session.execute(stats_query, {"table_name": table_name})
            row = result.fetchone()
            
            if row:
                return {
                    "schema_name": row.schemaname,
                    "table_name": row.tablename,
                    "insertions": row.n_tup_ins,
                    "updates": row.n_tup_upd,
                    "deletions": row.n_tup_del,
                    "live_tuples": row.n_live_tup,
                    "dead_tuples": row.n_dead_tup,
                    "last_vacuum": row.last_vacuum.isoformat() if row.last_vacuum else None,
                    "last_analyze": row.last_analyze.isoformat() if row.last_analyze else None
                }
            else:
                return {"error": f"No stats found for table {table_name}"}
                
        except Exception as e:
            logger.warning("Failed to get table stats", table_name=table_name, error=str(e))
            return {"error": str(e)}
    
    def _categorize_performance(self, execution_time_ms: float, record_count: int) -> str:
        """Categorize operation performance"""
        records_per_ms = record_count / execution_time_ms if execution_time_ms > 0 else 0
        
        if execution_time_ms < 10:
            return "excellent"
        elif execution_time_ms < 50:
            return "good"
        elif execution_time_ms < 200:
            return "acceptable"
        elif execution_time_ms < 1000:
            return "slow"
        else:
            return "very_slow"
    
    def _generate_operation_recommendations(self, profile: dict[str, Any]) -> list[str]:
        """Generate recommendations for write operation optimization"""
        recommendations = []
        
        execution_time = profile["execution_time_ms"]
        record_count = profile["record_count"]
        operation_type = profile["operation_type"]
        
        # Performance-based recommendations
        if execution_time > 500:
            recommendations.append("Consider breaking this operation into smaller chunks")
        
        if record_count > 1000 and execution_time / record_count > 1:
            recommendations.append("Consider using bulk operations for better performance")
        
        # Operation-specific recommendations
        if operation_type == "insert" and record_count > 100:
            recommendations.append("Use bulk INSERT or COPY for large insertions")
        
        if operation_type == "update" and record_count > 50:
            recommendations.append("Consider using bulk UPDATE with VALUES() clause")
        
        # Query analysis recommendations
        if "recommendations" in profile["query_analysis"]:
            recommendations.extend(profile["query_analysis"]["recommendations"])
        
        return recommendations
    
    def get_operation_summary(self, operation_name: str) -> dict[str, Any]:
        """Get performance summary for a specific operation"""
        profiles = self.operation_profiles.get(operation_name, [])
        
        if not profiles:
            return {"error": f"No profiles found for {operation_name}"}
        
        execution_times = [p["execution_time_ms"] for p in profiles]
        record_counts = [p["record_count"] for p in profiles]
        
        return {
            "operation_name": operation_name,
            "total_executions": len(profiles),
            "avg_execution_time_ms": sum(execution_times) / len(execution_times),
            "min_execution_time_ms": min(execution_times),
            "max_execution_time_ms": max(execution_times),
            "avg_record_count": sum(record_counts) / len(record_counts),
            "total_records_processed": sum(record_counts),
            "performance_distribution": {
                "excellent": len([p for p in profiles if p["performance_category"] == "excellent"]),
                "good": len([p for p in profiles if p["performance_category"] == "good"]),
                "acceptable": len([p for p in profiles if p["performance_category"] == "acceptable"]),
                "slow": len([p for p in profiles if p["performance_category"] == "slow"]),
                "very_slow": len([p for p in profiles if p["performance_category"] == "very_slow"])
            },
            "latest_recommendations": profiles[-1]["recommendations"] if profiles else []
        }


class WriteOptimizationAdvisor:
    """
    Provides optimization advice based on collected performance data
    """
    
    def __init__(self):
        self.profiler = WriteOperationProfiler()
        self.analyzer = QueryAnalyzer()
        
    async def analyze_write_patterns(
        self,
        session: AsyncSession,
        store_id: str,
        time_window_hours: int = 24
    ) -> dict[str, Any]:
        """
        Analyze write patterns for a store and provide optimization recommendations
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
        
        # Get recent write operations
        recent_operations = []
        for operation_name, profiles in self.profiler.operation_profiles.items():
            recent_profiles = [
                p for p in profiles 
                if p["timestamp"] > cutoff_time
            ]
            if recent_profiles:
                recent_operations.extend(recent_profiles)
        
        if not recent_operations:
            return {"message": "No recent write operations found"}
        
        # Analyze patterns
        pattern_analysis = self._analyze_operation_patterns(recent_operations)
        
        # Generate recommendations
        recommendations = await self._generate_optimization_recommendations(
            session, pattern_analysis, store_id
        )
        
        return {
            "analysis_period_hours": time_window_hours,
            "total_operations": len(recent_operations),
            "pattern_analysis": pattern_analysis,
            "optimization_recommendations": recommendations,
            "performance_summary": self._summarize_performance(recent_operations)
        }
    
    def _analyze_operation_patterns(self, operations: list[dict[str, Any]]) -> dict[str, Any]:
        """Analyze patterns in write operations"""
        
        # Group by operation type
        by_type = defaultdict(list)
        for op in operations:
            by_type[op["operation_type"]].append(op)
        
        # Group by table
        by_table = defaultdict(list)
        for op in operations:
            by_table[op["table_name"]].append(op)
        
        # Group by performance category
        by_performance = defaultdict(list)
        for op in operations:
            by_performance[op["performance_category"]].append(op)
        
        # Find temporal patterns
        hourly_distribution = defaultdict(int)
        for op in operations:
            hour = op["timestamp"].hour
            hourly_distribution[hour] += 1
        
        return {
            "operation_types": {
                op_type: {
                    "count": len(ops),
                    "avg_execution_time_ms": sum(op["execution_time_ms"] for op in ops) / len(ops),
                    "total_records": sum(op["record_count"] for op in ops)
                }
                for op_type, ops in by_type.items()
            },
            "table_activity": {
                table: {
                    "operation_count": len(ops),
                    "avg_execution_time_ms": sum(op["execution_time_ms"] for op in ops) / len(ops),
                    "total_records": sum(op["record_count"] for op in ops)
                }
                for table, ops in by_table.items()
            },
            "performance_distribution": {
                category: len(ops) for category, ops in by_performance.items()
            },
            "hourly_distribution": dict(hourly_distribution),
            "peak_hours": sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
        }
    
    async def _generate_optimization_recommendations(
        self,
        session: AsyncSession,
        pattern_analysis: dict[str, Any],
        store_id: str
    ) -> list[dict[str, Any]]:
        """Generate specific optimization recommendations"""
        recommendations = []
        
        # Table-specific recommendations
        for table_name, stats in pattern_analysis["table_activity"].items():
            if stats["avg_execution_time_ms"] > 200:
                recommendations.append({
                    "type": "table_optimization",
                    "priority": "high",
                    "table": table_name,
                    "issue": "Slow write operations",
                    "recommendation": f"Optimize {table_name} for write performance",
                    "suggested_actions": [
                        "Check for unused indexes that slow down writes",
                        "Consider partitioning if table is large",
                        "Review foreign key constraints",
                        "Run VACUUM ANALYZE regularly"
                    ]
                })
        
        # Operation type recommendations
        operation_types = pattern_analysis["operation_types"]
        
        if "insert" in operation_types and operation_types["insert"]["avg_execution_time_ms"] > 100:
            recommendations.append({
                "type": "insert_optimization",
                "priority": "medium",
                "issue": "Slow INSERT operations",
                "recommendation": "Optimize INSERT performance",
                "suggested_actions": [
                    "Use bulk INSERT operations",
                    "Consider using COPY for large data loads",
                    "Batch multiple INSERTs in single transactions",
                    "Disable autocommit for bulk operations"
                ]
            })
        
        if "update" in operation_types and operation_types["update"]["avg_execution_time_ms"] > 150:
            recommendations.append({
                "type": "update_optimization",
                "priority": "medium",
                "issue": "Slow UPDATE operations",
                "recommendation": "Optimize UPDATE performance",
                "suggested_actions": [
                    "Use bulk UPDATE with VALUES() clause",
                    "Ensure proper indexing on UPDATE conditions",
                    "Consider using upsert (ON CONFLICT) instead of separate INSERT/UPDATE",
                    "Batch UPDATEs when possible"
                ]
            })
        
        # Performance distribution recommendations
        perf_dist = pattern_analysis["performance_distribution"]
        slow_operations = perf_dist.get("slow", 0) + perf_dist.get("very_slow", 0)
        total_operations = sum(perf_dist.values())
        
        if slow_operations / total_operations > 0.3:  # >30% slow operations
            recommendations.append({
                "type": "general_performance",
                "priority": "high",
                "issue": f"{slow_operations}/{total_operations} operations are slow",
                "recommendation": "Address overall write performance issues",
                "suggested_actions": [
                    "Review database configuration (shared_buffers, work_mem)",
                    "Check for lock contention",
                    "Monitor connection pool usage",
                    "Consider read replicas to reduce write load"
                ]
            })
        
        # Temporal pattern recommendations
        peak_hours = pattern_analysis["peak_hours"]
        if peak_hours and peak_hours[0][1] > total_operations * 0.3:  # >30% in peak hour
            recommendations.append({
                "type": "temporal_optimization",
                "priority": "medium",
                "issue": f"High write activity during hour {peak_hours[0][0]}",
                "recommendation": "Consider load balancing across time",
                "suggested_actions": [
                    "Implement write queuing for peak hours",
                    "Schedule heavy operations during off-peak hours",
                    "Use connection pooling to handle traffic spikes",
                    "Consider horizontal scaling for peak periods"
                ]
            })
        
        return recommendations
    
    def _summarize_performance(self, operations: list[dict[str, Any]]) -> dict[str, Any]:
        """Summarize overall performance metrics"""
        if not operations:
            return {}
        
        execution_times = [op["execution_time_ms"] for op in operations]
        record_counts = [op["record_count"] for op in operations]
        
        return {
            "total_operations": len(operations),
            "avg_execution_time_ms": sum(execution_times) / len(execution_times),
            "median_execution_time_ms": sorted(execution_times)[len(execution_times) // 2],
            "95th_percentile_execution_time_ms": sorted(execution_times)[int(len(execution_times) * 0.95)],
            "total_records_processed": sum(record_counts),
            "avg_records_per_operation": sum(record_counts) / len(record_counts),
            "operations_per_hour": len(operations) / 24,  # Assuming 24-hour window
            "fastest_operation_ms": min(execution_times),
            "slowest_operation_ms": max(execution_times)
        }


# Global instances
_write_performance_monitor = None


class WritePerformanceMonitor:
    """
    Main write performance monitoring service
    Coordinates all monitoring components
    """
    
    def __init__(self):
        self.session_factory = async_session()
        self.advisor = WriteOptimizationAdvisor()
        self.active_monitors = {}
        
    async def monitor_write_operation(
        self,
        operation_name: str,
        table_name: str,
        operation_type: str,
        record_count: int,
        query: str,
        params: dict[str, Any] = None
    ) -> dict[str, Any]:
        """
        Monitor a write operation with full performance analysis
        """
        async with self.session_factory() as session:
            profile = await self.advisor.profiler.profile_write_operation(
                session=session,
                operation_name=operation_name,
                table_name=table_name,
                operation_type=operation_type,
                record_count=record_count,
                query=query,
                params=params
            )
            
            # Record metrics
            metrics.record_database_query(
                f"write_{operation_type}_{table_name}",
                profile["execution_time_ms"],
                record_count,
                success=True
            )
            
            return profile
    
    async def get_store_optimization_report(
        self,
        store_id: str,
        time_window_hours: int = 24
    ) -> dict[str, Any]:
        """
        Get comprehensive optimization report for a store
        """
        async with self.session_factory() as session:
            return await self.advisor.analyze_write_patterns(
                session, store_id, time_window_hours
            )
    
    async def analyze_slow_queries(self) -> dict[str, Any]:
        """
        Analyze slow write queries and provide optimization suggestions
        """
        slow_operations = list(self.advisor.profiler.slow_operations)
        
        if not slow_operations:
            return {"message": "No slow operations detected"}
        
        # Group by query pattern
        query_patterns = defaultdict(list)
        for op in slow_operations:
            pattern_key = f"{op['operation_type']}_{op['table_name']}"
            query_patterns[pattern_key].append(op)
        
        analysis = {}
        for pattern, operations in query_patterns.items():
            avg_time = sum(op["execution_time_ms"] for op in operations) / len(operations)
            analysis[pattern] = {
                "occurrence_count": len(operations),
                "avg_execution_time_ms": avg_time,
                "total_records_affected": sum(op["record_count"] for op in operations),
                "sample_recommendations": operations[0]["recommendations"][:3]  # Top 3 recommendations
            }
        
        return {
            "total_slow_operations": len(slow_operations),
            "pattern_analysis": analysis,
            "optimization_priority": sorted(
                analysis.items(),
                key=lambda x: x[1]["avg_execution_time_ms"] * x[1]["occurrence_count"],
                reverse=True
            )[:5]  # Top 5 priority patterns
        }


def get_write_performance_monitor() -> WritePerformanceMonitor:
    """Get the global write performance monitor instance"""
    global _write_performance_monitor
    if _write_performance_monitor is None:
        _write_performance_monitor = WritePerformanceMonitor()
    return _write_performance_monitor