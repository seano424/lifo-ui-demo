"""
Advanced rate limiting and DDoS protection for LIFO AI Engine
Multi-layer protection with adaptive thresholds and intelligent blocking
"""

import asyncio
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import threading
import hashlib
import ipaddress

import structlog
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded"""
    pass


class IPBanned(Exception):
    """Exception raised when IP is banned"""
    pass


class AdvancedRateLimiter:
    """
    Multi-layer rate limiting system with adaptive thresholds
    Provides protection against DDoS, brute force, and abuse
    """
    
    def __init__(self):
        self.lock = threading.RLock()
        
        # Request tracking by IP
        self.ip_requests = defaultdict(lambda: deque(maxlen=1000))  # Last 1000 requests per IP
        self.ip_violations = defaultdict(int)  # Violation count per IP
        self.ip_ban_list = {}  # IP -> ban_until_timestamp
        
        # Request tracking by endpoint
        self.endpoint_requests = defaultdict(lambda: deque(maxlen=5000))  # Last 5000 requests per endpoint
        
        # Suspicious activity tracking
        self.suspicious_ips = defaultdict(lambda: {"score": 0, "last_seen": datetime.now(timezone.utc)})
        
        # Rate limit configurations
        self.rate_limits = {
            # General API limits
            "default": {"requests": 100, "window": 60, "burst": 20},  # 100 req/min, burst 20
            
            # Mobile endpoints (higher limits for better UX)
            "mobile": {"requests": 200, "window": 60, "burst": 50},   # 200 req/min, burst 50
            
            # Authentication endpoints (stricter limits)
            "auth": {"requests": 10, "window": 60, "burst": 3},       # 10 req/min, burst 3
            
            # File upload endpoints (very strict)
            "upload": {"requests": 5, "window": 60, "burst": 2},      # 5 req/min, burst 2
            
            # Health check endpoints (more lenient)
            "health": {"requests": 300, "window": 60, "burst": 100},  # 300 req/min, burst 100
            
            # Analytics endpoints (moderate limits)
            "analytics": {"requests": 50, "window": 60, "burst": 10}, # 50 req/min, burst 10
        }
        
        # DDoS detection thresholds
        self.ddos_thresholds = {
            "requests_per_second": 50,     # 50 requests per second from single IP
            "requests_per_minute": 500,    # 500 requests per minute from single IP
            "error_rate_threshold": 0.8,   # 80% error rate indicates attack
            "suspicious_score_limit": 100, # Suspicion score limit for auto-ban
        }
        
        # Whitelist for internal/trusted IPs
        self.ip_whitelist = {
            "127.0.0.1", "::1",           # Localhost
            "10.0.0.0/8",                 # Private networks
            "172.16.0.0/12",
            "192.168.0.0/16"
        }
        
        # Start cleanup background task
        self._start_cleanup_task()
    
    def get_endpoint_category(self, path: str) -> str:
        """Determine rate limit category based on endpoint path"""
        if "/mobile" in path:
            return "mobile"
        elif "/auth" in path or "/login" in path:
            return "auth"
        elif "/upload" in path or "/csv" in path:
            return "upload"
        elif "/health" in path:
            return "health"
        elif "/analytics" in path:
            return "analytics"
        else:
            return "default"
    
    def is_ip_whitelisted(self, ip: str) -> bool:
        """Check if IP is whitelisted"""
        try:
            ip_addr = ipaddress.ip_address(ip)
            for whitelist_entry in self.ip_whitelist:
                if "/" in whitelist_entry:
                    network = ipaddress.ip_network(whitelist_entry, strict=False)
                    if ip_addr in network:
                        return True
                elif ip == whitelist_entry:
                    return True
            return False
        except ValueError:
            return False
    
    def is_ip_banned(self, ip: str) -> bool:
        """Check if IP is currently banned"""
        with self.lock:
            if ip in self.ip_ban_list:
                ban_until = self.ip_ban_list[ip]
                if datetime.now(timezone.utc) < ban_until:
                    return True
                else:
                    # Ban expired, remove from list
                    del self.ip_ban_list[ip]
            return False
    
    def check_rate_limit(self, request: Request) -> Tuple[bool, Optional[str]]:
        """
        Check if request should be rate limited
        
        Returns:
            Tuple of (allowed, reason)
        """
        client_ip = self._get_client_ip(request)
        endpoint_path = request.url.path
        
        # Skip rate limiting for whitelisted IPs
        if self.is_ip_whitelisted(client_ip):
            return True, None
        
        # Check if IP is banned
        if self.is_ip_banned(client_ip):
            logger.warning("Request from banned IP", ip=client_ip, path=endpoint_path)
            return False, "IP temporarily banned due to suspicious activity"
        
        with self.lock:
            current_time = datetime.now(timezone.utc)
            
            # Get rate limit configuration for this endpoint
            category = self.get_endpoint_category(endpoint_path)
            limits = self.rate_limits[category]
            
            # Check IP-based rate limits
            ip_allowed = self._check_ip_rate_limit(client_ip, limits, current_time)
            if not ip_allowed:
                self._record_violation(client_ip, "rate_limit_exceeded")
                return False, f"Rate limit exceeded for IP: {limits['requests']} requests per {limits['window']} seconds"
            
            # Check endpoint-based rate limits (global per endpoint)
            endpoint_allowed = self._check_endpoint_rate_limit(endpoint_path, limits, current_time)
            if not endpoint_allowed:
                return False, f"Endpoint rate limit exceeded: {limits['requests']} requests per {limits['window']} seconds"
            
            # Record successful request
            self._record_request(client_ip, endpoint_path, current_time)
            
            return True, None
    
    def _check_ip_rate_limit(self, ip: str, limits: Dict, current_time: datetime) -> bool:
        """Check rate limit for specific IP"""
        requests = self.ip_requests[ip]
        window_start = current_time - timedelta(seconds=limits["window"])
        
        # Remove old requests outside the window
        while requests and requests[0]["timestamp"] < window_start:
            requests.popleft()
        
        # Check if within rate limit
        if len(requests) >= limits["requests"]:
            return False
        
        # Check burst limit (requests in last 10 seconds)
        burst_start = current_time - timedelta(seconds=10)
        burst_requests = sum(1 for req in requests if req["timestamp"] >= burst_start)
        
        if burst_requests >= limits["burst"]:
            return False
        
        return True
    
    def _check_endpoint_rate_limit(self, endpoint: str, limits: Dict, current_time: datetime) -> bool:
        """Check rate limit for specific endpoint (global)"""
        requests = self.endpoint_requests[endpoint]
        window_start = current_time - timedelta(seconds=limits["window"])
        
        # Remove old requests outside the window
        while requests and requests[0]["timestamp"] < window_start:
            requests.popleft()
        
        # Global endpoint limit (5x the per-IP limit)
        global_limit = limits["requests"] * 5
        
        return len(requests) < global_limit
    
    def _record_request(self, ip: str, endpoint: str, timestamp: datetime):
        """Record a successful request"""
        request_data = {
            "timestamp": timestamp,
            "endpoint": endpoint,
            "status": "success"
        }
        
        self.ip_requests[ip].append(request_data)
        self.endpoint_requests[endpoint].append(request_data)
    
    def _record_violation(self, ip: str, violation_type: str):
        """Record a rate limit violation"""
        self.ip_violations[ip] += 1
        
        # Update suspicious activity score
        suspicious_data = self.suspicious_ips[ip]
        suspicious_data["score"] += 10  # Increase suspicion score
        suspicious_data["last_seen"] = datetime.now(timezone.utc)
        
        logger.warning(
            "Rate limit violation recorded",
            ip=ip,
            violation_type=violation_type,
            total_violations=self.ip_violations[ip],
            suspicious_score=suspicious_data["score"]
        )
        
        # Auto-ban if too many violations
        if self.ip_violations[ip] >= 10 or suspicious_data["score"] >= self.ddos_thresholds["suspicious_score_limit"]:
            self._ban_ip(ip, duration_minutes=30)
    
    def _ban_ip(self, ip: str, duration_minutes: int = 30):
        """Ban an IP address for specified duration"""
        ban_until = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
        self.ip_ban_list[ip] = ban_until
        
        logger.warning(
            "IP banned",
            ip=ip,
            duration_minutes=duration_minutes,
            ban_until=ban_until.isoformat(),
            violations=self.ip_violations[ip],
            suspicious_score=self.suspicious_ips[ip]["score"]
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers"""
        # Check for forwarded IP headers (load balancer, proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in case of multiple forwards
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return getattr(request.client, 'host', 'unknown')
    
    def detect_ddos_attack(self, request: Request) -> bool:
        """Detect potential DDoS attack patterns"""
        client_ip = self._get_client_ip(request)
        
        with self.lock:
            current_time = datetime.now(timezone.utc)
            requests = self.ip_requests[client_ip]
            
            if not requests:
                return False
            
            # Check requests per second
            one_second_ago = current_time - timedelta(seconds=1)
            recent_requests = sum(1 for req in requests if req["timestamp"] >= one_second_ago)
            
            if recent_requests > self.ddos_thresholds["requests_per_second"]:
                logger.warning(
                    "DDoS attack detected - high request rate",
                    ip=client_ip,
                    requests_per_second=recent_requests
                )
                return True
            
            # Check requests per minute
            one_minute_ago = current_time - timedelta(minutes=1)
            minute_requests = sum(1 for req in requests if req["timestamp"] >= one_minute_ago)
            
            if minute_requests > self.ddos_thresholds["requests_per_minute"]:
                logger.warning(
                    "DDoS attack detected - high request volume",
                    ip=client_ip,
                    requests_per_minute=minute_requests
                )
                return True
            
            # Check error rate (if we have enough requests)
            if len(requests) >= 10:
                error_requests = sum(1 for req in requests if req.get("status") == "error")
                error_rate = error_requests / len(requests)
                
                if error_rate > self.ddos_thresholds["error_rate_threshold"]:
                    logger.warning(
                        "Potential attack detected - high error rate",
                        ip=client_ip,
                        error_rate=error_rate
                    )
                    return True
            
            return False
    
    def record_error_response(self, request: Request, status_code: int):
        """Record an error response for DDoS detection"""
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        with self.lock:
            # Update the last request to mark it as error
            ip_requests = self.ip_requests[client_ip]
            if ip_requests:
                ip_requests[-1]["status"] = "error"
                ip_requests[-1]["status_code"] = status_code
            
            # Increase suspicious score for error responses
            if status_code >= 400:
                suspicious_data = self.suspicious_ips[client_ip]
                suspicious_data["score"] += 1 if status_code < 500 else 5
                suspicious_data["last_seen"] = datetime.now(timezone.utc)
    
    def get_rate_limit_status(self, request: Request) -> Dict:
        """Get current rate limit status for an IP"""
        client_ip = self._get_client_ip(request)
        endpoint_path = request.url.path
        category = self.get_endpoint_category(endpoint_path)
        limits = self.rate_limits[category]
        
        with self.lock:
            current_time = datetime.now(timezone.utc)
            requests = self.ip_requests[client_ip]
            
            # Count requests in current window
            window_start = current_time - timedelta(seconds=limits["window"])
            current_requests = sum(1 for req in requests if req["timestamp"] >= window_start)
            
            # Count burst requests
            burst_start = current_time - timedelta(seconds=10)
            burst_requests = sum(1 for req in requests if req["timestamp"] >= burst_start)
            
            return {
                "ip": client_ip,
                "category": category,
                "requests_in_window": current_requests,
                "window_limit": limits["requests"],
                "window_seconds": limits["window"],
                "burst_requests": burst_requests,
                "burst_limit": limits["burst"],
                "violations": self.ip_violations[client_ip],
                "suspicious_score": self.suspicious_ips[client_ip]["score"],
                "is_banned": self.is_ip_banned(client_ip),
                "remaining_requests": max(0, limits["requests"] - current_requests),
                "remaining_burst": max(0, limits["burst"] - burst_requests),
            }
    
    def _start_cleanup_task(self):
        """Start background cleanup task"""
        def cleanup_old_data():
            while True:
                try:
                    with self.lock:
                        current_time = datetime.now(timezone.utc)
                        
                        # Clean up old IP violations (reset after 1 hour)
                        hour_ago = current_time - timedelta(hours=1)
                        expired_ips = []
                        
                        for ip, last_request_time in [(ip, max(req["timestamp"] for req in reqs) if reqs else hour_ago) for ip, reqs in self.ip_requests.items()]:
                            if last_request_time < hour_ago:
                                expired_ips.append(ip)
                        
                        for ip in expired_ips:
                            if ip in self.ip_violations:
                                del self.ip_violations[ip]
                            if ip in self.ip_requests:
                                del self.ip_requests[ip]
                            if ip in self.suspicious_ips:
                                del self.suspicious_ips[ip]
                        
                        # Clean up expired bans
                        expired_bans = [ip for ip, ban_until in self.ip_ban_list.items() if current_time >= ban_until]
                        for ip in expired_bans:
                            del self.ip_ban_list[ip]
                            logger.info("IP ban expired", ip=ip)
                        
                        if expired_ips or expired_bans:
                            logger.info(
                                "Rate limiter cleanup completed",
                                expired_ips=len(expired_ips),
                                expired_bans=len(expired_bans),
                                active_ips=len(self.ip_requests),
                                banned_ips=len(self.ip_ban_list)
                            )
                    
                    time.sleep(300)  # Cleanup every 5 minutes
                    
                except Exception as e:
                    logger.error("Rate limiter cleanup error", error=str(e))
                    time.sleep(600)  # Wait 10 minutes on error
        
        cleanup_thread = threading.Thread(target=cleanup_old_data, daemon=True)
        cleanup_thread.start()


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with DDoS protection
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = AdvancedRateLimiter()
    
    async def dispatch(self, request: Request, call_next):
        # Check rate limits
        allowed, reason = self.rate_limiter.check_rate_limit(request)
        
        if not allowed:
            # Record the violation
            self.rate_limiter.record_error_response(request, 429)
            
            # Check for DDoS attack
            if self.rate_limiter.detect_ddos_attack(request):
                client_ip = self.rate_limiter._get_client_ip(request)
                self.rate_limiter._ban_ip(client_ip, duration_minutes=60)  # Longer ban for DDoS
            
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": reason,
                    "retry_after": 60
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": "100",
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + 60)
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Record error responses for DDoS detection
        if response.status_code >= 400:
            self.rate_limiter.record_error_response(request, response.status_code)
        
        # Add rate limit headers
        rate_limit_status = self.rate_limiter.get_rate_limit_status(request)
        response.headers["X-RateLimit-Limit"] = str(rate_limit_status["window_limit"])
        response.headers["X-RateLimit-Remaining"] = str(rate_limit_status["remaining_requests"])
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + rate_limit_status["window_seconds"])
        
        return response


# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()


def get_rate_limiter() -> AdvancedRateLimiter:
    """Get the global rate limiter instance"""
    return rate_limiter