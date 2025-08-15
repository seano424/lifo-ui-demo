#!/usr/bin/env python3
"""
Comprehensive test runner for LIFO AI Engine
Runs all test suites with proper configuration and reporting
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


class TestRunner:
    """Comprehensive test runner for LIFO AI Engine"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_results = {}
        
    def run_command(self, command, description):
        """Run a command and track results"""
        print(f"\n{'='*60}")
        print(f"🚀 {description}")
        print(f"{'='*60}")
        print(f"Command: {' '.join(command)}")
        print()
        
        start_time = time.time()
        
        try:
            result = subprocess.run(
                command,
                cwd=self.project_root,
                capture_output=False,
                text=True,
                check=True
            )
            
            duration = time.time() - start_time
            self.test_results[description] = {
                "status": "PASSED",
                "duration": duration,
                "exit_code": result.returncode
            }
            
            print(f"\n✅ {description} - PASSED ({duration:.1f}s)")
            return True
            
        except subprocess.CalledProcessError as e:
            duration = time.time() - start_time
            self.test_results[description] = {
                "status": "FAILED", 
                "duration": duration,
                "exit_code": e.returncode
            }
            
            print(f"\n❌ {description} - FAILED ({duration:.1f}s)")
            print(f"Exit code: {e.returncode}")
            return False
    
    def run_linting(self):
        """Run code linting and formatting checks"""
        success = True
        
        # Ruff linting
        success &= self.run_command(
            ["ruff", "check", "app/", "tests/"],
            "Code Linting (Ruff)"
        )
        
        # Black formatting check
        success &= self.run_command(
            ["black", "--check", "app/", "tests/"],
            "Code Formatting Check (Black)"
        )
        
        # MyPy type checking
        success &= self.run_command(
            ["mypy", "app/"],
            "Type Checking (MyPy)"
        )
        
        return success
    
    def run_unit_tests(self):
        """Run unit tests with coverage"""
        return self.run_command([
            "pytest", "tests/unit/", "-v",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-report=xml:coverage.xml",
            "--junit-xml=test-results-unit.xml",
            "--durations=10",
            "-m", "unit"
        ], "Unit Tests")
    
    def run_security_tests(self):
        """Run security tests"""
        return self.run_command([
            "pytest", "tests/security/", "-v",
            "--junit-xml=test-results-security.xml",
            "--durations=10",
            "-m", "security"
        ], "Security Tests")
    
    def run_performance_tests(self):
        """Run performance tests""" 
        return self.run_command([
            "pytest", "tests/performance/", "-v",
            "--junit-xml=test-results-performance.xml",
            "--durations=10",
            "-m", "performance"
        ], "Performance Tests")
    
    def run_integration_tests(self):
        """Run integration tests"""
        return self.run_command([
            "pytest", "tests/integration/", "-v",
            "--junit-xml=test-results-integration.xml", 
            "--durations=10",
            "-m", "integration"
        ], "Integration Tests")
    
    def run_mobile_tests(self):
        """Run mobile-specific tests"""
        return self.run_command([
            "pytest", "tests/", "-v",
            "--junit-xml=test-results-mobile.xml",
            "--durations=10",
            "-m", "mobile"
        ], "Mobile Optimization Tests")
    
    def run_all_tests(self):
        """Run all tests"""
        return self.run_command([
            "pytest", "tests/", "-v",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-report=xml:coverage.xml",
            "--junit-xml=test-results-all.xml",
            "--durations=20",
            "--cov-fail-under=85"
        ], "All Tests")
    
    def run_quick_tests(self):
        """Run quick smoke tests"""
        return self.run_command([
            "pytest", "tests/unit/test_mobile_endpoints.py::TestMobileEndpointPerformance", "-v",
            "--durations=5"
        ], "Quick Smoke Tests")
    
    def run_parallel_tests(self):
        """Run tests in parallel"""
        return self.run_command([
            "pytest", "tests/", "-v",
            "--cov=app",
            "--cov-report=term-missing", 
            "--cov-report=html:htmlcov",
            "--junit-xml=test-results-parallel.xml",
            "-n", "auto",  # Use all available CPUs
            "--durations=10"
        ], "Parallel Test Execution")
    
    def print_summary(self):
        """Print test execution summary"""
        print(f"\n{'='*80}")
        print("📊 TEST EXECUTION SUMMARY")
        print(f"{'='*80}")
        
        total_duration = sum(result["duration"] for result in self.test_results.values())
        passed_count = sum(1 for result in self.test_results.values() if result["status"] == "PASSED")
        failed_count = len(self.test_results) - passed_count
        
        print(f"Total Test Suites: {len(self.test_results)}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {failed_count}")
        print(f"Total Duration: {total_duration:.1f} seconds")
        print()
        
        for description, result in self.test_results.items():
            status_emoji = "✅" if result["status"] == "PASSED" else "❌"
            print(f"{status_emoji} {description:<40} {result['status']:<10} ({result['duration']:.1f}s)")
        
        print(f"\n{'='*80}")
        
        if failed_count > 0:
            print("❌ SOME TESTS FAILED - See output above for details")
            return False
        else:
            print("🎉 ALL TESTS PASSED - System ready for production!")
            return True
    
    def generate_reports(self):
        """Generate test reports"""
        print(f"\n{'='*60}")
        print("📋 GENERATING REPORTS")
        print(f"{'='*60}")
        
        # Coverage report
        if (self.project_root / "coverage.xml").exists():
            print(f"📊 Coverage report: {self.project_root}/htmlcov/index.html")
        
        # Test result files
        xml_files = list(self.project_root.glob("test-results-*.xml"))
        if xml_files:
            print(f"📋 Test results: {len(xml_files)} XML files generated")
        
        # Performance benchmarks
        benchmark_files = list(self.project_root.glob("benchmark*.json"))
        if benchmark_files:
            print(f"⚡ Performance benchmarks: {len(benchmark_files)} files")


def main():
    """Main test runner entry point"""
    parser = argparse.ArgumentParser(description="LIFO AI Engine Test Runner")
    parser.add_argument(
        "suite",
        nargs="?",
        default="all",
        choices=[
            "lint", "unit", "security", "performance", "integration", 
            "mobile", "all", "quick", "parallel"
        ],
        help="Test suite to run"
    )
    parser.add_argument(
        "--no-lint",
        action="store_true",
        help="Skip linting checks"
    )
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    
    args = parser.parse_args()
    
    runner = TestRunner()
    success = True
    
    print("🧪 LIFO AI Engine - Comprehensive Test Suite")
    print("=" * 80)
    
    # Run linting first unless skipped
    if not args.no_lint and args.suite in ["all", "lint"]:
        success &= runner.run_linting()
    
    # Run specific test suite
    if args.suite == "unit":
        success &= runner.run_unit_tests()
    elif args.suite == "security":
        success &= runner.run_security_tests()
    elif args.suite == "performance":
        success &= runner.run_performance_tests()
    elif args.suite == "integration":
        success &= runner.run_integration_tests()
    elif args.suite == "mobile":
        success &= runner.run_mobile_tests()
    elif args.suite == "quick":
        success &= runner.run_quick_tests()
    elif args.suite == "parallel":
        success &= runner.run_parallel_tests()
    elif args.suite == "all":
        if args.parallel:
            success &= runner.run_parallel_tests()
        else:
            success &= runner.run_unit_tests()
            success &= runner.run_security_tests()
            success &= runner.run_performance_tests()
            success &= runner.run_integration_tests()
    
    # Print summary and generate reports
    runner.print_summary()
    runner.generate_reports()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()