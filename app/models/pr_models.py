"""
PR & Testing Models
===================
Pydantic schemas for the Test Recommendation & PR Generator Agent (Phase 7).
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class TestType(str, Enum):
    """Types of tests to recommend."""
    UNIT = "Unit"
    INTEGRATION = "Integration"
    SECURITY = "Security"
    EDGE_CASE = "Edge Case"


# ─── Test Recommendation Models ──────────────────────────────────────────────

class TestCaseSuggestion(BaseModel):
    """Granular suggestion for a test case."""
    test_file_path: str = Field(..., description="Target file to place the test in.")
    test_type: TestType = Field(..., description="Category of the test.")
    target_function: str = Field(..., description="Method/Function being tested.")
    test_case_name: str = Field(..., description="Descriptive name for the test.")
    description: str = Field(..., description="What the test should do and why.")
    input_payload: str = Field(default="", description="Mock input or scenario setup.")
    expected_behavior: str = Field(..., description="Expected output or state.")
    sample_code_snippet: str = Field(default="", description="Markdown code block of the test.")


class TestRecommendationReport(BaseModel):
    """Aggregate report of missing tests."""
    repository_id: str = Field(..., description="Target repository path or ID.")
    pull_request_id: str = Field(..., description="ID of the PR or commit hash.")
    evaluated_files: List[str] = Field(default_factory=list, description="Files evaluated.")
    total_missing_tests: int = Field(default=0, description="Number of suggestions.")
    test_suggestions: List[TestCaseSuggestion] = Field(default_factory=list)
    coverage_gap_summary: str = Field(..., description="High-level analysis of coverage gaps.")


# ─── Pull Request Generation Models ──────────────────────────────────────────

class PRGeneratorRequest(BaseModel):
    """Input payload to generate a Pull Request draft."""
    requirement_id: str = Field(..., description="Jira ID or Tracker ID.")
    requirement_title: str = Field(..., description="Title of the requirement.")
    diff_content: str = Field(..., description="Raw unified git diff.")
    changed_files: List[str] = Field(..., description="List of modified files.")
    impact_report_summary: str = Field(..., description="Summary from Phase 4 (Impact Agent).")
    review_summary: str = Field(..., description="Summary from Phase 6 (Review Agent).")


class PullRequestDraft(BaseModel):
    """Structured output representing an enterprise Pull Request."""
    pr_title: str = Field(..., description="Professional PR Title (e.g. feat(auth): add OAuth2).")
    summary: str = Field(..., description="Brief summary of the PR.")
    problem_statement: str = Field(..., description="What business problem is being solved.")
    solution_overview: str = Field(..., description="How the code solves the problem.")
    modified_components: List[str] = Field(default_factory=list, description="Core components changed.")
    security_and_compliance_notes: str = Field(..., description="Security context and mitigations.")
    test_coverage_summary: str = Field(..., description="Testing notes (done or required).")
    breaking_changes_flag: bool = Field(default=False, description="Does this break existing APIs/Contracts?")
    recommended_reviewers_tags: List[str] = Field(default_factory=list, description="Teams or roles to review.")
