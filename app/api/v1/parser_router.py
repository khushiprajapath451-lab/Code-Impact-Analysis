"""
Parser API Router
=================
Endpoints for repository ingestion and code parsing.
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, HTTPException, status

from app.agents.parser_agent import RepositoryParserAgent
from app.models.code_models import (
    FileSummary,
    ParseRepositoryRequest,
    ParseRepositoryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/repository", tags=["Repository Parser"])


@router.post(
    "/parse",
    response_model=ParseRepositoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse a local repository",
    description=(
        "Accepts a local repository path, scans the directory tree for source "
        "files, parses them into structured code chunks (classes, methods, "
        "functions), and returns a summary of the extraction."
    ),
)
async def parse_repository(request: ParseRepositoryRequest) -> ParseRepositoryResponse:
    """
    Ingest and parse a local code repository.

    Instantiates the RepositoryParserAgent, runs the full
    scan → parse → (optional summarise) pipeline, and returns
    a lightweight summary suitable for API consumers.
    """
    try:
        # Build extension set from request if provided
        extensions = set(request.file_extensions) if request.file_extensions else None

        agent = RepositoryParserAgent(
            extensions=extensions,
            enable_llm_summaries=request.enable_llm_summaries,
            min_lines_for_summary=request.max_chunk_lines_for_summary,
        )

        parsed = agent.parse_repository(
            request.repository_path,
            extensions=extensions,
            enable_llm_summaries=request.enable_llm_summaries,
            min_lines_for_summary=request.max_chunk_lines_for_summary,
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Repository parsing failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing error: {exc}",
        )

    # Build per-file summaries for the response
    files_summary: List[FileSummary] = [
        FileSummary(
            file_path=pf.file_path,
            language=pf.language.value,
            total_lines=pf.total_lines,
            chunk_count=len(pf.chunks),
            chunk_types=sorted({c.chunk_type.value for c in pf.chunks}),
            errors=pf.parse_errors,
        )
        for pf in parsed.files
    ]

    return ParseRepositoryResponse(
        repository_path=parsed.repository_path,
        total_files_scanned=parsed.total_files_scanned,
        total_files_parsed=parsed.total_files_parsed,
        total_files_skipped=parsed.total_files_skipped,
        total_chunks=parsed.total_chunks,
        languages_detected=parsed.languages_detected,
        parse_duration_ms=parsed.parse_duration_ms,
        parsed_at=parsed.parsed_at,
        files_summary=files_summary,
    )
