"""
Embedding & Search Models
==========================
Pydantic schemas for the embedding generation and semantic search
API endpoints (Phase 3).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Embedding Generation ────────────────────────────────────────────────────


class GenerateEmbeddingsRequest(BaseModel):
    """Request payload for the embedding generation endpoint."""
    repository_path: str = Field(
        ...,
        min_length=1,
        description="Path to the local repository to parse and embed.",
    )
    file_extensions: Optional[List[str]] = Field(
        default=None,
        description="Override the default list of file extensions.",
    )
    collection_name: Optional[str] = Field(
        default=None,
        description="Override the ChromaDB collection name.",
    )


class GenerateEmbeddingsResponse(BaseModel):
    """Response payload after generating and storing embeddings."""
    repository_path: str
    total_files_parsed: int
    total_chunks_embedded: int
    total_chunks_stored: int
    embedding_provider: str
    embedding_model: str
    embedding_dimensions: int
    collection_name: str
    duration_ms: float
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ─── Semantic Search ─────────────────────────────────────────────────────────


class SearchRequest(BaseModel):
    """Request payload for the semantic search endpoint."""
    query: str = Field(
        ...,
        min_length=1,
        description=(
            "Natural language query — e.g. a Jira requirement, "
            "a feature description, or a code-related question."
        ),
    )
    top_k: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of top results to return.",
    )
    language_filter: Optional[str] = Field(
        default=None,
        description="Filter results by programming language.",
    )
    collection_name: Optional[str] = Field(
        default=None,
        description="Override the ChromaDB collection to search.",
    )


class SearchResultItem(BaseModel):
    """A single search result with its relevance score."""
    chunk_id: str
    file_path: str
    language: str
    chunk_type: str
    entity_name: str
    code_content: str
    start_line: int
    end_line: int
    parent_entity: str = ""
    docstring: str = ""
    similarity: float = Field(
        description="Cosine similarity score (0.0 – 1.0)."
    )


class SearchResponse(BaseModel):
    """Response payload for the semantic search endpoint."""
    query: str
    top_k: int
    total_results: int
    embedding_provider: str
    results: List[SearchResultItem] = Field(default_factory=list)
    search_duration_ms: float
    searched_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
