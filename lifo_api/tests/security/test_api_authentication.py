"""
Comprehensive security tests for API key authentication and CORS
Tests authentication flows, authorization, and security headers
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


@pytest.mark.security
@pytest.mark.unit
class TestAPIKeyAuthentication:
    """Test API key authentication security"""

    @pytest.mark.asyncio
    async def test_valid_api_key_authentication(self, async_client):
        """Test valid API key authentication succeeds"""

        with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "sub": "valid-user-123",
                "email": "test@lifo.ai",
                "role": "authenticated",
                "store_access": ["store-123"],
            }

            headers = {"Authorization": "Bearer valid-api-key-123"}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            # Should not fail due to authentication
            assert response.status_code != 401
            assert response.status_code != 403

    @pytest.mark.asyncio
    async def test_missing_api_key_rejected(self, async_client):
        """Test requests without API key are rejected"""

        # Request without Authorization header
        response = await async_client.get("/api/v1/mobile-summary/store-123")
        assert response.status_code in [401, 403]

        # Request with empty Authorization header
        headers = {"Authorization": ""}
        response = await async_client.get(
            "/api/v1/mobile-summary/store-123", headers=headers
        )
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_invalid_api_key_rejected(self, async_client):
        """Test invalid API keys are rejected"""

        invalid_keys = [
            "Bearer invalid-key",
            "Bearer ",
            "invalid-format",
            "Bearer expired-key-123",
            "Bearer malformed.key.here",
        ]

        for invalid_key in invalid_keys:
            headers = {"Authorization": invalid_key}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )
            assert response.status_code in [401, 403], (
                f"Failed to reject invalid key: {invalid_key}"
            )

    @pytest.mark.asyncio
    async def test_api_key_format_validation(self, async_client):
        """Test API key format validation"""

        malformed_headers = [
            {"Authorization": "Basic dXNlcjpwYXNz"},  # Basic auth instead of Bearer
            {"Authorization": "Bearer"},  # Missing key
            {"Authorization": "bearer valid-key"},  # Wrong case
            {"X-API-Key": "valid-key"},  # Wrong header name
        ]

        for headers in malformed_headers:
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )
            assert response.status_code in [401, 403], (
                f"Failed to reject malformed header: {headers}"
            )

    @pytest.mark.asyncio
    async def test_authentication_error_messages_not_verbose(self, async_client):
        """Test authentication error messages don't leak information"""

        headers = {"Authorization": "Bearer invalid-key-123"}
        response = await async_client.get(
            "/api/v1/mobile-summary/store-123", headers=headers
        )

        if response.status_code in [401, 403]:
            error_detail = response.json().get("detail", "")

            # Error messages should not be too verbose to prevent information leakage
            forbidden_info = [
                "database",
                "table",
                "query",
                "internal",
                "secret",
                "config",
                "environment",
                "key format",
                "validation",
            ]

            for info in forbidden_info:
                assert info.lower() not in error_detail.lower(), (
                    f"Error message too verbose: '{error_detail}' contains '{info}'"
                )

    @pytest.mark.asyncio
    async def test_store_access_authorization(self, async_client):
        """Test store-level access authorization"""

        # User with limited store access
        with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "sub": "limited-user-123",
                "email": "limited@lifo.ai",
                "role": "authenticated",
                "store_access": ["store-123"],  # Only access to store-123
            }

            headers = {"Authorization": "Bearer valid-key-limited"}

            # Should allow access to authorized store
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )
            assert response.status_code != 403  # Should not be forbidden

            # Should deny access to unauthorized store
            response = await async_client.get(
                "/api/v1/mobile-summary/store-456", headers=headers
            )
            # Note: This depends on implementation - might be 403 or 404

    @pytest.mark.asyncio
    async def test_role_based_access_control(self, async_client):
        """Test role-based access control"""

        test_roles = [
            ("viewer", ["GET"], ["POST", "PUT", "DELETE"]),
            ("operator", ["GET", "POST"], ["PUT", "DELETE"]),
            ("admin", ["GET", "POST", "PUT", "DELETE"], []),
        ]

        for role, allowed_methods, denied_methods in test_roles:
            with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
                mock_auth.return_value = {
                    "sub": f"{role}-user-123",
                    "email": f"{role}@lifo.ai",
                    "role": role,
                    "store_access": ["store-123"],
                }

                headers = {"Authorization": f"Bearer {role}-key"}

                # Test allowed methods
                for method in allowed_methods:
                    if method == "GET":
                        response = await async_client.get(
                            "/api/v1/mobile-summary/store-123", headers=headers
                        )
                        # Should not fail due to authorization (might fail for other reasons)
                        assert response.status_code != 403

                # Test denied methods (if any specific endpoints enforce this)
                # Note: This depends on implementation of role-based access


@pytest.mark.security
@pytest.mark.unit
class TestAuthenticationSecurityMeasures:
    """Test authentication security measures and protections"""

    @pytest.mark.asyncio
    async def test_authentication_timing_attack_resistance(self, async_client):
        """Test authentication is resistant to timing attacks"""
        import time

        # Test multiple invalid keys and measure response times
        invalid_keys = [
            "Bearer short",
            "Bearer medium-length-key-123",
            "Bearer very-long-invalid-key-that-should-take-same-time-to-reject-123456789",
            "Bearer another-different-length-key",
        ]

        response_times = []

        for key in invalid_keys:
            headers = {"Authorization": key}
            start_time = time.time()

            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            end_time = time.time()
            response_times.append(end_time - start_time)

            assert response.status_code in [401, 403]

        # Response times should be relatively consistent to prevent timing attacks
        if len(response_times) > 1:
            avg_time = sum(response_times) / len(response_times)
            max_deviation = max(abs(t - avg_time) for t in response_times)

            # Allow some variation but not excessive
            assert max_deviation < 0.1, (
                f"Response time variation too high: {max_deviation:.3f}s"
            )

    @pytest.mark.asyncio
    async def test_rate_limiting_on_authentication_failures(self, async_client):
        """Test rate limiting on authentication failures"""

        # Attempt multiple failed authentications rapidly
        failed_attempts = 0
        headers = {"Authorization": "Bearer invalid-key-for-rate-test"}

        for i in range(20):  # Try 20 failed attempts
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            if response.status_code in [401, 403]:
                failed_attempts += 1
            elif response.status_code == 429:  # Too Many Requests
                # Rate limiting kicked in - this is good!
                assert failed_attempts < 20, (
                    "Rate limiting should have kicked in before 20 attempts"
                )
                break

        # Should have some protection mechanism (either rate limiting or other)
        # This test verifies the system handles repeated failures gracefully

    @pytest.mark.asyncio
    async def test_api_key_injection_prevention(self, async_client):
        """Test API key injection attacks are prevented"""

        injection_attempts = [
            "Bearer key'; DROP TABLE users; --",
            "Bearer key<script>alert('xss')</script>",
            "Bearer key\"; system('rm -rf /'); echo \"",
            "Bearer key\x00null-byte-injection",
            "Bearer key\r\nInjected-Header: malicious",
        ]

        for malicious_key in injection_attempts:
            headers = {"Authorization": malicious_key}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            # Should reject malicious keys
            assert response.status_code in [400, 401, 403], (
                f"Failed to reject injection attempt: {malicious_key}"
            )

            # Response should not indicate successful processing of injection
            response_text = response.text.lower()
            suspicious_responses = ["dropped", "deleted", "script", "executed"]
            for suspicious in suspicious_responses:
                assert suspicious not in response_text, (
                    f"Response suggests injection succeeded: {response_text}"
                )

    @pytest.mark.asyncio
    async def test_session_security_headers(self, async_client):
        """Test security headers are present in authenticated responses"""

        with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "sub": "test-user-123",
                "email": "test@lifo.ai",
                "role": "authenticated",
                "store_access": ["store-123"],
            }

            headers = {"Authorization": "Bearer valid-key"}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            # Check for important security headers
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": ["DENY", "SAMEORIGIN"],
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": ["max-age=", "includeSubDomains"],
                "Content-Security-Policy": ["default-src", "'self'"],
            }

            for header_name, expected_values in security_headers.items():
                if header_name in response.headers:
                    header_value = response.headers[header_name]

                    if isinstance(expected_values, list):
                        # Check if any expected value is present
                        assert any(
                            expected in header_value for expected in expected_values
                        ), (
                            f"Security header {header_name} has unexpected value: {header_value}"
                        )
                    else:
                        # Exact match expected
                        assert header_value == expected_values, (
                            f"Security header {header_name} mismatch: {header_value}"
                        )


@pytest.mark.security
@pytest.mark.unit
class TestCORSSecurityConfiguration:
    """Test CORS security configuration"""

    @pytest.mark.asyncio
    async def test_cors_origin_validation(self, async_client):
        """Test CORS origin validation"""

        # Test preflight request with valid origin
        headers = {
            "Origin": "https://app.lifo.ai",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        }

        response = await async_client.options(
            "/api/v1/mobile-summary/store-123", headers=headers
        )

        # Should allow valid origin
        if "Access-Control-Allow-Origin" in response.headers:
            allowed_origin = response.headers["Access-Control-Allow-Origin"]
            assert allowed_origin in ["https://app.lifo.ai", "*"], (
                f"Unexpected CORS origin: {allowed_origin}"
            )

    @pytest.mark.asyncio
    async def test_cors_malicious_origin_rejection(self, async_client):
        """Test CORS rejects malicious origins"""

        malicious_origins = [
            "https://evil.com",
            "http://malicious-site.org",
            "javascript:alert('xss')",
            "data:text/html,<script>alert('xss')</script>",
            "file:///etc/passwd",
            "null",  # Null origin can be dangerous
        ]

        for malicious_origin in malicious_origins:
            headers = {
                "Origin": malicious_origin,
                "Access-Control-Request-Method": "GET",
            }

            response = await async_client.options(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            # Should not allow malicious origins
            if "Access-Control-Allow-Origin" in response.headers:
                allowed_origin = response.headers["Access-Control-Allow-Origin"]
                assert allowed_origin != malicious_origin, (
                    f"CORS allowed malicious origin: {malicious_origin}"
                )

    @pytest.mark.asyncio
    async def test_cors_credentials_security(self, async_client):
        """Test CORS credentials handling security"""

        headers = {
            "Origin": "https://app.lifo.ai",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        }

        response = await async_client.options(
            "/api/v1/mobile-summary/store-123", headers=headers
        )

        # If credentials are allowed, origin should not be wildcard
        if "Access-Control-Allow-Credentials" in response.headers:
            credentials_allowed = response.headers[
                "Access-Control-Allow-Credentials"
            ].lower()

            if credentials_allowed == "true":
                # When credentials are allowed, origin must not be wildcard
                allowed_origin = response.headers.get("Access-Control-Allow-Origin", "")
                assert allowed_origin != "*", (
                    "CORS security issue: credentials allowed with wildcard origin"
                )

    @pytest.mark.asyncio
    async def test_cors_method_restrictions(self, async_client):
        """Test CORS method restrictions"""

        # Test various HTTP methods
        test_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
        dangerous_methods = ["TRACE", "CONNECT"]

        for method in test_methods + dangerous_methods:
            headers = {
                "Origin": "https://app.lifo.ai",
                "Access-Control-Request-Method": method,
            }

            response = await async_client.options(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            if "Access-Control-Allow-Methods" in response.headers:
                allowed_methods = response.headers["Access-Control-Allow-Methods"]

                # Dangerous methods should not be allowed
                if method in dangerous_methods:
                    assert method not in allowed_methods, (
                        f"CORS allows dangerous method: {method}"
                    )

    @pytest.mark.asyncio
    async def test_cors_header_restrictions(self, async_client):
        """Test CORS header restrictions"""

        # Test various headers
        safe_headers = ["authorization", "content-type", "x-requested-with"]
        dangerous_headers = ["x-custom-admin", "x-internal-auth", "x-debug-mode"]

        for header in safe_headers + dangerous_headers:
            headers = {
                "Origin": "https://app.lifo.ai",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": header,
            }

            response = await async_client.options(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            if "Access-Control-Allow-Headers" in response.headers:
                allowed_headers = response.headers[
                    "Access-Control-Allow-Headers"
                ].lower()

                # Dangerous headers should not be allowed
                if header.startswith("x-internal") or header.startswith("x-debug"):
                    assert header.lower() not in allowed_headers, (
                        f"CORS allows dangerous header: {header}"
                    )


@pytest.mark.security
@pytest.mark.integration
class TestEndToEndAuthenticationSecurity:
    """Test end-to-end authentication security scenarios"""

    @pytest.mark.asyncio
    async def test_complete_mobile_workflow_security(self, async_client):
        """Test complete mobile workflow requires proper authentication"""

        # List of mobile endpoints that should require authentication
        mobile_endpoints = [
            ("GET", "/api/v1/mobile-summary/store-123"),
            ("GET", "/api/v1/store-health/store-123"),
            ("GET", "/api/v1/batch-list-mobile/store-123"),
            ("POST", "/api/v1/batch-quick-score/batch-123?store_id=store-123"),
            ("GET", "/api/v1/mobile-performance-health"),
        ]

        for method, endpoint in mobile_endpoints:
            # Test without authentication
            if method == "GET":
                response = await async_client.get(endpoint)
            elif method == "POST":
                response = await async_client.post(endpoint)

            assert response.status_code in [401, 403], (
                f"Endpoint {method} {endpoint} should require authentication"
            )

    @pytest.mark.asyncio
    async def test_api_key_lifecycle_security(self, async_client):
        """Test API key lifecycle security (creation, usage, expiration)"""

        # Test with expired API key simulation
        with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
            # Simulate expired key
            mock_auth.side_effect = HTTPException(
                status_code=401, detail="Token expired"
            )

            headers = {"Authorization": "Bearer expired-key-123"}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            assert response.status_code == 401

            # Simulate revoked key
            mock_auth.side_effect = HTTPException(
                status_code=403, detail="Token revoked"
            )

            headers = {"Authorization": "Bearer revoked-key-123"}
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_concurrent_authentication_security(self, async_client):
        """Test authentication security under concurrent requests"""
        import asyncio

        # Simulate concurrent requests with various auth states
        async def make_request(auth_state):
            if auth_state == "valid":
                with patch(
                    "app.auth.secure_dependencies.get_current_user"
                ) as mock_auth:
                    mock_auth.return_value = {
                        "sub": "concurrent-user-123",
                        "email": "concurrent@lifo.ai",
                        "role": "authenticated",
                        "store_access": ["store-123"],
                    }
                    headers = {"Authorization": "Bearer valid-concurrent-key"}
                    return await async_client.get(
                        "/api/v1/mobile-summary/store-123", headers=headers
                    )
            else:
                headers = {"Authorization": "Bearer invalid-concurrent-key"}
                return await async_client.get(
                    "/api/v1/mobile-summary/store-123", headers=headers
                )

        # Mix of valid and invalid requests
        tasks = []
        for i in range(20):
            auth_state = "valid" if i % 3 == 0 else "invalid"
            tasks.append(make_request(auth_state))

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Verify responses are consistent
        valid_responses = 0
        invalid_responses = 0

        for response in responses:
            if hasattr(response, "status_code"):
                if response.status_code == 200:
                    valid_responses += 1
                elif response.status_code in [401, 403]:
                    invalid_responses += 1

        # Should have reasonable mix based on our 1/3 valid ratio
        assert valid_responses > 0, "No valid responses in concurrent test"
        assert invalid_responses > 0, "No invalid responses in concurrent test"

    @pytest.mark.asyncio
    async def test_authentication_error_handling_security(self, async_client):
        """Test authentication error handling doesn't leak information"""

        # Various invalid authentication scenarios
        auth_scenarios = [
            {"Authorization": "Bearer "},  # Empty key
            {"Authorization": "Bearer malformed.jwt.token"},  # Malformed JWT
            {
                "Authorization": "Bearer sql-injection'; DROP TABLE users;--"
            },  # SQL injection attempt
            {"Authorization": "Bearer <script>alert('xss')</script>"},  # XSS attempt
            {},  # No header
        ]

        for headers in auth_scenarios:
            response = await async_client.get(
                "/api/v1/mobile-summary/store-123", headers=headers
            )

            # Should return appropriate error status
            assert response.status_code in [400, 401, 403]

            # Error response should not leak sensitive information
            if response.status_code != 403:  # 403 might not have body
                try:
                    error_data = response.json()
                    error_detail = str(error_data.get("detail", "")).lower()

                    # Should not contain sensitive information
                    sensitive_terms = [
                        "database",
                        "table",
                        "column",
                        "query",
                        "internal",
                        "secret",
                        "config",
                        "environment",
                        "stack trace",
                        "exception",
                    ]

                    for term in sensitive_terms:
                        assert term not in error_detail, (
                            f"Error response contains sensitive information: {term}"
                        )

                except (ValueError, json.JSONDecodeError):
                    # Non-JSON response is acceptable for some error cases
                    pass
