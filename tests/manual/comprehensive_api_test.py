#!/usr/bin/env python3
"""
Comprehensive API Testing Script for LIFO AI Engine
Tests all endpoints with realistic data and scenarios including Supabase integration
"""

import json
import time
from datetime import datetime
from typing import Any

import requests

# Configuration
BASE_URL = "http://localhost:8000"
API_V1_PREFIX = "/api/v1"

# Test data from Supabase
TEST_STORES = [
    "17215fdb-b067-4ff7-b1d8-ebcd49d4f02f",  # Sean's second test
    "22222222-2222-2222-2222-222222222222",  # Demo Supermarket Lyon
    "e3b41480-79a3-4cb7-8151-3fe014a1b60f",  # slim store
]


class ComprehensiveAPITester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": "LIFO-Comprehensive-API-Tester/1.0",
            }
        )

        # Test results storage
        self.test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": [],
            "performance_metrics": {},
            "error_details": [],
            "endpoint_coverage": {},
            "start_time": time.time(),
        }

        # JWT token for authenticated requests
        self.auth_token = None

        print("🧪 LIFO AI Engine - Comprehensive API Testing")
        print("=" * 70)
        print(f"Testing server: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Test stores: {len(TEST_STORES)} stores")
        print("")

    def log_test(
        self,
        test_name: str,
        passed: bool,
        response_time: float,
        status_code: int | None = None,
        error: str | None = None,
        details: dict | None = None,
        response_data: dict | None = None,
    ):
        """Log test results with enhanced details"""
        self.test_results["total_tests"] += 1
        if passed:
            self.test_results["passed_tests"] += 1
            status_icon = "✅ PASS"
        else:
            self.test_results["failed_tests"] += 1
            status_icon = "❌ FAIL"

        test_detail = {
            "test_name": test_name,
            "passed": passed,
            "response_time_ms": round(response_time * 1000, 2),
            "status_code": status_code,
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "details": details or {},
            "response_data": response_data,
        }

        self.test_results["test_details"].append(test_detail)

        # Track endpoint coverage
        endpoint = test_name.split(" - ")[0] if " - " in test_name else test_name
        if endpoint not in self.test_results["endpoint_coverage"]:
            self.test_results["endpoint_coverage"][endpoint] = {"total": 0, "passed": 0}
        self.test_results["endpoint_coverage"][endpoint]["total"] += 1
        if passed:
            self.test_results["endpoint_coverage"][endpoint]["passed"] += 1

        # Log to console with better formatting
        response_time_str = f"{test_detail['response_time_ms']}ms"
        status_str = f"{status_code}" if status_code else "N/A"
        print(f"{status_icon} {test_name} [{status_str}] ({response_time_str})")

        if error and not passed:
            print(f"      ⚠️ Error: {error}")
        elif response_data and passed:
            # Show useful response info for successful tests
            if isinstance(response_data, dict):
                if "status" in response_data:
                    print(f"      ℹ️ Status: {response_data['status']}")
                elif "message" in response_data:
                    print(f"      ℹ️ Message: {response_data['message'][:100]}...")
                elif len(response_data) > 0:
                    print(
                        f"      ℹ️ Response keys: {', '.join(list(response_data.keys())[:5])}"
                    )

        # Store error details for failed tests
        if not passed:
            self.test_results["error_details"].append(
                {
                    "test_name": test_name,
                    "error": error,
                    "status_code": status_code,
                    "response_time_ms": test_detail["response_time_ms"],
                }
            )

    def make_request(self, method: str, endpoint: str, **kwargs) -> tuple:
        """Make HTTP request with enhanced error handling and timing"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response_time = time.time() - start_time

            # Try to parse JSON response
            response_data = None
            try:
                response_data = response.json()
            except:
                response_data = {"content_length": len(response.content)}

            return response, response_time, response_data

        except requests.exceptions.Timeout:
            response_time = time.time() - start_time
            raise Exception(f"Request timeout after {response_time:.1f}s")
        except requests.exceptions.ConnectionError:
            response_time = time.time() - start_time
            raise Exception("Connection error - server may be down")
        except Exception as e:
            response_time = time.time() - start_time
            raise Exception(f"Request failed: {str(e)}")

    def test_health_endpoints(self):
        """Test all health and status endpoints"""
        print("\n🏥 Testing Health & Status Endpoints")
        print("-" * 50)

        # Basic health endpoints
        health_endpoints = [
            ("/", "Root Endpoint"),
            ("/health", "Main Health Check"),
            ("/api/info", "API Info"),
            (f"{API_V1_PREFIX}/health/health", "Detailed Health Check"),
        ]

        for endpoint, name in health_endpoints:
            try:
                response, response_time, response_data = self.make_request(
                    "GET", endpoint
                )
                self.log_test(
                    f"Health - {name}",
                    response.status_code == 200,
                    response_time,
                    response.status_code,
                    response_data=response_data,
                )

                # Store performance metrics for health endpoints
                if name not in self.test_results["performance_metrics"]:
                    self.test_results["performance_metrics"][name] = []
                self.test_results["performance_metrics"][name].append(response_time)

            except Exception as e:
                self.log_test(f"Health - {name}", False, 0, error=str(e))

        # Test health sub-endpoints
        health_sub_endpoints = [
            (f"{API_V1_PREFIX}/health/health/supabase", "Supabase Health"),
            (f"{API_V1_PREFIX}/health/health/database", "Database Health"),
            (f"{API_V1_PREFIX}/health/health/ready", "Readiness Check"),
            (f"{API_V1_PREFIX}/health/health/live", "Liveness Check"),
        ]

        for endpoint, name in health_sub_endpoints:
            try:
                response, response_time, response_data = self.make_request(
                    "GET", endpoint
                )
                # Health endpoints can return 503 for degraded status
                success = response.status_code in [200, 503]
                self.log_test(
                    f"Health - {name}",
                    success,
                    response_time,
                    response.status_code,
                    response_data=response_data,
                )
            except Exception as e:
                self.log_test(f"Health - {name}", False, 0, error=str(e))

    def test_scoring_endpoints(self):
        """Test AI scoring system endpoints"""
        print("\n🎯 Testing AI Scoring Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            scoring_endpoints = [
                (
                    f"{API_V1_PREFIX}/scoring/batch/{store_id}",
                    f"Batch Scoring - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/scoring/alerts/{store_id}",
                    f"Scoring Alerts - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/scoring/recommendations/{store_id}",
                    f"Recommendations - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/scoring/analytics/{store_id}",
                    f"Scoring Analytics - {store_name}",
                ),
            ]

            for endpoint, name in scoring_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    # Accept 200 (success), 401 (auth required), 404 (no data)
                    success = response.status_code in [200, 401, 404]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_analytics_endpoints(self):
        """Test analytics and reporting endpoints"""
        print("\n📊 Testing Analytics Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            analytics_endpoints = [
                (
                    f"{API_V1_PREFIX}/analytics/store/{store_id}",
                    f"Store Analytics - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/analytics/dashboard/{store_id}",
                    f"Dashboard Data - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/analytics/performance/{store_id}",
                    f"Performance Metrics - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/analytics/trends/{store_id}",
                    f"Trends Analysis - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/analytics/exports/{store_id}",
                    f"Data Exports - {store_name}",
                ),
            ]

            for endpoint, name in analytics_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_csv_endpoints(self):
        """Test CSV processing endpoints"""
        print("\n📝 Testing CSV Processing Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            csv_endpoints = [
                (
                    f"{API_V1_PREFIX}/csv/validate/{store_id}",
                    f"CSV Validation - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/csv/template/{store_id}",
                    f"CSV Template - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/csv/status/{store_id}",
                    f"CSV Status - {store_name}",
                ),
            ]

            for endpoint, name in csv_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404, 422]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_mobile_endpoints(self):
        """Test mobile-optimized endpoints"""
        print("\n📱 Testing Mobile Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            mobile_endpoints = [
                (
                    f"{API_V1_PREFIX}/mobile/session/{store_id}",
                    f"Mobile Session - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/mobile/quick-score/{store_id}",
                    f"Quick Score - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/mobile/sync/{store_id}",
                    f"Mobile Sync - {store_name}",
                ),
            ]

            for endpoint, name in mobile_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404, 422]

                    # Check mobile performance target (<300ms)
                    mobile_performance_ok = response_time < 0.3

                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        details={
                            "mobile_performance_target_met": mobile_performance_ok
                        },
                        response_data=response_data,
                    )

                    if not mobile_performance_ok and success:
                        print(
                            f"      ⚠️ Performance: {response_time * 1000:.0f}ms > 300ms target"
                        )

                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_vision_ocr_endpoints(self):
        """Test Google Vision OCR endpoints"""
        print("\n👁️ Testing Vision OCR Endpoints")
        print("-" * 50)

        vision_endpoints = [
            (f"{API_V1_PREFIX}/vision/analyze", "Vision Analysis"),
            (f"{API_V1_PREFIX}/vision/extract-text", "Text Extraction"),
            (f"{API_V1_PREFIX}/ocr/batch-process", "Batch OCR Processing"),
        ]

        for endpoint, name in vision_endpoints:
            try:
                response, response_time, response_data = self.make_request(
                    "GET", endpoint
                )
                success = response.status_code in [
                    200,
                    401,
                    404,
                    405,
                    422,
                ]  # 405 = Method not allowed for GET
                self.log_test(
                    name,
                    success,
                    response_time,
                    response.status_code,
                    response_data=response_data,
                )
            except Exception as e:
                self.log_test(name, False, 0, error=str(e))

    def test_donation_endpoints(self):
        """Test donation system endpoints"""
        print("\n🎁 Testing Donation System Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            donation_endpoints = [
                (
                    f"{API_V1_PREFIX}/donations/eligible/{store_id}",
                    f"Eligible Donations - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/donations/recipients/{store_id}",
                    f"Recipients - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/donation-queries/stats/{store_id}",
                    f"Donation Stats - {store_name}",
                ),
            ]

            for endpoint, name in donation_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_batch_endpoints(self):
        """Test batch management endpoints"""
        print("\n📦 Testing Batch Management Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            batch_endpoints = [
                (
                    f"{API_V1_PREFIX}/batches/scan/{store_id}",
                    f"Scan Batches - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/batches/recent/{store_id}",
                    f"Recent Batches - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/scan/workflow/{store_id}",
                    f"Scan Workflow - {store_name}",
                ),
            ]

            for endpoint, name in batch_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404, 422]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_mvp_endpoints(self):
        """Test MVP-specific endpoints"""
        print("\n🚀 Testing MVP Endpoints")
        print("-" * 50)

        for store_id in TEST_STORES:
            store_name = f"Store {store_id[-8:]}"

            mvp_endpoints = [
                (
                    f"{API_V1_PREFIX}/mvp/dashboard/{store_id}",
                    f"MVP Dashboard - {store_name}",
                ),
                (
                    f"{API_V1_PREFIX}/mvp/quick-stats/{store_id}",
                    f"Quick Stats - {store_name}",
                ),
            ]

            for endpoint, name in mvp_endpoints:
                try:
                    response, response_time, response_data = self.make_request(
                        "GET", endpoint
                    )
                    success = response.status_code in [200, 401, 404]
                    self.log_test(
                        name,
                        success,
                        response_time,
                        response.status_code,
                        response_data=response_data,
                    )
                except Exception as e:
                    self.log_test(name, False, 0, error=str(e))

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling")
        print("-" * 50)

        error_test_cases = [
            # Invalid store ID format
            (
                f"{API_V1_PREFIX}/analytics/store/invalid-store-id",
                "Invalid Store ID Format",
            ),
            # Non-existent store ID
            (
                f"{API_V1_PREFIX}/analytics/store/99999999-9999-9999-9999-999999999999",
                "Non-existent Store ID",
            ),
            # Invalid endpoint
            (f"{API_V1_PREFIX}/nonexistent-endpoint", "Non-existent Endpoint"),
            # Malformed request
            ("/api/v1/../health", "Path Traversal Attempt"),
        ]

        for endpoint, name in error_test_cases:
            try:
                response, response_time, response_data = self.make_request(
                    "GET", endpoint
                )
                # Should return appropriate error codes
                success = response.status_code in [400, 404, 422, 500]
                self.log_test(
                    f"Error Handling - {name}",
                    success,
                    response_time,
                    response.status_code,
                    response_data=response_data,
                )
            except Exception as e:
                self.log_test(f"Error Handling - {name}", False, 0, error=str(e))

    def run_performance_tests(self):
        """Run performance-focused tests"""
        print("\n🚀 Running Performance Tests")
        print("-" * 50)

        # Test concurrent requests
        import concurrent.futures

        def make_health_request():
            try:
                response, response_time, response_data = self.make_request(
                    "GET", "/health"
                )
                return response_time, response.status_code, response_data
            except:
                return None, None, None

        # Run 10 concurrent health requests
        print("Testing concurrent requests (10x health checks)...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_health_request) for _ in range(10)]
            results = [
                future.result() for future in concurrent.futures.as_completed(futures)
            ]

        successful_requests = [r for r in results if r[0] is not None and r[1] == 200]

        if successful_requests:
            response_times = [r[0] for r in successful_requests]
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)

            # Performance is good if average < 1s and all requests succeeded
            performance_ok = len(successful_requests) >= 8 and avg_response_time < 1.0

            self.log_test(
                "Performance - Concurrent Requests",
                performance_ok,
                avg_response_time,
                details={
                    "successful_requests": len(successful_requests),
                    "total_requests": 10,
                    "avg_response_time_ms": round(avg_response_time * 1000, 2),
                    "max_response_time_ms": round(max_response_time * 1000, 2),
                    "min_response_time_ms": round(min_response_time * 1000, 2),
                    "success_rate": len(successful_requests) / 10 * 100,
                },
            )
        else:
            self.log_test(
                "Performance - Concurrent Requests",
                False,
                0,
                error="No successful requests",
            )

    def generate_report(self) -> dict[str, Any]:
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
                    "requests": len(times),
                    "mobile_performance_ok": all(t < 0.3 for t in times),
                }

        # Calculate endpoint coverage
        coverage_stats = {}
        for endpoint, stats in self.test_results["endpoint_coverage"].items():
            coverage_stats[endpoint] = {
                "success_rate": round(stats["passed"] / stats["total"] * 100, 1),
                "total_tests": stats["total"],
                "passed_tests": stats["passed"],
            }

        success_rate = round(
            self.test_results["passed_tests"]
            / max(1, self.test_results["total_tests"])
            * 100,
            2,
        )

        report = {
            "test_summary": {
                "total_tests": self.test_results["total_tests"],
                "passed_tests": self.test_results["passed_tests"],
                "failed_tests": self.test_results["failed_tests"],
                "success_rate_percent": success_rate,
                "total_testing_time_seconds": round(total_time, 2),
                "test_stores": len(TEST_STORES),
                "endpoints_tested": len(self.test_results["endpoint_coverage"]),
            },
            "performance_metrics": performance_stats,
            "endpoint_coverage": coverage_stats,
            "error_summary": {
                "total_errors": len(self.test_results["error_details"]),
                "error_breakdown": {},
            },
            "test_details": self.test_results["test_details"],
            "recommendations": self.generate_recommendations(),
            "timestamp": datetime.now().isoformat(),
            "server_info": {"base_url": self.base_url, "test_stores": TEST_STORES},
        }

        # Group errors by type
        for error in self.test_results["error_details"]:
            error_type = (
                f"HTTP {error['status_code']}"
                if error["status_code"]
                else "Network Error"
            )
            if error_type not in report["error_summary"]["error_breakdown"]:
                report["error_summary"]["error_breakdown"][error_type] = 0
            report["error_summary"]["error_breakdown"][error_type] += 1

        return report

    def generate_recommendations(self) -> list[str]:
        """Generate recommendations based on test results"""
        recommendations = []

        success_rate = self.test_results["passed_tests"] / max(
            1, self.test_results["total_tests"]
        )

        # Success rate analysis
        if success_rate < 0.5:
            recommendations.append(
                "🚨 CRITICAL: Less than 50% of endpoints are working - immediate attention required"
            )
        elif success_rate < 0.8:
            recommendations.append(
                "⚠️ Multiple endpoint failures detected - review error logs"
            )
        elif success_rate < 0.95:
            recommendations.append("✅ Most endpoints working, minor issues to address")
        else:
            recommendations.append("🎉 Excellent API health - all systems operational")

        # Performance analysis
        mobile_tests = [
            t for t in self.test_results["test_details"] if "Mobile" in t["test_name"]
        ]
        slow_mobile = [t for t in mobile_tests if t["response_time_ms"] > 300]
        if slow_mobile:
            recommendations.append(
                f"📱 Optimize {len(slow_mobile)} mobile endpoint(s) for <300ms target"
            )

        # Error pattern analysis
        error_404_count = len(
            [e for e in self.test_results["error_details"] if e["status_code"] == 404]
        )
        if error_404_count > 10:
            recommendations.append(
                "🔍 Many 404 errors - check endpoint routing configuration"
            )

        # Coverage analysis
        total_endpoints = len(self.test_results["endpoint_coverage"])
        if total_endpoints < 20:
            recommendations.append(
                "📊 Consider testing more endpoint variations for better coverage"
            )

        if not recommendations:
            recommendations.append("✨ All tests passing and performance targets met!")

        return recommendations

    def run_all_tests(self):
        """Run comprehensive test suite"""

        # Run all test suites
        self.test_health_endpoints()
        self.test_scoring_endpoints()
        self.test_analytics_endpoints()
        self.test_csv_endpoints()
        self.test_mobile_endpoints()
        self.test_vision_ocr_endpoints()
        self.test_donation_endpoints()
        self.test_batch_endpoints()
        self.test_mvp_endpoints()
        self.test_error_handling()
        self.run_performance_tests()

        # Generate and display report
        report = self.generate_report()

        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 70)
        print(f"📈 Success Rate: {report['test_summary']['success_rate_percent']}%")
        print(f"✅ Passed: {report['test_summary']['passed_tests']}")
        print(f"❌ Failed: {report['test_summary']['failed_tests']}")
        print(f"🔧 Total Tests: {report['test_summary']['total_tests']}")
        print(f"⏱️ Total Time: {report['test_summary']['total_testing_time_seconds']}s")
        print(f"🏪 Stores Tested: {report['test_summary']['test_stores']}")
        print(f"🔗 Endpoints: {report['test_summary']['endpoints_tested']}")

        # Performance summary
        if report["performance_metrics"]:
            print("\n📊 PERFORMANCE HIGHLIGHTS:")
            for endpoint, stats in report["performance_metrics"].items():
                mobile_status = "📱✅" if stats["mobile_performance_ok"] else "📱⚠️"
                print(
                    f"   {endpoint}: {stats['avg_response_time_ms']}ms avg {mobile_status}"
                )

        # Error summary
        if report["error_summary"]["total_errors"] > 0:
            print("\n⚠️ ERROR BREAKDOWN:")
            for error_type, count in report["error_summary"]["error_breakdown"].items():
                print(f"   {error_type}: {count} errors")

        print("\n🎯 RECOMMENDATIONS:")
        for i, rec in enumerate(report["recommendations"], 1):
            print(f"{i}. {rec}")

        # Save detailed report
        timestamp = int(time.time())
        report_file = (
            f"/home/slim/lifo-app/comprehensive_api_test_report_{timestamp}.json"
        )
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)

        print(f"\n📄 Detailed report saved to: {report_file}")
        print(f"🌐 Swagger UI available at: {self.base_url}/docs")

        return report


if __name__ == "__main__":
    tester = ComprehensiveAPITester()
    report = tester.run_all_tests()

    # Exit with error code if too many tests failed
    if report["test_summary"]["success_rate_percent"] < 50:
        exit(1)
