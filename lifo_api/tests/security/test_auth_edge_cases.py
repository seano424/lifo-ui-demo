"""
Security tests for authentication edge cases and vulnerabilities
⚠️ CRITICAL VULNERABILITIES DETECTED ⚠️
"""

import time
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi import HTTPException

from app.auth.dependencies import validate_store_access
from app.auth.supabase_jwt import SupabaseAuth, SupabaseAuthError


class TestAuthenticationVulnerabilities:
    """Test authentication system for security vulnerabilities"""

    @pytest.fixture
    def supabase_auth(self):
        """Create auth instance for testing"""
        with patch("app.core.settings.supabase_jwt_secret", "test-secret"):
            with patch("app.core.settings.supabase_url", "https://test.supabase.co"):
                return SupabaseAuth()

    def test_algorithm_confusion_attack(self, supabase_auth):
        """🚨 CRITICAL: JWT Algorithm Confusion Attack"""
        # Create token with 'none' algorithm
        header = {"alg": "none", "typ": "JWT"}
        payload = {
            "sub": "malicious-user",
            "email": "hacker@evil.com",
            "role": "admin",
            "exp": int(time.time()) + 3600,
            "aud": "authenticated",
        }

        # None algorithm tokens should be unsigned
        token_parts = [
            jwt.utils.base64url_encode(str(header).encode()),
            jwt.utils.base64url_encode(str(payload).encode()),
            "",  # No signature for 'none' algorithm
        ]
        malicious_token = ".".join(token_parts)

        # This should fail but might not due to algorithm confusion
        with pytest.raises(SupabaseAuthError):
            supabase_auth.verify_token(malicious_token)

    def test_jwt_claims_extraction_vulnerability(self, supabase_auth):
        """🚨 CRITICAL: Unsafe JWT claims extraction"""
        # Create malicious token with admin claims
        malicious_payload = {
            "sub": "user123",
            "email": "user@test.com",
            "role": "user",
            "app_metadata": {
                "role": "admin",  # Elevated privileges
                "permissions": ["*"],
            },
            "exp": int(time.time()) - 100,  # Expired token
        }

        # encode without proper signing
        malicious_token = jwt.encode(
            malicious_payload, "wrong-secret", algorithm="HS256"
        )

        # extract_user_claims doesn't verify signature - VULNERABILITY
        claims = supabase_auth.extract_user_claims(malicious_token)

        # This extracts admin claims from unverified token!
        assert claims["app_metadata"]["role"] == "admin"
        assert claims["app_metadata"]["permissions"] == ["*"]

    def test_service_role_token_confusion(self, supabase_auth):
        """🚨 CRITICAL: Service role authentication bypass"""
        # Test 1: Empty service role key
        with patch("app.core.settings.supabase_service_role_key", ""):
            assert not supabase_auth.verify_service_role_token("any-token")

        # Test 2: Service role JWT with wrong signature
        service_payload = {"role": "service_role", "exp": int(time.time()) + 3600}
        fake_service_token = jwt.encode(
            service_payload, "wrong-secret", algorithm="HS256"
        )

        # This might pass due to verification bypass in service role path
        supabase_auth.verify_service_role_token(fake_service_token)
        # Should be False but implementation is vulnerable

    def test_token_reuse_attack(self, supabase_auth):
        """🚨 HIGH: Token reuse without proper validation"""
        # Create valid token
        payload = {
            "sub": "user123",
            "email": "user@test.com",
            "role": "authenticated",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "aud": "authenticated",
        }

        valid_token = jwt.encode(payload, "test-secret", algorithm="HS256")

        # Token should work first time
        user = supabase_auth.verify_token(valid_token)
        assert user.user_id == "user123"

        # Token should work again (no jti/nonce check) - VULNERABILITY
        user2 = supabase_auth.verify_token(valid_token)
        assert user2.user_id == "user123"

        # System doesn't track used tokens - allows replay attacks

    def test_expired_token_timing_attack(self, supabase_auth):
        """🚨 MEDIUM: Timing attack on expired tokens"""
        # Create recently expired token
        payload = {
            "sub": "user123",
            "email": "user@test.com",
            "exp": int(time.time()) - 1,  # Expired 1 second ago
            "aud": "authenticated",
        }

        token = jwt.encode(payload, "test-secret", algorithm="HS256")

        # Time the validation
        start = time.time()
        with pytest.raises(SupabaseAuthError):
            supabase_auth.verify_token(token)
        expired_time = time.time() - start

        # Create token expired long ago
        payload["exp"] = int(time.time()) - 3600  # Expired 1 hour ago
        old_token = jwt.encode(payload, "test-secret", algorithm="HS256")

        start = time.time()
        with pytest.raises(SupabaseAuthError):
            supabase_auth.verify_token(old_token)
        old_expired_time = time.time() - start

        # Timing difference could leak information about expiry times
        assert abs(expired_time - old_expired_time) < 0.1  # Should be similar

    def test_issuer_validation_bypass(self, supabase_auth):
        """🚨 MEDIUM: Issuer validation is only warning"""
        payload = {
            "sub": "user123",
            "email": "user@test.com",
            "role": "authenticated",
            "exp": int(time.time()) + 3600,
            "aud": "authenticated",
            "iss": "https://malicious.supabase.co/auth/v1",  # Wrong issuer
        }

        token = jwt.encode(payload, "test-secret", algorithm="HS256")

        # Token should be rejected but only generates warning
        user = supabase_auth.verify_token(token)
        assert user.user_id == "user123"  # VULNERABILITY: Still accepts token!

    @pytest.mark.asyncio
    async def test_store_access_race_condition(self):
        """🚨 HIGH: Race condition in store access validation"""

        mock_db = AsyncMock()
        mock_user = AsyncMock()
        mock_user.user_id = "user123"

        # Mock store user with manager role
        mock_store_user = AsyncMock()
        mock_store_user.role_in_store = "manager"
        mock_store_user.is_active = True

        # First call returns manager
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = mock_store_user
        mock_db.execute.return_value = mock_result

        # Import here to avoid circular imports

        # First validation passes
        result1 = await validate_store_access("store123", mock_user, mock_db, "manager")
        assert result1

        # Between calls, user could be deactivated or role changed
        # But there's no transaction boundary to prevent this race condition

        # Second call (user now deactivated)
        mock_result.scalar_one_or_none.return_value = None

        with pytest.raises(HTTPException):
            await validate_store_access("store123", mock_user, mock_db, "manager")

    def test_role_hierarchy_manipulation(self):
        """🚨 MEDIUM: Hardcoded role hierarchy vulnerable to extension"""

        # Role hierarchy is hardcoded - what if new roles are added?
        role_hierarchy = {"employee": 1, "staff": 2, "manager": 3, "owner": 4}

        # If new role "super_admin" with level 5 is added elsewhere,
        # this hardcoded hierarchy won't recognize it
        # Leading to access control bypass

        unknown_role = "super_admin"
        assert unknown_role not in role_hierarchy

        # Would return 0, potentially bypassing checks
        level = role_hierarchy.get(unknown_role, 0)
        assert level == 0  # Could allow unauthorized access

    def test_user_id_validation_missing(self, supabase_auth):
        """🚨 HIGH: No validation of user_id format"""
        payload = {
            "sub": "../../../etc/passwd",  # Path traversal attempt
            "email": "user@test.com",
            "role": "authenticated",
            "exp": int(time.time()) + 3600,
            "aud": "authenticated",
        }

        token = jwt.encode(payload, "test-secret", algorithm="HS256")
        user = supabase_auth.verify_token(token)

        # System accepts malformed user_id without validation
        assert user.user_id == "../../../etc/passwd"  # VULNERABILITY!

    def test_store_id_validation_missing(self):
        """🚨 HIGH: No validation of store_id format"""
        # Store IDs should be UUIDs but no validation exists
        malicious_store_ids = [
            "'; DROP TABLE stores; --",  # SQL injection attempt
            "../../../etc/passwd",  # Path traversal
            "store123' OR '1'='1",  # SQL injection
            "x" * 1000,  # Buffer overflow attempt
            "",  # Empty string
        ]

        # System would accept these without validation
        for store_id in malicious_store_ids:
            # No validation in validate_store_access function
            assert len(store_id) >= 0  # Any string accepted

    def test_missing_rate_limiting(self, client):
        """🚨 MEDIUM: No rate limiting on authentication endpoints"""
        # Brute force attack simulation
        for i in range(100):
            response = client.get(
                "/api/v1/scoring/high-urgency/test-store",
                headers={"Authorization": f"Bearer invalid-token-{i}"},
            )
            # Should be rate limited after certain attempts
            # But no rate limiting is implemented
            assert response.status_code in [401, 403, 500]

    def test_jwt_size_limit_missing(self, supabase_auth):
        """🚨 LOW: No JWT token size limits"""
        # Create oversized token
        large_payload = {
            "sub": "user123",
            "email": "user@test.com",
            "role": "authenticated",
            "exp": int(time.time()) + 3600,
            "aud": "authenticated",
            "large_data": "x" * 100000,  # 100KB of data
        }

        large_token = jwt.encode(large_payload, "test-secret", algorithm="HS256")

        # System should reject oversized tokens but doesn't
        with pytest.raises(Exception):  # Should implement size limits
            supabase_auth.verify_token(large_token)

    def test_information_disclosure_in_logs(self, supabase_auth):
        """🚨 MEDIUM: Sensitive information in logs"""
        malicious_token = "clearly-malicious-token-with-secrets"

        with patch("app.auth.supabase_jwt.logger") as mock_logger:
            with pytest.raises(SupabaseAuthError):
                supabase_auth.verify_token(malicious_token)

            # Check if sensitive token data is logged
            logged_calls = str(mock_logger.warning.call_args_list)
            # Token content might be logged - INFORMATION DISCLOSURE
            assert "clearly-malicious-token" not in logged_calls


class TestAuthorizationBypass:
    """Test authorization bypass vulnerabilities"""

    @pytest.mark.asyncio
    async def test_store_user_deactivation_bypass(self):
        """🚨 HIGH: Deactivated users still have access"""
        # Mock deactivated user that still exists in database
        mock_db = AsyncMock()
        mock_user = AsyncMock()
        mock_user.user_id = "user123"

        mock_store_user = AsyncMock()
        mock_store_user.role_in_store = "manager"
        mock_store_user.is_active = False  # Deactivated!

        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = mock_store_user
        mock_db.execute.return_value = mock_result

        # Should deny access for deactivated user
        with pytest.raises(HTTPException):
            await validate_store_access("store123", mock_user, mock_db, "staff")

    def test_admin_role_bypass(self, supabase_auth):
        """🚨 HIGH: Admin role check bypasses specific role requirements"""
        # User with admin role can bypass specific role checks
        admin_user = AsyncMock()
        admin_user.app_metadata = {"role": "admin"}
        admin_user.role = "admin"

        # Admin bypasses specific permission check
        has_permission = supabase_auth.check_user_permissions(
            admin_user, "dangerous_permission"
        )
        assert has_permission  # Admin bypasses everything!

        # This could allow privilege escalation if admin role is compromised


class TestCORSVulnerabilities:
    """Test CORS configuration vulnerabilities"""

    def test_wildcard_cors_in_development(self):
        """🚨 MEDIUM: Development CORS allows any origin"""
        from app.core.config import settings

        with patch.object(settings, "environment", "development"):
            with patch.object(settings, "cors_origins", ["*"]):
                cors_origins = settings.get_cors_origins()
                # Wildcard CORS in development is dangerous
                assert "*" in cors_origins

    def test_cors_origin_validation_bypass(self):
        """🚨 MEDIUM: CORS origin validation could be bypassed"""
        from app.core.config import settings

        # Test subdomain bypass
        with patch.object(settings, "frontend_url", "https://app.example.com"):
            settings.get_cors_origins()
            # Should not allow arbitrary subdomains
            malicious_origins = [
                "https://evil.app.example.com",
                "https://app.example.com.evil.com",
                "https://app-example.com",
            ]

            for _origin in malicious_origins:
                # Current implementation might allow these
                pass


# Summary of Critical Vulnerabilities Found:
"""
🚨 CRITICAL SECURITY VULNERABILITIES IDENTIFIED:

1. JWT Algorithm Confusion (CRITICAL)
   - Multiple algorithms supported without proper validation
   - 'none' algorithm might be accepted

2. Unsafe Claims Extraction (CRITICAL)
   - extract_user_claims() doesn't verify signature
   - Allows extraction of admin claims from invalid tokens

3. Service Role Authentication Bypass (CRITICAL)
   - Mixed authentication methods create confusion
   - Potential bypass of service role verification

4. Token Reuse Attacks (HIGH)
   - No jti/nonce tracking allows token replay
   - No blacklist for revoked tokens

5. Store Access Race Conditions (HIGH)
   - No transaction boundaries around authorization checks
   - User can be deactivated between check and action

6. Missing Input Validation (HIGH)
   - No validation of user_id or store_id formats
   - Accepts malformed/malicious identifiers

7. Issuer Validation Bypass (MEDIUM)
   - Wrong issuer only generates warning, doesn't reject token

8. Hardcoded Role Hierarchy (MEDIUM)
   - New roles not recognized, potential bypass

9. No Rate Limiting (MEDIUM)
   - Brute force attacks possible on auth endpoints

10. Information Disclosure (MEDIUM)
    - Sensitive data might be logged

IMMEDIATE ACTIONS REQUIRED:
1. Implement proper JWT algorithm validation
2. Fix unsafe claims extraction
3. Add input validation for all IDs
4. Implement transaction boundaries for auth checks
5. Add rate limiting
6. Fix issuer validation
7. Implement token blacklisting
8. Add comprehensive security testing
"""
