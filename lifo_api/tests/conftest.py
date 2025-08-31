"""
Comprehensive pytest configuration and fixtures for LIFO AI Engine tests

Provides fixtures for:
- Database testing with SQLite in-memory
- Authentication mocking
- Performance testing utilities
- Security testing fixtures
- Mobile testing data
"""

import asyncio
import os
import time
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

# =============================================================================
# CRITICAL: Load test environment FIRST before any app imports
# =============================================================================
# This ensures that environment variables are loaded before any module
# initialization that depends on them (like settings objects)
# Load .env.test file if it exists
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Get the directory containing this conftest.py file
_current_dir = os.path.dirname(os.path.abspath(__file__))
_api_root = os.path.dirname(_current_dir)  # Go up one level to lifo_api root
_test_env_path = os.path.join(_api_root, ".env.test")

# Load test environment variables with override=True to ensure they take precedence
if os.path.exists(_test_env_path):
    load_dotenv(_test_env_path, override=True)
    print(f"Loaded test environment from: {_test_env_path}")
else:
    print(f"Warning: .env.test file not found at {_test_env_path}")

# Set critical environment variables if not already set
if "ENVIRONMENT" not in os.environ:
    os.environ["ENVIRONMENT"] = "testing"
if "SUPABASE_URL" not in os.environ:
    os.environ["SUPABASE_URL"] = "https://test.supabase.co"
if "SUPABASE_JWT_SECRET" not in os.environ:
    os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-key-12345"  # noqa: S105
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

# NOW it's safe to import app modules since environment is properly set
from app.core.config import settings  # noqa: E402
from app.database.connection import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.utils.performance import BoundedCache, PerformanceMonitor  # noqa: E402

# Verify that the environment was loaded correctly
print(f"Test environment loaded - ENVIRONMENT: {os.environ.get('ENVIRONMENT')}")
print(f"Test environment loaded - SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")

# Test database URL - use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Test environment configuration
TEST_CONFIG = {
    "MOBILE_PERFORMANCE_THRESHOLDS": {
        "mobile_summary": 300,  # ms
        "quick_score": 200,  # ms
        "store_health": 400,  # ms
        "batch_list": 300,  # ms
    },
    "SECURITY_TEST_ENABLED": True,
    "PERFORMANCE_TEST_ENABLED": True,
    "INTEGRATION_TEST_ENABLED": True,
}

# Default test environment variables with fallbacks
DEFAULT_TEST_ENV = {
    "ENVIRONMENT": "testing",
    "DEBUG": "true",
    "DATABASE_URL": TEST_DATABASE_URL,
    "RATE_LIMIT_ENABLED": "false",
    "RATE_LIMIT_PER_MINUTE": "1000",
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_JWT_SECRET": "test-jwt-secret-key-12345",
    "SUPABASE_ANON_KEY": "test-anon-key-12345",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key-12345",
    "JWT_SECRET_KEY": "test-jwt-secret-key-for-testing-12345",
    "LOG_LEVEL": "DEBUG",
    "ENABLE_PERFORMANCE_MONITORING": "false",
    "ENABLE_ALERTING": "false",
    "ENABLE_API_KEY_AUTH": "false",
    "MAX_FILE_SIZE_MB": "10",  # Smaller for tests
    "ASYNC_TIMEOUT_SECONDS": "5",  # Shorter timeout for tests
}


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    async with engine.begin() as conn:
        # For SQLite testing, disable foreign key constraints during table creation
        if "sqlite" in str(engine.url):
            await conn.execute(text("PRAGMA foreign_keys = OFF"))
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in str(engine.url):
            await conn.execute(text("PRAGMA foreign_keys = ON"))

    yield engine
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session


@pytest.fixture
def client(test_db, test_settings):
    """Create test client with database override and test settings."""

    def override_get_db():
        return test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def validate_test_environment(test_settings):
    """Validate that test environment is properly configured."""
    try:
        assert test_settings.environment == "testing", (
            f"Expected 'testing' environment, got '{test_settings.environment}'"
        )
        assert test_settings.database_url == TEST_DATABASE_URL, (
            "Test database URL not properly set"
        )
        assert not test_settings.rate_limit_enabled, (
            "Rate limiting should be disabled in tests"
        )
        assert test_settings.debug is True, "Debug mode should be enabled in tests"

        # Additional validation for critical test settings
        assert test_settings.rate_limit_per_minute >= 1000, (
            "Rate limit should be high for tests"
        )
        assert not test_settings.enable_performance_monitoring, (
            "Performance monitoring should be disabled in tests"
        )
        assert not test_settings.enable_alerting, "Alerting should be disabled in tests"

    except AttributeError as e:
        pytest.fail(f"Missing required setting attribute: {e}")
    except AssertionError as e:
        pytest.fail(f"Test environment validation failed: {e}")


@pytest.fixture
def mock_user():
    """Mock user for authentication tests."""
    return {"sub": "test-user-id", "email": "test@example.com", "role": "authenticated"}


@pytest.fixture
def mock_store():
    """Mock store data for testing."""
    return {
        "store_id": "test-store-id",
        "store_name": "Test Store",
        "store_code": "TEST-001",
        "business_name": "Test Business",
        "is_active": True,
    }


@pytest.fixture
def mock_inventory_batch():
    """Mock inventory batch for testing."""
    return {
        "batch_id": "test-batch-id",
        "sku": "TEST-001",
        "product_name": "Test Product",
        "category": "test",
        "current_quantity": 10,
        "cost_price": 1.0,
        "selling_price": 2.0,
        "expiry_date": "2024-12-31",
        "location_code": "TEST-LOC",
    }


@pytest.fixture
def sample_csv_content():
    """Sample CSV content for testing."""
    return """sku,product_name,quantity,cost_price,selling_price,expiry_date,category
TEST-001,Test Product 1,10,1.00,2.00,2024-12-31,test
TEST-002,Test Product 2,5,2.00,3.50,2024-11-30,test"""


@pytest.fixture
def invalid_csv_content():
    """Invalid CSV content for testing."""
    return """sku,product_name,quantity
TEST-001,Test Product 1"""  # Missing required columns


# Test configuration overrides
@pytest.fixture(autouse=True)
def test_settings(monkeypatch):
    """Override settings for testing with proper isolation."""
    try:
        # Since environment variables are now loaded early, we only need to
        # apply any additional overrides that weren't in the .env.test file
        for key, value in DEFAULT_TEST_ENV.items():
            if key not in os.environ or os.environ[key] != value:
                monkeypatch.setenv(key, value)

        # The settings object should already be properly initialized with
        # test environment values due to early loading
        test_settings_instance = settings  # Use existing settings instance

        # Validate critical settings
        assert test_settings_instance.environment == "testing", (
            f"Failed to set testing environment - got '{test_settings_instance.environment}'. "
            f"Check that .env.test is loaded correctly."
        )
        assert test_settings_instance.database_url == TEST_DATABASE_URL, (
            f"Failed to set test database URL - got '{test_settings_instance.database_url}'"
        )

        return test_settings_instance

    except Exception as e:
        pytest.fail(f"Failed to configure test settings: {e}")


@pytest.fixture
def malicious_csv_content():
    """Malicious CSV content for security testing."""
    return """sku,product_name,quantity,formula_field
TEST-001,Test Product,10,=2+2
TEST-002,Another Product,5,+2+2
TEST-003,DDE Test,3,=DDE("cmd","/c calc.exe")
TEST-004,Script Test,2,<script>alert('xss')</script>"""


@pytest.fixture
def performance_timer():
    """Performance timing fixture for tests."""

    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()

        @property
        def elapsed_ms(self):
            if self.start_time and self.end_time:
                return (self.end_time - self.start_time) * 1000
            return None

        def assert_under_ms(self, threshold_ms: float, message: str = None):
            elapsed = self.elapsed_ms
            assert elapsed is not None, "Timer not properly started/stopped"
            if message:
                assert elapsed <= threshold_ms, (
                    f"{message}: {elapsed:.1f}ms > {threshold_ms}ms"
                )
            else:
                assert elapsed <= threshold_ms, (
                    f"Performance threshold exceeded: {elapsed:.1f}ms > {threshold_ms}ms"
                )

    return Timer()


@pytest.fixture
def mock_mobile_cache():
    """Mock mobile cache for testing."""
    cache = BoundedCache(max_size=100, default_ttl=60)
    return cache


@pytest.fixture
def mock_performance_monitor():
    """Mock performance monitor for testing."""
    return PerformanceMonitor()


@pytest.fixture
def mock_api_key_auth():
    """Mock API key authentication for testing."""
    with patch("app.auth.secure_dependencies.get_current_user") as mock_auth:
        mock_auth.return_value = {
            "sub": "test-user-123",
            "email": "test@lifo.ai",
            "role": "authenticated",
            "store_access": ["test-store-id"],
        }
        yield mock_auth


@pytest.fixture
def mock_database_operations():
    """Mock database operations for testing."""
    mock_ops = AsyncMock()

    # Mock mobile endpoint data
    mock_ops.get_store_inventory_for_scoring.return_value = [
        {
            "batch_id": "batch-001",
            "sku": "TEST-001",
            "category": "fresh_produce",
            "current_quantity": 10,
            "selling_price": 2.50,
            "cost_price": 1.00,
            "days_to_expiry": 2,
            "location_code": "A1",
            "expiry_date": (datetime.now() + timedelta(days=2)).date(),
        },
        {
            "batch_id": "batch-002",
            "sku": "TEST-002",
            "category": "dairy",
            "current_quantity": 5,
            "selling_price": 3.00,
            "cost_price": 1.50,
            "days_to_expiry": 1,
            "location_code": "B2",
            "expiry_date": (datetime.now() + timedelta(days=1)).date(),
        },
    ]

    return mock_ops


@pytest.fixture
def mobile_test_data():
    """Test data for mobile endpoints."""
    return {
        "store_id": "test-store-123",
        "batch_ids": ["batch-001", "batch-002", "batch-003"],
        "urgent_batches": [
            {
                "batch_id": "batch-001",
                "sku": "URGENT-001",
                "days_to_expiry": 0,
                "urgency_score": 1.0,
                "quantity": 15,
            }
        ],
        "expected_performance_ms": {
            "mobile_summary": 300,
            "quick_score": 200,
            "store_health": 400,
            "batch_list": 300,
        },
    }


@pytest.fixture
def security_test_payloads():
    """Security test payloads for various attack vectors."""
    return {
        "sql_injection": [
            "'; DROP TABLE batches; --",
            "1' OR '1'='1",
            "UNION SELECT * FROM users",
        ],
        "xss_payloads": [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
        ],
        "formula_injection": ["=2+2", "+2+2", '=DDE("cmd","/c calc.exe")', "@SUM(1+1)"],
        "path_traversal": [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "/etc/shadow",
        ],
    }


@pytest.fixture
async def async_client(test_settings):
    """Async HTTP client for testing async endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


# Performance testing utilities
class PerformanceAssertion:
    """Helper class for performance assertions in tests."""

    @staticmethod
    def assert_response_time(
        response_time_ms: float, threshold_ms: float, endpoint: str = None
    ):
        """Assert response time is under threshold."""
        endpoint_info = f" for {endpoint}" if endpoint else ""
        assert response_time_ms <= threshold_ms, (
            f"Performance threshold exceeded{endpoint_info}: "
            f"{response_time_ms:.1f}ms > {threshold_ms}ms"
        )

    @staticmethod
    def assert_mobile_performance(response_time_ms: float, endpoint: str = None):
        """Assert mobile performance standards (300ms for most, 200ms for scoring)."""
        if endpoint and "score" in endpoint:
            threshold = 200
        else:
            threshold = 300
        PerformanceAssertion.assert_response_time(response_time_ms, threshold, endpoint)


@pytest.fixture
def perf_assert():
    """Performance assertion helper."""
    return PerformanceAssertion()


# Memory leak testing utilities
@pytest.fixture
def memory_tracker():
    """Track memory usage during tests."""
    import os

    import psutil

    class MemoryTracker:
        def __init__(self):
            self.process = psutil.Process(os.getpid())
            self.initial_memory = None
            self.peak_memory = None

        def start(self):
            self.initial_memory = self.process.memory_info().rss
            self.peak_memory = self.initial_memory

        def update_peak(self):
            current_memory = self.process.memory_info().rss
            if current_memory > self.peak_memory:
                self.peak_memory = current_memory

        def assert_no_significant_leak(self, threshold_mb: float = 50):
            """Assert no significant memory leak occurred."""
            if self.initial_memory is None:
                raise ValueError("Memory tracking not started")

            current_memory = self.process.memory_info().rss
            leak_bytes = current_memory - self.initial_memory
            leak_mb = leak_bytes / (1024 * 1024)

            assert leak_mb <= threshold_mb, (
                f"Memory leak detected: {leak_mb:.1f}MB > {threshold_mb}MB threshold"
            )

    return MemoryTracker()


# Database test data factories
@pytest.fixture
def test_data_factory():
    """Factory for creating test data."""

    class TestDataFactory:
        @staticmethod
        def create_inventory_batch(
            batch_id: str = None, days_to_expiry: int = 5, **kwargs
        ):
            """Create test inventory batch data."""
            batch_id = batch_id or f"test-batch-{int(time.time())}"
            expiry_date = datetime.now() + timedelta(days=days_to_expiry)

            return {
                "batch_id": batch_id,
                "sku": kwargs.get("sku", f"SKU-{batch_id}"),
                "product_name": kwargs.get("product_name", "Test Product"),
                "category": kwargs.get("category", "test_category"),
                "current_quantity": kwargs.get("current_quantity", 10),
                "cost_price": kwargs.get("cost_price", 1.00),
                "selling_price": kwargs.get("selling_price", 2.00),
                "expiry_date": expiry_date.date(),
                "days_to_expiry": days_to_expiry,
                "location_code": kwargs.get("location_code", "A1"),
            }

        @staticmethod
        def create_urgent_batch_list(count: int = 5):
            """Create list of urgent batches for testing."""
            batches = []
            for i in range(count):
                days_to_expiry = i % 3  # 0, 1, 2 days - all urgent
                batch = TestDataFactory.create_inventory_batch(
                    batch_id=f"urgent-batch-{i}",
                    days_to_expiry=days_to_expiry,
                    sku=f"URGENT-{i:03d}",
                )
                batches.append(batch)
            return batches

    return TestDataFactory()


@pytest.fixture
def test_environment_info():
    """Provide information about test environment setup."""
    return {
        "database_url": TEST_DATABASE_URL,
        "config": DEFAULT_TEST_ENV,
        "performance_thresholds": TEST_CONFIG["MOBILE_PERFORMANCE_THRESHOLDS"],
        "features_enabled": {
            "security_tests": TEST_CONFIG["SECURITY_TEST_ENABLED"],
            "performance_tests": TEST_CONFIG["PERFORMANCE_TEST_ENABLED"],
            "integration_tests": TEST_CONFIG["INTEGRATION_TEST_ENABLED"],
        },
    }


# Error handling for common test configuration issues
def pytest_configure(config):
    """Configure pytest with custom markers and validation."""
    # Register custom markers
    config.addinivalue_line(
        "markers", "requires_settings: Tests that require proper settings configuration"
    )
    config.addinivalue_line(
        "markers", "config_validation: Tests that validate configuration"
    )

    # Validate that test environment was loaded correctly
    print(f"pytest_configure: Environment = {os.environ.get('ENVIRONMENT', 'NOT_SET')}")
    print(
        f"pytest_configure: SUPABASE_URL = {os.environ.get('SUPABASE_URL', 'NOT_SET')}"
    )


def pytest_runtest_setup(item):
    """Run setup for each test item."""
    # Add validation for tests that require specific settings
    if item.get_closest_marker("requires_settings"):
        try:
            from app.core.config import settings

            if not hasattr(settings, "rate_limit_enabled"):
                pytest.skip(
                    "Settings not properly configured - missing rate_limit_enabled field"
                )

            # Validate that we're in test environment
            if settings.environment != "testing":
                pytest.skip(
                    f"Not in testing environment - got '{settings.environment}'"
                )

        except ImportError as e:
            pytest.skip(f"Cannot import settings: {e}")
        except AttributeError as e:
            pytest.skip(f"Settings configuration error: {e}")
