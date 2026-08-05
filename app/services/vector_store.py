"""
Vector Store Service
=====================
Manages persistent storage of code-chunk embeddings in ChromaDB.

Responsibilities:
  - Collection initialization and lifecycle
  - Batch upsert of CodeChunk records + their embeddings
  - Cosine-similarity search
  - Collection statistics and management

ChromaDB stores data on local disk by default, ensuring
proprietary code never leaves MassMutual's infrastructure.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import Settings, get_settings
from app.models.code_models import CodeChunk

logger = logging.getLogger(__name__)


class VectorStoreService:
    """
    ChromaDB-backed vector store for code-chunk embeddings.

    Parameters
    ----------
    settings : Settings | None
        Override global settings (useful for testing).
    persist_dir : str | None
        Override the ChromaDB persistence directory.
    collection_name : str | None
        Override the default collection name.
    """

    def __init__(
        self,
        settings: Optional[Settings] = None,
        persist_dir: Optional[str] = None,
        collection_name: Optional[str] = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._persist_dir = persist_dir or self._settings.chroma_persist_dir
        self._collection_name = (
            collection_name or self._settings.chroma_collection_name
        )
        self._batch_size = self._settings.embedding_batch_size

        self._client: Optional[chromadb.ClientAPI] = None
        self._collection: Optional[chromadb.Collection] = None

    # ── Initialisation ────────────────────────────────────────────────────

    def _ensure_client(self) -> None:
        """Lazily initialise the ChromaDB client and collection."""
        if self._client is not None:
            return

        logger.info(
            "Initialising ChromaDB — persist_dir=%s  collection=%s",
            self._persist_dir,
            self._collection_name,
        )

        self._client = chromadb.PersistentClient(
            path=self._persist_dir,
            settings=ChromaSettings(
                anonymized_telemetry=False,  # Enterprise: no telemetry
            ),
        )

        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        logger.info(
            "ChromaDB ready — collection '%s' has %d records",
            self._collection_name,
            self._collection.count(),
        )

    # ── Upsert ────────────────────────────────────────────────────────────

    def upsert_chunks(
        self,
        chunks: List[CodeChunk],
        embeddings: List[List[float]],
        repository_path: str = "",
    ) -> int:
        """
        Upsert a batch of code chunks and their embeddings.

        Chunks are inserted in configurable sub-batches (default 100)
        to prevent memory exhaustion on enterprise-scale repositories.

        Parameters
        ----------
        chunks : list[CodeChunk]
            The parsed code chunks.
        embeddings : list[list[float]]
            Corresponding embedding vectors (same order as chunks).
        repository_path : str
            The repository these chunks belong to (stored as metadata).

        Returns
        -------
        int
            Total number of records upserted.
        """
        self._ensure_client()
        assert self._collection is not None

        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Chunk count ({len(chunks)}) != embedding count ({len(embeddings)})"
            )

        total = len(chunks)
        upserted = 0
        start = time.perf_counter()

        for i in range(0, total, self._batch_size):
            batch_chunks = chunks[i : i + self._batch_size]
            batch_embeddings = embeddings[i : i + self._batch_size]

            ids = [c.chunk_id for c in batch_chunks]
            documents = [c.code_content for c in batch_chunks]
            metadatas = [
                self._chunk_to_metadata(c, repository_path)
                for c in batch_chunks
            ]

            self._collection.upsert(
                ids=ids,
                embeddings=batch_embeddings,
                documents=documents,
                metadatas=metadatas,
            )

            upserted += len(batch_chunks)
            logger.info(
                "Upserted %d/%d chunks into '%s'",
                upserted,
                total,
                self._collection_name,
            )

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "Upsert complete: %d records in %.1f ms", upserted, elapsed_ms
        )
        return upserted

    # ── Search ────────────────────────────────────────────────────────────

    def search(
        self,
        query_embedding: List[float],
        top_k: Optional[int] = None,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform cosine-similarity search against stored embeddings.

        Parameters
        ----------
        query_embedding : list[float]
            The embedding vector of the search query.
        top_k : int | None
            Number of results to return (defaults to config value).
        where_filter : dict | None
            Optional ChromaDB metadata filter (e.g., by language or repo).

        Returns
        -------
        list[dict]
            Ranked results, each containing:
            ``chunk_id``, ``code_content``, ``metadata``, ``distance``, ``similarity``.
        """
        self._ensure_client()
        assert self._collection is not None

        k = top_k or self._settings.vector_search_top_k

        query_params: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            query_params["where"] = where_filter

        raw = self._collection.query(**query_params)

        results: List[Dict[str, Any]] = []
        if raw["ids"] and raw["ids"][0]:
            for idx, chunk_id in enumerate(raw["ids"][0]):
                distance = raw["distances"][0][idx] if raw["distances"] else 0.0
                results.append({
                    "chunk_id": chunk_id,
                    "code_content": raw["documents"][0][idx] if raw["documents"] else "",
                    "metadata": raw["metadatas"][0][idx] if raw["metadatas"] else {},
                    "distance": round(distance, 6),
                    "similarity": round(1.0 - distance, 6),
                })

        logger.info(
            "Search returned %d results (top_k=%d)", len(results), k
        )
        return results

    # ── Collection Management ─────────────────────────────────────────────

    def get_collection_stats(self) -> Dict[str, Any]:
        """Return basic statistics about the current collection."""
        self._ensure_client()
        assert self._collection is not None

        count = self._collection.count()
        return {
            "collection_name": self._collection_name,
            "total_records": count,
            "persist_dir": self._persist_dir,
        }

    def delete_collection(self) -> None:
        """Delete the entire collection (destructive)."""
        self._ensure_client()
        assert self._client is not None

        self._client.delete_collection(self._collection_name)
        self._collection = None
        logger.warning("Deleted collection '%s'", self._collection_name)

    def clear_collection(self) -> int:
        """
        Remove all records from the collection without deleting it.

        Returns the number of records that were removed.
        """
        self._ensure_client()
        assert self._collection is not None
        assert self._client is not None

        count = self._collection.count()
        if count > 0:
            # Re-create the collection to clear all data
            self._client.delete_collection(self._collection_name)
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        logger.info(
            "Cleared %d records from '%s'", count, self._collection_name
        )
        return count

    # ── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _chunk_to_metadata(
        chunk: CodeChunk, repository_path: str
    ) -> Dict[str, str]:
        """
        Flatten a CodeChunk into a ChromaDB-compatible metadata dict.

        ChromaDB metadata values must be str, int, float, or bool.
        """
        return {
            "file_path": chunk.file_path,
            "language": chunk.language.value,
            "chunk_type": chunk.chunk_type.value,
            "entity_name": chunk.entity_name,
            "start_line": str(chunk.start_line),
            "end_line": str(chunk.end_line),
            "parent_entity": chunk.parent_entity or "",
            "docstring": (chunk.docstring or "")[:500],  # Cap for DB limits
            "repository_path": repository_path,
        }
