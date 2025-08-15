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
import json
import time
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database.connection import Base, get_db
from app.main import app
from app.utils.performance import BoundedCache, PerformanceMonitor

# Test database URL - use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Test environment configuration
TEST_CONFIG = {
    "MOBILE_PERFORMANCE_THRESHOLDS": {
        "mobile_summary": 300,  # ms
        "quick_score": 200,     # ms
        "store_health": 400,    # ms
        "batch_list": 300       # ms
    },
    "SECURITY_TEST_ENABLED": True,
    "PERFORMANCE_TEST_ENABLED": True,
    "INTEGRATION_TEST_ENABLED": True
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
        await conn.run_sync(Base.metadata.create_all)

    yield engine
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        yield session


@pytest.fixture
def client(test_db):
    """Create test client with database override."""

    def override_get_db():
        return test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


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
def test_settings():
    """Override settings for testing."""
    settings.environment = "testing"
    settings.debug = True
    settings.database_url = TEST_DATABASE_URL
    # Disable rate limiting for tests
    settings.rate_limit_enabled = False
    return settings


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
                assert elapsed <= threshold_ms, f"{message}: {elapsed:.1f}ms > {threshold_ms}ms"
            else:
                assert elapsed <= threshold_ms, f"Performance threshold exceeded: {elapsed:.1f}ms > {threshold_ms}ms"
    
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
    with patch('app.auth.secure_dependencies.get_current_user') as mock_auth:
        mock_auth.return_value = {
            "sub": "test-user-123",
            "email": "test@lifo.ai",
            "role": "authenticated",
            "store_access": ["test-store-id"]
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
            "expiry_date": (datetime.now() + timedelta(days=2)).date()
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
            "expiry_date": (datetime.now() + timedelta(days=1)).date()
        }
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
                "quantity": 15
            }
        ],
        "expected_performance_ms": {
            "mobile_summary": 300,
            "quick_score": 200,
            "store_health": 400,
            "batch_list": 300
        }
    }


@pytest.fixture
def security_test_payloads():
    """Security test payloads for various attack vectors."""
    return {
        "sql_injection": [
            "'; DROP TABLE batches; --",
            "1' OR '1'='1",
            "UNION SELECT * FROM users"
        ],
        "xss_payloads": [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>"
        ],
        "formula_injection": [
            "=2+2",
            "+2+2",
            "=DDE(\"cmd\",\"/c calc.exe\")",
            "@SUM(1+1)"
        ],
        "path_traversal": [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "/etc/shadow"
        ]
    }


@pytest.fixture
async def async_client():
    """Async HTTP client for testing async endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


# Performance testing utilities
class PerformanceAssertion:
    """Helper class for performance assertions in tests."""
    
    @staticmethod
    def assert_response_time(response_time_ms: float, threshold_ms: float, endpoint: str = None):
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
    import psutil
    import os
    
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
        def create_inventory_batch(batch_id: str = None, days_to_expiry: int = 5, **kwargs):
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
                "location_code": kwargs.get("location_code", "A1")
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
                    sku=f"URGENT-{i:03d}"
                )
                batches.append(batch)
            return batches
    
    return TestDataFactory()
