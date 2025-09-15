"""
Comprehensive metrics collection for LIFO AI Engine
Real-time performance metrics with mobile optimization focus
"""

import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Any

import psutil
import structlog

logger = structlog.get_logger()


class MetricsCollector:
    """
    Production-ready metrics collector for LIFO AI Engine
    Focuses on mobile performance, database health, and system observability
    """

    def __init__(self):
        self.metrics = defaultdict(dict)
        self.time_series_metrics = defaultdict(
            lambda: deque(maxlen=1000)
        )  # Keep last 1000 data points
        self.alerts_triggered = defaultdict(list)
        self.lock = threading.RLock()

        # Performance thresholds for alerting
        self.thresholds = {
            "api_response_time_ms": {
                "mobile_critical": 200,  # Mobile scoring target
                "mobile_warning": 300,  # Mobile general target
                "api_critical": 1000,  # API critical threshold
                "api_warning": 500,  # API warning threshold
            },
            "database_query_time_ms": {"critical": 1000, "warning": 500},
            "memory_usage_percent": {"critical": 90, "warning": 80},
            "cache_hit_rate_percent": {
                "critical": 50,  # Below 50% hit rate is concerning
                "warning": 70,  # Below 70% hit rate needs attention
            },
            "error_rate_percent": {
                "critical": 10,  # >10% error rate is critical
                "warning": 5,  # >5% error rate needs attention
            },
        }

        # Start background metrics collection
        self._start_system_monitoring()

    def record_api_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: float,
        user_id: str | None = None,
        store_id: str | None = None,
    ):
        """Record API request metrics with mobile performance focus"""
        with self.lock:
            timestamp = datetime.now(UTC)

            # Update request metrics
            metric_key = f"api_{method.lower()}_{endpoint.replace('/', '_')}"

            if metric_key not in self.metrics:
                self.metrics[metric_key] = {
                    "total_requests": 0,
                    "total_response_time_ms": 0,
                    "success_count": 0,
                    "error_count": 0,
                    "min_response_time_ms": float("inf"),
                    "max_response_time_ms": 0,
                    "mobile_target_violations": 0,
                    "last_updated": timestamp,
                }

            metrics = self.metrics[metric_key]
            metrics["total_requests"] += 1
            metrics["total_response_time_ms"] += response_time_ms
            metrics["last_updated"] = timestamp

            # Track success/error rates
            if 200 <= status_code < 400:
                metrics["success_count"] += 1
            else:
                metrics["error_count"] += 1

            # Track response time statistics
            metrics["min_response_time_ms"] = min(
                metrics["min_response_time_ms"], response_time_ms
            )
            metrics["max_response_time_ms"] = max(
                metrics["max_response_time_ms"], response_time_ms
            )

            # Check mobile performance targets
            is_mobile_endpoint = any(
                mobile_path in endpoint
                for mobile_path in [
                    "/mobile-summary",
                    "/batch-quick-score",
                    "/store-health",
                    "/batch-list-mobile",
                ]
            )

            if is_mobile_endpoint:
                mobile_threshold = (
                    self.thresholds["api_response_time_ms"]["mobile_critical"]
                    if "quick-score" in endpoint
                    else self.thresholds["api_response_time_ms"]["mobile_warning"]
                )

                if response_time_ms > mobile_threshold:
                    metrics["mobile_target_violations"] += 1
                    self._trigger_alert(
                        "mobile_performance_degradation",
                        f"Mobile endpoint {endpoint} took {response_time_ms:.1f}ms (target: <{mobile_threshold}ms)",
                        {
                            "endpoint": endpoint,
                            "response_time_ms": response_time_ms,
                            "threshold": mobile_threshold,
                        },
                    )

            # Add to time series for trending
            self.time_series_metrics[f"{metric_key}_response_time"].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "value": response_time_ms,
                    "status_code": status_code,
                    "is_mobile": is_mobile_endpoint,
                }
            )

            logger.info(
                "API request metrics recorded",
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                is_mobile=is_mobile_endpoint,
                mobile_target_met=not (
                    is_mobile_endpoint and response_time_ms > mobile_threshold
                )
                if is_mobile_endpoint
                else None,
            )

    def record_database_query(
        self,
        query_name: str,
        execution_time_ms: float,
        result_count: int,
        success: bool = True,
        error: str | None = None,
    ):
        """Record database query performance metrics"""
        with self.lock:
            timestamp = datetime.now(UTC)
            metric_key = f"db_query_{query_name}"

            if metric_key not in self.metrics:
                self.metrics[metric_key] = {
                    "total_queries": 0,
                    "total_execution_time_ms": 0,
                    "success_count": 0,
                    "error_count": 0,
                    "total_results": 0,
                    "min_execution_time_ms": float("inf"),
                    "max_execution_time_ms": 0,
                    "slow_queries": 0,
                    "last_updated": timestamp,
                }

            metrics = self.metrics[metric_key]
            metrics["total_queries"] += 1
            metrics["total_execution_time_ms"] += execution_time_ms
            metrics["total_results"] += result_count
            metrics["last_updated"] = timestamp

            if success:
                metrics["success_count"] += 1
            else:
                metrics["error_count"] += 1
                logger.error(
                    "Database query failed", query_name=query_name, error=error
                )

            # Track execution time statistics
            metrics["min_execution_time_ms"] = min(
                metrics["min_execution_time_ms"], execution_time_ms
            )
            metrics["max_execution_time_ms"] = max(
                metrics["max_execution_time_ms"], execution_time_ms
            )

            # Check for slow queries
            if execution_time_ms > self.thresholds["database_query_time_ms"]["warning"]:
                metrics["slow_queries"] += 1

                if (
                    execution_time_ms
                    > self.thresholds["database_query_time_ms"]["critical"]
                ):
                    self._trigger_alert(
                        "slow_database_query",
                        f"Database query {query_name} took {execution_time_ms:.1f}ms (critical threshold: {self.thresholds['database_query_time_ms']['critical']}ms)",
                        {
                            "query_name": query_name,
                            "execution_time_ms": execution_time_ms,
                            "result_count": result_count,
                        },
                    )

            # Add to time series
            self.time_series_metrics[f"{metric_key}_execution_time"].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "value": execution_time_ms,
                    "result_count": result_count,
                    "success": success,
                }
            )

    def record_cache_operation(
        self,
        operation: str,  # "hit", "miss", "set", "evict"
        cache_name: str,
        key: str | None = None,
        execution_time_ms: float | None = None,
    ):
        """Record cache performance metrics"""
        with self.lock:
            timestamp = datetime.now(UTC)
            metric_key = f"cache_{cache_name}"

            if metric_key not in self.metrics:
                self.metrics[metric_key] = {
                    "hits": 0,
                    "misses": 0,
                    "sets": 0,
                    "evictions": 0,
                    "total_operations": 0,
                    "last_updated": timestamp,
                }

            metrics = self.metrics[metric_key]
            metrics[f"{operation}s"] = metrics.get(f"{operation}s", 0) + 1
            metrics["total_operations"] += 1
            metrics["last_updated"] = timestamp

            # Calculate hit rate and check thresholds
            if metrics["hits"] + metrics["misses"] > 0:
                hit_rate = (
                    metrics["hits"] / (metrics["hits"] + metrics["misses"])
                ) * 100

                if hit_rate < self.thresholds["cache_hit_rate_percent"]["critical"]:
                    self._trigger_alert(
                        "low_cache_hit_rate",
                        f"Cache {cache_name} hit rate is {hit_rate:.1f}% (critical threshold: {self.thresholds['cache_hit_rate_percent']['critical']}%)",
                        {
                            "cache_name": cache_name,
                            "hit_rate": hit_rate,
                            "total_operations": metrics["total_operations"],
                        },
                    )

            # Add to time series
            self.time_series_metrics[f"{metric_key}_operations"].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "operation": operation,
                    "execution_time_ms": execution_time_ms,
                }
            )

    def record_business_metric(
        self,
        metric_name: str,
        value: float,
        store_id: str | None = None,
        category: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """Record business metrics (store health, batch processing, etc.)"""
        with self.lock:
            timestamp = datetime.now(UTC)
            metric_key = f"business_{metric_name}"

            if store_id:
                metric_key += f"_store_{store_id}"
            if category:
                metric_key += f"_cat_{category}"

            # Add to time series for trending
            self.time_series_metrics[metric_key].append(
                {
                    "timestamp": timestamp.isoformat(),
                    "value": value,
                    "store_id": store_id,
                    "category": category,
                    "metadata": metadata or {},
                }
            )

            logger.info(
                "Business metric recorded",
                metric_name=metric_name,
                value=value,
                store_id=store_id,
                category=category,
                metadata=metadata,
            )

    def _start_system_monitoring(self):
        """Start background system resource monitoring"""

        def monitor_system():
            while True:
                try:
                    # Get system metrics
                    cpu_percent = psutil.cpu_percent(interval=1)
                    memory = psutil.virtual_memory()
                    disk = psutil.disk_usage("/")

                    timestamp = datetime.now(UTC)

                    # Record system metrics
                    system_metrics = {
                        "cpu_usage_percent": cpu_percent,
                        "memory_usage_percent": memory.percent,
                        "memory_available_mb": memory.available / (1024 * 1024),
                        "disk_usage_percent": disk.percent,
                        "disk_free_gb": disk.free / (1024 * 1024 * 1024),
                    }

                    with self.lock:
                        self.metrics["system_resources"] = system_metrics
                        self.metrics["system_resources"]["last_updated"] = timestamp.isoformat()

                        # Add to time series
                        for metric_name, value in system_metrics.items():
                            if isinstance(value, int | float):
                                self.time_series_metrics[
                                    f"system_{metric_name}"
                                ].append(
                                    {"timestamp": timestamp.isoformat(), "value": value}
                                )

                    # Check memory usage thresholds
                    if (
                        memory.percent
                        > self.thresholds["memory_usage_percent"]["critical"]
                    ):
                        self._trigger_alert(
                            "high_memory_usage",
                            f"Memory usage is {memory.percent:.1f}% (critical threshold: {self.thresholds['memory_usage_percent']['critical']}%)",
                            {
                                "memory_percent": memory.percent,
                                "available_mb": memory.available / (1024 * 1024),
                            },
                        )

                    time.sleep(30)  # Monitor every 30 seconds

                except Exception as e:
                    logger.error("System monitoring error", error=str(e))
                    time.sleep(60)  # Wait longer on error

        # Start monitoring in background thread
        monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        monitor_thread.start()

    def _trigger_alert(self, alert_type: str, message: str, context: dict[str, Any]):
        """Trigger an alert with context"""
        alert = {
            "type": alert_type,
            "message": message,
            "context": context,
            "timestamp": datetime.now(UTC).isoformat(),
            "severity": self._get_alert_severity(alert_type),
        }

        with self.lock:
            self.alerts_triggered[alert_type].append(alert)

            # Keep only last 100 alerts per type
            if len(self.alerts_triggered[alert_type]) > 100:
                self.alerts_triggered[alert_type] = self.alerts_triggered[alert_type][
                    -100:
                ]

        logger.warning(
            "Performance alert triggered",
            alert_type=alert_type,
            message=message,
            context=context,
            severity=alert["severity"],
        )

    def _get_alert_severity(self, alert_type: str) -> str:
        """Get alert severity based on type"""
        critical_alerts = [
            "mobile_performance_degradation",
            "slow_database_query",
            "high_memory_usage",
            "low_cache_hit_rate",
        ]

        return "critical" if alert_type in critical_alerts else "warning"

    def get_metrics_summary(self) -> dict[str, Any]:
        """Get comprehensive metrics summary"""
        with self.lock:
            summary = {
                "collection_timestamp": datetime.now(UTC).isoformat(),
                "api_metrics": {},
                "database_metrics": {},
                "cache_metrics": {},
                "system_metrics": self.metrics.get("system_resources", {}),
                "alerts_summary": self._get_alerts_summary(),
                "performance_health": self._calculate_performance_health(),
            }

            # Process API metrics
            for key, metrics in self.metrics.items():
                if key.startswith("api_"):
                    endpoint_name = key.replace("api_", "").replace("_", "/")
                    if metrics["total_requests"] > 0:
                        summary["api_metrics"][endpoint_name] = {
                            "total_requests": metrics["total_requests"],
                            "avg_response_time_ms": metrics["total_response_time_ms"]
                            / metrics["total_requests"],
                            "success_rate": metrics["success_count"]
                            / metrics["total_requests"],
                            "error_rate": metrics["error_count"]
                            / metrics["total_requests"],
                            "min_response_time_ms": metrics["min_response_time_ms"]
                            if metrics["min_response_time_ms"] != float("inf")
                            else 0,
                            "max_response_time_ms": metrics["max_response_time_ms"],
                            "mobile_target_violations": metrics.get(
                                "mobile_target_violations", 0
                            ),
                            "last_updated": metrics["last_updated"].isoformat(),
                        }

                elif key.startswith("db_query_"):
                    query_name = key.replace("db_query_", "")
                    if metrics["total_queries"] > 0:
                        summary["database_metrics"][query_name] = {
                            "total_queries": metrics["total_queries"],
                            "avg_execution_time_ms": metrics["total_execution_time_ms"]
                            / metrics["total_queries"],
                            "success_rate": metrics["success_count"]
                            / metrics["total_queries"],
                            "avg_result_count": metrics["total_results"]
                            / metrics["total_queries"],
                            "slow_query_rate": metrics["slow_queries"]
                            / metrics["total_queries"],
                            "min_execution_time_ms": metrics["min_execution_time_ms"]
                            if metrics["min_execution_time_ms"] != float("inf")
                            else 0,
                            "max_execution_time_ms": metrics["max_execution_time_ms"],
                            "last_updated": metrics["last_updated"].isoformat(),
                        }

                elif key.startswith("cache_"):
                    cache_name = key.replace("cache_", "")
                    if metrics["total_operations"] > 0:
                        hit_rate = (
                            (metrics["hits"] / (metrics["hits"] + metrics["misses"]))
                            * 100
                            if (metrics["hits"] + metrics["misses"]) > 0
                            else 0
                        )
                        summary["cache_metrics"][cache_name] = {
                            "total_operations": metrics["total_operations"],
                            "hit_rate_percent": hit_rate,
                            "hits": metrics["hits"],
                            "misses": metrics["misses"],
                            "sets": metrics["sets"],
                            "evictions": metrics["evictions"],
                            "last_updated": metrics["last_updated"].isoformat(),
                        }

            return summary

    def _get_alerts_summary(self) -> dict[str, Any]:
        """Get summary of recent alerts"""
        recent_alerts = []
        alert_counts: dict[str, int] = defaultdict(int)

        cutoff_time = datetime.now(UTC) - timedelta(hours=24)

        for alert_type, alerts in self.alerts_triggered.items():
            for alert in alerts:
                alert_time = datetime.fromisoformat(alert["timestamp"])
                if alert_time > cutoff_time:
                    recent_alerts.append(alert)
                    alert_counts[alert_type] += 1

        return {
            "recent_alerts_24h": len(recent_alerts),
            "alert_counts_by_type": dict(alert_counts),
            "latest_alerts": sorted(
                recent_alerts, key=lambda x: x["timestamp"], reverse=True
            )[:10],
        }

    def _calculate_performance_health(self) -> dict[str, Any]:
        """Calculate overall performance health score"""
        health_scores = []
        issues = []

        # Check API performance health
        mobile_violations = 0
        total_mobile_requests = 0

        for key, metrics in self.metrics.items():
            if key.startswith("api_") and "mobile" in key:
                mobile_violations += metrics.get("mobile_target_violations", 0)
                total_mobile_requests += metrics.get("total_requests", 0)

        if total_mobile_requests > 0:
            mobile_violation_rate = mobile_violations / total_mobile_requests
            mobile_health = max(
                0, 1 - mobile_violation_rate * 2
            )  # Penalty for violations
            health_scores.append(mobile_health)

            if mobile_violation_rate > 0.1:  # >10% violations
                issues.append(
                    f"Mobile performance violations: {mobile_violation_rate:.1%} of requests"
                )

        # Check system resource health
        system_metrics = self.metrics.get("system_resources", {})
        if "memory_usage_percent" in system_metrics:
            memory_health = max(0, 1 - (system_metrics["memory_usage_percent"] / 100))
            health_scores.append(memory_health)

            if system_metrics["memory_usage_percent"] > 80:
                issues.append(
                    f"High memory usage: {system_metrics['memory_usage_percent']:.1f}%"
                )

        # Check cache performance health
        cache_health_scores = []
        for key, metrics in self.metrics.items():
            if key.startswith("cache_") and metrics["total_operations"] > 0:
                hit_rate = (
                    (metrics["hits"] / (metrics["hits"] + metrics["misses"])) * 100
                    if (metrics["hits"] + metrics["misses"]) > 0
                    else 0
                )
                cache_health = hit_rate / 100  # Convert to 0-1 scale
                cache_health_scores.append(cache_health)

                if hit_rate < 60:
                    issues.append(f"Low cache hit rate: {hit_rate:.1f}%")

        if cache_health_scores:
            health_scores.append(sum(cache_health_scores) / len(cache_health_scores))

        # Calculate overall health
        overall_health = (
            sum(health_scores) / len(health_scores) if health_scores else 1.0
        )

        health_status = (
            "excellent"
            if overall_health >= 0.9
            else (
                "good"
                if overall_health >= 0.7
                else ("fair" if overall_health >= 0.5 else "poor")
            )
        )

        return {
            "overall_health_score": round(overall_health, 3),
            "health_status": health_status,
            "component_scores": {
                "mobile_performance": health_scores[0]
                if len(health_scores) > 0
                else 1.0,
                "system_resources": health_scores[1] if len(health_scores) > 1 else 1.0,
                "cache_performance": health_scores[2]
                if len(health_scores) > 2
                else 1.0,
            },
            "issues": issues,
            "recommendations": self._get_health_recommendations(issues),
        }

    def _get_health_recommendations(self, issues: list[str]) -> list[str]:
        """Get health improvement recommendations"""
        recommendations = []

        for issue in issues:
            if "mobile performance" in issue.lower():
                recommendations.append(
                    "Optimize mobile queries or increase server resources"
                )
            elif "memory usage" in issue.lower():
                recommendations.append(
                    "Check for memory leaks or increase available memory"
                )
            elif "cache hit rate" in issue.lower():
                recommendations.append("Review cache strategy or increase cache size")

        if not recommendations:
            recommendations.append("System performance is optimal")

        return recommendations

    def get_time_series_data(
        self, metric_name: str, hours: int = 24
    ) -> list[dict[str, Any]]:
        """Get time series data for a specific metric"""
        with self.lock:
            if metric_name not in self.time_series_metrics:
                return []

            cutoff_time = datetime.now(UTC) - timedelta(hours=hours)

            filtered_data = []
            for data_point in self.time_series_metrics[metric_name]:
                point_time = datetime.fromisoformat(data_point["timestamp"])
                if point_time > cutoff_time:
                    filtered_data.append(data_point)

            return filtered_data


# Global metrics collector instance
metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance"""
    return metrics_collector
