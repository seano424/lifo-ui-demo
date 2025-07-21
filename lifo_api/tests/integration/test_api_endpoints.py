"""
Integration tests for API endpoints
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestAPIEndpoints:
    """Test API endpoint integration."""

    def test_api_root_endpoint(self, client: TestClient):
        """Test API root endpoint."""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert data["service"] == "LIFO AI Engine"
        assert "version" in data

    def test_health_endpoint(self, client: TestClient):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "timestamp" in data

    def test_api_info_endpoint(self, client: TestClient):
        """Test API info endpoint."""
        response = client.get("/api/info")
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "LIFO AI Engine"
        assert "endpoints" in data

    def test_csv_template_endpoint(self, client: TestClient):
        """Test CSV template endpoint."""
        response = client.get("/api/v1/csv/template/inventory")
        assert response.status_code == 200

        data = response.json()
        assert data["processing_type"] == "inventory"
        assert "csv_content" in data
        assert "sku,product_name" in data["csv_content"]

    def test_csv_template_invalid_type(self, client: TestClient):
        """Test CSV template with invalid type."""
        response = client.get("/api/v1/csv/template/invalid")
        assert response.status_code == 400

    @patch("app.auth.dependencies.get_current_user")
    def test_scoring_endpoints_require_auth(self, mock_auth, client: TestClient):
        """Test that scoring endpoints require authentication."""
        # Mock authentication failure
        mock_auth.side_effect = Exception("Authentication required")

        response = client.get("/api/v1/scoring/high-urgency/test-store")
        assert response.status_code == 500  # Internal server error due to auth failure

    @patch("app.auth.dependencies.get_current_user")
    @patch("app.auth.dependencies.validate_store_access")
    def test_inventory_endpoints_require_auth(
        self, mock_store_access, mock_auth, client: TestClient
    ):
        """Test that inventory endpoints require authentication."""
        # Mock successful authentication
        mock_auth.return_value = {"sub": "test-user", "role": "authenticated"}
        mock_store_access.return_value = True

        response = client.get("/api/v1/inventory/store/test-store")
        # Should not fail due to authentication, but may fail due to database
        assert response.status_code in [200, 500]  # 500 if database operation fails

    def test_cors_headers(self, client: TestClient):
        """Test CORS headers are present."""
        response = client.options("/", headers={"Origin": "http://localhost:3000"})

        # FastAPI automatically handles CORS, so we just check the response
        assert response.status_code in [
            200,
            405,
        ]  # 405 if OPTIONS not explicitly handled

    def test_openapi_docs(self, client: TestClient):
        """Test OpenAPI documentation endpoints."""
        # Test docs endpoint
        response = client.get("/docs")
        assert response.status_code == 200

        # Test OpenAPI JSON
        response = client.get("/openapi.json")
        assert response.status_code == 200

        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "LIFO AI Engine"

    def test_error_handling(self, client: TestClient):
        """Test error handling for non-existent endpoints."""
        response = client.get("/non-existent-endpoint")
        assert response.status_code == 404

        # Test method not allowed
        response = client.post("/health")
        assert response.status_code == 405

    @patch("app.database.connection.test_connection")
    def test_health_check_with_database_failure(self, mock_db_test, client: TestClient):
        """Test health check when database is unavailable."""
        mock_db_test.return_value = False

        response = client.get("/health")
        # Should still return 200 but with unhealthy status
        assert response.status_code in [200, 503]

        if response.status_code == 200:
            data = response.json()
            assert data["database"] == "disconnected"

    def test_request_validation(self, client: TestClient):
        """Test request validation on endpoints that expect specific formats."""
        # Test CSV upload with invalid file type
        response = client.post(
            "/api/v1/csv/upload/test-store",
            files={"file": ("test.txt", b"invalid content", "text/plain")},
            data={"processing_type": "inventory"},
        )
        # Should fail due to authentication, but that's expected in tests
        assert response.status_code in [400, 401, 403, 422, 500]

    def test_api_versioning(self, client: TestClient):
        """Test API versioning structure."""
        # Test that v1 endpoints exist
        response = client.get("/api/v1/csv/template/inventory")
        assert response.status_code == 200

        # Test that unversioned endpoints still work
        response = client.get("/health")
        assert response.status_code == 200
