"""
Smoke Tests — Health Endpoint
==============================
Validates the Phase 1 foundation is wired up correctly.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_200():
    """GET /api/v1/health should return 200 OK."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_response_schema():
    """Health response must contain expected fields."""
    response = client.get("/api/v1/health")
    data = response.json()

    assert "app_name" in data
    assert "version" in data
    assert "status" in data
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "timestamp" in data


def test_health_returns_correct_app_name():
    """The app_name field should match configuration."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert data["app_name"] == "AI Code Impact Analysis Assistant"


def test_health_returns_version():
    """Version should be a non-empty string."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert isinstance(data["version"], str)
    assert len(data["version"]) > 0


def test_openapi_docs_accessible():
    """Swagger UI should be available at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200
