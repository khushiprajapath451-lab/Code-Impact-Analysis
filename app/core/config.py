"""
Configuration Manager
=====================
Centralised application settings loaded from environment variables and .env files.
Uses Pydantic BaseSettings for type-safe validation and automatic casting.
"""

from __future__ import annotations

import json
from enum import Enum
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Supported deployment environments."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


class EmbeddingProvider(str, Enum):
    """Supported embedding providers."""
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    LOCAL = "local"  # HuggingFace sentence-transformers (zero data-leakage)


class Settings(BaseSettings):
    """
    Application-wide settings.

    Values are loaded in order of precedence:
      1. Environment variables
      2. .env file
      3. Defaults defined here
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────
    app_name: str = "AI Code Impact Analysis Assistant"
    app_version: str = "0.1.0"
    app_env: Environment = Environment.DEVELOPMENT
    debug: bool = True

    # ── LLM — OpenAI ────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # ── LLM — Anthropic ─────────────────────────────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # ── LLM — Google Gemini ─────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # ── LLM Defaults ────────────────────────────────────────────────────
    default_llm_provider: LLMProvider = LLMProvider.OPENAI
    default_temperature: float = 0.2
    default_max_tokens: int = 4096

    # ── Embeddings ────────────────────────────────────────────────────────
    embedding_provider: EmbeddingProvider = EmbeddingProvider.LOCAL
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384
    embedding_batch_size: int = 100

    # Azure OpenAI (enterprise-secure endpoint)
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_embedding_deployment: str = ""

    # ── Vector Database (ChromaDB) ───────────────────────────────────────
    chroma_persist_dir: str = "./data/chroma_db"
    chroma_collection_name: str = "code_chunks"
    vector_search_top_k: int = 10

    # ── Database (future) ────────────────────────────────────────────────
    database_uri: str = "sqlite:///./data/app.db"

    # ── CORS ────────────────────────────────────────────────────────────
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        """Accept both JSON-encoded strings and native lists."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                # Fall back to comma-separated
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # ── Computed helpers ────────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.app_env == Environment.DEVELOPMENT


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached singleton of the application settings.

    The first call reads from the environment / .env file; subsequent
    calls return the same instance for zero-cost access.
    """
    return Settings()
