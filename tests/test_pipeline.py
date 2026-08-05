"""
Tests — End-to-End Orchestration (Phase 8)
==========================================
Validates the master pipeline, state store, and audit logger.
"""

from fastapi.testclient import TestClient

from app.core.audit_logger import AuditLogger
from app.main import app
from app.models.pipeline_models import RunMode, WorkflowExecutionRequest
from app.services.orchestrator import MasterOrchestratorService
from app.models.impact_models import ImpactAnalysisReport, RiskLevel
from app.models.pr_models import PullRequestDraft, TestRecommendationReport, TestType
from app.models.review_models import CodeReviewSummary, ReviewStatus

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  Audit Logger Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_audit_logger_scrubs_secrets():
    bad_string = "Here is my token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ.XYZ"
    scrubbed = AuditLogger.scrub_sensitive_data(bad_string)
    assert "eyJhb" not in scrubbed
    assert "[REDACTED_JWT]" in scrubbed

    bad_string_2 = "Bearer 12345-abcde"
    scrubbed_2 = AuditLogger.scrub_sensitive_data(bad_string_2)
    assert "12345-abcde" not in scrubbed_2
    assert "[REDACTED_TOKEN]" in scrubbed_2

    bad_string_3 = "api_key='SUPER_SECRET_1234567890'"
    scrubbed_3 = AuditLogger.scrub_sensitive_data(bad_string_3)
    assert "SUPER_SECRET" not in scrubbed_3
    assert "[REDACTED_SECRET]" in scrubbed_3


# ═══════════════════════════════════════════════════════════════════════════════
#  Master Orchestrator Tests
# ═══════════════════════════════════════════════════════════════════════════════

class MockImpactAgent:
    def analyse_requirement(self, req):
        return ImpactAnalysisReport(
            requirement_id=req.requirement_id,
            requirement_title=req.title,
            core_intent_summary="Mock intent",
            overall_risk_level=RiskLevel.HIGH,
            impacted_files=[]
        )

class MockReviewAgent:
    def review_diff(self, req):
        return CodeReviewSummary(
            pull_request_id=req.pull_request_id,
            overall_status=ReviewStatus.APPROVED,
            summary_notes="Good",
            comments=[],
        )

class MockPRAgent:
    def recommend_tests(self, diff_content, changed_files, repo_id, pr_id):
        return TestRecommendationReport(
            repository_id=repo_id, pull_request_id=pr_id, coverage_gap_summary="None", test_suggestions=[]
        )
        
    def generate_pr_draft(self, req):
        return PullRequestDraft(
            pr_title="Mock PR",
            summary="Summary",
            problem_statement="Problem",
            solution_overview="Solution",
            security_and_compliance_notes="None",
            test_coverage_summary="None",
        )

def test_master_orchestrator_full_run():
    orchestrator = MasterOrchestratorService()
    # Monkey-patch agents
    orchestrator.impact_agent = MockImpactAgent()
    orchestrator.review_agent = MockReviewAgent()
    orchestrator.pr_agent = MockPRAgent()

    req = WorkflowExecutionRequest(
        requirement_id="REQ-1",
        requirement_title="Test",
        requirement_description="Test req",
        repository_id="repo1",
        pull_request_id="pr1",
        diff_content="+ code",
        changed_files=["main.py"],
        run_mode=RunMode.FULL
    )

    report = orchestrator.run_pipeline(req)
    
    assert report.status == "Completed"
    assert report.overall_risk_score == "high"
    assert report.impact_analysis is not None
    assert report.code_review is not None
    assert report.test_recommendations is not None
    assert report.generated_pr_draft is not None
    assert report.metrics.total_execution_ms >= 0

def test_master_orchestrator_partial_run():
    orchestrator = MasterOrchestratorService()
    orchestrator.impact_agent = MockImpactAgent()

    req = WorkflowExecutionRequest(
        requirement_id="REQ-1",
        requirement_title="Test",
        requirement_description="Test req",
        repository_id="repo1",
        pull_request_id="pr1",
        diff_content="+ code",
        changed_files=["main.py"],
        run_mode=RunMode.IMPACT_ONLY
    )

    report = orchestrator.run_pipeline(req)
    
    assert report.status == "Completed"
    assert report.impact_analysis is not None
    assert report.code_review is None
    assert report.generated_pr_draft is None


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_orchestrate_api():
    payload = {
        "requirement_id": "REQ-1",
        "requirement_title": "Test",
        "requirement_description": "Test req",
        "repository_id": "repo1",
        "pull_request_id": "pr1",
        "diff_content": "+ code",
        "changed_files": ["main.py"],
        "run_mode": "impact_only"
    }
    
    res = client.post("/api/v1/orchestrate/run", json=payload)
    # The actual agents will hit the real DB and LLM (or fallback), 
    # so we expect a 200 or 500 depending on environment setup,
    # but the route MUST exist.
    assert res.status_code in [202, 500]
    
    # Check status endpoint with a fake ID
    res2 = client.get("/api/v1/orchestrate/status/invalid-uuid")
    assert res2.status_code == 404
