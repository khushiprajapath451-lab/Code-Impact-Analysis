"""
Impact Analysis API Router
============================
Endpoint for receiving business requirements and returning
structured impact analysis reports.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.agents.impact_agent import ImpactAnalysisAgent
from app.models.impact_models import (
    ImpactAnalysisResponse,
    RequirementInput,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Impact Analysis"])


@router.post(
    "/impact-analysis",
    response_model=ImpactAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse requirement impact",
    description=(
        "Accepts a business requirement, extracts technical concepts, "
        "searches the indexed codebase for relevant code, and returns "
        "a structured Impact Analysis Report with risk assessment "
        "and recommended implementation order."
    ),
)
async def analyse_impact(
    requirement: RequirementInput,
) -> ImpactAnalysisResponse:
    """
    End-to-end impact analysis.

    Audit log: every call is logged with requirement ID, timestamp,
    and outcome for enterprise traceability.
    """
    logger.info(
        "AUDIT | Impact analysis requested | req_id=%s | title=%s | "
        "domain=%s | source=%s | timestamp=%s",
        requirement.requirement_id,
        requirement.title,
        requirement.domain,
        requirement.source.value,
        datetime.now(timezone.utc).isoformat(),
    )

    try:
        agent = ImpactAnalysisAgent(use_llm_reasoning=True)
        report = agent.analyse_requirement(requirement)

    except FileNotFoundError as exc:
        logger.error(
            "AUDIT | Impact analysis FAILED | req_id=%s | error=%s",
            requirement.requirement_id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception(
            "AUDIT | Impact analysis FAILED | req_id=%s | error=%s",
            requirement.requirement_id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis error: {exc}",
        )

    logger.info(
        "AUDIT | Impact analysis COMPLETE | req_id=%s | "
        "impacted_files=%d | risk=%s | duration_ms=%.1f | timestamp=%s",
        requirement.requirement_id,
        len(report.impacted_files),
        report.overall_risk_level.value,
        report.analysis_duration_ms or 0,
        datetime.now(timezone.utc).isoformat(),
    )

    return ImpactAnalysisResponse(status="success", report=report)
