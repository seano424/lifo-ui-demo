#!/usr/bin/env python3
"""
Enhanced Health Endpoint Debugging Tool
Systematically tests health endpoint to identify 400 error causes
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

import aiohttp
import structlog

# Configure logging for debugging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class HealthEndpointDebugger:
    """Comprehensive health endpoint debugging and analysis"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.session = None
        self.test_results: List[Dict[str, Any]] = []

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_endpoint_variations(self) -> Dict[str, Any]:
        """Test different endpoint URL variations to identify routing issues"""
        endpoints_to_test = [
            "/health",
            "/health/",
            "/api/v1/health",
            "/api/v1/health/",
            "/api/v1/health/supabase",
            "/api/v1/health/ready",
            "/api/v1/health/live",
        ]

        results = {}

        for endpoint in endpoints_to_test:
            try:
                url = f"{self.base_url}{endpoint}"
                logger.info(f"Testing endpoint: {url}")

                async with self.session.get(url) as response:
                    content = await response.text()

                    results[endpoint] = {
                        "url": url,
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "content": content[:1000],  # Limit content for readability
                        "success": response.status == 200,
                        "error": response.status >= 400
                    }

                    if response.status == 400:
                        logger.warning(f"400 error on {endpoint}", content=content)
                    elif response.status == 200:
                        logger.info(f"Success on {endpoint}")

            except Exception as e:
                results[endpoint] = {
                    "url": f"{self.base_url}{endpoint}",
                    "error": str(e),
                    "exception": type(e).__name__
                }
                logger.error(f"Exception testing {endpoint}: {e}")

        return results

    async def test_request_methods(self) -> Dict[str, Any]:
        """Test different HTTP methods on the health endpoint"""
        health_endpoint = "/api/v1/health/"
        methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]

        results = {}

        for method in methods:
            try:
                url = f"{self.base_url}{health_endpoint}"

                async with self.session.request(method, url) as response:
                    content = await response.text() if method != "HEAD" else ""

                    results[method] = {
                        "status_code": response.status,
                        "headers": dict(response.headers),
                        "content": content[:500] if content else "",
                        "allowed": response.status != 405
                    }

            except Exception as e:
                results[method] = {
                    "error": str(e),
                    "exception": type(e).__name__
                }

        return results

    async def test_headers_impact(self) -> Dict[str, Any]:
        """Test how different headers affect the request"""
        base_endpoint = "/api/v1/health/"

        header_combinations = [
            {},  # No headers
            {"Content-Type": "application/json"},
            {"Accept": "application/json"},
            {"Content-Type": "application/json", "Accept": "application/json"},
            {"User-Agent": "HealthDebugger/1.0"},
            {"Authorization": "Bearer invalid-token"},
            {"X-API-Key": "test-key"},
            {"Content-Length": "0"},
        ]

        results = {}

        for i, headers in enumerate(header_combinations):
            try:
                url = f"{self.base_url}{base_endpoint}"
                header_key = f"headers_{i}" if headers else "no_headers"

                async with self.session.get(url, headers=headers) as response:
                    content = await response.text()

                    results[header_key] = {
                        "request_headers": headers,
                        "status_code": response.status,
                        "response_headers": dict(response.headers),
                        "content": content[:500],
                        "success": response.status == 200
                    }

            except Exception as e:
                results[header_key] = {
                    "request_headers": headers,
                    "error": str(e),
                    "exception": type(e).__name__
                }

        return results

    async def test_query_parameters(self) -> Dict[str, Any]:
        """Test how query parameters affect the request"""
        base_endpoint = "/api/v1/health/"

        query_combinations = [
            {},  # No query params
            {"format": "json"},
            {"debug": "true"},
            {"detailed": "true"},
            {"timeout": "30"},
            {"invalid_param": "test"},
        ]

        results = {}

        for i, params in enumerate(query_combinations):
            try:
                param_key = f"params_{i}" if params else "no_params"

                async with self.session.get(
                    f"{self.base_url}{base_endpoint}",
                    params=params
                ) as response:
                    content = await response.text()

                    results[param_key] = {
                        "query_params": params,
                        "final_url": str(response.url),
                        "status_code": response.status,
                        "content": content[:500],
                        "success": response.status == 200
                    }

            except Exception as e:
                results[param_key] = {
                    "query_params": params,
                    "error": str(e),
                    "exception": type(e).__name__
                }

        return results

    async def analyze_error_response(self, endpoint: str = "/api/v1/health/") -> Dict[str, Any]:
        """Detailed analysis of error response"""
        try:
            url = f"{self.base_url}{endpoint}"

            async with self.session.get(url) as response:
                content = await response.text()

                analysis = {
                    "status_code": response.status,
                    "reason": response.reason,
                    "headers": dict(response.headers),
                    "content": content,
                    "content_length": len(content),
                    "is_json": False,
                    "parsed_content": None
                }

                # Try to parse JSON response
                try:
                    parsed = json.loads(content)
                    analysis["is_json"] = True
                    analysis["parsed_content"] = parsed
                except json.JSONDecodeError:
                    analysis["parse_error"] = "Response is not valid JSON"

                return analysis

        except Exception as e:
            return {
                "error": str(e),
                "exception": type(e).__name__
            }

    async def run_comprehensive_diagnosis(self) -> Dict[str, Any]:
        """Run all debugging tests and compile comprehensive report"""
        logger.info("Starting comprehensive health endpoint diagnosis")

        diagnosis_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "base_url": self.base_url,
            "tests": {}
        }

        # Test 1: Endpoint variations
        logger.info("Testing endpoint URL variations...")
        diagnosis_report["tests"]["endpoint_variations"] = await self.test_endpoint_variations()

        # Test 2: HTTP methods
        logger.info("Testing HTTP methods...")
        diagnosis_report["tests"]["http_methods"] = await self.test_request_methods()

        # Test 3: Headers impact
        logger.info("Testing headers impact...")
        diagnosis_report["tests"]["headers_impact"] = await self.test_headers_impact()

        # Test 4: Query parameters
        logger.info("Testing query parameters...")
        diagnosis_report["tests"]["query_parameters"] = await self.test_query_parameters()

        # Test 5: Detailed error analysis
        logger.info("Analyzing error response in detail...")
        diagnosis_report["tests"]["error_analysis"] = await self.analyze_error_response()

        # Generate summary
        diagnosis_report["summary"] = self._generate_summary(diagnosis_report["tests"])

        return diagnosis_report

    def _generate_summary(self, tests: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary and recommendations from test results"""
        summary = {
            "working_endpoints": [],
            "failing_endpoints": [],
            "error_patterns": [],
            "recommendations": []
        }

        # Analyze endpoint variations
        for endpoint, result in tests.get("endpoint_variations", {}).items():
            if result.get("success"):
                summary["working_endpoints"].append(endpoint)
            elif result.get("error"):
                summary["failing_endpoints"].append({
                    "endpoint": endpoint,
                    "status": result.get("status_code"),
                    "error": result.get("content", "")[:200]
                })

        # Analyze patterns
        if len(summary["failing_endpoints"]) > 0:
            # Check if all endpoints fail with 400
            status_codes = [ep.get("status") for ep in summary["failing_endpoints"]]
            if all(code == 400 for code in status_codes):
                summary["error_patterns"].append("All endpoints returning 400 - likely middleware or validation issue")
                summary["recommendations"].extend([
                    "Check middleware configuration for request validation",
                    "Verify environment variables are properly set",
                    "Review CORS and security headers configuration",
                    "Check if rate limiting is blocking requests"
                ])

        # Check if any endpoint works
        if len(summary["working_endpoints"]) == 0:
            summary["error_patterns"].append("No endpoints responding successfully")
            summary["recommendations"].extend([
                "Verify FastAPI app is running and accessible",
                "Check if port 8000 is accessible",
                "Review application startup logs for errors",
                "Verify database connectivity during startup"
            ])

        return summary


async def main():
    """Main debugging function"""
    # Get base URL from environment or use default
    base_url = os.getenv("API_URL", "http://localhost:8000")

    if len(sys.argv) > 1:
        base_url = sys.argv[1]

    logger.info(f"Starting health endpoint debugging for: {base_url}")

    async with HealthEndpointDebugger(base_url) as debugger:
        report = await debugger.run_comprehensive_diagnosis()

        # Save report to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"health_debug_report_{timestamp}.json"

        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        # Print summary
        print(f"\n{'='*60}")
        print("HEALTH ENDPOINT DEBUG REPORT")
        print(f"{'='*60}")
        print(f"Timestamp: {report['timestamp']}")
        print(f"Base URL: {report['base_url']}")
        print(f"Report saved to: {report_file}")
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")

        summary = report.get("summary", {})

        print(f"Working endpoints: {len(summary.get('working_endpoints', []))}")
        for endpoint in summary.get("working_endpoints", []):
            print(f"  ✓ {endpoint}")

        print(f"\nFailing endpoints: {len(summary.get('failing_endpoints', []))}")
        for endpoint_info in summary.get("failing_endpoints", []):
            print(f"  ✗ {endpoint_info['endpoint']} (Status: {endpoint_info['status']})")
            if endpoint_info.get('error'):
                print(f"    Error: {endpoint_info['error'][:100]}...")

        print(f"\nError patterns identified:")
        for pattern in summary.get("error_patterns", []):
            print(f"  • {pattern}")

        print(f"\nRecommendations:")
        for rec in summary.get("recommendations", []):
            print(f"  → {rec}")

        print(f"\n{'='*60}")
        print(f"Full report available in: {report_file}")


if __name__ == "__main__":
    asyncio.run(main())