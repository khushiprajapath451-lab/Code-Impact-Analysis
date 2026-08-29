"""
Pydantic Schemas
================
Standardised request / response models used across the application.
These schemas define the contract between agents, API endpoints, and services.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────


class AgentStatus(str, Enum):
    """Outcome status of an agent execution."""
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


# ─── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Response schema for the health-check endpoint."""
    app_name: str
    version: str
    status: str = "healthy"
    environment: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Agent I/O ───────────────────────────────────────────────────────────────


class AgentInput(BaseModel):
    """
    Standardised input payload for every agent.

    Attributes
    ----------
    task : str
        A concise description of what the agent should do.
    context : str | None
        Supporting context the agent may need (source code, diffs, docs, etc.).
    metadata : dict
        Arbitrary key-value pairs for agent-specific configuration.
    """
    task: str = Field(
        ...,
        min_length=1,
        description="Concise description of the task for the agent.",
    )
    context: Optional[str] = Field(
        default=None,
        description="Supporting context (code, diffs, documentation).",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary key-value pairs for agent-specific config.",
    )


class AgentOutput(BaseModel):
    """
    Standardised output payload returned by every agent.

    Attributes
    ----------
    agent_name : str
        Name of the agent that produced this output.
    status : AgentStatus
        Whether the execution succeeded, failed, or partially completed.
    result : str
        The primary output / response from the agent.
    error : str | None
        Error message if the execution failed.
    usage : dict
        Token usage and cost metadata from the LLM call.
    metadata : dict
        Any additional structured data the agent wants to surface.
    created_at : datetime
        UTC timestamp of when the output was generated.
    duration_ms : float | None
        Wall-clock duration of the agent execution in milliseconds.
    """
    agent_name: str
    status: AgentStatus = AgentStatus.SUCCESS
    result: str = ""
    error: Optional[str] = None
    usage: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: Optional[float] = None
