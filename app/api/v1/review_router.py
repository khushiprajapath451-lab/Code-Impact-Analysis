"""
Code Review API Router
======================
Interactive API endpoints for the multi-dimensional AI Code Review Engine.
"""

import logging
from typing import Dict

from fastapi import APIRouter, HTTPException, status

from app.agents.review_agent import CodeReviewAgent
from app.models.review_models import CodeReviewSummary, ReviewRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/review", tags=["Code Review"])

# In-memory storage for historical reviews (simulating DB for Phase 6)
_review_db: Dict[str, CodeReviewSummary] = {}


@router.post(
    "/diff",
    response_model=CodeReviewSummary,
    status_code=status.HTTP_200_OK,
    summary="Submit a git diff for automated AI code review",
)
async def review_diff(request: ReviewRequest) -> CodeReviewSummary:
    """
    Ingest a raw git diff and return a structured code review evaluating
    security, performance, standards, and regression risks.
    """
    logger.info("AUDIT | Review requested | PR: %s | Repo: %s | Author: %s",
                request.pull_request_id, request.repository_id, request.author_id)
    try:
        agent = CodeReviewAgent()
        summary = agent.review_diff(request)
        
        # Save to mock historical DB
        _review_db[summary.review_id] = summary

        logger.info("AUDIT | Review complete | PR: %s | Status: %s | Issues: %d",
                    summary.pull_request_id, summary.overall_status.value, summary.total_issues_found)
        return summary
    except Exception as exc:
        logger.exception("Failed to process code review for PR %s", request.pull_request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code Review Agent error: {str(exc)}"
        )


@router.get(
    "/{review_id}",
    response_model=CodeReviewSummary,
    summary="Retrieve a historical code review result",
)
async def get_review(review_id: str) -> CodeReviewSummary:
    """Retrieve past code review results for audit and historical tracking."""
    if review_id not in _review_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review ID {review_id} not found."
        )
    return _review_db[review_id]
