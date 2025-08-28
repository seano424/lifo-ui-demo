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

from dotenv import load_dotenv


class TestRunner:
    """Comprehensive test runner for LIFO AI Engine"""

    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_results = {}
        self._setup_test_environment()

    def _setup_test_environment(self):
        """Setup test environment with proper isolation and configuration."""
        print("🔧 Setting up test environment...")

        # Path to test environment file
        test_env_file = self.project_root / ".env.test"

        if test_env_file.exists():
            print(f"   ✅ Loading test environment from: {test_env_file}")
            load_dotenv(test_env_file, override=True)
        else:
            print(f"   ⚠️  Test environment file not found: {test_env_file}")
            print("   ℹ️  Creating minimal test environment variables...")
            self._create_minimal_test_env()

        # Set critical environment variables for testing
        os.environ["ENVIRONMENT"] = "testing"
        os.environ["DEBUG"] = "true"
        os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
        os.environ["RATE_LIMIT_ENABLED"] = "false"
        os.environ["ENABLE_PERFORMANCE_MONITORING"] = "false"
        os.environ["ENABLE_ALERTING"] = "false"

        # Validate critical test environment variables
        self._validate_test_environment()

        # Verify test dependencies are installed
        if not self._verify_dependencies():
            raise OSError("Required test dependencies are missing")

        print("   ✅ Test environment configured successfully")

    def _create_minimal_test_env(self):
        """Create minimal test environment variables if .env.test doesn't exist."""
        minimal_env = {
            "ENVIRONMENT": "testing",
            "DEBUG": "true",
            "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
            "RATE_LIMIT_ENABLED": "false",
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_JWT_SECRET": "test-jwt-secret-key-12345",
            "SUPABASE_ANON_KEY": "test-anon-key-12345",
            "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key-12345",
            "JWT_SECRET_KEY": "test-jwt-secret-key-for-testing-12345",
            "LOG_LEVEL": "DEBUG",
            "ENABLE_PERFORMANCE_MONITORING": "false",
            "ENABLE_ALERTING": "false",
        }

        for key, value in minimal_env.items():
            os.environ[key] = value

    def _validate_test_environment(self):
        """Validate that test environment is properly configured."""
        required_vars = [
            "ENVIRONMENT",
            "DATABASE_URL",
            "SUPABASE_URL",
            "JWT_SECRET_KEY"
        ]

        missing_vars = []
        for var in required_vars:
            if not os.environ.get(var):
                missing_vars.append(var)

        if missing_vars:
            raise OSError(
                f"Missing required test environment variables: {missing_vars}"
            )

        # Validate environment is set to testing
        if os.environ.get("ENVIRONMENT") != "testing":
            raise OSError(
                f"ENVIRONMENT must be 'testing', got: {os.environ.get('ENVIRONMENT')}"
            )

        # Validate database URL is test-safe
        db_url = os.environ.get("DATABASE_URL", "")
        if not (db_url.startswith("sqlite") or "test" in db_url):
            raise OSError(
                f"DATABASE_URL appears unsafe for testing: {db_url}"
            )

    def _verify_dependencies(self):
        """Verify that required test dependencies are installed."""
        required_packages = [
            ("pytest", "pytest"),
            ("coverage", "pytest-cov"),
            ("httpx", "httpx"),
            ("fastapi", "fastapi"),
            ("sqlalchemy", "sqlalchemy"),
            ("aiosqlite", "aiosqlite"),
        ]

        missing_packages = []
        for package_name, import_name in required_packages:
            try:
                __import__(import_name.replace("-", "_"))
            except ImportError:
                missing_packages.append(package_name)

        if missing_packages:
            print(f"   ⚠️  Missing required packages: {missing_packages}")
            print("   💡 Install with: pip install -r requirements-test.txt")
            return False

        print("   ✅ All required test dependencies are installed")
        return True

    def run_command(self, command, description):
        """Run a command and track results"""
        print(f"\n{'=' * 60}")
        print(f"🚀 {description}")
        print(f"{'=' * 60}")
        print(f"Command: {' '.join(command)}")
        print()

        start_time = time.time()

        try:
            result = subprocess.run(  # noqa: S603  # Controlled test execution
                command,
                cwd=self.project_root,
                capture_output=False,
                text=True,
                check=True,
            )

            duration = time.time() - start_time
            self.test_results[description] = {
                "status": "PASSED",
                "duration": duration,
                "exit_code": result.returncode,
            }

            print(f"\n✅ {description} - PASSED ({duration:.1f}s)")
            return True

        except subprocess.CalledProcessError as e:
            duration = time.time() - start_time
            self.test_results[description] = {
                "status": "FAILED",
                "duration": duration,
                "exit_code": e.returncode,
            }

            print(f"\n❌ {description} - FAILED ({duration:.1f}s)")
            print(f"Exit code: {e.returncode}")
            return False

    def run_linting(self):
        """Run code linting and formatting checks"""
        success = True

        # Ruff linting
        success &= self.run_command(
            ["ruff", "check", "app/", "tests/"], "Code Linting (Ruff)"
        )

        # Black formatting check
        success &= self.run_command(
            ["black", "--check", "app/", "tests/"], "Code Formatting Check (Black)"
        )

        # MyPy type checking
        success &= self.run_command(["mypy", "app/"], "Type Checking (MyPy)")

        return success

    def run_unit_tests(self):
        """Run unit tests with coverage"""
        return self.run_command(
            [
                "pytest",
                "tests/unit/",
                "-v",
                "--cov=app",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--cov-report=xml:coverage.xml",
                "--junit-xml=test-results-unit.xml",
                "--durations=10",
                "-m",
                "unit",
            ],
            "Unit Tests",
        )

    def run_security_tests(self):
        """Run security tests"""
        return self.run_command(
            [
                "pytest",
                "tests/security/",
                "-v",
                "--junit-xml=test-results-security.xml",
                "--durations=10",
                "-m",
                "security",
            ],
            "Security Tests",
        )

    def run_performance_tests(self):
        """Run performance tests"""
        return self.run_command(
            [
                "pytest",
                "tests/performance/",
                "-v",
                "--junit-xml=test-results-performance.xml",
                "--durations=10",
                "-m",
                "performance",
            ],
            "Performance Tests",
        )

    def run_integration_tests(self):
        """Run integration tests"""
        return self.run_command(
            [
                "pytest",
                "tests/integration/",
                "-v",
                "--junit-xml=test-results-integration.xml",
                "--durations=10",
                "-m",
                "integration",
            ],
            "Integration Tests",
        )

    def run_mobile_tests(self):
        """Run mobile-specific tests"""
        return self.run_command(
            [
                "pytest",
                "tests/",
                "-v",
                "--junit-xml=test-results-mobile.xml",
                "--durations=10",
                "-m",
                "mobile",
            ],
            "Mobile Optimization Tests",
        )

    def run_all_tests(self):
        """Run all tests"""
        return self.run_command(
            [
                "pytest",
                "tests/",
                "-v",
                "--cov=app",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--cov-report=xml:coverage.xml",
                "--junit-xml=test-results-all.xml",
                "--durations=20",
                "--cov-fail-under=85",
            ],
            "All Tests",
        )

    def run_quick_tests(self):
        """Run quick smoke tests"""
        return self.run_command(
            [
                "pytest",
                "tests/unit/test_mobile_endpoints.py::TestMobileEndpointPerformance",
                "-v",
                "--durations=5",
            ],
            "Quick Smoke Tests",
        )

    def run_parallel_tests(self):
        """Run tests in parallel"""
        return self.run_command(
            [
                "pytest",
                "tests/",
                "-v",
                "--cov=app",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov",
                "--junit-xml=test-results-parallel.xml",
                "-n",
                "auto",  # Use all available CPUs
                "--durations=10",
            ],
            "Parallel Test Execution",
        )

    def print_summary(self):
        """Print test execution summary"""
        print(f"\n{'=' * 80}")
        print("📊 TEST EXECUTION SUMMARY")
        print(f"{'=' * 80}")

        total_duration = sum(
            result["duration"] for result in self.test_results.values()
        )
        passed_count = sum(
            1 for result in self.test_results.values() if result["status"] == "PASSED"
        )
        failed_count = len(self.test_results) - passed_count

        print(f"Total Test Suites: {len(self.test_results)}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {failed_count}")
        print(f"Total Duration: {total_duration:.1f} seconds")
        print()

        for description, result in self.test_results.items():
            status_emoji = "✅" if result["status"] == "PASSED" else "❌"
            print(
                f"{status_emoji} {description:<40} {result['status']:<10} ({result['duration']:.1f}s)"
            )

        print(f"\n{'=' * 80}")

        if failed_count > 0:
            print("❌ SOME TESTS FAILED - See output above for details")
            return False
        else:
            print("🎉 ALL TESTS PASSED - System ready for production!")
            return True

    def generate_reports(self):
        """Generate test reports"""
        print(f"\n{'=' * 60}")
        print("📋 GENERATING REPORTS")
        print(f"{'=' * 60}")

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

    def cleanup_test_environment(self):
        """Clean up test environment after test execution."""
        print(f"\n{'=' * 60}")
        print("🧹 CLEANING UP TEST ENVIRONMENT")
        print(f"{'=' * 60}")

        # Clean up test database files if any were created
        test_db_files = list(self.project_root.glob("test*.db"))
        if test_db_files:
            for db_file in test_db_files:
                try:
                    db_file.unlink()
                    print(f"   ✅ Removed test database: {db_file.name}")
                except Exception as e:
                    print(f"   ⚠️  Failed to remove {db_file.name}: {e}")

        # Clean up temporary test files
        temp_files = list(self.project_root.glob("temp_*"))
        if temp_files:
            for temp_file in temp_files:
                try:
                    temp_file.unlink()
                    print(f"   ✅ Removed temporary file: {temp_file.name}")
                except Exception as e:
                    print(f"   ⚠️  Failed to remove {temp_file.name}: {e}")

        print("   ✅ Test environment cleanup completed")


def main():
    """Main test runner entry point"""
    parser = argparse.ArgumentParser(description="LIFO AI Engine Test Runner")
    parser.add_argument(
        "suite",
        nargs="?",
        default="all",
        choices=[
            "lint",
            "unit",
            "security",
            "performance",
            "integration",
            "mobile",
            "all",
            "quick",
            "parallel",
        ],
        help="Test suite to run",
    )
    parser.add_argument("--no-lint", action="store_true", help="Skip linting checks")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--verify-env", action="store_true", help="Verify test environment setup and exit")
    parser.add_argument("--no-cleanup", action="store_true", help="Skip cleanup after tests")

    args = parser.parse_args()

    try:
        runner = TestRunner()
    except OSError as e:
        print(f"❌ Environment setup failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test runner initialization failed: {e}")
        sys.exit(1)

    # Handle environment verification
    if args.verify_env:
        print("✅ Test environment verification completed successfully")
        sys.exit(0)

    success = True

    print("🧪 LIFO AI Engine - Comprehensive Test Suite")
    print("=" * 80)

    # Display environment information
    print(f"Environment: {os.environ.get('ENVIRONMENT', 'unknown')}")
    print(f"Database: {os.environ.get('DATABASE_URL', 'not set')[:50]}...")
    print(f"Rate limiting: {'disabled' if os.environ.get('RATE_LIMIT_ENABLED') == 'false' else 'enabled'}")
    print(f"Performance monitoring: {'disabled' if os.environ.get('ENABLE_PERFORMANCE_MONITORING') == 'false' else 'enabled'}")
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

    # Clean up test environment (unless skipped)
    if not args.no_cleanup:
        runner.cleanup_test_environment()
    else:
        print("⚠️  Cleanup skipped (--no-cleanup flag)")

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
