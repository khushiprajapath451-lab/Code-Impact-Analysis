"""
Repository Parser Agent
========================
Orchestrates the full repository parsing pipeline:

  1. Scan the directory tree for source files (via RepositoryScanner)
  2. Parse each file into structured CodeChunks (via code_parser)
  3. Optionally generate LLM summaries for large / complex chunks
  4. Return a complete ParsedRepository result

Inherits from :class:`BaseAgent` so it follows the standard agent
contract (``execute`` / ``safe_execute``).
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import List, Optional, Set

from app.agents.base_agent import BaseAgent
from app.models.code_models import (
    CodeChunk,
    ParsedFile,
    ParsedRepository,
    SupportedLanguage,
)
from app.models.schemas import AgentInput, AgentOutput, AgentStatus
from app.services.code_parser import parse_file
from app.services.repo_scanner import RepositoryScanner

logger = logging.getLogger(__name__)

# ─── System Prompt ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a senior code analyst.  Given a code chunk, produce a concise 1–2 sentence
summary that describes:
  • What the code does (its purpose / responsibility)
  • Key inputs and outputs
  • Notable patterns or dependencies

Be factual and precise.  Do not include line numbers or file paths in the summary.
"""

_SUMMARY_USER_TEMPLATE = """\
Summarise this {language} {chunk_type}:

```{language}
{code}
```
"""


class RepositoryParserAgent(BaseAgent):
    """
    Agent responsible for scanning and parsing a local code repository.

    Parameters
    ----------
    extensions : set[str] | None
        Override the default file-extension filter.
    enable_llm_summaries : bool
        When True, large chunks are sent to the LLM for brief summaries.
    min_lines_for_summary : int
        Only chunks with at least this many lines trigger LLM summarisation.
    """

    def __init__(
        self,
        *,
        extensions: Optional[Set[str]] = None,
        enable_llm_summaries: bool = False,
        min_lines_for_summary: int = 50,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="RepositoryParserAgent",
            system_prompt=_SYSTEM_PROMPT,
            **kwargs,
        )
        self._extensions = extensions
        self._enable_llm_summaries = enable_llm_summaries
        self._min_lines_for_summary = min_lines_for_summary

    # ── BaseAgent contract ────────────────────────────────────────────────

    def execute(self, payload: AgentInput) -> AgentOutput:
        """
        Parse the repository specified in ``payload.task`` (the path).

        Metadata keys recognised:
          - ``file_extensions``: list[str] — override extensions
          - ``enable_llm_summaries``: bool
          - ``max_chunk_lines_for_summary``: int
        """
        repo_path = payload.task  # the path is passed as the task string
        meta = payload.metadata or {}

        extensions = meta.get("file_extensions") or self._extensions
        if extensions and isinstance(extensions, list):
            extensions = set(extensions)

        enable_summaries = meta.get(
            "enable_llm_summaries", self._enable_llm_summaries
        )
        min_lines = meta.get(
            "max_chunk_lines_for_summary", self._min_lines_for_summary
        )

        try:
            parsed = self.parse_repository(
                repo_path,
                extensions=extensions,
                enable_llm_summaries=enable_summaries,
                min_lines_for_summary=min_lines,
            )

            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=(
                    f"Parsed {parsed.total_files_parsed} files, "
                    f"extracted {parsed.total_chunks} chunks "
                    f"across {len(parsed.languages_detected)} language(s)."
                ),
                metadata=parsed.model_dump(exclude={"files"}),
                duration_ms=parsed.parse_duration_ms,
            )
        except Exception as exc:
            logger.exception("Repository parsing failed")
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=str(exc),
            )

    # ── Core Pipeline ─────────────────────────────────────────────────────

    def parse_repository(
        self,
        repo_path: str,
        *,
        extensions: Optional[Set[str]] = None,
        enable_llm_summaries: bool = False,
        min_lines_for_summary: int = 50,
    ) -> ParsedRepository:
        """
        Full parsing pipeline: scan → parse → (optional) summarise.

        Returns
        -------
        ParsedRepository
            Complete structured representation of the repository.
        """
        start = time.perf_counter()
        root = Path(repo_path).resolve()

        # ── Step 1: Scan ──────────────────────────────────────────────────
        scanner = RepositoryScanner(root, extensions=extensions)
        scanned_files = scanner.scan()

        # ── Step 2: Parse ─────────────────────────────────────────────────
        parsed_files: List[ParsedFile] = []
        total_chunks = 0
        languages: set[str] = set()

        for sf in scanned_files:
            pf = parse_file(sf.absolute_path, root)
            parsed_files.append(pf)
            total_chunks += len(pf.chunks)
            languages.add(pf.language.value)

        # ── Step 3: LLM Summaries (optional) ──────────────────────────────
        if enable_llm_summaries:
            self._enrich_with_summaries(parsed_files, min_lines_for_summary)

        elapsed_ms = (time.perf_counter() - start) * 1000

        result = ParsedRepository(
            repository_path=str(root),
            files=parsed_files,
            total_files_scanned=len(scanned_files),
            total_files_parsed=len(parsed_files),
            total_files_skipped=0,
            total_chunks=total_chunks,
            languages_detected=sorted(languages),
            parse_duration_ms=round(elapsed_ms, 2),
        )

        logger.info(
            "Repository parsed: %d files → %d chunks in %.1f ms",
            result.total_files_parsed,
            result.total_chunks,
            elapsed_ms,
        )
        return result

    # ── LLM Summarisation ─────────────────────────────────────────────────

    def _enrich_with_summaries(
        self,
        files: List[ParsedFile],
        min_lines: int,
    ) -> None:
        """
        For each chunk exceeding ``min_lines``, call the LLM to generate
        a brief natural-language summary and attach it to the chunk.
        """
        for pf in files:
            for chunk in pf.chunks:
                if chunk.line_count < min_lines:
                    continue

                try:
                    summary = self._summarise_chunk(chunk)
                    chunk.summary = summary
                except Exception as exc:
                    logger.warning(
                        "Failed to summarise chunk %s: %s",
                        chunk.chunk_id,
                        exc,
                    )

    def _summarise_chunk(self, chunk: CodeChunk) -> str:
        """Call the LLM to produce a short summary of a single code chunk."""
        user_msg = _SUMMARY_USER_TEMPLATE.format(
            language=chunk.language.value,
            chunk_type=chunk.chunk_type.value,
            code=chunk.code_content[:8000],  # Cap context length
        )
        output = self._call_llm(user_msg)
        return output.result.strip()
