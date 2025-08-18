"""
Security monitoring and management API endpoints
Provides security statistics, threat monitoring, and security configuration
"""

from datetime import datetime, timedelta
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.auth.secure_dependencies import get_current_user
from app.core.config import settings
from app.security.input_validation import sanitize_for_logging
from app.security.rate_limiting import get_rate_limiter
from app.security.security_monitor import get_security_monitor

router = APIRouter()
logger = structlog.get_logger()


@router.get("/security/statistics")
async def get_security_statistics(
    request: Request,
    hours: int = Query(24, ge=1, le=168, description="Hours of statistics to retrieve"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get comprehensive security statistics
    Requires authentication and appropriate permissions
    """
    try:
        security_monitor = get_security_monitor()
        rate_limiter = get_rate_limiter()

        # Get security statistics
        security_stats = security_monitor.get_security_statistics()

        # Get rate limiting statistics
        client_ip = request.client.host if request.client else "unknown"
        rate_limit_status = rate_limiter.get_rate_limit_status(request)

        # Combine statistics
        comprehensive_stats = {
            "timestamp": datetime.utcnow(),
            "time_period_hours": hours,
            "security_events": security_stats,
            "rate_limiting": {
                "current_ip_status": rate_limit_status,
                "banned_ips_count": len(rate_limiter.ip_ban_list),
                "active_violations": len(rate_limiter.ip_violations),
                "rate_limit_categories": list(rate_limiter.rate_limits.keys()),
            },
            "system_security": {
                "monitoring_enabled": True,
                "environment": settings.environment,
                "security_level": "production"
                if settings.environment == "production"
                else "development",
                "input_validation_enabled": True,
                "ddos_protection_enabled": True,
                "brute_force_protection_enabled": True,
            },
        }

        logger.info(
            "Security statistics requested",
            user_id=current_user.get("sub"),
            hours=hours,
            total_events=security_stats["total_events"],
        )

        return comprehensive_stats

    except Exception as e:
        logger.error(
            "Failed to get security statistics",
            error=str(e),
            user_id=current_user.get("sub"),
        )
        raise HTTPException(
            status_code=500, detail="Failed to retrieve security statistics"
        )


@router.get("/security/threats")
async def get_active_threats(
    request: Request,
    severity: str | None = Query(
        None, description="Filter by severity (low, medium, high, critical)"
    ),
    limit: int = Query(
        100, ge=1, le=1000, description="Maximum number of threats to return"
    ),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get active security threats and high-risk IPs
    """
    try:
        security_monitor = get_security_monitor()

        # Get recent security events
        with security_monitor.lock:
            recent_events = []
            cutoff_time = datetime.utcnow() - timedelta(hours=24)

            for event in security_monitor.security_events:
                if event.timestamp >= cutoff_time:
                    # Filter by severity if specified
                    if severity and event.severity != severity:
                        continue

                    event_dict = event.to_dict()
                    # Sanitize sensitive information
                    event_dict["details"] = {
                        k: sanitize_for_logging(v)
                        for k, v in event_dict.get("details", {}).items()
                    }
                    recent_events.append(event_dict)

            # Sort by timestamp (newest first) and limit
            recent_events.sort(key=lambda x: x["timestamp"], reverse=True)
            recent_events = recent_events[:limit]

            # Get high-risk IPs
            high_risk_ips = [
                {
                    "ip": ip,
                    "risk_score": score,
                    "risk_level": security_monitor._get_risk_level(score),
                    "profile": security_monitor.get_ip_security_profile(ip),
                }
                for ip, score in security_monitor.ip_risk_scores.items()
                if score >= 50  # High risk threshold
            ]

            # Sort by risk score
            high_risk_ips.sort(key=lambda x: x["risk_score"], reverse=True)

        threat_data = {
            "timestamp": datetime.utcnow(),
            "active_threats": {
                "total_events": len(recent_events),
                "events": recent_events,
                "high_risk_ips": high_risk_ips[:20],  # Top 20 high-risk IPs
                "severity_filter": severity,
                "time_period": "24 hours",
            },
            "threat_summary": {
                "critical_events": len(
                    [e for e in recent_events if e["severity"] == "critical"]
                ),
                "high_severity_events": len(
                    [e for e in recent_events if e["severity"] == "high"]
                ),
                "unique_attacking_ips": len(set(e["client_ip"] for e in recent_events)),
                "most_common_attack_types": _get_most_common_attack_types(
                    recent_events
                ),
            },
        }

        logger.info(
            "Active threats requested",
            user_id=current_user.get("sub"),
            severity_filter=severity,
            threats_returned=len(recent_events),
            high_risk_ips=len(high_risk_ips),
        )

        return threat_data

    except Exception as e:
        logger.error(
            "Failed to get active threats",
            error=str(e),
            user_id=current_user.get("sub"),
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve active threats")


@router.get("/security/ip/{ip_address}")
async def get_ip_security_profile(
    ip_address: str,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get detailed security profile for a specific IP address
    """
    try:
        # Validate IP address format
        from app.security.input_validation import validate_input

        validated_ip = validate_input(ip_address, "general", max_length=45)

        security_monitor = get_security_monitor()
        rate_limiter = get_rate_limiter()

        # Get IP security profile
        ip_profile = security_monitor.get_ip_security_profile(validated_ip)

        # Get rate limiting information
        is_banned = rate_limiter.is_ip_banned(validated_ip)
        is_whitelisted = rate_limiter.is_ip_whitelisted(validated_ip)

        # Get recent events for this IP
        with security_monitor.lock:
            ip_events = list(security_monitor.ip_events[validated_ip])
            recent_events = [
                event.to_dict()
                for event in ip_events[-20:]  # Last 20 events
            ]

        profile_data = {
            "ip_address": validated_ip,
            "timestamp": datetime.utcnow(),
            "security_profile": ip_profile,
            "rate_limiting": {
                "is_banned": is_banned,
                "is_whitelisted": is_whitelisted,
                "ban_until": rate_limiter.ip_ban_list.get(validated_ip),
                "violations": rate_limiter.ip_violations.get(validated_ip, 0),
            },
            "recent_events": recent_events,
            "threat_assessment": {
                "is_threat": ip_profile["risk_score"] >= 50,
                "threat_level": ip_profile["risk_level"],
                "recommendation": _get_ip_recommendation(
                    ip_profile, is_banned, is_whitelisted
                ),
            },
        }

        logger.info(
            "IP security profile requested",
            ip_address=validated_ip,
            user_id=current_user.get("sub"),
            risk_score=ip_profile["risk_score"],
        )

        return profile_data

    except Exception as e:
        logger.error(
            "Failed to get IP security profile",
            ip_address=sanitize_for_logging(ip_address),
            error=str(e),
            user_id=current_user.get("sub"),
        )
        raise HTTPException(
            status_code=500, detail="Failed to retrieve IP security profile"
        )


@router.get("/security/health")
async def get_security_health(
    request: Request, current_user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Get overall security system health status
    """
    try:
        security_monitor = get_security_monitor()
        rate_limiter = get_rate_limiter()

        # Calculate security health metrics
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)

        with security_monitor.lock:
            # Count recent events by severity
            recent_events = [
                e for e in security_monitor.security_events if e.timestamp >= last_hour
            ]

            critical_events = len(
                [e for e in recent_events if e.severity == "critical"]
            )
            high_events = len([e for e in recent_events if e.severity == "high"])

            # Calculate health score
            health_score = 100
            health_score -= min(
                critical_events * 10, 50
            )  # Critical events reduce score significantly
            health_score -= min(
                high_events * 5, 30
            )  # High events reduce score moderately
            health_score = max(health_score, 0)

            # Determine health status
            if health_score >= 90:
                health_status = "excellent"
            elif health_score >= 75:
                health_status = "good"
            elif health_score >= 60:
                health_status = "fair"
            else:
                health_status = "poor"

        # Get system component status
        component_status = {
            "security_monitoring": "active",
            "rate_limiting": "active",
            "input_validation": "active",
            "ddos_protection": "active",
            "brute_force_protection": "active",
            "security_headers": "active",
        }

        # Check for issues
        issues = []
        if critical_events > 0:
            issues.append(
                f"{critical_events} critical security events in the last hour"
            )
        if high_events > 5:
            issues.append(f"{high_events} high-severity events in the last hour")
        if len(rate_limiter.ip_ban_list) > 50:
            issues.append(f"{len(rate_limiter.ip_ban_list)} IPs currently banned")

        health_data = {
            "timestamp": now,
            "overall_health": {
                "status": health_status,
                "score": health_score,
                "issues": issues,
            },
            "component_status": component_status,
            "metrics": {
                "events_last_hour": len(recent_events),
                "critical_events_last_hour": critical_events,
                "high_events_last_hour": high_events,
                "banned_ips": len(rate_limiter.ip_ban_list),
                "monitored_ips": len(security_monitor.ip_events),
                "total_security_events": len(security_monitor.security_events),
            },
            "recommendations": _get_security_recommendations(health_score, issues),
        }

        logger.info(
            "Security health check requested",
            user_id=current_user.get("sub"),
            health_status=health_status,
            health_score=health_score,
        )

        return health_data

    except Exception as e:
        logger.error(
            "Failed to get security health",
            error=str(e),
            user_id=current_user.get("sub"),
        )
        raise HTTPException(
            status_code=500, detail="Failed to retrieve security health status"
        )


def _get_most_common_attack_types(events: list[dict]) -> list[dict[str, Any]]:
    """Get most common attack types from events"""
    attack_counts = {}
    for event in events:
        event_type = event.get("event_type", "unknown")
        attack_counts[event_type] = attack_counts.get(event_type, 0) + 1

    # Sort by count and return top 5
    sorted_attacks = sorted(attack_counts.items(), key=lambda x: x[1], reverse=True)
    return [
        {"attack_type": attack_type, "count": count}
        for attack_type, count in sorted_attacks[:5]
    ]


def _get_ip_recommendation(profile: dict, is_banned: bool, is_whitelisted: bool) -> str:
    """Get recommendation for handling an IP address"""
    if is_whitelisted:
        return "IP is whitelisted - no action needed"

    if is_banned:
        return "IP is currently banned due to suspicious activity"

    risk_score = profile.get("risk_score", 0)

    if risk_score >= 100:
        return "CRITICAL: Consider permanent ban - extremely high risk"
    elif risk_score >= 50:
        return "HIGH RISK: Consider temporary ban or enhanced monitoring"
    elif risk_score >= 20:
        return "MEDIUM RISK: Continue monitoring closely"
    else:
        return "LOW RISK: Normal monitoring sufficient"


def _get_security_recommendations(health_score: int, issues: list[str]) -> list[str]:
    """Get security recommendations based on health status"""
    recommendations = []

    if health_score < 60:
        recommendations.append("URGENT: Investigate security incidents immediately")
        recommendations.append("Consider implementing additional security measures")
    elif health_score < 75:
        recommendations.append("Review recent security events and patterns")
        recommendations.append("Consider adjusting rate limiting thresholds")
    elif health_score < 90:
        recommendations.append("Continue monitoring - some elevated activity detected")
    else:
        recommendations.append(
            "Security posture is excellent - maintain current settings"
        )

    if "banned" in str(issues).lower() and "50" in str(issues):
        recommendations.append("High number of banned IPs - review ban criteria")

    if not recommendations:
        recommendations.append("No specific recommendations at this time")

    return recommendations
