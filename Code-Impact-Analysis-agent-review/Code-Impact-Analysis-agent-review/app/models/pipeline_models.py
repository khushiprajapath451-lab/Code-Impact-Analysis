"""
Master Pipeline Models
======================
Pydantic schemas for the End-to-End Orchestration (Phase 8).
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.impact_models import ImpactAnalysisReport
from app.models.pr_models import PullRequestDraft, TestRecommendationReport
from app.models.review_models import CodeReviewSummary


class RunMode(str, Enum):
    FULL = "full"
    IMPACT_ONLY = "impact_only"
    REVIEW_ONLY = "review_only"


class WorkflowExecutionRequest(BaseModel):
    """Payload to trigger the master orchestration pipeline."""
    requirement_id: str = Field(..., description="Jira ID or BRD ID.")
    requirement_title: str = Field(..., description="Title of the requirement.")
    requirement_description: str = Field(..., description="Full text of the business requirement.")
    repository_id: str = Field(..., description="ID of the repository.")
    pull_request_id: str = Field(..., description="Target PR or commit hash.")
    diff_content: str = Field(..., description="Raw unified git diff.")
    changed_files: List[str] = Field(..., description="List of modified file paths.")
    run_mode: RunMode = Field(default=RunMode.FULL, description="Which parts of the pipeline to run.")


class ExecutionStepMetrics(BaseModel):
    """Tracks time taken for individual pipeline steps."""
    impact_analysis_ms: int = 0
    code_review_ms: int = 0
    test_recommendation_ms: int = 0
    pr_generation_ms: int = 0
    total_execution_ms: int = 0


class WorkflowExecutionReport(BaseModel):
    """Complete output payload from a pipeline run."""
    execution_id: str = Field(..., description="Unique ID for this run.")
    timestamp: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    requirement_id: str = Field(...)
    
    # Nested Reports from sub-agents
    impact_analysis: Optional[ImpactAnalysisReport] = None
    code_review: Optional[CodeReviewSummary] = None
    test_recommendations: Optional[TestRecommendationReport] = None
    generated_pr_draft: Optional[PullRequestDraft] = None
    
    # Aggregates
    overall_risk_score: str = Field(default="Unknown", description="Low, Medium, or High")
    metrics: ExecutionStepMetrics = Field(default_factory=ExecutionStepMetrics)
    status: str = Field(default="Completed")
    error_message: Optional[str] = None
