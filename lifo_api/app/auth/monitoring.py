"""
Authentication monitoring and metrics for enhanced security
Tracks login attempts, performance, and security events
"""

from datetime import datetime
from enum import Enum

import structlog

logger = structlog.get_logger()


class AuthEventType(Enum):
    """Types of authentication events to track"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    TOKEN_VALIDATION = "token_validation"
    RATE_LIMIT_HIT = "rate_limit_hit"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


def record_login_success(
    user_id: str,
    ip_address: str | None = None,
    response_time_ms: float | None = None,
    metadata: dict | None = None
):
    """
    Record successful authentication event

    Args:
        user_id: Authenticated user ID
        ip_address: Client IP address
        response_time_ms: Authentication response time
        metadata: Additional event metadata
    """
    logger.info(
        "Authentication success recorded",
        event_type=AuthEventType.LOGIN_SUCCESS.value,
        user_id=user_id,
        ip_address=ip_address,
        response_time_ms=response_time_ms,
        timestamp=datetime.utcnow().isoformat(),
        metadata=metadata or {}
    )


def record_login_failure(
    ip_address: str | None = None,
    error_code: str | None = None,
    user_agent: str | None = None,
    metadata: dict | None = None
):
    """
    Record failed authentication event

    Args:
        ip_address: Client IP address
        error_code: Authentication error code
        user_agent: Client user agent
        metadata: Additional event metadata
    """
    logger.warning(
        "Authentication failure recorded",
        event_type=AuthEventType.LOGIN_FAILURE.value,
        ip_address=ip_address,
        error_code=error_code,
        user_agent=user_agent,
        timestamp=datetime.utcnow().isoformat(),
        metadata=metadata or {}
    )


def record_rate_limit_hit(
    identifier: str,
    endpoint: str,
    limit: str,
    ip_address: str | None = None
):
    """
    Record rate limit violation

    Args:
        identifier: Rate limit identifier (user_id or IP)
        endpoint: API endpoint that was rate limited
        limit: Rate limit configuration that was hit
        ip_address: Client IP address
    """
    logger.warning(
        "Rate limit exceeded",
        event_type=AuthEventType.RATE_LIMIT_HIT.value,
        identifier=identifier,
        endpoint=endpoint,
        limit=limit,
        ip_address=ip_address,
        timestamp=datetime.utcnow().isoformat()
    )


def record_suspicious_activity(
    activity_type: str,
    details: dict,
    user_id: str | None = None,
    ip_address: str | None = None
):
    """
    Record suspicious authentication activity

    Args:
        activity_type: Type of suspicious activity
        details: Activity details
        user_id: User ID if known
        ip_address: Client IP address
    """
    logger.error(
        "Suspicious authentication activity detected",
        event_type=AuthEventType.SUSPICIOUS_ACTIVITY.value,
        activity_type=activity_type,
        details=details,
        user_id=user_id,
        ip_address=ip_address,
        timestamp=datetime.utcnow().isoformat()
    )


# Global performance monitor instance
_performance_monitor = None

def get_auth_health():
    """Get authentication system health status"""
    global _performance_monitor
    if not _performance_monitor:
        _performance_monitor = AuthPerformanceMonitor()
    
    return {
        "status": "healthy",
        "metrics": _performance_monitor.get_metrics(),
        "timestamp": datetime.utcnow().isoformat()
    }

def get_auth_monitor():
    """Get authentication monitor instance"""
    global _performance_monitor
    if not _performance_monitor:
        _performance_monitor = AuthPerformanceMonitor()
    return _performance_monitor

class AuthPerformanceMonitor:
    """Monitor authentication performance metrics"""

    def __init__(self):
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time": 0.0,
            "slow_requests": 0  # >500ms
        }

    def record_request(self, success: bool, response_time_ms: float):
        """Record authentication request metrics"""
        self.metrics["total_requests"] += 1

        if success:
            self.metrics["successful_requests"] += 1
        else:
            self.metrics["failed_requests"] += 1

        # Update average response time
        total_time = self.metrics["avg_response_time"] * (self.metrics["total_requests"] - 1)
        self.metrics["avg_response_time"] = (total_time + response_time_ms) / self.metrics["total_requests"]

        if response_time_ms > 500:
            self.metrics["slow_requests"] += 1

    def get_stats(self) -> dict:
        """Get current authentication performance stats"""
        success_rate = 0.0
        if self.metrics["total_requests"] > 0:
            success_rate = (self.metrics["successful_requests"] / self.metrics["total_requests"]) * 100

        return {
            **self.metrics,
            "success_rate_percent": round(success_rate, 2),
            "slow_request_rate_percent": round(
                (self.metrics["slow_requests"] / max(self.metrics["total_requests"], 1)) * 100, 2
            )
        }
    
    def get_metrics(self) -> dict:
        """Alias for get_stats() for compatibility"""
        return self.get_stats()


# Global performance monitor instance
auth_performance_monitor = AuthPerformanceMonitor()

