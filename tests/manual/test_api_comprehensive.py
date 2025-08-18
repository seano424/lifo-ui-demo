#!/usr/bin/env python3
"""
Comprehensive API Testing Script for LIFO AI Engine
Tests all endpoints with realistic data and scenarios
"""

import asyncio
import json
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

# Configuration
BASE_URL = "http://localhost:8000"
API_V1_PREFIX = "/api/v1"


class APITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update(
            {"Content-Type": "application/json", "User-Agent": "LIFO-API-Tester/1.0"}
        )

        # Test results storage
        self.test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": [],
            "performance_metrics": {},
            "start_time": time.time(),
        }

        # JWT token for authenticated requests
        self.auth_token = None

    def log_test(
        self,
        test_name: str,
        passed: bool,
        response_time: float,
        status_code: Optional[int] = None,
        error: Optional[str] = None,
        details: Optional[Dict] = None,
    ):
        """Log test results"""
        self.test_results["total_tests"] += 1
        if passed:
            self.test_results["passed_tests"] += 1
        else:
            self.test_results["failed_tests"] += 1

        test_detail = {
            "test_name": test_name,
            "passed": passed,
            "response_time_ms": round(response_time * 1000, 2),
            "status_code": status_code,
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "details": details or {},
        }

        self.test_results["test_details"].append(test_detail)

        # Log to console
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name} ({test_detail['response_time_ms']}ms)")
        if error:
            print(f"      Error: {error}")

    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with timing"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            raise Exception(f"Request failed: {str(e)}")

    def test_health_endpoints(self):
        """Test all health and status endpoints"""
        print("\n🏥 Testing Health & Status Endpoints")
        print("=" * 50)

        # Test root endpoint
        try:
            response, response_time = self.make_request("GET", "/")
            self.log_test(
                "Root Endpoint",
                response.status_code == 200,
                response_time,
                response.status_code,
                details={"response_size": len(response.content)},
            )
        except Exception as e:
            self.log_test("Root Endpoint", False, 0, error=str(e))

        # Test main health endpoint
        try:
            response, response_time = self.make_request("GET", "/health")
            self.log_test(
                "Main Health Check",
                response.status_code == 200,
                response_time,
                response.status_code,
            )
        except Exception as e:
            self.log_test("Main Health Check", False, 0, error=str(e))

        # Test API info endpoint
        try:
            response, response_time = self.make_request("GET", "/api/info")
            self.log_test(
                "API Info Endpoint",
                response.status_code == 200,
                response_time,
                response.status_code,
            )
        except Exception as e:
            self.log_test("API Info Endpoint", False, 0, error=str(e))

        # Test detailed health endpoints
        health_endpoints = [
            f"{API_V1_PREFIX}/health/health",
            f"{API_V1_PREFIX}/health/supabase",
            f"{API_V1_PREFIX}/health/database",
            f"{API_V1_PREFIX}/health/ready",
            f"{API_V1_PREFIX}/health/live",
        ]

        for endpoint in health_endpoints:
            try:
                response, response_time = self.make_request("GET", endpoint)
                test_name = f"Health Check: {endpoint.split('/')[-1]}"
                self.log_test(
                    test_name,
                    response.status_code
                    in [200, 503],  # 503 is acceptable for health checks
                    response_time,
                    response.status_code,
                )
            except Exception as e:
                self.log_test(
                    f"Health Check: {endpoint.split('/')[-1]}", False, 0, error=str(e)
                )

    def test_mobile_endpoints(self):
        """Test mobile-optimized endpoints"""
        print("\n📱 Testing Mobile Endpoints")
        print("=" * 50)

        mobile_endpoints = [
            f"{API_V1_PREFIX}/mobile/scan-session",
            f"{API_V1_PREFIX}/mobile/quick-score",
        ]

        for endpoint in mobile_endpoints:
            try:
                # Test GET request
                response, response_time = self.make_request("GET", endpoint)
                test_name = f"Mobile GET: {endpoint.split('/')[-1]}"

                # Mobile endpoints should respond quickly (< 500ms target)
                performance_ok = response_time < 0.5
                status_ok = response.status_code in [
                    200,
                    401,
                    422,
                ]  # 401 if auth required, 422 if params needed

                self.log_test(
                    test_name,
                    status_ok,
                    response_time,
                    response.status_code,
                    details={"performance_target_met": performance_ok},
                )

                # Store performance metric
                if endpoint not in self.test_results["performance_metrics"]:
                    self.test_results["performance_metrics"][endpoint] = []
                self.test_results["performance_metrics"][endpoint].append(response_time)

            except Exception as e:
                self.log_test(
                    f"Mobile: {endpoint.split('/')[-1]}", False, 0, error=str(e)
                )

    def test_csv_endpoints(self):
        """Test CSV upload and processing endpoints"""
        print("\n📊 Testing CSV Processing Endpoints")
        print("=" * 50)

        # Test CSV info endpoint
        try:
            response, response_time = self.make_request(
                "GET", f"{API_V1_PREFIX}/csv/info"
            )
            self.log_test(
                "CSV Info Endpoint",
                response.status_code == 200,
                response_time,
                response.status_code,
            )
        except Exception as e:
            self.log_test("CSV Info Endpoint", False, 0, error=str(e))

        # Test CSV sample endpoint
        try:
            response, response_time = self.make_request(
                "GET", f"{API_V1_PREFIX}/csv/sample"
            )
            self.log_test(
                "CSV Sample Template",
                response.status_code == 200,
                response_time,
                response.status_code,
                details={
                    "content_type": response.headers.get("content-type", "unknown")
                },
            )
        except Exception as e:
            self.log_test("CSV Sample Template", False, 0, error=str(e))

    def test_analytics_endpoints(self):
        """Test analytics and scoring endpoints"""
        print("\n📈 Testing Analytics & Scoring Endpoints")
        print("=" * 50)

        analytics_endpoints = [
            f"{API_V1_PREFIX}/analytics/overview",
            f"{API_V1_PREFIX}/scoring/info",
            f"{API_V1_PREFIX}/mvp/stats",
        ]

        for endpoint in analytics_endpoints:
            try:
                response, response_time = self.make_request("GET", endpoint)
                test_name = f"Analytics: {endpoint.split('/')[-1]}"
                self.log_test(
                    test_name,
                    response.status_code
                    in [200, 401],  # 401 if authentication required
                    response_time,
                    response.status_code,
                )
            except Exception as e:
                self.log_test(
                    f"Analytics: {endpoint.split('/')[-1]}", False, 0, error=str(e)
                )

    def test_vision_ocr_endpoints(self):
        """Test Google Vision OCR endpoints"""
        print("\n👁️ Testing Vision OCR Endpoints")
        print("=" * 50)

        vision_endpoints = [
            f"{API_V1_PREFIX}/vision/info",
            f"{API_V1_PREFIX}/ocr/status",
        ]

        for endpoint in vision_endpoints:
            try:
                response, response_time = self.make_request("GET", endpoint)
                test_name = f"Vision: {endpoint.split('/')[-1]}"
                self.log_test(
                    test_name,
                    response.status_code in [200, 401],
                    response_time,
                    response.status_code,
                )
            except Exception as e:
                self.log_test(
                    f"Vision: {endpoint.split('/')[-1]}", False, 0, error=str(e)
                )

    def test_donation_endpoints(self):
        """Test donation system endpoints"""
        print("\n🎁 Testing Donation System Endpoints")
        print("=" * 50)

        donation_endpoints = [
            f"{API_V1_PREFIX}/donations/info",
            f"{API_V1_PREFIX}/donation-queries/stats",
        ]

        for endpoint in donation_endpoints:
            try:
                response, response_time = self.make_request("GET", endpoint)
                test_name = f"Donations: {endpoint.split('/')[-1]}"
                self.log_test(
                    test_name,
                    response.status_code in [200, 401],
                    response_time,
                    response.status_code,
                )
            except Exception as e:
                self.log_test(
                    f"Donations: {endpoint.split('/')[-1]}", False, 0, error=str(e)
                )

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling")
        print("=" * 50)

        # Test 404 errors
        try:
            response, response_time = self.make_request("GET", "/api/v1/nonexistent")
            self.log_test(
                "404 Error Handling",
                response.status_code == 404,
                response_time,
                response.status_code,
            )
        except Exception as e:
            self.log_test("404 Error Handling", False, 0, error=str(e))

        # Test malformed JSON
        try:
            response, response_time = self.make_request(
                "POST",
                f"{API_V1_PREFIX}/mobile/scan-session",
                data="invalid json",
                headers={"Content-Type": "application/json"},
            )
            self.log_test(
                "Invalid JSON Handling",
                response.status_code in [400, 422],
                response_time,
                response.status_code,
            )
        except Exception as e:
            self.log_test("Invalid JSON Handling", False, 0, error=str(e))

    def run_performance_tests(self):
        """Run performance-focused tests"""
        print("\n🚀 Running Performance Tests")
        print("=" * 50)

        # Test concurrent requests to health endpoint
        import concurrent.futures
        import threading

        def make_health_request():
            try:
                response, response_time = self.make_request("GET", "/health")
                return response_time, response.status_code
            except:
                return None, None

        # Run 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_health_request) for _ in range(10)]
            results = [
                future.result() for future in concurrent.futures.as_completed(futures)
            ]

        successful_requests = [r for r in results if r[0] is not None and r[1] == 200]

        if successful_requests:
            avg_response_time = sum(r[0] for r in successful_requests) / len(
                successful_requests
            )
            max_response_time = max(r[0] for r in successful_requests)

            self.log_test(
                "Concurrent Health Requests (10x)",
                len(successful_requests) >= 8,  # At least 80% success rate
                avg_response_time,
                details={
                    "successful_requests": len(successful_requests),
                    "total_requests": 10,
                    "avg_response_time": avg_response_time,
                    "max_response_time": max_response_time,
                },
            )
        else:
            self.log_test(
                "Concurrent Health Requests (10x)",
                False,
                0,
                error="No successful requests",
            )

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        end_time = time.time()
        total_time = end_time - self.test_results["start_time"]

        # Calculate performance statistics
        performance_stats = {}
        for endpoint, times in self.test_results["performance_metrics"].items():
            if times:
                performance_stats[endpoint] = {
                    "avg_response_time_ms": round(sum(times) * 1000 / len(times), 2),
                    "max_response_time_ms": round(max(times) * 1000, 2),
                    "min_response_time_ms": round(min(times) * 1000, 2),
                    "requests_under_300ms": sum(1 for t in times if t < 0.3),
                    "mobile_performance_target_met": all(t < 0.5 for t in times),
                }

        report = {
            "test_summary": {
                "total_tests": self.test_results["total_tests"],
                "passed_tests": self.test_results["passed_tests"],
                "failed_tests": self.test_results["failed_tests"],
                "success_rate": round(
                    self.test_results["passed_tests"]
                    / max(1, self.test_results["total_tests"])
                    * 100,
                    2,
                ),
                "total_testing_time_seconds": round(total_time, 2),
            },
            "performance_metrics": performance_stats,
            "test_details": self.test_results["test_details"],
            "recommendations": self.generate_recommendations(),
            "timestamp": datetime.now().isoformat(),
        }

        return report

    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []

        # Check for failed tests
        failed_tests = [t for t in self.test_results["test_details"] if not t["passed"]]
        if failed_tests:
            recommendations.append(f"Address {len(failed_tests)} failed endpoint(s)")

        # Check performance
        slow_tests = [
            t for t in self.test_results["test_details"] if t["response_time_ms"] > 500
        ]
        if slow_tests:
            recommendations.append(
                f"Optimize {len(slow_tests)} slow endpoint(s) (>500ms)"
            )

        # Check mobile performance
        mobile_tests = [
            t for t in self.test_results["test_details"] if "Mobile" in t["test_name"]
        ]
        slow_mobile = [t for t in mobile_tests if t["response_time_ms"] > 300]
        if slow_mobile:
            recommendations.append(
                f"Optimize {len(slow_mobile)} mobile endpoint(s) for <300ms target"
            )

        # Success rate check
        success_rate = self.test_results["passed_tests"] / max(
            1, self.test_results["total_tests"]
        )
        if success_rate < 0.9:
            recommendations.append(
                "Improve overall API reliability (success rate < 90%)"
            )

        if not recommendations:
            recommendations.append("All tests passing! API is performing well.")

        return recommendations

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🧪 LIFO AI Engine - Comprehensive API Testing")
        print("=" * 60)
        print(f"Testing server: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run all test suites
        self.test_health_endpoints()
        self.test_mobile_endpoints()
        self.test_csv_endpoints()
        self.test_analytics_endpoints()
        self.test_vision_ocr_endpoints()
        self.test_donation_endpoints()
        self.test_error_handling()
        self.run_performance_tests()

        # Generate and display report
        report = self.generate_report()

        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {report['test_summary']['total_tests']}")
        print(f"Passed: {report['test_summary']['passed_tests']}")
        print(f"Failed: {report['test_summary']['failed_tests']}")
        print(f"Success Rate: {report['test_summary']['success_rate']}%")
        print(f"Total Time: {report['test_summary']['total_testing_time_seconds']}s")

        print("\n🎯 RECOMMENDATIONS:")
        for i, rec in enumerate(report["recommendations"], 1):
            print(f"{i}. {rec}")

        # Save detailed report
        report_file = f"/home/slim/lifo-app/api_test_report_{int(time.time())}.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)

        print(f"\n📄 Detailed report saved to: {report_file}")

        return report


if __name__ == "__main__":
    tester = APITester()
    report = tester.run_all_tests()
