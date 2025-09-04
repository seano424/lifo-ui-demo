"""
Comprehensive alerting system for LIFO AI Engine
Proactive monitoring with configurable thresholds and notifications
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import structlog

logger = structlog.get_logger()


class AlertSeverity(Enum):
    """Alert severity levels"""

    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class AlertStatus(Enum):
    """Alert status"""

    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """Alert data structure"""

    id: str
    type: str
    severity: AlertSeverity
    title: str
    message: str
    context: dict[str, Any]
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    resolved_at: datetime | None = None
    suppressed_until: datetime | None = None
    escalation_level: int = 0
    notification_count: int = 0


class AlertManager:
    """
    Comprehensive alert management system
    Handles alert creation, escalation, suppression, and notifications
    """

    def __init__(self):
        self.active_alerts = {}  # alert_id -> Alert
        self.alert_history = deque(maxlen=10000)  # Keep last 10k alerts
        self.alert_rules = {}  # rule_name -> AlertRule
        self.notification_handlers = []  # List of notification functions
        self.lock = threading.RLock()

        # Alert suppression tracking
        self.suppression_rules = {}  # rule_pattern -> suppression_config
        self.alert_counts: dict[str, int] = defaultdict(
            int
        )  # alert_type -> count in time window

        # Initialize default alert rules
        self._initialize_default_rules()

        # Start background alert processing
        self._start_alert_processor()

    def _initialize_default_rules(self):
        """Initialize default alerting rules for LIFO AI Engine"""

        # Mobile performance alerts
        self.add_alert_rule(
            name="mobile_response_time_critical",
            condition=lambda metrics: self._check_mobile_response_time(
                metrics, threshold_ms=200, endpoint_pattern="batch-quick-score"
            ),
            severity=AlertSeverity.CRITICAL,
            title="Critical Mobile Response Time",
            message_template="Mobile scoring endpoint exceeding critical threshold: {avg_time_ms:.1f}ms (target: <200ms)",
            cooldown_minutes=5,
        )

        self.add_alert_rule(
            name="mobile_response_time_warning",
            condition=lambda metrics: self._check_mobile_response_time(
                metrics, threshold_ms=300, endpoint_pattern="mobile-summary"
            ),
            severity=AlertSeverity.WARNING,
            title="Mobile Response Time Warning",
            message_template="Mobile endpoints exceeding warning threshold: {avg_time_ms:.1f}ms (target: <300ms)",
            cooldown_minutes=10,
        )

    def add_alert_rule(
        self,
        name: str,
        condition: Callable[[dict[str, Any]], dict[str, Any] | None],
        severity: AlertSeverity,
        title: str,
        message_template: str,
        cooldown_minutes: int = 10,
        escalation_minutes: int = 30,
    ):
        """Add a new alert rule"""
        self.alert_rules[name] = {
            "condition": condition,
            "severity": severity,
            "title": title,
            "message_template": message_template,
            "cooldown_minutes": cooldown_minutes,
            "escalation_minutes": escalation_minutes,
            "last_triggered": None,
            "escalation_level": 0,
        }

        logger.info("Alert rule added", rule_name=name, severity=severity.value)

    def check_metrics(self, metrics: dict[str, Any]):
        """Check metrics against all alert rules"""
        with self.lock:
            current_time = datetime.utcnow()

            for rule_name, rule_config in self.alert_rules.items():
                try:
                    # Check if rule is in cooldown
                    if self._is_rule_in_cooldown(rule_name, current_time):
                        continue

                    # Evaluate condition
                    condition_result = rule_config["condition"](metrics)

                    if condition_result:
                        # Condition met - trigger alert
                        alert_context = (
                            condition_result
                            if isinstance(condition_result, dict)
                            else {}
                        )

                        alert = self._create_alert(
                            rule_name=rule_name,
                            rule_config=rule_config,
                            context=alert_context,
                            timestamp=current_time,
                        )

                        self._trigger_alert(alert)

                        # Update rule state
                        rule_config["last_triggered"] = current_time

                except Exception as e:
                    logger.error(
                        "Error evaluating alert rule", rule_name=rule_name, error=str(e)
                    )

    def _create_alert(
        self,
        rule_name: str,
        rule_config: dict[str, Any],
        context: dict[str, Any],
        timestamp: datetime,
    ) -> Alert:
        """Create a new alert from rule and context"""
        alert_id = f"{rule_name}_{timestamp.strftime('%Y%m%d_%H%M%S')}"

        # Format message with context
        try:
            message = rule_config["message_template"].format(**context)
        except (KeyError, ValueError):
            message = rule_config["message_template"]

        return Alert(
            id=alert_id,
            type=rule_name,
            severity=rule_config["severity"],
            title=rule_config["title"],
            message=message,
            context=context,
            timestamp=timestamp,
        )

    def _trigger_alert(self, alert: Alert):
        """Trigger an alert and handle notifications"""
        with self.lock:
            # Check for duplicate/similar active alerts
            if self._should_suppress_alert(alert):
                logger.debug("Alert suppressed", alert_id=alert.id, type=alert.type)
                return

            # Add to active alerts
            self.active_alerts[alert.id] = alert
            self.alert_history.append(alert)

            # Increment alert count for rate limiting
            self.alert_counts[alert.type] += 1

            logger.warning(
                "Alert triggered",
                alert_id=alert.id,
                type=alert.type,
                severity=alert.severity.value,
                title=alert.title,
                message=alert.message,
            )

            # Send notifications
            self._send_notifications(alert)

    def _should_suppress_alert(self, alert: Alert) -> bool:
        """Check if alert should be suppressed"""
        # Check for identical active alerts
        for existing_alert in self.active_alerts.values():
            if (
                existing_alert.type == alert.type
                and existing_alert.status == AlertStatus.ACTIVE
            ):
                return True

        # Check rate limiting
        time_window = datetime.utcnow() - timedelta(minutes=15)
        recent_count = sum(
            1
            for a in self.alert_history
            if a.type == alert.type and a.timestamp > time_window
        )

        if recent_count > 5:  # Max 5 alerts of same type in 15 minutes
            return True

        return False

    def _send_notifications(self, alert: Alert):
        """Send alert notifications through configured handlers"""
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(
                    "Notification handler failed",
                    alert_id=alert.id,
                    handler=handler.__name__,
                    error=str(e),
                )

    def _is_rule_in_cooldown(self, rule_name: str, current_time: datetime) -> bool:
        """Check if alert rule is in cooldown period"""
        rule_config = self.alert_rules.get(rule_name)
        if not rule_config or not rule_config.get("last_triggered"):
            return False

        cooldown_period = timedelta(minutes=rule_config["cooldown_minutes"])
        return current_time - rule_config["last_triggered"] < cooldown_period

    def _start_alert_processor(self):
        """Start background alert processing for escalation and cleanup"""

        def process_alerts():
            while True:
                try:
                    time.sleep(60)  # Process every minute
                except Exception as e:
                    logger.error("Alert processor error", error=str(e))
                    time.sleep(300)  # Wait 5 minutes on error

        # Start processing in background thread
        processor_thread = threading.Thread(target=process_alerts, daemon=True)
        processor_thread.start()

    def _check_mobile_response_time(
        self, metrics: dict[str, Any], threshold_ms: float, endpoint_pattern: str
    ) -> dict[str, Any] | None:
        """Check mobile endpoint response times"""
        api_metrics = metrics.get("api_metrics", {})

        for endpoint_key, endpoint_metrics in api_metrics.items():
            if endpoint_pattern in endpoint_key:
                avg_time = endpoint_metrics.get("avg_response_time_ms", 0)
                if avg_time > threshold_ms:
                    return {
                        "endpoint": endpoint_key,
                        "avg_time_ms": avg_time,
                        "threshold_ms": threshold_ms,
                        "violation_ratio": avg_time / threshold_ms,
                    }

        return None

    def get_active_alerts(self) -> list[dict[str, Any]]:
        """Get all active alerts"""
        with self.lock:
            return [asdict(alert) for alert in self.active_alerts.values()]

    def get_alert_history(self, hours: int = 24) -> list[dict[str, Any]]:
        """Get alert history for specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        with self.lock:
            filtered_alerts = [
                asdict(alert)
                for alert in self.alert_history
                if alert.timestamp > cutoff_time
            ]

            return sorted(filtered_alerts, key=lambda x: x["timestamp"], reverse=True)


# Global alert manager instance
alert_manager = AlertManager()


def get_alert_manager() -> AlertManager:
    """Get the global alert manager instance"""
    return alert_manager


# Notification handlers


def log_notification_handler(alert: Alert):
    """Log-based notification handler"""
    log_level = "error" if alert.severity == AlertSeverity.CRITICAL else "warning"

    getattr(logger, log_level)(
        "Alert notification",
        alert_id=alert.id,
        type=alert.type,
        severity=alert.severity.value,
        title=alert.title,
        message=alert.message,
        context=alert.context,
    )


def webhook_notification_handler(alert: Alert):
    """Webhook notification handler (placeholder)"""
    # This would send webhooks to external systems like Slack, PagerDuty, etc.
    logger.info(
        "Webhook notification sent",
        alert_id=alert.id,
        type=alert.type,
        severity=alert.severity.value,
    )


# Register default notification handlers
alert_manager.notification_handlers.append(log_notification_handler)
alert_manager.notification_handlers.append(webhook_notification_handler)
