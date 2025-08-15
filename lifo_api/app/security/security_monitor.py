"""
Comprehensive security monitoring and audit system
Real-time threat detection and security event logging
"""

import asyncio
import json
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import threading
import hashlib
import re

import structlog
from fastapi import Request

logger = structlog.get_logger()


class SecurityEventType:
    """Security event type constants"""
    AUTHENTICATION_FAILURE = "auth_failure"
    AUTHORIZATION_FAILURE = "authz_failure"
    INPUT_VALIDATION_FAILURE = "input_validation_failure"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_REQUEST = "suspicious_request"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    PATH_TRAVERSAL_ATTEMPT = "path_traversal_attempt"
    DDOS_ATTACK = "ddos_attack"
    IP_BANNED = "ip_banned"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    UNUSUAL_PATTERN = "unusual_pattern"
    SECURITY_SCAN_DETECTED = "security_scan_detected"


class SecurityEvent:
    """Security event data structure"""
    
    def __init__(
        self,
        event_type: str,
        client_ip: str,
        endpoint: str,
        severity: str = "medium",
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        self.event_type = event_type
        self.client_ip = client_ip
        self.endpoint = endpoint
        self.severity = severity
        self.details = details or {}
        self.user_id = user_id
        self.user_agent = user_agent
        self.timestamp = datetime.utcnow()
        self.event_id = self._generate_event_id()
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        data = f"{self.timestamp.isoformat()}{self.client_ip}{self.event_type}"
        return hashlib.md5(data.encode()).hexdigest()[:16]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for logging/storage"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "client_ip": self.client_ip,
            "endpoint": self.endpoint,
            "severity": self.severity,
            "details": self.details,
            "user_id": self.user_id,
            "user_agent": self.user_agent,
            "timestamp": self.timestamp.isoformat()
        }


class SecurityMonitor:
    """
    Comprehensive security monitoring system
    Tracks threats, patterns, and security events
    """
    
    def __init__(self):
        self.lock = threading.RLock()
        
        # Event storage (keep last 10k events)
        self.security_events = deque(maxlen=10000)
        
        # IP-based tracking
        self.ip_events = defaultdict(lambda: deque(maxlen=100))  # Events per IP
        self.ip_risk_scores = defaultdict(int)  # Risk score per IP
        self.ip_first_seen = {}  # First time seeing each IP
        
        # Pattern detection
        self.attack_patterns = defaultdict(int)  # Attack pattern counts
        self.endpoint_access_patterns = defaultdict(lambda: defaultdict(int))  # IP -> endpoint -> count
        
        # Failed authentication tracking
        self.failed_auth_attempts = defaultdict(lambda: deque(maxlen=50))  # IP -> failed attempts
        
        # Security scan detection
        self.scanner_signatures = [
            r"nikto",
            r"nmap",
            r"sqlmap",
            r"burp",
            r"dirb",
            r"gobuster",
            r"dirbuster",
            r"wpscan",
            r"owasp zap",
            r"acunetix",
            r"nessus",
            r"openvas",
            r"metasploit"
        ]
        self.compiled_scanner_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.scanner_signatures]
        
        # Suspicious endpoints (commonly targeted)
        self.honeypot_endpoints = {
            "/admin", "/wp-admin", "/phpmyadmin", "/.env", "/backup",
            "/config", "/debug", "/test", "/api/admin", "/administrator",
            "/wp-login", "/login.php", "/admin.php", "/wp-config.php",
            "/.git", "/robots.txt", "/sitemap.xml", "/crossdomain.xml"
        }
        
        # Start background monitoring
        self._start_monitoring_tasks()
    
    def record_security_event(
        self,
        event_type: str,
        request: Request,
        severity: str = "medium",
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ):
        """Record a security event"""
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Create security event
        event = SecurityEvent(
            event_type=event_type,
            client_ip=client_ip,
            endpoint=endpoint,
            severity=severity,
            details=details,
            user_id=user_id,
            user_agent=user_agent
        )
        
        with self.lock:
            # Store event
            self.security_events.append(event)
            self.ip_events[client_ip].append(event)
            
            # Update risk scores
            self._update_risk_score(client_ip, event_type, severity)
            
            # Track patterns
            self.attack_patterns[event_type] += 1
            self.endpoint_access_patterns[client_ip][endpoint] += 1
            
            # Track first-time IPs
            if client_ip not in self.ip_first_seen:
                self.ip_first_seen[client_ip] = datetime.utcnow()
        
        # Log the event
        log_level = self._get_log_level(severity)
        getattr(logger, log_level)(
            "Security event recorded",
            event_id=event.event_id,
            event_type=event_type,
            client_ip=client_ip,
            endpoint=endpoint,
            severity=severity,
            details=details,
            user_id=user_id
        )
        
        # Check for immediate threats
        self._analyze_threat_patterns(client_ip, event)
    
    def detect_security_scan(self, request: Request) -> bool:
        """Detect potential security scanning tools"""
        user_agent = request.headers.get("user-agent", "").lower()
        
        # Check user agent for scanner signatures
        for pattern in self.compiled_scanner_patterns:
            if pattern.search(user_agent):
                self.record_security_event(
                    SecurityEventType.SECURITY_SCAN_DETECTED,
                    request,
                    severity="high",
                    details={
                        "scanner_detected": True,
                        "user_agent": user_agent,
                        "detection_method": "user_agent_signature"
                    }
                )
                return True
        
        # Check for honeypot endpoint access
        if request.url.path in self.honeypot_endpoints:
            self.record_security_event(
                SecurityEventType.SUSPICIOUS_REQUEST,
                request,
                severity="medium",
                details={
                    "honeypot_endpoint": request.url.path,
                    "detection_method": "honeypot_access"
                }
            )
            return True
        
        return False
    
    def detect_brute_force_attack(self, request: Request, failed_auth: bool = False) -> bool:
        """Detect brute force authentication attempts"""
        if not failed_auth:
            return False
        
        client_ip = self._get_client_ip(request)
        
        with self.lock:
            # Record failed attempt
            self.failed_auth_attempts[client_ip].append(datetime.utcnow())
            
            # Check for brute force pattern
            recent_failures = [
                attempt for attempt in self.failed_auth_attempts[client_ip]
                if attempt > datetime.utcnow() - timedelta(minutes=15)
            ]
            
            if len(recent_failures) >= 5:  # 5 failures in 15 minutes
                self.record_security_event(
                    SecurityEventType.BRUTE_FORCE_ATTEMPT,
                    request,
                    severity="high",
                    details={
                        "failed_attempts_15min": len(recent_failures),
                        "total_failures": len(self.failed_auth_attempts[client_ip]),
                        "detection_threshold": 5
                    }
                )
                return True
        
        return False
    
    def analyze_request_anomalies(self, request: Request) -> List[str]:
        """Analyze request for various anomalies"""
        anomalies = []
        client_ip = self._get_client_ip(request)
        
        # Check for unusual request patterns
        with self.lock:
            ip_events = self.ip_events[client_ip]
            
            if len(ip_events) >= 10:
                # Check for rapid requests to different endpoints
                recent_events = [e for e in ip_events if e.timestamp > datetime.utcnow() - timedelta(minutes=5)]
                unique_endpoints = len(set(e.endpoint for e in recent_events))
                
                if unique_endpoints >= 10:  # 10+ different endpoints in 5 minutes
                    anomalies.append("endpoint_enumeration")
                
                # Check for error rate
                error_events = [e for e in recent_events if e.severity in ["high", "critical"]]
                if len(error_events) / len(recent_events) > 0.5:  # >50% error rate
                    anomalies.append("high_error_rate")
        
        # Check request headers for anomalies
        headers_anomalies = self._analyze_header_anomalies(request)
        anomalies.extend(headers_anomalies)
        
        # Check query parameters for anomalies
        query_anomalies = self._analyze_query_anomalies(request)
        anomalies.extend(query_anomalies)
        
        # Record anomalies as security events
        if anomalies:
            self.record_security_event(
                SecurityEventType.UNUSUAL_PATTERN,
                request,
                severity="medium",
                details={
                    "anomalies_detected": anomalies,
                    "anomaly_count": len(anomalies)
                }
            )
        
        return anomalies
    
    def _analyze_header_anomalies(self, request: Request) -> List[str]:
        """Analyze request headers for anomalies"""
        anomalies = []
        
        # Check for missing common headers
        if "user-agent" not in request.headers:
            anomalies.append("missing_user_agent")
        
        # Check for suspicious header values
        user_agent = request.headers.get("user-agent", "")
        if len(user_agent) > 500:  # Unusually long user agent
            anomalies.append("long_user_agent")
        
        # Check for suspicious custom headers
        suspicious_headers = ["x-forwarded-host", "x-original-host", "x-rewrite-url"]
        for header in suspicious_headers:
            if header in request.headers:
                anomalies.append(f"suspicious_header_{header}")
        
        return anomalies
    
    def _analyze_query_anomalies(self, request: Request) -> List[str]:
        """Analyze query parameters for anomalies"""
        anomalies = []
        
        query_string = str(request.url.query)
        
        # Check for excessively long query strings
        if len(query_string) > 2000:
            anomalies.append("long_query_string")
        
        # Check for suspicious parameter names
        suspicious_params = ["union", "select", "drop", "exec", "script", "iframe"]
        for param in suspicious_params:
            if param in query_string.lower():
                anomalies.append(f"suspicious_param_{param}")
        
        return anomalies
    
    def _update_risk_score(self, client_ip: str, event_type: str, severity: str):
        """Update risk score for an IP address"""
        score_increment = {
            "low": 1,
            "medium": 5,
            "high": 15,
            "critical": 30
        }.get(severity, 5)
        
        # Higher scores for more serious events
        event_multipliers = {
            SecurityEventType.SQL_INJECTION_ATTEMPT: 3,
            SecurityEventType.XSS_ATTEMPT: 2,
            SecurityEventType.DDOS_ATTACK: 5,
            SecurityEventType.BRUTE_FORCE_ATTEMPT: 4,
            SecurityEventType.SECURITY_SCAN_DETECTED: 3
        }
        
        multiplier = event_multipliers.get(event_type, 1)
        self.ip_risk_scores[client_ip] += score_increment * multiplier
    
    def _analyze_threat_patterns(self, client_ip: str, event: SecurityEvent):
        """Analyze threat patterns and trigger alerts"""
        with self.lock:
            risk_score = self.ip_risk_scores[client_ip]
            ip_events = self.ip_events[client_ip]
            
            # High-risk IP detection
            if risk_score >= 100:
                logger.error(
                    "High-risk IP detected",
                    client_ip=client_ip,
                    risk_score=risk_score,
                    event_count=len(ip_events),
                    latest_event=event.event_type
                )
            
            # Rapid event detection
            recent_events = [
                e for e in ip_events
                if e.timestamp > datetime.utcnow() - timedelta(minutes=5)
            ]
            
            if len(recent_events) >= 20:  # 20+ events in 5 minutes
                logger.warning(
                    "Rapid security events detected",
                    client_ip=client_ip,
                    events_5min=len(recent_events),
                    risk_score=risk_score
                )
    
    def get_security_statistics(self) -> Dict[str, Any]:
        """Get comprehensive security statistics"""
        with self.lock:
            now = datetime.utcnow()
            
            # Time-based statistics
            last_24h = [e for e in self.security_events if e.timestamp > now - timedelta(hours=24)]
            last_1h = [e for e in self.security_events if e.timestamp > now - timedelta(hours=1)]
            
            # Event type breakdown
            event_type_counts = defaultdict(int)
            severity_counts = defaultdict(int)
            
            for event in last_24h:
                event_type_counts[event.event_type] += 1
                severity_counts[event.severity] += 1
            
            # Top attacking IPs
            ip_event_counts = defaultdict(int)
            for event in last_24h:
                ip_event_counts[event.client_ip] += 1
            
            top_attacking_ips = sorted(
                ip_event_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            # High-risk IPs
            high_risk_ips = [
                (ip, score) for ip, score in self.ip_risk_scores.items()
                if score >= 50
            ]
            high_risk_ips.sort(key=lambda x: x[1], reverse=True)
            
            return {
                "timestamp": now.isoformat(),
                "total_events": len(self.security_events),
                "events_last_24h": len(last_24h),
                "events_last_1h": len(last_1h),
                "event_types_24h": dict(event_type_counts),
                "severity_breakdown_24h": dict(severity_counts),
                "top_attacking_ips": top_attacking_ips,
                "high_risk_ips": high_risk_ips[:10],
                "unique_ips_tracked": len(self.ip_events),
                "attack_patterns": dict(self.attack_patterns),
                "monitoring_status": "active"
            }
    
    def get_ip_security_profile(self, client_ip: str) -> Dict[str, Any]:
        """Get security profile for a specific IP"""
        with self.lock:
            ip_events = list(self.ip_events[client_ip])
            risk_score = self.ip_risk_scores[client_ip]
            first_seen = self.ip_first_seen.get(client_ip)
            
            # Event breakdown
            event_types = defaultdict(int)
            severities = defaultdict(int)
            
            for event in ip_events:
                event_types[event.event_type] += 1
                severities[event.severity] += 1
            
            # Recent activity
            recent_events = [
                e for e in ip_events
                if e.timestamp > datetime.utcnow() - timedelta(hours=24)
            ]
            
            return {
                "client_ip": client_ip,
                "risk_score": risk_score,
                "first_seen": first_seen.isoformat() if first_seen else None,
                "total_events": len(ip_events),
                "events_last_24h": len(recent_events),
                "event_types": dict(event_types),
                "severity_breakdown": dict(severities),
                "failed_auth_attempts": len(self.failed_auth_attempts[client_ip]),
                "risk_level": self._get_risk_level(risk_score),
                "is_high_risk": risk_score >= 50,
                "endpoints_accessed": list(self.endpoint_access_patterns[client_ip].keys())
            }
    
    def _get_risk_level(self, risk_score: int) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 100:
            return "critical"
        elif risk_score >= 50:
            return "high"
        elif risk_score >= 20:
            return "medium"
        else:
            return "low"
    
    def _get_log_level(self, severity: str) -> str:
        """Convert severity to log level"""
        severity_map = {
            "low": "info",
            "medium": "warning",
            "high": "error",
            "critical": "error"
        }
        return severity_map.get(severity, "warning")
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return getattr(request.client, 'host', 'unknown')
    
    def _start_monitoring_tasks(self):
        """Start background monitoring tasks"""
        def cleanup_old_data():
            while True:
                try:
                    with self.lock:
                        now = datetime.utcnow()
                        cutoff = now - timedelta(hours=72)  # Keep 72 hours of data
                        
                        # Clean up old IP events
                        expired_ips = []
                        for ip, events in self.ip_events.items():
                            # Remove old events
                            while events and events[0].timestamp < cutoff:
                                events.popleft()
                            
                            # Remove IP if no recent events
                            if not events:
                                expired_ips.append(ip)
                        
                        for ip in expired_ips:
                            if ip in self.ip_events:
                                del self.ip_events[ip]
                            if ip in self.ip_risk_scores:
                                del self.ip_risk_scores[ip]
                            if ip in self.ip_first_seen:
                                del self.ip_first_seen[ip]
                            if ip in self.failed_auth_attempts:
                                del self.failed_auth_attempts[ip]
                        
                        # Decay risk scores over time
                        for ip in self.ip_risk_scores:
                            self.ip_risk_scores[ip] = max(0, self.ip_risk_scores[ip] - 1)
                        
                        if expired_ips:
                            logger.info(
                                "Security monitor cleanup completed",
                                expired_ips=len(expired_ips),
                                active_ips=len(self.ip_events),
                                total_events=len(self.security_events)
                            )
                    
                    time.sleep(3600)  # Cleanup every hour
                    
                except Exception as e:
                    logger.error("Security monitor cleanup error", error=str(e))
                    time.sleep(3600)
        
        cleanup_thread = threading.Thread(target=cleanup_old_data, daemon=True)
        cleanup_thread.start()


# Global security monitor instance
security_monitor = SecurityMonitor()


def get_security_monitor() -> SecurityMonitor:
    """Get the global security monitor instance"""
    return security_monitor