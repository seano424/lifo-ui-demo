"""
Real-time alerting system for LIFO AI Engine
Supports multiple notification channels with intelligent throttling
"""

import asyncio
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, UTC
from typing import Any
from enum import Enum
from dataclasses import dataclass

import httpx
import structlog
from app.core.config import settings

logger = structlog.get_logger()


class AlertSeverity(Enum):
    """Alert severity levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertChannel(Enum):
    """Available alert channels"""

    SLACK = "slack"
    EMAIL = "email"
    WEBHOOK = "webhook"
    SMS = "sms"
    PAGERDUTY = "pagerduty"


@dataclass
class Alert:
    """Alert data structure"""

    id: str
    severity: AlertSeverity
    title: str
    message: str
    source: str
    category: str
    timestamp: datetime
    metadata: dict[str, Any]
    tags: set[str]
    tenant_id: str | None = None
    store_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert alert to dictionary"""
        return {
            "id": self.id,
            "severity": self.severity.value,
            "title": self.title,
            "message": self.message,
            "source": self.source,
            "category": self.category,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
            "tags": list(self.tags),
            "tenant_id": self.tenant_id,
            "store_id": self.store_id,
        }


class AlertThrottling:
    """Intelligent alert throttling to prevent spam"""

    def __init__(self):
        self.alert_counts = defaultdict(lambda: deque(maxlen=100))
        self.last_sent = defaultdict(float)

    def should_send_alert(self, alert_key: str, severity: AlertSeverity) -> bool:
        """Determine if alert should be sent based on throttling rules"""
        current_time = time.time()

        # Get throttling rules based on severity
        if severity == AlertSeverity.CRITICAL:
            min_interval = 60  # 1 minute for critical alerts
            max_per_hour = 20
        elif severity == AlertSeverity.HIGH:
            min_interval = 300  # 5 minutes for high alerts
            max_per_hour = 10
        elif severity == AlertSeverity.MEDIUM:
            min_interval = 900  # 15 minutes for medium alerts
            max_per_hour = 5
        else:  # LOW
            min_interval = 1800  # 30 minutes for low alerts
            max_per_hour = 3

        # Check minimum interval
        if current_time - self.last_sent[alert_key] < min_interval:
            return False

        # Check hourly limit
        hour_ago = current_time - 3600
        recent_alerts = [t for t in self.alert_counts[alert_key] if t > hour_ago]

        if len(recent_alerts) >= max_per_hour:
            return False

        # Record this alert attempt
        self.alert_counts[alert_key].append(current_time)
        self.last_sent[alert_key] = current_time

        return True


class AlertManager:
    """
    Comprehensive alert management system
    Handles multiple channels with intelligent routing and throttling
    """

    def __init__(self):
        self.channels: dict[AlertChannel, Any] = {}
        self.throttling = AlertThrottling()
        self.alert_history = deque(maxlen=1000)
        self.channel_configs = self._load_channel_configs()
        self.alert_rules = self._load_alert_rules()

        # Setup channels
        self._setup_channels()

    def _load_channel_configs(self) -> dict[str, Any]:
        """Load channel configurations from settings"""
        return {
            "slack": {
                "webhook_url": getattr(settings, "slack_webhook_url", None),
                "channel": getattr(settings, "slack_channel", "#alerts"),
                "username": getattr(settings, "slack_username", "LIFO Alert Bot"),
                "enabled": getattr(settings, "slack_alerts_enabled", False),
            },
            "email": {
                "smtp_server": getattr(settings, "smtp_server", "localhost"),
                "smtp_port": getattr(settings, "smtp_port", 587),
                "smtp_username": getattr(settings, "smtp_username", None),
                "smtp_password": getattr(settings, "smtp_password", None),
                "from_email": getattr(settings, "alert_from_email", "alerts@lifo.ai"),
                "to_emails": getattr(settings, "alert_to_emails", []),
                "enabled": getattr(settings, "email_alerts_enabled", False),
            },
            "webhook": {
                "url": getattr(settings, "webhook_alert_url", None),
                "headers": getattr(settings, "webhook_alert_headers", {}),
                "enabled": getattr(settings, "webhook_alerts_enabled", False),
            },
            "pagerduty": {
                "integration_key": getattr(settings, "pagerduty_integration_key", None),
                "enabled": getattr(settings, "pagerduty_alerts_enabled", False),
            },
        }

    def _load_alert_rules(self) -> dict[str, dict[str, Any]]:
        """Load alert routing rules"""
        return {
            "performance_degradation": {
                "channels": [AlertChannel.SLACK, AlertChannel.EMAIL],
                "severity_threshold": AlertSeverity.MEDIUM,
                "categories": ["api", "database", "mobile"],
            },
            "security_incident": {
                "channels": [
                    AlertChannel.SLACK,
                    AlertChannel.EMAIL,
                    AlertChannel.PAGERDUTY,
                ],
                "severity_threshold": AlertSeverity.HIGH,
                "categories": ["auth", "security", "access"],
            },
            "system_health": {
                "channels": [AlertChannel.SLACK],
                "severity_threshold": AlertSeverity.HIGH,
                "categories": ["system", "memory", "disk", "cpu"],
            },
            "business_critical": {
                "channels": [
                    AlertChannel.SLACK,
                    AlertChannel.EMAIL,
                    AlertChannel.PAGERDUTY,
                ],
                "severity_threshold": AlertSeverity.CRITICAL,
                "categories": ["scoring", "inventory", "data_loss"],
            },
        }

    def _setup_channels(self) -> None:
        """Initialize alert channels"""

        # Slack channel
        if self.channel_configs["slack"]["enabled"]:
            self.channels[AlertChannel.SLACK] = SlackChannel(
                self.channel_configs["slack"]
            )

        # Email channel
        if self.channel_configs["email"]["enabled"]:
            self.channels[AlertChannel.EMAIL] = EmailChannel(
                self.channel_configs["email"]
            )

        # Webhook channel
        if self.channel_configs["webhook"]["enabled"]:
            self.channels[AlertChannel.WEBHOOK] = WebhookChannel(
                self.channel_configs["webhook"]
            )

        # PagerDuty channel
        if self.channel_configs["pagerduty"]["enabled"]:
            self.channels[AlertChannel.PAGERDUTY] = PagerDutyChannel(
                self.channel_configs["pagerduty"]
            )

        logger.info(
            "Alert channels initialized",
            enabled_channels=[channel.value for channel in self.channels.keys()],
        )

    async def send_alert(
        self,
        severity: AlertSeverity,
        title: str,
        message: str,
        source: str,
        category: str,
        metadata: dict[str, Any] | None = None,
        tags: set[str] | None = None,
        tenant_id: str | None = None,
        store_id: str | None = None,
        force: bool = False,
    ) -> str:
        """Send alert through appropriate channels"""

        # Create alert object
        alert = Alert(
            id=f"{int(time.time())}-{hash(title)}",
            severity=severity,
            title=title,
            message=message,
            source=source,
            category=category,
            timestamp=datetime.now(UTC),
            metadata=metadata or {},
            tags=tags or set(),
            tenant_id=tenant_id,
            store_id=store_id,
        )

        # Add to history
        self.alert_history.append(alert)

        # Determine alert key for throttling
        alert_key = f"{category}:{title}"
        if tenant_id:
            alert_key += f":{tenant_id}"
        if store_id:
            alert_key += f":{store_id}"

        # Check throttling (unless forced)
        if not force and not self.throttling.should_send_alert(alert_key, severity):
            logger.debug(
                "Alert throttled",
                alert_id=alert.id,
                alert_key=alert_key,
                severity=severity.value,
            )
            return alert.id

        # Determine channels to use
        channels_to_use = self._get_channels_for_alert(alert)

        # Send to channels
        send_tasks = []
        for channel_type in channels_to_use:
            if channel_type in self.channels:
                task = asyncio.create_task(self._send_to_channel(channel_type, alert))
                send_tasks.append(task)

        # Wait for all sends to complete (with timeout)
        if send_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*send_tasks, return_exceptions=True), timeout=30
                )
            except TimeoutError:
                logger.warning("Alert sending timed out", alert_id=alert.id)

        logger.info(
            "Alert sent",
            alert_id=alert.id,
            severity=severity.value,
            channels=[ch.value for ch in channels_to_use],
            title=title,
        )

        return alert.id

    def _get_channels_for_alert(self, alert: Alert) -> list[AlertChannel]:
        """Determine which channels should receive this alert"""
        channels = set()

        # Check alert rules
        for rule_name, rule_config in self.alert_rules.items():
            if (
                alert.category in rule_config["categories"]
                and alert.severity.value >= rule_config["severity_threshold"].value
            ):
                channels.update(rule_config["channels"])

        # Filter by available channels
        available_channels = [ch for ch in channels if ch in self.channels]

        # Default fallback
        if not available_channels and AlertChannel.SLACK in self.channels:
            available_channels = [AlertChannel.SLACK]

        return available_channels

    async def _send_to_channel(self, channel_type: AlertChannel, alert: Alert) -> None:
        """Send alert to specific channel"""
        try:
            channel = self.channels[channel_type]
            await channel.send_alert(alert)
        except Exception as e:
            logger.error(
                "Failed to send alert to channel",
                channel=channel_type.value,
                alert_id=alert.id,
                error=str(e),
            )

    def get_alert_history(self, hours: int = 24) -> list[dict[str, Any]]:
        """Get alert history for the specified time period"""
        cutoff_time = datetime.now(UTC) - timedelta(hours=hours)

        return [
            alert.to_dict()
            for alert in self.alert_history
            if alert.timestamp > cutoff_time
        ]

    def get_alert_stats(self) -> dict[str, Any]:
        """Get alert statistics"""
        current_time = datetime.now(UTC)

        # Last 24 hours
        day_ago = current_time - timedelta(hours=24)
        recent_alerts = [a for a in self.alert_history if a.timestamp > day_ago]

        # Group by severity and category
        severity_counts = defaultdict(int)
        category_counts = defaultdict(int)

        for alert in recent_alerts:
            severity_counts[alert.severity.value] += 1
            category_counts[alert.category] += 1

        return {
            "total_alerts_24h": len(recent_alerts),
            "severity_breakdown": dict(severity_counts),
            "category_breakdown": dict(category_counts),
            "active_channels": [ch.value for ch in self.channels.keys()],
            "last_alert": recent_alerts[-1].to_dict() if recent_alerts else None,
        }


class SlackChannel:
    """Slack notification channel"""

    def __init__(self, config: dict[str, Any]):
        self.webhook_url = config["webhook_url"]
        self.channel = config["channel"]
        self.username = config["username"]

    async def send_alert(self, alert: Alert) -> None:
        """Send alert to Slack"""

        # Color based on severity
        color_map = {
            AlertSeverity.LOW: "#36a64f",  # Green
            AlertSeverity.MEDIUM: "#ff9900",  # Orange
            AlertSeverity.HIGH: "#ff4444",  # Red
            AlertSeverity.CRITICAL: "#8B0000",  # Dark Red
        }

        # Create Slack message
        slack_message = {
            "channel": self.channel,
            "username": self.username,
            "text": f":warning: {alert.title}",
            "attachments": [
                {
                    "color": color_map[alert.severity],
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.value.upper(),
                            "short": True,
                        },
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Category", "value": alert.category, "short": True},
                        {
                            "title": "Time",
                            "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "short": True,
                        },
                        {"title": "Message", "value": alert.message, "short": False},
                    ],
                }
            ],
        }

        # Add metadata if present
        if alert.metadata:
            metadata_text = "\n".join(
                [f"• {k}: {v}" for k, v in alert.metadata.items()]
            )
            slack_message["attachments"][0]["fields"].append(
                {"title": "Details", "value": f"```{metadata_text}```", "short": False}
            )

        # Send to Slack
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.webhook_url, json=slack_message, timeout=10
            )
            response.raise_for_status()


class EmailChannel:
    """Email notification channel"""

    def __init__(self, config: dict[str, Any]):
        self.smtp_server = config["smtp_server"]
        self.smtp_port = config["smtp_port"]
        self.smtp_username = config["smtp_username"]
        self.smtp_password = config["smtp_password"]
        self.from_email = config["from_email"]
        self.to_emails = config["to_emails"]

    async def send_alert(self, alert: Alert) -> None:
        """Send alert via email"""
        # For now, log the email (implement SMTP later)
        logger.info(
            "Email alert would be sent",
            to=self.to_emails,
            subject=f"[{alert.severity.value.upper()}] {alert.title}",
            message=alert.message,
        )


class WebhookChannel:
    """Generic webhook notification channel"""

    def __init__(self, config: dict[str, Any]):
        self.url = config["url"]
        self.headers = config["headers"]

    async def send_alert(self, alert: Alert) -> None:
        """Send alert to webhook"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.url, json=alert.to_dict(), headers=self.headers, timeout=10
            )
            response.raise_for_status()


class PagerDutyChannel:
    """PagerDuty notification channel"""

    def __init__(self, config: dict[str, Any]):
        self.integration_key = config["integration_key"]

    async def send_alert(self, alert: Alert) -> None:
        """Send alert to PagerDuty"""
        # For now, log the PagerDuty alert (implement PagerDuty API later)
        logger.info(
            "PagerDuty alert would be sent",
            integration_key=self.integration_key[:8] + "...",
            severity=alert.severity.value,
            title=alert.title,
        )


# Global alert manager instance
alert_manager = AlertManager()


def get_alert_manager() -> AlertManager:
    """Get the global alert manager instance"""
    return alert_manager


# Convenience functions
async def send_performance_alert(
    title: str,
    message: str,
    severity: AlertSeverity = AlertSeverity.MEDIUM,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Send performance-related alert"""
    return await alert_manager.send_alert(
        severity=severity,
        title=title,
        message=message,
        source="performance_monitor",
        category="performance",
        metadata=metadata,
    )


async def send_security_alert(
    title: str,
    message: str,
    severity: AlertSeverity = AlertSeverity.HIGH,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Send security-related alert"""
    return await alert_manager.send_alert(
        severity=severity,
        title=title,
        message=message,
        source="security_monitor",
        category="security",
        metadata=metadata,
    )


async def send_business_alert(
    title: str,
    message: str,
    severity: AlertSeverity = AlertSeverity.HIGH,
    store_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> str:
    """Send business-critical alert"""
    return await alert_manager.send_alert(
        severity=severity,
        title=title,
        message=message,
        source="business_monitor",
        category="business",
        store_id=store_id,
        metadata=metadata,
    )
