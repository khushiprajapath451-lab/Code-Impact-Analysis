"""
Tests — Impact Analysis (Phase 4)
====================================
Validates the requirement extractor, impact analysis agent,
and API endpoint.

All tests run deterministically without API keys.
"""

from __future__ import annotations

import textwrap
from pathlib import Path
from typing import List

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.impact_models import (
    ChangeType,
    ExtractedConcepts,
    ImpactAnalysisReport,
    ImpactedComponent,
    RequirementInput,
    RequirementSource,
    RiskLevel,
)
from app.services.requirement_extractor import RequirementExtractor

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  Fixtures
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture()
def auth_requirement() -> RequirementInput:
    """An authentication-related requirement."""
    return RequirementInput(
        requirement_id="JIRA-101",
        title="Add MFA to user login flow",
        description=(
            "As a security officer, I need multi-factor authentication "
            "added to the existing login flow. Users should receive an "
            "SMS code or use an authenticator app after entering their "
            "password. The system must integrate with our existing "
            "AuthManager class and session handling middleware."
        ),
        domain="Auth",
        source=RequirementSource.JIRA,
        acceptance_criteria=(
            "1. Users can enable MFA from account settings.\n"
            "2. SMS and TOTP authenticator methods supported.\n"
            "3. Failed MFA attempts are logged for audit.\n"
            "4. Existing password-only login still works when MFA is off."
        ),
    )


@pytest.fixture()
def payment_requirement() -> RequirementInput:
    """A payment-related requirement."""
    return RequirementInput(
        requirement_id="JIRA-202",
        title="Add refund processing to billing service",
        description=(
            "Implement refund processing capability in the billing service. "
            "When a claim is approved for refund, the system should create "
            "a refund transaction record, update the customer's account "
            "balance, and send a notification email. Must comply with "
            "SOX audit requirements for all financial transactions."
        ),
        domain="Payments",
        source=RequirementSource.JIRA,
    )


@pytest.fixture()
def simple_requirement() -> RequirementInput:
    """A simple, low-risk requirement."""
    return RequirementInput(
        requirement_id="JIRA-303",
        title="Update README documentation",
        description="Update the project README with new setup instructions.",
        source=RequirementSource.MANUAL,
    )


@pytest.fixture()
def sample_repo(tmp_path: Path) -> Path:
    """Create a repo with auth-related code for E2E testing."""
    auth_file = tmp_path / "auth.py"
    auth_file.write_text(
        textwrap.dedent('''\
            """Authentication module for user login."""

            class AuthManager:
                """Manages user authentication and sessions."""

                def authenticate(self, username: str, password: str) -> bool:
                    """Authenticate a user with credentials."""
                    return self.validate_credentials(username, password)

                def validate_credentials(self, username: str, password: str) -> bool:
                    """Check username and password against the database."""
                    pass

                def create_session(self, user_id: str) -> str:
                    """Create a new authenticated session."""
                    pass
        '''),
        encoding="utf-8",
    )

    billing_file = tmp_path / "billing.py"
    billing_file.write_text(
        textwrap.dedent('''\
            """Billing and payment processing module."""

            class BillingService:
                """Handles invoices, payments, and transactions."""

                def process_payment(self, amount: float, account_id: str) -> str:
                    """Process a payment transaction."""
                    pass

                def create_invoice(self, items: list, customer_id: str) -> dict:
                    """Create an invoice for a customer."""
                    pass
        '''),
        encoding="utf-8",
    )

    middleware_file = tmp_path / "middleware.py"
    middleware_file.write_text(
        textwrap.dedent('''\
            """Session handling middleware."""

            class SessionMiddleware:
                """Middleware for managing user sessions."""

                def verify_session(self, token: str) -> bool:
                    """Verify an active session token."""
                    pass
        '''),
        encoding="utf-8",
    )
    return tmp_path


# ═══════════════════════════════════════════════════════════════════════════════
#  Requirement Extractor Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestRequirementExtractor:
    """Tests for the heuristic requirement extractor."""

    def test_extracts_core_intent(self, auth_requirement: RequirementInput):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert concepts.core_intent == auth_requirement.title

    def test_extracts_domain_concepts_for_auth(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert "authentication" in concepts.domain_concepts

    def test_extracts_domain_concepts_for_payments(
        self, payment_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(payment_requirement)
        assert "payments" in concepts.domain_concepts

    def test_detects_security_risk_flag(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert "security_sensitive" in concepts.risk_flags

    def test_detects_financial_risk_flag(
        self, payment_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(payment_requirement)
        assert "financial_impact" in concepts.risk_flags

    def test_detects_compliance_risk_flag(
        self, payment_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(payment_requirement)
        assert "compliance_related" in concepts.risk_flags

    def test_extracts_explicit_keywords(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert len(concepts.explicit_keywords) > 0
        # Should contain auth-related keywords
        kw_text = " ".join(concepts.explicit_keywords)
        assert any(
            w in kw_text
            for w in ["authentication", "login", "mfa", "multi-factor"]
        )

    def test_generates_implicit_keywords(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert len(concepts.implicit_keywords) > 0

    def test_detects_technical_areas(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        # Auth requirement mentions middleware → Backend area
        assert len(concepts.technical_areas) > 0

    def test_includes_domain_in_concepts(
        self, auth_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(auth_requirement)
        assert "Auth" in concepts.domain_concepts

    def test_simple_requirement_low_risk(
        self, simple_requirement: RequirementInput
    ):
        extractor = RequirementExtractor()
        concepts = extractor.extract(simple_requirement)
        # No high-risk flags for a docs update
        assert "security_sensitive" not in concepts.risk_flags
        assert "financial_impact" not in concepts.risk_flags


# ═══════════════════════════════════════════════════════════════════════════════
#  Impact Models Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestImpactModels:
    """Tests for the impact analysis Pydantic models."""

    def test_requirement_input_validation(self):
        req = RequirementInput(
            requirement_id="TEST-001",
            title="Test requirement",
            description="A test requirement.",
        )
        assert req.source == RequirementSource.MANUAL
        assert req.domain is None

    def test_impacted_component_model(self):
        comp = ImpactedComponent(
            file_path="app/auth.py",
            entity_name="AuthManager",
            chunk_type="class",
            change_type=ChangeType.MODIFY,
            risk_level=RiskLevel.HIGH,
            reason="Directly handles authentication logic.",
        )
        assert comp.change_type == ChangeType.MODIFY
        assert comp.risk_level == RiskLevel.HIGH

    def test_impact_report_model(self):
        report = ImpactAnalysisReport(
            requirement_id="TEST-001",
            requirement_title="Test",
            core_intent_summary="Test intent",
            impacted_files=[
                ImpactedComponent(
                    file_path="app/auth.py",
                    entity_name="login",
                    change_type=ChangeType.MODIFY,
                    risk_level=RiskLevel.MEDIUM,
                    reason="Needs MFA integration.",
                )
            ],
        )
        assert len(report.impacted_files) == 1
        assert report.overall_risk_level == RiskLevel.MEDIUM

    def test_risk_level_enum_values(self):
        assert RiskLevel.CRITICAL.value == "critical"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.LOW.value == "low"

    def test_change_type_enum_values(self):
        assert ChangeType.MODIFY.value == "modify"
        assert ChangeType.CREATE.value == "create"
        assert ChangeType.DELETE.value == "delete"
        assert ChangeType.REVIEW.value == "review"


# ═══════════════════════════════════════════════════════════════════════════════
#  Impact Analysis Agent Tests (deterministic, no LLM)
# ═══════════════════════════════════════════════════════════════════════════════


class TestImpactAnalysisAgent:
    """Tests for the ImpactAnalysisAgent in deterministic mode."""

    def test_analyse_with_indexed_codebase(
        self, sample_repo: Path, auth_requirement: RequirementInput
    ):
        """Full pipeline: index repo → analyse requirement → get report."""
        from app.agents.search_agent import EmbeddingSearchAgent

        # Index the sample repo
        search_agent = EmbeddingSearchAgent(
            collection_name="test_impact_collection",
        )
        search_agent.generate_embeddings(str(sample_repo))

        # Run impact analysis
        from app.agents.impact_agent import ImpactAnalysisAgent

        agent = ImpactAnalysisAgent(
            collection_name="test_impact_collection",
        )
        report = agent.analyse_requirement(auth_requirement)

        assert report.requirement_id == "JIRA-101"
        assert report.requirement_title == "Add MFA to user login flow"
        assert len(report.impacted_files) > 0
        assert report.analysis_duration_ms > 0
        assert report.search_results_count > 0
        assert len(report.extracted_keywords) > 0

    def test_auth_requirement_finds_auth_code(
        self, sample_repo: Path, auth_requirement: RequirementInput
    ):
        """Auth requirement should identify auth-related files."""
        from app.agents.search_agent import EmbeddingSearchAgent

        search_agent = EmbeddingSearchAgent(
            collection_name="test_impact_auth",
        )
        search_agent.generate_embeddings(str(sample_repo))

        from app.agents.impact_agent import ImpactAnalysisAgent

        agent = ImpactAnalysisAgent(
            collection_name="test_impact_auth",
        )
        report = agent.analyse_requirement(auth_requirement)

        # Should find auth.py as impacted
        impacted_paths = [c.file_path for c in report.impacted_files]
        assert any("auth" in p.lower() for p in impacted_paths)

    def test_payment_requirement_risk_assessment(
        self, sample_repo: Path, payment_requirement: RequirementInput
    ):
        """Payment requirement should produce higher risk assessment."""
        from app.agents.search_agent import EmbeddingSearchAgent

        search_agent = EmbeddingSearchAgent(
            collection_name="test_impact_payment",
        )
        search_agent.generate_embeddings(str(sample_repo))

        from app.agents.impact_agent import ImpactAnalysisAgent

        agent = ImpactAnalysisAgent(
            collection_name="test_impact_payment",
        )
        report = agent.analyse_requirement(payment_requirement)

        # Payment + compliance = should be at least HIGH risk
        assert report.overall_risk_level in (
            RiskLevel.CRITICAL,
            RiskLevel.HIGH,
        )

    def test_report_has_implementation_order(
        self, sample_repo: Path, auth_requirement: RequirementInput
    ):
        """Report should contain recommended implementation steps."""
        from app.agents.search_agent import EmbeddingSearchAgent

        search_agent = EmbeddingSearchAgent(
            collection_name="test_impact_order",
        )
        search_agent.generate_embeddings(str(sample_repo))

        from app.agents.impact_agent import ImpactAnalysisAgent

        agent = ImpactAnalysisAgent(
            collection_name="test_impact_order",
        )
        report = agent.analyse_requirement(auth_requirement)

        assert len(report.recommended_implementation_order) > 0
        # Should always include testing and review steps
        all_steps = " ".join(report.recommended_implementation_order).lower()
        assert "test" in all_steps

    def test_empty_codebase_produces_empty_report(
        self, auth_requirement: RequirementInput
    ):
        """Analysis on an empty collection should still return a valid report."""
        from app.agents.impact_agent import ImpactAnalysisAgent

        agent = ImpactAnalysisAgent(
            collection_name="test_empty_impact",
        )
        report = agent.analyse_requirement(auth_requirement)

        assert report.requirement_id == "JIRA-101"
        assert len(report.impacted_files) == 0
        assert report.search_results_count == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestImpactEndpoint:
    """Tests for POST /api/v1/impact-analysis."""

    def test_impact_analysis_endpoint(self, sample_repo: Path):
        """End-to-end: index repo then analyse a requirement via API."""
        # Index first
        client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )

        # Analyse
        response = client.post(
            "/api/v1/impact-analysis",
            json={
                "requirement_id": "API-TEST-001",
                "title": "Add authentication logging",
                "description": (
                    "Add audit logging to all authentication events "
                    "including login, logout, and failed attempts."
                ),
                "domain": "Auth",
                "source": "jira",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "report" in data
        report = data["report"]
        assert report["requirement_id"] == "API-TEST-001"
        assert "impacted_files" in report
        assert "overall_risk_level" in report
        assert "recommended_implementation_order" in report
        assert report["analysis_duration_ms"] > 0

    def test_impact_analysis_validation_error(self):
        """Missing required fields should return 422."""
        response = client.post(
            "/api/v1/impact-analysis",
            json={"title": "Missing required fields"},
        )
        assert response.status_code == 422

    def test_impact_analysis_with_acceptance_criteria(self, sample_repo: Path):
        """Requirement with acceptance criteria should work."""
        client.post(
            "/api/v1/embeddings/generate",
            json={"repository_path": str(sample_repo)},
        )

        response = client.post(
            "/api/v1/impact-analysis",
            json={
                "requirement_id": "API-TEST-002",
                "title": "Implement session timeout",
                "description": (
                    "Sessions should automatically expire after 30 minutes "
                    "of inactivity for security compliance."
                ),
                "domain": "Auth",
                "source": "jira",
                "acceptance_criteria": (
                    "1. Sessions expire after 30 min idle.\n"
                    "2. Users receive a warning at 25 minutes.\n"
                    "3. Expired sessions redirect to login."
                ),
            },
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"
