"""
Chat Models
===========
Pydantic schemas for the Repository Chat Assistant.
Handles message structure, API requests/responses, and citations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class Role(str, Enum):
    """The role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ─── Components ──────────────────────────────────────────────────────────────

class Citation(BaseModel):
    """A specific code citation used in an answer."""
    file_path: str = Field(description="The path to the cited file.")
    start_line: int = Field(default=0, description="Starting line number.")
    end_line: int = Field(default=0, description="Ending line number.")
    entity_name: str = Field(default="", description="Class or method cited.")


class ChatMessage(BaseModel):
    """A single turn in the chat conversation."""
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(..., description="The chat session identifier.")
    role: Role = Field(..., description="Sender role (user or assistant).")
    content: str = Field(..., description="The text content of the message.")
    citations: List[Citation] = Field(
        default_factory=list,
        description="Code citations used in the assistant's answer."
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ─── Requests and Responses ──────────────────────────────────────────────────

class ChatQueryRequest(BaseModel):
    """Request payload for the chat endpoint."""
    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="A unique session ID to maintain conversation history."
    )
    repository_id: str = Field(
        default="default",
        description="Identifier or path of the indexed repository."
    )
    query_text: str = Field(
        ..., min_length=1, description="The user's question."
    )
    file_filters: Optional[List[str]] = Field(
        default=None,
        description="Optional list of file paths or directories to restrict search."
    )


class ChatQueryResponse(BaseModel):
    """Response payload for the chat endpoint."""
    session_id: str = Field(description="The session identifier.")
    answer: str = Field(description="The assistant's grounded answer.")
    citations: List[Citation] = Field(
        default_factory=list, description="Extracted code citations."
    )
    retrieved_chunks_used: int = Field(
        default=0, description="Number of code chunks provided to the LLM."
    )
    confidence_score: float = Field(
        default=1.0, description="Estimated confidence (0.0 to 1.0)."
    )
