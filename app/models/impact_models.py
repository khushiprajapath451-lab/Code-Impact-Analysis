"""
Impact Analysis Models
=======================
Pydantic schemas for requirement inputs, impacted components,
and the structured Impact Analysis Report output.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────


class RequirementSource(str, Enum):
    """Where the requirement originated."""
    JIRA = "jira"
    BRD = "brd"
    USER_STORY = "user_story"
    FEATURE_REQUEST = "feature_request"
    INCIDENT = "incident"
    MANUAL = "manual"


class ChangeType(str, Enum):
    """Type of change required for an impacted component."""
    MODIFY = "modify"
    CREATE = "create"
    DELETE = "delete"
    REVIEW = "review"


class RiskLevel(str, Enum):
    """Risk classification for an impacted component."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceConfidence(str, Enum):
    """Confidence level of evidence grounding for an impacted component."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ─── Input Models ────────────────────────────────────────────────────────────


class RequirementInput(BaseModel):
    """
    Incoming business requirement to analyse.

    Attributes
    ----------
    requirement_id : str
        Unique identifier (e.g. JIRA-1234).
    title : str
        Short title of the requirement.
    description : str
        Full description of the requirement / user story.
    domain : str | None
        Business domain (e.g. Auth, Payments, Claims).
    source : RequirementSource
        Where this requirement came from.
    acceptance_criteria : str | None
        Acceptance criteria text, if available.
    metadata : dict
        Arbitrary additional data (sprint, priority, etc.).
    """
    requirement_id: str = Field(
        ..., min_length=1, description="Unique identifier (e.g. JIRA-1234)."
    )
    title: str = Field(
        ..., min_length=1, description="Short title of the requirement."
    )
    description: str = Field(
        ..., min_length=1, description="Full requirement description."
    )
    domain: Optional[str] = Field(
        default=None, description="Business domain (Auth, Payments, Claims, etc.)."
    )
    source: RequirementSource = Field(
        default=RequirementSource.MANUAL,
        description="Origin of the requirement.",
    )
    acceptance_criteria: Optional[str] = Field(
        default=None, description="Acceptance criteria text."
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ─── Extracted Concepts ──────────────────────────────────────────────────────


class ExtractedConcepts(BaseModel):
    """
    Structured output from the requirement extraction step.

    The LLM (or fallback heuristic) parses the raw requirement
    and produces these structured fields for downstream search.
    """
    core_intent: str = Field(
        description="One-sentence summary of the core business intent."
    )
    domain_concepts: List[str] = Field(
        default_factory=list,
        description="Domain concepts (e.g. authentication, SMS gateway, user session).",
    )
    explicit_keywords: List[str] = Field(
        default_factory=list,
        description="Keywords explicitly mentioned in the requirement.",
    )
    implicit_keywords: List[str] = Field(
        default_factory=list,
        description="Inferred keywords to expand search context.",
    )
    technical_areas: List[str] = Field(
        default_factory=list,
        description="Technical areas likely affected (API, database, UI, etc.).",
    )
    risk_flags: List[str] = Field(
        default_factory=list,
        description="Potential risk indicators (security, compliance, data migration, etc.).",
    )


# ─── Component Evidence ──────────────────────────────────────────────────────


class ComponentEvidence(BaseModel):
    """
    Traceability evidence linking an impact claim to a retrieved code chunk.
    """
    supported: bool = Field(
        default=False,
        description="True if grounded in retrieved context; False if inferred.",
    )
    chunk_id: Optional[str] = Field(
        default=None,
        description="Deterministic ID of the supporting code chunk from vector store.",
    )
    file_path: str = Field(
        default="",
        description="File path verified from retrieved context.",
    )
    entity_name: str = Field(
        default="",
        description="Entity name verified from retrieved context.",
    )
    start_line: Optional[int] = Field(
        default=None,
        description="Starting line number from retrieved chunk.",
    )
    end_line: Optional[int] = Field(
        default=None,
        description="Ending line number from retrieved chunk.",
    )
    similarity_score: float = Field(
        default=0.0,
        description="Semantic similarity score (0.0 - 1.0) from retrieval.",
    )
    confidence: EvidenceConfidence = Field(
        default=EvidenceConfidence.LOW,
        description="Confidence of evidence grounding: high, medium, low.",
    )


# ─── Impacted Component ──────────────────────────────────────────────────────


class ImpactedComponent(BaseModel):
    """A single code component identified as impacted by the requirement."""
    file_path: str = Field(description="Relative path to the source file.")
    entity_name: str = Field(
        default="", description="Class or function name."
    )
    chunk_type: str = Field(
        default="general", description="Type: class, method, function, module."
    )
    change_type: ChangeType = Field(
        description="Whether to modify, create, delete, or review."
    )
    risk_level: RiskLevel = Field(
        description="Risk classification."
    )
    reason: str = Field(
        description="Why this component is impacted."
    )
    similarity_score: float = Field(
        default=0.0, description="Semantic similarity score from vector search."
    )
    start_line: int = Field(default=0)
    end_line: int = Field(default=0)
    language: str = Field(default="unknown")
    evidence: Optional[ComponentEvidence] = Field(
        default=None,
        description="Evidence and grounding metadata for this impact.",
    )


# ─── Impact Analysis Report ──────────────────────────────────────────────────


class ImpactAnalysisReport(BaseModel):
    """
    The full structured impact analysis report.

    This is the primary output of the ImpactAnalysisAgent and
    provides developers with an actionable breakdown of what
    needs to change to implement a given requirement.
    """
    requirement_id: str
    requirement_title: str
    core_intent_summary: str = Field(
        description="Concise summary of what the requirement aims to achieve."
    )
    extracted_keywords: List[str] = Field(
        default_factory=list,
        description="All keywords used for codebase search.",
    )
    domain_concepts: List[str] = Field(default_factory=list)

    # ── Impacted components ──
    impacted_files: List[ImpactedComponent] = Field(
        default_factory=list,
        description="Ordered list of impacted code components.",
    )
    affected_apis: List[str] = Field(
        default_factory=list,
        description="API endpoints likely affected.",
    )
    affected_db_tables: List[str] = Field(
        default_factory=list,
        description="Database tables likely affected.",
    )

    # ── Risk assessment ──
    overall_risk_level: RiskLevel = Field(
        default=RiskLevel.MEDIUM,
        description="Aggregate risk level for this change.",
    )
    downstream_risk_assessment: str = Field(
        default="",
        description="Narrative assessment of downstream / cascading risks.",
    )
    risk_flags: List[str] = Field(
        default_factory=list,
        description="Specific risk indicators identified.",
    )

    # ── Implementation guidance ──
    recommended_implementation_order: List[str] = Field(
        default_factory=list,
        description="Ordered steps for safe implementation.",
    )
    estimated_complexity: str = Field(
        default="medium",
        description="Rough complexity estimate (low, medium, high, very_high).",
    )
    notes: str = Field(
        default="",
        description="Additional analyst notes or caveats.",
    )

    # ── Metadata ──
    search_results_count: int = Field(default=0)
    analysis_duration_ms: Optional[float] = None
    analysed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ─── API Response ────────────────────────────────────────────────────────────


class ImpactAnalysisResponse(BaseModel):
    """Wrapper response for the impact analysis endpoint."""
    status: str = "success"
    report: ImpactAnalysisReport
