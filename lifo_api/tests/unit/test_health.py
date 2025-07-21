"""
Unit tests for health check endpoints
"""

import pytest
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test root endpoint returns service information."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "LIFO AI Engine"
    assert "version" in data
    assert "features" in data
    assert isinstance(data["features"], list)


def test_health_endpoint(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "version" in data


def test_api_info_endpoint(client: TestClient):
    """Test API info endpoint."""
    response = client.get("/api/info")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "LIFO AI Engine"
    assert "version" in data
    assert "endpoints" in data
    assert "features" in data


@pytest.mark.asyncio
async def test_health_check_structure(client: TestClient):
    """Test health check response structure."""
    response = client.get("/health")
    data = response.json()

    required_fields = ["status", "timestamp", "version"]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    # Status should be healthy or unhealthy
    assert data["status"] in ["healthy", "unhealthy"]
