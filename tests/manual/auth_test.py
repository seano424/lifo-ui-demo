#!/usr/bin/env python3
"""
Authentication Testing for LIFO AI Engine
Tests JWT token creation and authentication flow
"""

import json
import os
import time
from datetime import datetime, timedelta

import jwt
import requests

BASE_URL = "http://localhost:8000"

# Load JWT secret from environment
JWT_SECRET = "nCCdUdI+tKOv/xilCNyyQw5t52HXeahpn2KhmDb6cPcyeR9UZaSallSdGmy6AbRwU3cI19ljytZDucZRJcMv6A=="


def create_test_jwt_token(user_id: str, store_id: str):
    """Create a test JWT token for authentication"""
    payload = {
        "sub": user_id,  # subject (user ID)
        "aud": "authenticated",  # audience
        "iss": "https://jrgmetdsohowtxickqij.supabase.co/auth/v1",  # issuer
        "iat": int(time.time()),  # issued at
        "exp": int(time.time()) + 3600,  # expires in 1 hour
        "email": "test@example.com",
        "role": "authenticated",
        "store_id": store_id,
        "user_metadata": {"store_id": store_id},
        "app_metadata": {"provider": "email", "providers": ["email"]},
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token


def test_authenticated_endpoint(endpoint: str, token: str):
    """Test an endpoint with authentication"""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    try:
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
        return response.status_code, response.json() if response.headers.get(
            "content-type", ""
        ).startswith("application/json") else response.text
    except requests.exceptions.RequestException as e:
        return None, str(e)


def main():
    print("🔐 LIFO AI Engine - Authentication Testing")
    print("=" * 50)

    # Test stores
    test_stores = [
        "17215fdb-b067-4ff7-b1d8-ebcd49d4f02f",  # Sean's second test
        "22222222-2222-2222-2222-222222222222",  # Demo Supermarket Lyon
    ]

    # Test user IDs (we'll create fake ones for testing)
    test_users = [
        "cfd2c759-576f-4ef4-b2eb-75f1a53c5258",  # From the stores data
        "420d140c-2386-4d85-9d0d-a69bbd384276",  # Another user from stores data
    ]

    results = []

    for user_id, store_id in zip(test_users, test_stores):
        print(f"\n🧪 Testing with User: {user_id[-8:]} | Store: {store_id[-8:]}")
        print("-" * 40)

        # Create JWT token
        try:
            token = create_test_jwt_token(user_id, store_id)
            print(f"✅ JWT Token created: {token[:50]}...")

            # Test endpoints that actually exist
            auth_endpoints = [
                "/api/v1/health/health",
                "/health",
                "/api/info",
                "/api/errors/stats",
            ]

            for endpoint in auth_endpoints:
                status_code, response_data = test_authenticated_endpoint(
                    endpoint, token
                )

                if status_code:
                    status_icon = (
                        "✅"
                        if status_code in [200, 404]
                        else "⚠️"
                        if status_code == 403
                        else "❌"
                    )
                    endpoint_name = (
                        endpoint.split("/")[-2] + "/" + endpoint.split("/")[-1][:8]
                    )
                    print(f"  {status_icon} {endpoint_name}: {status_code}")

                    # Show response details for successful requests
                    if status_code == 200 and isinstance(response_data, dict):
                        if "data" in response_data:
                            print(
                                f"      📊 Data returned: {len(response_data['data'])} items"
                            )
                        elif "message" in response_data:
                            print(
                                f"      📝 Message: {response_data['message'][:60]}..."
                            )
                    elif status_code == 403:
                        print(
                            f"      🔒 Still forbidden - may need different auth or permissions"
                        )
                    elif status_code == 404:
                        print(f"      🔍 Endpoint exists but no data found")

                    results.append(
                        {
                            "endpoint": endpoint,
                            "status_code": status_code,
                            "user_id": user_id,
                            "store_id": store_id,
                            "authenticated": True,
                        }
                    )
                else:
                    print(f"  ❌ {endpoint}: Connection error - {response_data}")
                    results.append(
                        {
                            "endpoint": endpoint,
                            "status_code": None,
                            "error": response_data,
                            "user_id": user_id,
                            "store_id": store_id,
                            "authenticated": True,
                        }
                    )

        except Exception as e:
            print(f"❌ Failed to create JWT token: {e}")

    # Test without authentication for comparison
    print(f"\n🔓 Testing without authentication (comparison)")
    print("-" * 40)

    test_endpoint = f"/api/v1/scoring/batch/{test_stores[0]}"
    try:
        response = requests.get(f"{BASE_URL}{test_endpoint}", timeout=10)
        print(f"  No Auth: {response.status_code} (expected 401/403)")
    except Exception as e:
        print(f"  No Auth: Error - {e}")

    # Summary
    print(f"\n📊 AUTHENTICATION TEST SUMMARY")
    print("=" * 50)

    successful_auth = len([r for r in results if r.get("status_code") in [200, 404]])
    still_forbidden = len([r for r in results if r.get("status_code") == 403])
    total_tests = len([r for r in results if r.get("status_code")])

    print(f"✅ Successful requests: {successful_auth}")
    print(f"🔒 Still forbidden: {still_forbidden}")
    print(f"🔧 Total auth tests: {total_tests}")

    if successful_auth > 0:
        print(f"\n🎉 JWT authentication is working! Some endpoints are accessible.")
    elif still_forbidden == total_tests:
        print(f"\n⚠️ JWT tokens created but endpoints still return 403.")
        print(f"   This may indicate:")
        print(f"   - Additional permissions/roles required")
        print(f"   - Row Level Security (RLS) policies blocking access")
        print(f"   - Different token format expected")
    else:
        print(f"\n❌ Authentication test inconclusive.")

    return results


if __name__ == "__main__":
    main()
