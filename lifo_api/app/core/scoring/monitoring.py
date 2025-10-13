"""
Performance Monitoring Module

Handles performance tracking and metrics collection for scoring operations.
Extracted from the original monolithic scoring.py for better modularity.
"""

from datetime import datetime

import structlog

logger = structlog.get_logger()


class PerformanceMonitor:
    """
    Service responsible for performance monitoring and health tracking
    Handles metrics collection and performance analysis
    """

    def __init__(self):
        self.logger = structlog.get_logger().bind(component="performance_monitor")
        self.start_time = None

    def start_operation(self, operation_name: str, **context):
        """Start monitoring an operation"""
        self.start_time = datetime.utcnow()
        self.operation_name = operation_name
        self.logger.info(f"Starting {operation_name}", **context)

    def log_milestone(self, milestone: str, **context):
        """Log a milestone during the operation"""
        if self.start_time:
            elapsed_ms = int(
                (datetime.utcnow() - self.start_time).total_seconds() * 1000
            )
            self.logger.info(
                f"Milestone: {milestone}", elapsed_ms=elapsed_ms, **context
            )

    def complete_operation(self, **context) -> int:
        """Complete monitoring and return total processing time"""
        if not self.start_time:
            return 0

        processing_time_ms = int(
            (datetime.utcnow() - self.start_time).total_seconds() * 1000
        )

        self.logger.info(
            f"Completed {getattr(self, 'operation_name', 'operation')}",
            processing_time_ms=processing_time_ms,
            **context,
        )

        return processing_time_ms

    def track_performance_metrics(
        self, endpoint: str, processing_time_ms: int, status_code: int = 200
    ):
        """Track performance metrics using the monitoring system"""
        try:
            from app.monitoring.metrics import metrics_collector

            metrics_collector.record_api_request(
                endpoint=endpoint,
                method="POST",
                status_code=status_code,
                response_time_ms=processing_time_ms,
            )
        except Exception as e:
            self.logger.warning("Failed to track performance metrics", error=str(e))
