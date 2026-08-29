"""
Test Recommendation & PR Generator Agent
========================================
Dual-purpose orchestrator for analyzing test gaps and drafting PRs.
"""

import json
import logging
import re
from typing import Any, Dict, Optional

from app.agents.base_agent import BaseAgent
from app.agents.prompts.pr_prompts import (
    PR_GENERATOR_SYSTEM,
    PR_GENERATOR_USER,
    TEST_RECOMMENDATION_SYSTEM,
    TEST_RECOMMENDATION_USER,
)
from app.agents.search_agent import EmbeddingSearchAgent
from app.models.pr_models import (
    PRGeneratorRequest,
    PullRequestDraft,
    TestCaseSuggestion,
    TestRecommendationReport,
    TestType,
)
from app.models.schemas import AgentInput, AgentOutput, AgentStatus
from app.services.diff_parser import GitDiffParser
from app.services.test_analyzer import TestCoverageAnalyzer

logger = logging.getLogger(__name__)


class TestAndPRAgent(BaseAgent):
    """
    Agent responsible for generating test cases and Pull Request drafts.
    """

    def __init__(
        self,
        *,
        search_agent: Optional[EmbeddingSearchAgent] = None,
        collection_name: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="TestAndPRAgent",
            system_prompt="", # Dynamically set per method
            **kwargs,
        )
        self._search_agent = search_agent or EmbeddingSearchAgent(
            collection_name=collection_name
        )
        self._diff_parser = GitDiffParser()
        self._test_analyzer = TestCoverageAnalyzer()

    def execute(self, payload: AgentInput) -> AgentOutput:
        """Standard hook, but direct method calls are preferred for strict typing."""
        return AgentOutput(
            agent_name=self.agent_name,
            status=AgentStatus.ERROR,
            error="Use recommend_tests() or generate_pr_draft() directly."
        )

    def recommend_tests(
        self, diff_content: str, changed_files: list[str], repo_id: str, pr_id: str
    ) -> TestRecommendationReport:
        """
        Analyze code diffs and recommend missing test cases.
        """
        logger.info("Recommending tests for PR %s", pr_id)
        
        # 1. Identify test context
        evaluated_files = self._test_analyzer.get_evaluated_files(changed_files)
        
        test_context = ""
        if evaluated_files:
            guessed_test_files = [self._test_analyzer.guess_test_file_path(f) for f in evaluated_files]
            # In a real scenario, we'd search these exact guessed files.
            # Here, we do a semantic search for test patterns.
            search_query = " ".join([f.split('/')[-1] for f in guessed_test_files if f])
            if search_query:
                results = self._search_agent.search_codebase(query=f"test {search_query}", top_k=2)
                if results:
                    test_context = "\n".join(f"Found test snippet in {r.file_path}: {r.code_content[:500]}" for r in results)

        # 2. Setup Prompt
        self.system_prompt = TEST_RECOMMENDATION_SYSTEM
        user_msg = TEST_RECOMMENDATION_USER.format(
            evaluated_files=", ".join(evaluated_files) if evaluated_files else "None",
            existing_test_context=test_context or "No existing tests found.",
            diff_content=diff_content[:15000]
        )

        # 3. Call LLM
        llm_out = self._call_llm(user_msg)
        parsed = self._parse_json(llm_out.result)

        # 4. Map to Pydantic

        parsed["repository_id"] = repo_id
        parsed["pull_request_id"] = pr_id
        parsed["evaluated_files"] = evaluated_files
        
        # Calculate missing tests
        if "test_suggestions" in parsed and isinstance(parsed["test_suggestions"], list):
            parsed["total_missing_tests"] = len(parsed["test_suggestions"])
        else:
            parsed["total_missing_tests"] = 0

        try:
            return TestRecommendationReport.model_validate(parsed)
        except Exception as e:
            logger.error("Validation error in TestRecommendationReport: %s", e)
            return TestRecommendationReport(
                repository_id=repo_id,
                pull_request_id=pr_id,
                evaluated_files=evaluated_files,
                total_missing_tests=0,
                test_suggestions=[],
                coverage_gap_summary="Failed to parse test recommendations."
            )

    def generate_pr_draft(self, request: PRGeneratorRequest) -> PullRequestDraft:
        """
        Generate a structured PR draft integrating requirements and reviews.
        """
        logger.info("Generating PR Draft for %s", request.requirement_id)

        self.system_prompt = PR_GENERATOR_SYSTEM
        user_msg = PR_GENERATOR_USER.format(
            req_title=request.requirement_title,
            req_id=request.requirement_id,
            impact_summary=request.impact_report_summary,
            review_summary=request.review_summary,
            diff_content=request.diff_content[:10000]
        )

        llm_out = self._call_llm(user_msg)
        parsed = self._parse_json(llm_out.result)

        try:
            return PullRequestDraft.model_validate(parsed)
        except Exception as e:
            logger.error("Validation error in PR Draft: %s", e)
            return PullRequestDraft(
                pr_title="Draft PR",
                summary="Fallback summary due to parse error",
                problem_statement="",
                solution_overview="",
                security_and_compliance_notes="",
                test_coverage_summary=""
            )
