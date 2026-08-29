"""
Code Review Agent
=================
Orchestrates the multi-dimensional AI code review process.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.agents.prompts.review_prompts import (
    REVIEW_AGENT_SYSTEM,
    REVIEW_AGENT_USER,
)
from app.agents.search_agent import EmbeddingSearchAgent
from app.models.review_models import (
    CodeReviewSummary,
    RegressionWarningLevel,
    ReviewComment,
    ReviewCategory,
    ReviewRequest,
    ReviewStatus,
    SeverityLevel,
)
from app.models.schemas import AgentInput, AgentOutput, AgentStatus
from app.services.diff_parser import GitDiffParser

logger = logging.getLogger(__name__)


class CodeReviewAgent(BaseAgent):
    """
    Automated Code Review Agent analyzing git diffs across security,
    performance, standard, and regression dimensions.
    """

    def __init__(
        self,
        *,
        search_agent: Optional[EmbeddingSearchAgent] = None,
        collection_name: Optional[str] = None,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="CodeReviewAgent",
            system_prompt=REVIEW_AGENT_SYSTEM,
            **kwargs,
        )
        self._search_agent = search_agent or EmbeddingSearchAgent(
            collection_name=collection_name
        )
        self._diff_parser = GitDiffParser()

    def execute(self, payload: AgentInput) -> AgentOutput:
        """Standard execution hook for the agent."""
        req = ReviewRequest(
            repository_id=payload.metadata.get("repository_id", "default"),
            pull_request_id=payload.metadata.get("pull_request_id", "unknown"),
            diff_content=payload.task,
            author_id=payload.metadata.get("author_id", "unknown"),
        )
        try:
            summary = self.review_diff(req)
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=f"Code review complete. Status: {summary.overall_status.value}",
                metadata=summary.model_dump(mode="json"),
                duration_ms=summary.duration_ms,
            )
        except Exception as exc:
            logger.exception("Code review failed")
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=str(exc)
            )

    def review_diff(self, request: ReviewRequest) -> CodeReviewSummary:
        """
        End-to-end review orchestration.
        """
        start = time.perf_counter()

        # Step A: Parse the diff
        logger.info("Parsing diff for PR %s", request.pull_request_id)
        parsed_changes = self._diff_parser.parse(request.diff_content)
        
        if not parsed_changes:
            logger.warning("No valid file changes found in the diff.")
            return CodeReviewSummary(
                pull_request_id=request.pull_request_id,
                overall_status=ReviewStatus.APPROVED,
                summary_notes="No file changes found in the provided diff.",
                duration_ms=(time.perf_counter() - start) * 1000
            )

        # Step B: Locate downstream dependents
        logger.info("Searching for downstream dependents...")
        downstream_context = self._gather_downstream_context(parsed_changes)

        # Step C: Ask LLM for Review
        logger.info("Generating review via LLM...")
        user_msg = REVIEW_AGENT_USER.format(
            downstream_context=downstream_context or "No significant downstream dependents found.",
            diff_content=request.diff_content[:15000], # Cap at 15k chars for safety
        )

        llm_out = self._call_llm(user_msg)
        parsed_json = self._parse_json(llm_out.result)

        # Step D: Synthesize Summary
        summary = self._build_summary(parsed_json, request)
        summary.duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            "Review complete for %s. Issues found: %d. Status: %s",
            request.pull_request_id,
            summary.total_issues_found,
            summary.overall_status.value
        )

        return summary

    def _gather_downstream_context(self, parsed_changes: List[Any]) -> str:
        """
        Extract modified entities (methods/classes) from the diff and search
        the codebase to find where they are used to check for regression risks.
        """
        entities_to_search = set()
        for change in parsed_changes:
            entities_to_search.update(change.modified_entities)

        if not entities_to_search:
            return ""

        # Limit to 3 entity searches to avoid blasting the vector DB
        chunks = []
        for entity in list(entities_to_search)[:3]:
            # Use a strict term search heuristic for callers
            results = self._search_agent.search_codebase(query=entity, top_k=2)
            chunks.extend(results)

        # De-duplicate by chunk_id
        seen = set()
        unique_chunks = []
        for c in chunks:
            if c.chunk_id not in seen:
                seen.add(c.chunk_id)
                unique_chunks.append(c)

        context_parts = []
        for i, c in enumerate(unique_chunks[:5]):
            context_parts.append(
                f"--- Potential Caller {i+1} ---\n"
                f"File: {c.file_path}\n"
                f"Entity: {c.entity_name} ({c.chunk_type})\n"
                f"Code snippet:\n{c.code_content[:1000]}\n"
            )

        return "\n".join(context_parts)

    def _build_summary(
        self,
        data: Dict[str, Any],
        request: ReviewRequest
    ) -> CodeReviewSummary:
        """Map the parsed dict to Pydantic models using model_validate."""
        data["pull_request_id"] = request.pull_request_id
        
        # Count issues if comments exist
        if "comments" in data and isinstance(data["comments"], list):
            data["total_issues_found"] = len(data["comments"])
            
        try:
            return CodeReviewSummary.model_validate(data)
        except Exception as e:
            logger.error("Validation error in CodeReviewSummary: %s", e)
            return CodeReviewSummary(
                pull_request_id=request.pull_request_id,
                overall_status=ReviewStatus.NEEDS_ATTENTION,
                summary_notes="Failed to parse automated review correctly.",
                comments=[],
                regression_warning_level=RegressionWarningLevel.HIGH
            )
