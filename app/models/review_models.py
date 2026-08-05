"""
Code Review Models
==================
Pydantic schemas for the AI Code Review Agent (Phase 6).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class SeverityLevel(str, Enum):
    """Severity of a code review issue."""
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Info"


class ReviewCategory(str, Enum):
    """Category of a code review issue."""
    SECURITY = "Security"
    CODING_STANDARDS = "Coding Standards"
    PERFORMANCE = "Performance"
    REGRESSION_RISK = "Regression Risk"
    MAINTAINABILITY = "Maintainability"


class ReviewStatus(str, Enum):
    """Overall status of the pull request/commit review."""
    APPROVED = "Approved"
    CHANGES_REQUESTED = "Changes Requested"
    NEEDS_ATTENTION = "Needs Attention"


class RegressionWarningLevel(str, Enum):
    """Level of downstream regression risk identified."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


# ─── Diff Parsing Models ─────────────────────────────────────────────────────

class FileChange(BaseModel):
    """Represents changes to a single file from a git diff."""
    old_path: str = Field(description="Previous file path (or /dev/null).")
    new_path: str = Field(description="New file path (or /dev/null).")
    added_lines: List[int] = Field(
        default_factory=list, description="Line numbers added in the new file."
    )
    deleted_lines: List[int] = Field(
        default_factory=list, description="Line numbers deleted from the old file."
    )
    diff_hunks: str = Field(
        default="", description="The raw unified diff hunks for this file."
    )
    modified_entities: List[str] = Field(
        default_factory=list,
        description="Rough guess of functions/classes modified based on diff headers."
    )


# ─── Request Models ──────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    """Incoming request for an automated code review."""
    repository_id: str = Field(..., description="Target repository path or ID.")
    pull_request_id: str = Field(..., description="ID of the PR or commit hash.")
    diff_content: str = Field(..., description="Raw unified git diff string.")
    changed_files: Optional[List[str]] = Field(
        default=None, description="Optional explicit list of changed file paths."
    )
    author_id: str = Field(default="unknown", description="Author of the changes.")


# ─── Response Models ─────────────────────────────────────────────────────────

class ReviewComment(BaseModel):
    """A granular piece of feedback on a specific code change."""
    file_path: str = Field(..., description="Path to the file being commented on.")
    line_number: Optional[int] = Field(
        default=None, description="Line number of the issue in the new file."
    )
    severity: SeverityLevel = Field(..., description="Severity of the issue.")
    category: ReviewCategory = Field(..., description="Category of the issue.")
    issue_description: str = Field(..., description="Description of the problem.")
    suggested_fix_code: str = Field(
        default="", description="Markdown code block with the suggested fix."
    )
    rationale: str = Field(..., description="Why this needs to be fixed.")


class CodeReviewSummary(BaseModel):
    """The complete aggregated code review result."""
    review_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pull_request_id: str = Field(..., description="PR or commit being reviewed.")
    overall_status: ReviewStatus = Field(
        ..., description="Overall approval recommendation."
    )
    total_issues_found: int = Field(default=0)
    summary_notes: str = Field(
        ..., description="High-level summary of the review findings."
    )
    comments: List[ReviewComment] = Field(
        default_factory=list, description="Detailed inline comments."
    )
    regression_warning_level: RegressionWarningLevel = Field(
        default=RegressionWarningLevel.LOW,
        description="Assessed risk of breaking downstream consumers."
    )
    reviewed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    duration_ms: Optional[float] = None
