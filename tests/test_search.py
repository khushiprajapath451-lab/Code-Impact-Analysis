"""
Tests — Embedding & Semantic Search (Phase 3)
===============================================
Validates the embedding service, vector store, search agent,
and API endpoints.

Uses the LOCAL embedding provider (sentence-transformers) so
tests run without any API keys.
"""

from __future__ import annotations

import textwrap
from pathlib import Path
from typing import List

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.models.code_models import ChunkType, CodeChunk, SupportedLanguage
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  Fixtures
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture()
def embedding_service() -> EmbeddingService:
    """Create an EmbeddingService using the local provider."""
    return EmbeddingService()


@pytest.fixture()
def vector_store(tmp_path: Path) -> VectorStoreService:
    """Create a VectorStoreService with a temp directory."""
    return VectorStoreService(
        persist_dir=str(tmp_path / "chroma_test"),
        collection_name="test_collection",
    )


@pytest.fixture()
def sample_chunks() -> List[CodeChunk]:
    """Create sample CodeChunks for testing."""
    return [
        CodeChunk(
            chunk_id="chunk_001",
            file_path="app/calculator.py",
            language=SupportedLanguage.PYTHON,
            chunk_type=ChunkType.FUNCTION,
            entity_name="add",
            code_content="def add(a: int, b: int) -> int:\n    return a + b",
            start_line=1,
            end_line=2,
            docstring="Add two numbers together.",
        ),
        CodeChunk(
            chunk_id="chunk_002",
            file_path="app/calculator.py",
            language=SupportedLanguage.PYTHON,
            chunk_type=ChunkType.FUNCTION,
            entity_name="subtract",
            code_content="def subtract(a: int, b: int) -> int:\n    return a - b",
            start_line=4,
            end_line=5,
            docstring="Subtract b from a.",
        ),
        CodeChunk(
            chunk_id="chunk_003",
            file_path="app/auth.py",
            language=SupportedLanguage.PYTHON,
            chunk_type=ChunkType.CLASS,
            entity_name="AuthManager",
            code_content=(
                "class AuthManager:\n"
                "    def authenticate(self, token: str) -> bool:\n"
                "        return self.validate_jwt(token)"
            ),
            start_line=1,
            end_line=3,
            docstring="Handles user authentication via JWT tokens.",
        ),
    ]


@pytest.fixture()
def sample_repo(tmp_path: Path) -> Path:
    """Create a minimal repo for end-to-end testing."""
    py_file = tmp_path / "calculator.py"
    py_file.write_text(
        textwrap.dedent('''\
            """Calculator module."""

            def add(a: int, b: int) -> int:
                """Add two numbers."""
                return a + b

            def multiply(a: int, b: int) -> int:
                """Multiply two numbers."""
                return a * b
        '''),
        encoding="utf-8",
    )
    return tmp_path


# ═══════════════════════════════════════════════════════════════════════════════
#  Embedding Service Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestEmbeddingService:
    """Tests for the secure embedding service."""

    def test_embed_single_text(self, embedding_service: EmbeddingService):
        result = embedding_service.embed_texts(["Hello world"])
        assert len(result) == 1
        assert len(result[0]) > 0  # Has dimensions
        assert all(isinstance(v, float) for v in result[0])

    def test_embed_multiple_texts(self, embedding_service: EmbeddingService):
        texts = ["Hello world", "def add(a, b): return a + b", "authentication"]
        result = embedding_service.embed_texts(texts)
        assert len(result) == 3

    def test_embed_empty_list(self, embedding_service: EmbeddingService):
        result = embedding_service.embed_texts([])
        assert result == []

    def test_embed_query(self, embedding_service: EmbeddingService):
        result = embedding_service.embed_query("find authentication code")
        assert len(result) > 0
        assert isinstance(result, list)

    def test_embeddings_are_normalised(self, embedding_service: EmbeddingService):
        """Local model should return normalised vectors (magnitude ≈ 1.0)."""
        result = embedding_service.embed_texts(["test normalisation"])
        magnitude = sum(v ** 2 for v in result[0]) ** 0.5
        assert abs(magnitude - 1.0) < 0.01

    def test_provider_name(self, embedding_service: EmbeddingService):
        assert embedding_service.provider_name == "local"

    def test_dimensions_property(self, embedding_service: EmbeddingService):
        # Force model load
        embedding_service.embed_texts(["trigger load"])
        assert embedding_service.dimensions > 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Vector Store Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestVectorStore:
    """Tests for the ChromaDB vector store."""

    def test_upsert_and_count(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)
        stored = vector_store.upsert_chunks(sample_chunks, embeddings)
        assert stored == 3

        stats = vector_store.get_collection_stats()
        assert stats["total_records"] == 3

    def test_upsert_idempotent(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        """Upserting the same chunks twice should not duplicate records."""
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)

        vector_store.upsert_chunks(sample_chunks, embeddings)
        vector_store.upsert_chunks(sample_chunks, embeddings)

        stats = vector_store.get_collection_stats()
        assert stats["total_records"] == 3

    def test_search_returns_results(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)
        vector_store.upsert_chunks(sample_chunks, embeddings)

        query_vec = embedding_service.embed_query("add two numbers")
        results = vector_store.search(query_vec, top_k=2)

        assert len(results) == 2
        assert "chunk_id" in results[0]
        assert "similarity" in results[0]
        assert results[0]["similarity"] > 0

    def test_search_relevance_ranking(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        """'add two numbers' should rank the add function highest."""
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)
        vector_store.upsert_chunks(sample_chunks, embeddings)

        query_vec = embedding_service.embed_query("add two numbers together")
        results = vector_store.search(query_vec, top_k=3)

        # The 'add' function chunk should be the top result
        assert results[0]["chunk_id"] == "chunk_001"

    def test_search_with_filter(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)
        vector_store.upsert_chunks(sample_chunks, embeddings)

        query_vec = embedding_service.embed_query("authentication")
        results = vector_store.search(
            query_vec, top_k=10, where_filter={"chunk_type": "class"}
        )

        assert all(
            r["metadata"]["chunk_type"] == "class" for r in results
        )

    def test_mismatched_lengths_raises(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
    ):
        with pytest.raises(ValueError, match="Chunk count"):
            vector_store.upsert_chunks(sample_chunks, [[0.1, 0.2]])

    def test_clear_collection(
        self,
        vector_store: VectorStoreService,
        sample_chunks: List[CodeChunk],
        embedding_service: EmbeddingService,
    ):
        texts = [c.code_content for c in sample_chunks]
        embeddings = embedding_service.embed_texts(texts)
        vector_store.upsert_chunks(sample_chunks, embeddings)

        removed = vector_store.clear_collection()
        assert removed == 3
        assert vector_store.get_collection_stats()["total_records"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestEmbeddingsEndpoint:
    """Tests for POST /api/v1/embeddings/generate."""

    def test_generate_embeddings(self, sample_repo: Path):
        response = client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_files_parsed"] >= 1
        assert data["total_chunks_embedded"] > 0
        assert data["total_chunks_stored"] > 0
        assert data["embedding_provider"] == "local"
        assert data["duration_ms"] > 0

    def test_generate_invalid_path(self):
        response = client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": "/nonexistent/path/xyz"},
        )
        assert response.status_code == 404

    def test_collection_stats(self, sample_repo: Path):
        # Generate first to ensure collection exists
        client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )
        response = client.get("/api/v1/embeddings/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert data["total_records"] > 0


class TestSearchEndpoint:
    """Tests for POST /api/v1/search."""

    def test_search_returns_results(self, sample_repo: Path):
        # Index first
        client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )

        # Search
        response = client.post(
            "/api/v1/search",
            json={"query": "add two numbers", "top_k": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_results"] > 0
        assert len(data["results"]) > 0
        assert "similarity" in data["results"][0]
        assert "code_content" in data["results"][0]
        assert data["search_duration_ms"] > 0

    def test_search_with_language_filter(self, sample_repo: Path):
        # Index first
        client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )

        response = client.post(
            "/api/v1/search",
            json={
                "query": "multiply function",
                "top_k": 5,
                "language_filter": "python",
            },
        )
        assert response.status_code == 200
        data = response.json()
        for r in data["results"]:
            assert r["language"] == "python"

    def test_search_empty_collection(self):
        """Search with an unused collection should return empty results."""
        response = client.post(
            "/api/v1/search",
            json={
                "query": "anything",
                "top_k": 5,
                "collection_name": "empty_test_collection",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_results"] == 0
