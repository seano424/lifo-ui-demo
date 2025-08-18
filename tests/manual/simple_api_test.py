#!/usr/bin/env python3
"""
Simple API Testing Script for LIFO AI Engine
"""

import time

import requests

BASE_URL = "http://localhost:8000"


def test_endpoint(endpoint, method="GET", expected_codes=[200]):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    start_time = time.time()

    try:
        response = requests.request(method, url, timeout=10)
        response_time = (time.time() - start_time) * 1000

        success = response.status_code in expected_codes
        status = "✅ PASS" if success else "❌ FAIL"

        print(
            f"{status} {method} {endpoint} - {response.status_code} ({response_time:.0f}ms)"
        )

        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and "status" in data:
                    print(f"      Status: {data.get('status', 'unknown')}")
            except:
                print(f"      Response size: {len(response.content)} bytes")

        return success, response_time, response.status_code

    except Exception as e:
        print(f"❌ FAIL {method} {endpoint} - Error: {str(e)}")
        return False, 0, 0


def main():
    print("🧪 LIFO AI Engine - Simple API Testing")
    print("=" * 50)

    # Test basic endpoints
    endpoints = [
        "/",
        "/health",
        "/api/info",
        "/api/v1/health/health",
        "/api/v1/health/live",
        "/api/v1/health/ready",
        "/api/v1/health/supabase",
        "/api/v1/csv/info",
        "/api/v1/scoring/info",
        "/api/v1/analytics/overview",
        "/api/v1/mobile/scan-session",
        "/api/v1/vision/info",
        "/api/v1/donations/info",
    ]

    results = []
    total_tests = 0
    passed_tests = 0

    for endpoint in endpoints:
        # Allow various status codes for different endpoints
        expected = [200, 401, 422, 503] if "/health/" in endpoint else [200, 401, 422]
        success, response_time, status_code = test_endpoint(
            endpoint, expected_codes=expected
        )

        results.append(
            {
                "endpoint": endpoint,
                "success": success,
                "response_time": response_time,
                "status_code": status_code,
            }
        )

        total_tests += 1
        if success:
            passed_tests += 1

    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests / total_tests * 100):.1f}%")

    # Performance analysis
    avg_response_time = sum(r["response_time"] for r in results if r["success"]) / max(
        1, passed_tests
    )
    print(f"Average Response Time: {avg_response_time:.0f}ms")

    # Failed endpoints
    failed = [r for r in results if not r["success"]]
    if failed:
        print("\n❌ Failed Endpoints:")
        for f in failed:
            print(f"   {f['endpoint']} - {f['status_code']}")

    return results


if __name__ == "__main__":
    main()
