"""
API v1 Router
=============
Versioned API routes.  All endpoints in this module are mounted
under the ``/api/v1`` prefix by the main application.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["v1"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the application's health status, version, and environment.",
)
async def health_check() -> HealthResponse:
    """
    Lightweight health-check endpoint.

    Used by load balancers, orchestrators, and monitoring systems
    to verify the service is alive and responding.
    """
    settings = get_settings()
    return HealthResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        status="healthy",
        environment=settings.app_env.value,
        timestamp=datetime.now(timezone.utc),
    )
