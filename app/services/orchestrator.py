"""
Master Workflow Orchestration Engine
====================================
End-to-End lifecycle runner combining Impact, Review, Testing, and PR phases.
"""

import json
import logging
import os
import time
import uuid
from typing import Dict, Optional

from app.agents.impact_agent import ImpactAnalysisAgent
from app.agents.pr_agent import TestAndPRAgent
from app.agents.review_agent import CodeReviewAgent
from app.agents.search_agent import EmbeddingSearchAgent
from app.core.audit_logger import AuditLogger
from app.models.impact_models import RequirementInput
from app.models.pipeline_models import (
    RunMode,
    WorkflowExecutionReport,
    WorkflowExecutionRequest,
)
from app.models.pr_models import PRGeneratorRequest
from app.models.review_models import ReviewRequest

logger = logging.getLogger(__name__)


class MasterOrchestratorService:
    """Coordinates the execution of all micro-agents into a single workflow."""

    def __init__(self, state_file: str = ".state/orchestrator_state.json"):
        self.search_agent = EmbeddingSearchAgent()
        self.impact_agent = ImpactAnalysisAgent(use_llm_reasoning=True)
        self.review_agent = CodeReviewAgent(search_agent=self.search_agent)
        self.pr_agent = TestAndPRAgent(search_agent=self.search_agent)
        
        self.state_file = state_file
        self._executions: Dict[str, WorkflowExecutionReport] = {}
        self._load_state()

    def _load_state(self):
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self._executions[k] = WorkflowExecutionReport.model_validate(v)
            except Exception as e:
                logger.error("Failed to load orchestrator state: %s", e)

    def _save_state(self):
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        try:
            with open(self.state_file, "w") as f:
                json.dump({k: v.model_dump(mode="json") for k, v in self._executions.items()}, f)
        except Exception as e:
            logger.error("Failed to save orchestrator state: %s", e)

    def get_execution_status(self, execution_id: str) -> Optional[WorkflowExecutionReport]:
        return self._executions.get(execution_id)

    def register_new_execution(self, request: WorkflowExecutionRequest) -> str:
        execution_id = str(uuid.uuid4())
        report = WorkflowExecutionReport(
            execution_id=execution_id,
            requirement_id=request.requirement_id,
            status="Pending"
        )
        self._executions[execution_id] = report
        self._save_state()
        return execution_id

    def run_pipeline(self, request: WorkflowExecutionRequest, execution_id: Optional[str] = None) -> WorkflowExecutionReport:
        """
        Executes the master workflow synchronously, tracking metrics and logs.
        """
        if not execution_id:
            execution_id = str(uuid.uuid4())
            report = WorkflowExecutionReport(
                execution_id=execution_id,
                requirement_id=request.requirement_id,
                status="Running"
            )
            self._executions[execution_id] = report
        else:
            report = self._executions[execution_id]
            report.status = "Running"
        
        self._save_state()
        
        logger.info("Starting Master Pipeline execution: %s for %s", execution_id, request.requirement_id)
        start_time_total = time.time()
        
        try:
            # ─────────────────────────────────────────────────────────────
            # STEP 1: Impact Analysis (Phase 4)
            # ─────────────────────────────────────────────────────────────
            impact_summary_str = "No impact analysis run."
            if request.run_mode in [RunMode.FULL, RunMode.IMPACT_ONLY]:
                start_step = time.time()
                try:
                    impact_req = RequirementInput(
                        requirement_id=request.requirement_id,
                        title=request.requirement_title,
                        description=request.requirement_description
                    )
                    impact_res = self.impact_agent.analyse_requirement(impact_req)
                    report.impact_analysis = impact_res
                    impact_summary_str = f"Risk: {impact_res.overall_risk_level.value}. {len(impact_res.impacted_files)} components affected."
                    # Map risk to overall report
                    report.overall_risk_score = impact_res.overall_risk_level.value
                    
                    dur = int((time.time() - start_step) * 1000)
                    report.metrics.impact_analysis_ms = dur
                    AuditLogger.log_agent_execution(execution_id, "ImpactAnalysisAgent", dur, request.requirement_description)
                except Exception as e:
                    logger.error("Impact Analysis failed: %s", e)
                    AuditLogger.log_agent_execution(execution_id, "ImpactAnalysisAgent", 0, status="FAILED", error_msg=str(e))
                    report.error_message = f"Impact Phase failed: {str(e)}"

            if request.run_mode == RunMode.IMPACT_ONLY:
                report.status = "Completed"
                return report


            # ─────────────────────────────────────────────────────────────
            # STEP 2: Code Review (Phase 6)
            # ─────────────────────────────────────────────────────────────
            review_summary_str = "No code review run."
            if request.run_mode in [RunMode.FULL, RunMode.REVIEW_ONLY]:
                start_step = time.time()
                try:
                    review_req = ReviewRequest(
                        repository_id=request.repository_id,
                        pull_request_id=request.pull_request_id,
                        diff_content=request.diff_content,
                    )
                    review_res = self.review_agent.review_diff(review_req)
                    report.code_review = review_res
                    review_summary_str = f"Status: {review_res.overall_status.value}. {review_res.total_issues_found} issues found."
                    
                    dur = int((time.time() - start_step) * 1000)
                    report.metrics.code_review_ms = dur
                    AuditLogger.log_agent_execution(execution_id, "CodeReviewAgent", dur, request.diff_content[:100])
                except Exception as e:
                    logger.error("Code Review failed: %s", e)
                    AuditLogger.log_agent_execution(execution_id, "CodeReviewAgent", 0, status="FAILED", error_msg=str(e))
                    report.error_message = f"Review Phase failed: {str(e)}"
                    
            if request.run_mode == RunMode.REVIEW_ONLY:
                report.status = "Completed"
                return report


            # ─────────────────────────────────────────────────────────────
            # STEP 3: Test Recommendation (Phase 7)
            # ─────────────────────────────────────────────────────────────
            if request.run_mode == RunMode.FULL:
                start_step = time.time()
                try:
                    test_res = self.pr_agent.recommend_tests(
                        diff_content=request.diff_content,
                        changed_files=request.changed_files,
                        repo_id=request.repository_id,
                        pr_id=request.pull_request_id
                    )
                    report.test_recommendations = test_res
                    
                    dur = int((time.time() - start_step) * 1000)
                    report.metrics.test_recommendation_ms = dur
                    AuditLogger.log_agent_execution(execution_id, "TestRecommendation", dur, request.diff_content[:100])
                except Exception as e:
                    logger.error("Test Recommendation failed: %s", e)
                    AuditLogger.log_agent_execution(execution_id, "TestRecommendation", 0, status="FAILED", error_msg=str(e))


            # ─────────────────────────────────────────────────────────────
            # STEP 4: PR Generation (Phase 7)
            # ─────────────────────────────────────────────────────────────
            if request.run_mode == RunMode.FULL:
                start_step = time.time()
                try:
                    pr_req = PRGeneratorRequest(
                        requirement_id=request.requirement_id,
                        requirement_title=request.requirement_title,
                        diff_content=request.diff_content,
                        changed_files=request.changed_files,
                        impact_report_summary=impact_summary_str,
                        review_summary=review_summary_str
                    )
                    pr_draft = self.pr_agent.generate_pr_draft(pr_req)
                    report.generated_pr_draft = pr_draft
                    
                    dur = int((time.time() - start_step) * 1000)
                    report.metrics.pr_generation_ms = dur
                    AuditLogger.log_agent_execution(execution_id, "PRGenerator", dur, pr_req.requirement_title)
                except Exception as e:
                    logger.error("PR Generation failed: %s", e)
                    AuditLogger.log_agent_execution(execution_id, "PRGenerator", 0, status="FAILED", error_msg=str(e))

            
            # Finalize
            report.status = "Completed"
            
        except Exception as general_err:
            logger.error("Master Orchestrator fatal error: %s", general_err)
            report.status = "Failed"
            report.error_message = str(general_err)
        finally:
            report.metrics.total_execution_ms = int((time.time() - start_time_total) * 1000)
            # Update state store
            self._executions[execution_id] = report
            self._save_state()
            logger.info("Pipeline execution %s finished in %sms", execution_id, report.metrics.total_execution_ms)

        return report
