"""
Security Utilities
==================
Handles API key validation and secure endpoint access for MassMutual's
enterprise code review assistant.
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

from app.core.config import get_settings

logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: Optional[str] = Security(api_key_header)) -> str:
    """
    Dependency for protecting API routes.
    Checks if the incoming X-API-Key header matches the configured key.
    """
    settings = get_settings()
    
    # In enterprise environments, the expected key should be loaded securely
    # from Azure Key Vault or similar, but here we read it from settings.
    expected_api_key = getattr(settings, "api_key", None)
    
    if not expected_api_key:
        logger.warning("No API key configured in settings. Allowing access.")
        return "unsecured_dev_mode"

    if api_key == expected_api_key:
        return api_key

    logger.warning("Invalid or missing API key attempt.")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing X-API-Key header",
    )
