"""
Pytest configuration and fixtures for LIFO AI Engine tests
"""

import asyncio
from collections.abc import AsyncGenerator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database.connection import Base, get_db
from app.main import app

# Test database URL - use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


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
    return settings
