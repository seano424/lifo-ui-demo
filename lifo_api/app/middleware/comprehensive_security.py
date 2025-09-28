"""
Comprehensive security middleware integrating all security components
Multi-layer protection with input validation, rate limiting, and threat detection
"""

import time
from collections.abc import Callable
from typing import Any

import structlog
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.security.input_validation import InputValidationError, security_validator
from app.security.rate_limiting import get_rate_limiter
from app.security.security_monitor import SecurityEventType, get_security_monitor

logger = structlog.get_logger()


class ComprehensiveSecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware combining all security measures
    Provides multi-layer protection against various attack vectors
    """

    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = get_rate_limiter()
        self.security_monitor = get_security_monitor()

        # Security bypass paths (for health checks, metrics, etc.)
        self.bypass_paths = {
            "/health",
            "/metrics",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/robots.txt",
            "/api/v1/test"
        }

        # High-security endpoints requiring extra validation
        self.high_security_endpoints = {
            "/api/v1/csv",
            "/api/v1/upload",
            "/api/v1/analytics",
            "/api/v1/auth",
            "/api/v1/admin",
        }

    def should_bypass_security(self, path: str) -> bool:
        """Check if path should bypass security checks"""
        return any(bypass_path in path for bypass_path in self.bypass_paths)

    def is_high_security_endpoint(self, path: str) -> bool:
        """Check if endpoint requires high security"""
        return any(secure_path in path for secure_path in self.high_security_endpoints)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main security processing pipeline"""
        start_time = time.time()

        # Skip security for bypass paths
        if self.should_bypass_security(request.url.path):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        security_checks_passed = []

        try:
            # 1. Security Scanner Detection
            if self.security_monitor.detect_security_scan(request):
                logger.warning(
                    "Security scanner detected", ip=client_ip, path=request.url.path
                )
                return self._create_security_response(
                    "Security scanner detected", status_code=403
                )
            security_checks_passed.append("scanner_detection")

            # 2. Rate Limiting and DDoS Protection
            rate_limit_allowed, rate_limit_reason = self.rate_limiter.check_rate_limit(
                request
            )
            if not rate_limit_allowed:
                self.security_monitor.record_security_event(
                    SecurityEventType.RATE_LIMIT_EXCEEDED,
                    request,
                    severity="medium",
                    details={"reason": rate_limit_reason},
                )
                return self._create_rate_limit_response(rate_limit_reason)
            security_checks_passed.append("rate_limiting")

            # 3. DDoS Attack Detection
            if self.rate_limiter.detect_ddos_attack(request):
                self.security_monitor.record_security_event(
                    SecurityEventType.DDOS_ATTACK,
                    request,
                    severity="critical",
                    details={"attack_type": "ddos_detected"},
                )
                # Ban IP immediately for DDoS
                self.rate_limiter._ban_ip(client_ip, duration_minutes=120)
                return self._create_security_response(
                    "DDoS attack detected - IP temporarily banned", status_code=429
                )
            security_checks_passed.append("ddos_protection")

            # 4. Input Validation for Query Parameters
            if request.url.query:
                try:
                    # Validate query parameters with context-aware approach
                    if not self._validate_query_parameters(request):
                        raise InputValidationError(
                            "Invalid query parameter format or values"
                        )
                except InputValidationError as e:
                    self.security_monitor.record_security_event(
                        SecurityEventType.INPUT_VALIDATION_FAILURE,
                        request,
                        severity="high",
                        details={
                            "validation_error": str(e),
                            "input_type": "query_params",
                        },
                    )
                    return self._create_security_response(
                        "Invalid query parameters", status_code=400
                    )
            security_checks_passed.append("query_validation")

            # 5. Path Parameter Validation
            if self._has_suspicious_path(request.url.path):
                self.security_monitor.record_security_event(
                    SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
                    request,
                    severity="high",
                    details={"suspicious_path": request.url.path},
                )
                return self._create_security_response(
                    "Invalid request path", status_code=400
                )
            security_checks_passed.append("path_validation")

            # 6. Request Header Validation
            header_validation_result = self._validate_request_headers(request)
            if not header_validation_result["valid"]:
                self.security_monitor.record_security_event(
                    SecurityEventType.SUSPICIOUS_REQUEST,
                    request,
                    severity="medium",
                    details=header_validation_result["details"],
                )
                return self._create_security_response(
                    "Invalid request headers", status_code=400
                )
            security_checks_passed.append("header_validation")

            # 7. Request Anomaly Detection
            anomalies = self.security_monitor.analyze_request_anomalies(request)
            if len(anomalies) >= 3:  # Multiple anomalies indicate potential attack
                self.security_monitor.record_security_event(
                    SecurityEventType.SUSPICIOUS_REQUEST,
                    request,
                    severity="high",
                    details={"anomalies": anomalies, "anomaly_count": len(anomalies)},
                )
                return self._create_security_response(
                    "Suspicious request patterns detected", status_code=403
                )
            security_checks_passed.append("anomaly_detection")

            # 8. High-Security Endpoint Validation
            if self.is_high_security_endpoint(request.url.path):
                high_security_valid = await self._validate_high_security_request(
                    request
                )
                if not high_security_valid:
                    return self._create_security_response(
                        "High-security endpoint validation failed", status_code=403
                    )
            security_checks_passed.append("high_security_validation")

            # Process the request
            response = await call_next(request)

            # 9. Post-processing Security
            await self._post_process_security(request, response)

            # Add security headers to response
            self._add_security_response_headers(response, security_checks_passed)

            # Log successful security processing
            processing_time = (time.time() - start_time) * 1000
            logger.debug(
                "Security processing completed",
                ip=client_ip,
                path=request.url.path,
                checks_passed=security_checks_passed,
                processing_time_ms=processing_time,
            )

            return response

        except HTTPException:
            raise
        except Exception as e:
            # Log security processing errors
            logger.error(
                "Security middleware error",
                ip=client_ip,
                path=request.url.path,
                error=str(e),
                checks_passed=security_checks_passed,
            )

            # Record security event for the error
            self.security_monitor.record_security_event(
                SecurityEventType.SUSPICIOUS_REQUEST,
                request,
                severity="medium",
                details={"error": "security_processing_error", "message": str(e)},
            )

            # Return generic error to avoid information disclosure
            return self._create_security_response(
                "Request processing failed", status_code=500
            )

    def _validate_request_headers(self, request: Request) -> dict:
        """Validate request headers for security issues"""
        validation_result: dict[str, Any] = {"valid": True, "details": {}}

        # Check for required headers on certain endpoints
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            # Only require Content-Type for endpoints that actually need a request body
            # Scoring endpoints use query parameters, not request body
            if (not content_type and
                request.url.path.startswith("/api/") and
                not request.url.path.startswith("/api/v1/scoring/")):
                validation_result["valid"] = False
                validation_result["details"]["missing_content_type"] = True

        # Check for suspicious header values
        suspicious_headers = ["x-forwarded-host", "x-original-host", "x-rewrite-url"]
        for header in suspicious_headers:
            if header in request.headers:
                value = request.headers[header]
                try:
                    security_validator.validate_and_sanitize_input(
                        value, input_type="general", max_length=200, strict_mode=True
                    )
                except InputValidationError:
                    validation_result["valid"] = False
                    validation_result["details"][f"suspicious_header_{header}"] = value[
                        :50
                    ]

        # Check User-Agent for suspicious patterns
        user_agent = request.headers.get("user-agent", "")
        if len(user_agent) > 1000:  # Unusually long user agent
            validation_result["valid"] = False
            validation_result["details"]["oversized_user_agent"] = len(user_agent)

        # Check for header injection attempts
        for header_name, header_value in request.headers.items():
            if "\n" in header_value or "\r" in header_value:
                validation_result["valid"] = False
                validation_result["details"]["header_injection_attempt"] = header_name

        return validation_result

    def _has_suspicious_path(self, path: str) -> bool:
        """Check if path contains suspicious patterns"""
        suspicious_patterns = [
            "../",
            "..\\",
            "%2e%2e%2f",
            "%2e%2e%5c",
            "//",
            "\\\\",
            "%00",
            "%0a",
            "%0d",
            "<script",
            "javascript:",
            "vbscript:",
            "union+select",
            "drop+table",
            "exec+master",
        ]

        path_lower = path.lower()
        return any(pattern in path_lower for pattern in suspicious_patterns)

    async def _validate_high_security_request(self, request: Request) -> bool:
        """Additional validation for high-security endpoints"""
        try:
            # Validate Content-Length for uploads
            if request.method in ["POST", "PUT", "PATCH"]:
                content_length = request.headers.get("content-length")
                if content_length:
                    try:
                        length = int(content_length)
                        max_size = (
                            settings.max_file_size_mb * 1024 * 1024
                        )  # Convert to bytes
                        if length > max_size:
                            return False
                    except ValueError:
                        return False

            # Additional authentication checks for admin endpoints
            if "/admin" in request.url.path:
                # Require additional authentication headers (case-insensitive)
                auth_header = request.headers.get("Authorization") or request.headers.get("authorization") or ""

                # Ensure header is a string (handle potential bytes issues)
                if isinstance(auth_header, bytes):
                    auth_header = auth_header.decode('utf-8')

                if not auth_header.startswith("Bearer "):
                    return False

            return True

        except Exception as e:
            logger.error("High-security validation error", error=str(e))
            return False

    async def _post_process_security(self, request: Request, response: Response):
        """Post-process security checks after request completion"""
        # Record failed authentication attempts
        if response.status_code == 401:
            self.security_monitor.detect_brute_force_attack(request, failed_auth=True)
            self.security_monitor.record_security_event(
                SecurityEventType.AUTHENTICATION_FAILURE,
                request,
                severity="medium",
                details={"status_code": response.status_code},
            )

        # Record authorization failures
        elif response.status_code == 403:
            self.security_monitor.record_security_event(
                SecurityEventType.AUTHORIZATION_FAILURE,
                request,
                severity="medium",
                details={"status_code": response.status_code},
            )

        # Record error responses for DDoS detection
        if response.status_code >= 400:
            self.rate_limiter.record_error_response(request, response.status_code)

    def _add_security_response_headers(self, response: Response, checks_passed: list):
        """Add security-related headers to response"""
        # Security processing confirmation
        response.headers["X-Security-Processed"] = "true"
        response.headers["X-Security-Checks"] = ",".join(checks_passed)

        # CSRF protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

        # Additional security headers based on environment
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
            response.headers["X-Security-Level"] = "production"
        else:
            response.headers["X-Security-Level"] = "development"

    def _create_security_response(
        self, message: str, status_code: int = 403
    ) -> JSONResponse:
        """Create standardized security error response"""
        return JSONResponse(
            status_code=status_code,
            content={
                "error": "Security validation failed",
                "message": message,
                "timestamp": time.time(),
                "security_processed": True,
            },
            headers={
                "X-Security-Processed": "true",
                "X-Security-Response": "blocked",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            },
        )

    def _create_rate_limit_response(self, reason: str) -> JSONResponse:
        """Create standardized rate limit response"""
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": reason,
                "retry_after": 60,
                "timestamp": time.time(),
            },
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + 60),
                "X-Security-Processed": "true",
            },
        )

    def _validate_query_parameters(self, request: Request) -> bool:
        """
        Context-aware validation for query parameters
        Allows legitimate parameter separators while blocking malicious content
        """
        try:
            import urllib.parse

            # Parse query parameters properly
            parsed_params = urllib.parse.parse_qs(str(request.url.query))

            # Define allowed parameter names for different endpoints
            allowed_params = {
                "scoring": [
                    "threshold",
                    "limit",
                    "urgency",
                    "category",
                    "store_id",
                    "days",
                    "force_recalculate",
                    "save_to_database",
                    "include_donation_rationale",
                ],
                "analytics": ["store_id", "days", "metric", "timeframe"],
                "general": ["page", "limit", "offset", "sort", "order", "filter"],
            }

            # Get endpoint type
            endpoint_type = "general"
            if "/scoring/" in request.url.path:
                endpoint_type = "scoring"
            elif "/analytics/" in request.url.path:
                endpoint_type = "analytics"

            # Validate each parameter
            for param_name, param_values in parsed_params.items():
                # Check if parameter name is allowed
                if (
                    param_name not in allowed_params[endpoint_type]
                    and param_name not in allowed_params["general"]
                ):
                    logger.warning(
                        f"Unexpected parameter: {param_name} for endpoint type: {endpoint_type}"
                    )
                    return False

                # Validate each parameter value
                for value in param_values:
                    if not self._validate_parameter_value(param_name, value):
                        return False

            return True

        except Exception as e:
            logger.error(f"Query parameter validation error: {e}")
            return False

    def _validate_parameter_value(self, param_name: str, value: str) -> bool:
        """Validate individual parameter values based on parameter type"""
        try:
            # Length check
            if len(value) > 100:  # Reasonable limit for URL parameters
                return False

            # Type-specific validation
            if param_name in ["threshold"]:
                # Should be a float between 0 and 1
                try:
                    float_val = float(value)
                    return 0.0 <= float_val <= 1.0
                except ValueError:
                    return False

            elif param_name in ["limit", "offset", "page", "days"]:
                # Should be positive integers
                try:
                    int_val = int(value)
                    return 0 < int_val <= 1000
                except ValueError:
                    return False

            elif param_name in ["store_id"]:
                # Should be UUID format
                import uuid as uuid_lib

                try:
                    uuid_lib.UUID(value)
                    return True
                except ValueError:
                    return False

            elif param_name in ["force_recalculate", "save_to_database", "include_donation_rationale"]:
                # Boolean parameters
                return value.lower() in ["true", "false", "1", "0"]

            elif param_name in [
                "urgency",
                "category",
                "metric",
                "timeframe",
                "sort",
                "order",
                "filter",
            ]:
                # Should be alphanumeric with limited special characters
                import re

                safe_pattern = r"^[a-zA-Z0-9_-]+$"
                return bool(re.match(safe_pattern, value)) and len(value) <= 50

            # For any other parameters, do basic safety checks
            dangerous_patterns = [
                "<script",
                "javascript:",
                "vbscript:",
                "onload=",
                "onerror=",
                "../",
                "..\\",
                ";",
                "|",
                "`",
                "$",
            ]
            value_lower = value.lower()
            return not any(pattern in value_lower for pattern in dangerous_patterns)

        except Exception as e:
            logger.error(f"Parameter value validation error: {e}")
            return False

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return getattr(request.client, "host", "unknown")
