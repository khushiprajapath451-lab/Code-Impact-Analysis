"""
PR & Testing API Router
=======================
Endpoints for test recommendations and automated PR generation.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.pr_agent import TestAndPRAgent
from app.models.pr_models import (
    PRGeneratorRequest,
    PullRequestDraft,
    TestRecommendationReport,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pr", tags=["PR & Testing"])


class RecommendTestsRequest(BaseModel):
    """Payload for test recommendation endpoint."""
    repository_id: str = Field(..., description="Target repository.")
    pull_request_id: str = Field(..., description="Target PR or commit.")
    diff_content: str = Field(..., description="Raw diff to analyze.")
    changed_files: list[str] = Field(..., description="List of files changed.")


@router.post(
    "/recommend-tests",
    response_model=TestRecommendationReport,
    status_code=status.HTTP_200_OK,
    summary="Recommend missing test cases for a code change",
)
async def recommend_tests_endpoint(request: RecommendTestsRequest) -> TestRecommendationReport:
    """
    Analyze code diffs, evaluate against existing test patterns,
    and suggest comprehensive Unit, Integration, and Edge Case tests.
    """
    logger.info("AUDIT | Test Recommendation requested | PR: %s", request.pull_request_id)
    try:
        agent = TestAndPRAgent()
        report = agent.recommend_tests(
            diff_content=request.diff_content,
            changed_files=request.changed_files,
            repo_id=request.repository_id,
            pr_id=request.pull_request_id,
        )
        return report
    except Exception as exc:
        logger.exception("Failed to recommend tests for PR %s", request.pull_request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test Recommendation Agent error: {str(exc)}"
        )


@router.post(
    "/generate",
    response_model=PullRequestDraft,
    status_code=status.HTTP_200_OK,
    summary="Generate a professional Pull Request draft",
)
async def generate_pr_endpoint(request: PRGeneratorRequest) -> PullRequestDraft:
    """
    Synthesize business requirements, raw code changes, and code review
    outcomes into a professional, enterprise-standard Pull Request description.
    """
    logger.info("AUDIT | PR Generation requested | Req: %s", request.requirement_id)
    try:
        agent = TestAndPRAgent()
        draft = agent.generate_pr_draft(request)
        return draft
    except Exception as exc:
        logger.exception("Failed to generate PR for Requirement %s", request.requirement_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PR Generator Agent error: {str(exc)}"
        )
