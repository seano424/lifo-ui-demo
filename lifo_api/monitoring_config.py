"""
Performance Monitoring Configuration
Simple threshold-based alerting for persistence performance
"""

from dataclasses import dataclass
from typing import Callable


@dataclass
class PerformanceThreshold:
    """Performance threshold configuration"""
    metric_name: str
    warning_threshold: float
    critical_threshold: float
    unit: str = "ms"


# Persistence Performance Thresholds
PERSISTENCE_THRESHOLDS = {
    "scoring_copy": PerformanceThreshold(
        metric_name="scoring_persistence_copy",
        warning_threshold=3000,   # 3s warning
        critical_threshold=10000,  # 10s critical
        unit="ms"
    ),
    "scoring_rest": PerformanceThreshold(
        metric_name="scoring_persistence_rest",
        warning_threshold=40000,   # 40s warning (optimized)
        critical_threshold=60000,  # 60s critical
        unit="ms"
    ),
    "batch_creation": PerformanceThreshold(
        metric_name="batch_creation",
        warning_threshold=5000,    # 5s warning for 100 items
        critical_threshold=10000,  # 10s critical
        unit="ms"
    ),
}


def check_performance(metric_name: str, value: float) -> str:
    """
    Check performance against thresholds

    Returns: "ok", "warning", or "critical"
    """
    threshold = PERSISTENCE_THRESHOLDS.get(metric_name)
    if not threshold:
        return "ok"

    if value >= threshold.critical_threshold:
        return "critical"
    elif value >= threshold.warning_threshold:
        return "warning"
    return "ok"


def log_performance_alert(metric_name: str, value: float, logger):
    """Log performance alert if thresholds exceeded"""
    status = check_performance(metric_name, value)
    threshold = PERSISTENCE_THRESHOLDS.get(metric_name)

    if status == "critical":
        logger.error(
            "Performance threshold CRITICAL",
            metric=metric_name,
            value=value,
            threshold=threshold.critical_threshold,
            unit=threshold.unit
        )
    elif status == "warning":
        logger.warning(
            "Performance threshold WARNING",
            metric=metric_name,
            value=value,
            threshold=threshold.warning_threshold,
            unit=threshold.unit
        )
