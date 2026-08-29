"""
Secure Embedding Service
=========================
Converts text (code snippets, summaries, queries) into numerical vector
embeddings for semantic search.

Enterprise Security Architecture
---------------------------------
Three embedding providers are supported, selectable via configuration:

  1. **LOCAL** (``sentence-transformers``) — The model runs entirely
     on-premises.  **Zero data leaves the network.**  This is the
     recommended default for MassMutual's regulated environment.

  2. **AZURE_OPENAI** — Calls an Azure-hosted OpenAI deployment
     inside MassMutual's own Azure tenant, covered by the enterprise
     BAA and data-processing agreement.

  3. **OPENAI** — Direct OpenAI API.  Should only be used with
     non-sensitive data or in development environments.

Rate-limit and batch-processing logic is built in so the service
can handle enterprise-scale repositories (10k+ files) without
memory exhaustion or API throttling.
"""

from __future__ import annotations

import logging
import time
from typing import List, Optional
import concurrent.futures

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import EmbeddingProvider, Settings, get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Converts text into vector embeddings using the configured provider.

    Parameters
    ----------
    settings : Settings | None
        Override the global settings (useful for testing).
    """

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self._settings = settings or get_settings()
        self._provider = self._settings.embedding_provider
        self._model_name = self._settings.embedding_model
        self._dimensions = self._settings.embedding_dimensions
        self._batch_size = self._settings.embedding_batch_size

        # Lazy-loaded clients
        self._local_model = None
        self._openai_client = None

        logger.info(
            "EmbeddingService initialised — provider=%s  model=%s  dims=%d",
            self._provider.value,
            self._model_name,
            self._dimensions,
        )

    # ── Public API ────────────────────────────────────────────────────────

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of text strings into vectors.

        Automatically batches large inputs to prevent memory issues
        and respects API rate limits.

        Parameters
        ----------
        texts : list[str]
            The texts to embed.

        Returns
        -------
        list[list[float]]
            One embedding vector per input text.
        """
        if not texts:
            return []

        all_embeddings: List[List[float]] = []
        total = len(texts)

        batches = [texts[i : i + self._batch_size] for i in range(0, total, self._batch_size)]
        total_batches = len(batches)

        logger.info("Starting embedding for %d texts across %d batches.", total, total_batches)
        start_total = time.perf_counter()

        if self._provider == EmbeddingProvider.LOCAL:
            # Local models often hold the GIL and run on GPU/CPU threads internally.
            # Processing sequentially is usually safer and sometimes faster.
            for i, batch in enumerate(batches, 1):
                logger.info("Embedding batch %d/%d (%d texts) locally", i, total_batches, len(batch))
                all_embeddings.extend(self._embed_batch(batch))
        else:
            # IO-bound API calls can be heavily parallelized
            max_workers = min(10, total_batches)
            
            # Keep track of original order
            future_to_batch = {}
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                for i, batch in enumerate(batches):
                    future = executor.submit(self._embed_batch, batch)
                    future_to_batch[future] = i
                
                # Pre-allocate array to preserve order
                results = [None] * total_batches
                for future in concurrent.futures.as_completed(future_to_batch):
                    idx = future_to_batch[future]
                    try:
                        results[idx] = future.result()
                    except Exception as e:
                        logger.error("Batch %d failed with error: %s", idx, e)
                        raise
                
                # Flatten
                for res in results:
                    if res:
                        all_embeddings.extend(res)

        elapsed = (time.perf_counter() - start_total) * 1000
        logger.info("Completed embedding %d texts in %.1f ms", total, elapsed)
        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single query string.

        Uses the same model but may apply query-specific prefixes
        for asymmetric retrieval models.

        Parameters
        ----------
        query : str
            The search query text.

        Returns
        -------
        list[float]
            The query embedding vector.
        """
        results = self._embed_batch([query])
        return results[0]

    # ── Dispatch ──────────────────────────────────────────────────────────

    def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Route to the correct provider implementation."""
        if self._provider == EmbeddingProvider.LOCAL:
            return self._embed_local(texts)
        elif self._provider == EmbeddingProvider.AZURE_OPENAI:
            return self._embed_azure_openai(texts)
        elif self._provider == EmbeddingProvider.OPENAI:
            return self._embed_openai(texts)
        else:
            raise ValueError(f"Unknown embedding provider: {self._provider}")

    # ── Local (sentence-transformers) ─────────────────────────────────────

    def _embed_local(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings using a local HuggingFace model.

        The model is downloaded once and cached locally.
        **No data leaves the machine.**
        """
        if self._local_model is None:
            logger.info(
                "Loading local embedding model: %s", self._model_name
            )
            from sentence_transformers import SentenceTransformer

            self._local_model = SentenceTransformer(self._model_name)
            # Update dimensions from the actual model
            self._dimensions = self._local_model.get_embedding_dimension()
            logger.info(
                "Local model loaded — dimensions=%d", self._dimensions
            )

        embeddings = self._local_model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    # ── OpenAI ────────────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings via the OpenAI Embeddings API.

        Includes retry logic for rate-limit and transient errors.
        """
        if self._openai_client is None:
            from openai import OpenAI

            self._openai_client = OpenAI(
                api_key=self._settings.openai_api_key,
            )

        response = self._openai_client.embeddings.create(
            model=self._model_name,
            input=texts,
        )
        # Sort by index to guarantee order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]

    # ── Azure OpenAI ──────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    def _embed_azure_openai(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings via an Azure OpenAI Enterprise deployment.

        Data stays within MassMutual's Azure tenant boundary.
        """
        if self._openai_client is None:
            from openai import AzureOpenAI

            self._openai_client = AzureOpenAI(
                azure_endpoint=self._settings.azure_openai_endpoint,
                api_key=self._settings.azure_openai_api_key,
                api_version=self._settings.azure_openai_api_version,
            )

        response = self._openai_client.embeddings.create(
            model=self._settings.azure_openai_embedding_deployment,
            input=texts,
        )
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]

    # ── Introspection ─────────────────────────────────────────────────────

    @property
    def dimensions(self) -> int:
        """Return the embedding vector dimensionality."""
        return self._dimensions

    @property
    def provider_name(self) -> str:
        """Return a human-readable provider label."""
        return self._provider.value
