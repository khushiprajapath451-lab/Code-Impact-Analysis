"""
Search & Embeddings API Router
================================
Endpoints for embedding generation and semantic codebase search.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, status

from app.agents.search_agent import EmbeddingSearchAgent
from app.models.search_models import (
    GenerateEmbeddingsRequest,
    GenerateEmbeddingsResponse,
    SearchRequest,
    SearchResponse,
)
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Embeddings & Search"])


# ─── Embedding Generation ────────────────────────────────────────────────────


@router.post(
    "/embeddings/generate",
    response_model=GenerateEmbeddingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate and store embeddings",
    description=(
        "Parses a local repository, generates vector embeddings for all "
        "extracted code chunks, and stores them in the vector database."
    ),
)
async def generate_embeddings(
    request: GenerateEmbeddingsRequest,
) -> GenerateEmbeddingsResponse:
    """
    Full pipeline: parse → embed → store.

    Delegates to EmbeddingSearchAgent.generate_embeddings().
    """
    try:
        agent = EmbeddingSearchAgent(
            collection_name=request.collection_name,
        )
        result = agent.generate_embeddings(
            request.repository_path,
            file_extensions=(
                list(request.file_extensions) if request.file_extensions else None
            ),
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Embedding generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding error: {exc}",
        )

    return GenerateEmbeddingsResponse(**result)


# ─── Semantic Search ──────────────────────────────────────────────────────────


@router.post(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic code search",
    description=(
        "Accepts a natural-language query (e.g. a Jira requirement) and "
        "returns the most semantically relevant code chunks from the "
        "indexed codebase."
    ),
)
async def search_codebase(request: SearchRequest) -> SearchResponse:
    """
    Embed the query and perform cosine-similarity search
    against the vector store.
    """
    start = time.perf_counter()

    try:
        agent = EmbeddingSearchAgent(
            collection_name=request.collection_name,
        )
        results = agent.search_codebase(
            request.query,
            top_k=request.top_k,
            language_filter=request.language_filter,
        )
    except Exception as exc:
        logger.exception("Search failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search error: {exc}",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000

    return SearchResponse(
        query=request.query,
        top_k=request.top_k,
        total_results=len(results),
        embedding_provider=agent._embedding_service.provider_name,
        results=results,
        search_duration_ms=round(elapsed_ms, 2),
    )


# ─── Collection Stats ────────────────────────────────────────────────────────


@router.get(
    "/embeddings/stats",
    summary="Vector store statistics",
    description="Returns the number of records and collection info.",
)
async def collection_stats():
    """Return basic stats about the vector store collection."""
    try:
        store = VectorStoreService()
        return store.get_collection_stats()
    except Exception as exc:
        logger.exception("Failed to get collection stats")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
