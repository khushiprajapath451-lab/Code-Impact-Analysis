"""
Code Structure Models
=====================
Pydantic schemas for representing parsed code structures extracted
from repository source files.  These models are the structured output
of the Repository Parser Agent and serve as input for vector embeddings
in Phase 3.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, computed_field


# ─── Enums ───────────────────────────────────────────────────────────────────


class ChunkType(str, Enum):
    """Classification of a parsed code chunk."""
    MODULE = "module"
    CLASS = "class"
    METHOD = "method"
    FUNCTION = "function"
    INTERFACE = "interface"
    DECORATOR = "decorator"
    IMPORT_BLOCK = "import_block"
    GENERAL = "general"


class SupportedLanguage(str, Enum):
    """Programming languages the parser can handle."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    JSX = "jsx"
    UNKNOWN = "unknown"


# ─── File Extension → Language Mapping ───────────────────────────────────────

EXTENSION_LANGUAGE_MAP: Dict[str, SupportedLanguage] = {
    ".py": SupportedLanguage.PYTHON,
    ".js": SupportedLanguage.JAVASCRIPT,
    ".ts": SupportedLanguage.TYPESCRIPT,
    ".jsx": SupportedLanguage.JSX,
    ".tsx": SupportedLanguage.TYPESCRIPT,
    ".java": SupportedLanguage.JAVA,
}


# ─── Core Models ─────────────────────────────────────────────────────────────


class CodeChunk(BaseModel):
    """
    A single meaningful unit of code extracted from a source file.

    Attributes
    ----------
    chunk_id : str
        Unique identifier for the chunk (file_path:entity_name:start_line).
    file_path : str
        Path to the source file relative to the repository root.
    language : SupportedLanguage
        The programming language of this chunk.
    chunk_type : ChunkType
        Structural classification (class, method, function, etc.).
    entity_name : str
        Name of the code entity (class name, function name, etc.).
        Falls back to the filename for module-level chunks.
    code_content : str
        The raw source code of this chunk.
    start_line : int
        1-indexed start line in the original file.
    end_line : int
        1-indexed end line in the original file (inclusive).
    docstring : str | None
        The extracted docstring / JSDoc / Javadoc, if present.
    summary : str | None
        An optional LLM-generated brief summary of the chunk.
    parent_entity : str | None
        If this is a method, the name of its parent class.
    decorators : list[str]
        Decorators / annotations applied to this entity.
    metadata : dict
        Arbitrary additional metadata (complexity hints, etc.).
    """
    chunk_id: str
    file_path: str
    language: SupportedLanguage
    chunk_type: ChunkType
    entity_name: str
    code_content: str
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    docstring: Optional[str] = None
    summary: Optional[str] = None
    parent_entity: Optional[str] = None
    decorators: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @computed_field
    @property
    def line_count(self) -> int:
        """Number of lines in this chunk."""
        return self.end_line - self.start_line + 1


class ParsedFile(BaseModel):
    """Summary of a single parsed source file."""
    file_path: str
    language: SupportedLanguage
    total_lines: int
    chunks: List[CodeChunk] = Field(default_factory=list)
    parse_errors: List[str] = Field(default_factory=list)


class ParsedRepository(BaseModel):
    """
    Aggregated result of parsing an entire repository.

    This is the top-level output of the Repository Parser Agent.
    """
    repository_path: str
    files: List[ParsedFile] = Field(default_factory=list)
    total_files_scanned: int = 0
    total_files_parsed: int = 0
    total_files_skipped: int = 0
    total_chunks: int = 0
    languages_detected: List[str] = Field(default_factory=list)
    parse_duration_ms: Optional[float] = None
    parsed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def all_chunks(self) -> List[CodeChunk]:
        """Flatten all chunks from all parsed files into a single list."""
        return [chunk for f in self.files for chunk in f.chunks]


# ─── API Request / Response ──────────────────────────────────────────────────


class FileSummary(BaseModel):
    """Lightweight summary of a parsed file (used in the API response)."""
    file_path: str
    language: str
    total_lines: int
    chunk_count: int
    chunk_types: List[str]
    errors: List[str] = Field(default_factory=list)


class ParseRepositoryRequest(BaseModel):
    """Request payload for the repository parse endpoint."""
    repository_path: str = Field(
        ...,
        min_length=1,
        description="Absolute or relative path to the local repository to parse.",
    )
    file_extensions: Optional[List[str]] = Field(
        default=None,
        description="Override the default list of file extensions to parse.",
    )
    enable_llm_summaries: bool = Field(
        default=False,
        description="If true, use the LLM to generate brief summaries of complex chunks.",
    )
    max_chunk_lines_for_summary: int = Field(
        default=50,
        ge=10,
        description="Minimum line count for a chunk to be sent for LLM summarisation.",
    )


class ParseRepositoryResponse(BaseModel):
    """Response payload returned after parsing a repository."""
    repository_path: str
    total_files_scanned: int
    total_files_parsed: int
    total_files_skipped: int
    total_chunks: int
    languages_detected: List[str]
    parse_duration_ms: Optional[float]
    parsed_at: datetime
    files_summary: List[FileSummary] = Field(default_factory=list)
