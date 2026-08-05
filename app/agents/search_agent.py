"""
Embedding & Semantic Search Agent
==================================
Orchestrates the full embedding pipeline and semantic search:

  1. Parse a repository (delegates to RepositoryParserAgent)
  2. Generate embeddings for all code chunks (via EmbeddingService)
  3. Store embeddings in the vector database (via VectorStoreService)
  4. Search the codebase with natural-language queries

Inherits from :class:`BaseAgent` so it follows the standard agent
contract.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.agents.parser_agent import RepositoryParserAgent
from app.models.code_models import CodeChunk
from app.models.schemas import AgentInput, AgentOutput, AgentStatus
from app.models.search_models import SearchResultItem
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)

# ─── System Prompt ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an enterprise code-search assistant for MassMutual.
When asked about code, you provide precise, security-aware answers
grounded in the retrieved code chunks.  Never fabricate code references.
"""


class EmbeddingSearchAgent(BaseAgent):
    """
    Agent for generating embeddings and performing semantic search
    across an indexed codebase.

    Parameters
    ----------
    embedding_service : EmbeddingService | None
        Custom embedding service instance (injected for testing).
    vector_store : VectorStoreService | None
        Custom vector store instance (injected for testing).
    collection_name : str | None
        Override the default ChromaDB collection name.
    """

    def __init__(
        self,
        *,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStoreService] = None,
        collection_name: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="EmbeddingSearchAgent",
            system_prompt=_SYSTEM_PROMPT,
            **kwargs,
        )
        self._embedding_service = embedding_service or EmbeddingService()
        self._vector_store = vector_store or VectorStoreService(
            collection_name=collection_name,
        )
        self._collection_name = (
            collection_name or self._settings.chroma_collection_name
        )

    # ── BaseAgent contract ────────────────────────────────────────────────

    def execute(self, payload: AgentInput) -> AgentOutput:
        """
        Dispatch based on ``payload.metadata["action"]``.

        Supported actions:
          - ``"embed"``  → parse + embed + store
          - ``"search"`` → semantic search
        """
        action = payload.metadata.get("action", "search")

        if action == "embed":
            return self._handle_embed(payload)
        elif action == "search":
            return self._handle_search(payload)
        else:
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=f"Unknown action: {action}",
            )

    # ── Embedding Pipeline ────────────────────────────────────────────────

    def generate_embeddings(
        self,
        repository_path: str,
        *,
        file_extensions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Full pipeline: parse repository → embed chunks → store vectors.

        Parameters
        ----------
        repository_path : str
            Path to the local repository.
        file_extensions : list[str] | None
            Override file-extension filter.

        Returns
        -------
        dict
            Summary with counts, timings, and configuration metadata.
        """
        start = time.perf_counter()

        # ── Step 1: Parse ─────────────────────────────────────────────────
        logger.info("Step 1/3: Parsing repository — %s", repository_path)
        parser = RepositoryParserAgent(
            extensions=set(file_extensions) if file_extensions else None,
        )
        parsed = parser.parse_repository(repository_path)

        all_chunks = parsed.all_chunks()
        if not all_chunks:
            logger.warning("No code chunks found in %s", repository_path)
            return {
                "total_files_parsed": parsed.total_files_parsed,
                "total_chunks_embedded": 0,
                "total_chunks_stored": 0,
            }

        # ── Step 2: Embed ─────────────────────────────────────────────────
        logger.info(
            "Step 2/3: Generating embeddings for %d chunks", len(all_chunks)
        )
        texts = [self._chunk_to_text(c) for c in all_chunks]
        embeddings = self._embedding_service.embed_texts(texts)

        # ── Step 3: Store ─────────────────────────────────────────────────
        logger.info("Step 3/3: Storing %d embeddings", len(embeddings))
        stored = self._vector_store.upsert_chunks(
            all_chunks, embeddings, repository_path=repository_path
        )

        elapsed_ms = (time.perf_counter() - start) * 1000

        result = {
            "repository_path": repository_path,
            "total_files_parsed": parsed.total_files_parsed,
            "total_chunks_embedded": len(all_chunks),
            "total_chunks_stored": stored,
            "embedding_provider": self._embedding_service.provider_name,
            "embedding_model": self._embedding_service._model_name,
            "embedding_dimensions": self._embedding_service.dimensions,
            "collection_name": self._collection_name,
            "duration_ms": round(elapsed_ms, 2),
        }

        logger.info(
            "Embedding pipeline complete: %d chunks in %.1f ms",
            stored,
            elapsed_ms,
        )
        return result

    # ── Semantic Search ───────────────────────────────────────────────────

    def search_codebase(
        self,
        query: str,
        *,
        top_k: int = 10,
        language_filter: Optional[str] = None,
    ) -> List[SearchResultItem]:
        """
        Search the indexed codebase with a natural-language query.

        Parameters
        ----------
        query : str
            The search query (e.g. a Jira requirement).
        top_k : int
            Number of results to return.
        language_filter : str | None
            Restrict results to a specific programming language.

        Returns
        -------
        list[SearchResultItem]
            Ranked code chunks with similarity scores.
        """
        start = time.perf_counter()

        # Embed the query
        query_embedding = self._embedding_service.embed_query(query)

        # Build optional filter
        where_filter = None
        if language_filter:
            where_filter = {"language": language_filter}

        # Search
        raw_results = self._vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            where_filter=where_filter,
        )

        # Map to typed results
        results: List[SearchResultItem] = []
        for r in raw_results:
            meta = r.get("metadata", {})
            results.append(
                SearchResultItem(
                    chunk_id=r["chunk_id"],
                    file_path=meta.get("file_path", ""),
                    language=meta.get("language", "unknown"),
                    chunk_type=meta.get("chunk_type", "general"),
                    entity_name=meta.get("entity_name", ""),
                    code_content=r.get("code_content", ""),
                    start_line=int(meta.get("start_line", 0)),
                    end_line=int(meta.get("end_line", 0)),
                    parent_entity=meta.get("parent_entity", ""),
                    docstring=meta.get("docstring", ""),
                    similarity=r.get("similarity", 0.0),
                )
            )

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "Search for '%s' returned %d results in %.1f ms",
            query[:80],
            len(results),
            elapsed_ms,
        )
        return results

    # ── Internal Handlers ─────────────────────────────────────────────────

    def _handle_embed(self, payload: AgentInput) -> AgentOutput:
        """Handle an embed action via the standard agent contract."""
        try:
            result = self.generate_embeddings(
                payload.task,
                file_extensions=payload.metadata.get("file_extensions"),
            )
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=(
                    f"Embedded {result['total_chunks_embedded']} chunks "
                    f"from {result['total_files_parsed']} files."
                ),
                metadata=result,
            )
        except Exception as exc:
            logger.exception("Embedding pipeline failed")
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=str(exc),
            )

    def _handle_search(self, payload: AgentInput) -> AgentOutput:
        """Handle a search action via the standard agent contract."""
        try:
            items = self.search_codebase(
                payload.task,
                top_k=payload.metadata.get("top_k", 10),
                language_filter=payload.metadata.get("language_filter"),
            )
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=f"Found {len(items)} relevant code chunks.",
                metadata={
                    "results": [item.model_dump() for item in items],
                },
            )
        except Exception as exc:
            logger.exception("Search failed")
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=str(exc),
            )

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _chunk_to_text(chunk: CodeChunk) -> str:
        """
        Build the text representation of a chunk for embedding.

        Combines the entity name, docstring, and code content
        to produce a rich embedding input.
        """
        parts: List[str] = []

        # Header
        header = f"{chunk.chunk_type.value}: {chunk.entity_name}"
        if chunk.parent_entity:
            header += f" (in {chunk.parent_entity})"
        parts.append(header)

        # Language
        parts.append(f"Language: {chunk.language.value}")

        # Docstring
        if chunk.docstring:
            parts.append(f"Docstring: {chunk.docstring}")

        # Code (cap at 6000 chars to stay within embedding model limits)
        parts.append(chunk.code_content[:6000])

        return "\n".join(parts)
