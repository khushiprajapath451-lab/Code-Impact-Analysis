"""
Impact Analysis Agent
======================
Orchestrates the full Phase 4 impact analysis workflow:

  Step A: Receive RequirementInput → extract key concepts
  Step B: Search codebase via EmbeddingSearchAgent (Phase 3)
  Step C: Send retrieved chunks + requirement into a reasoning LLM prompt
  Step D: Synthesise and return a structured ImpactAnalysisReport

Inherits from :class:`BaseAgent` and follows the standard
``execute`` / ``safe_execute`` contract.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.agents.prompts.impact_prompts import (
    IMPACT_ANALYSIS_SYSTEM,
    IMPACT_ANALYSIS_USER,
)
from app.models.impact_models import (
    ChangeType,
    ComponentEvidence,
    EvidenceConfidence,
    ExtractedConcepts,
    ImpactAnalysisReport,
    ImpactedComponent,
    RequirementInput,
    RiskLevel,
)
from app.models.schemas import AgentInput, AgentOutput, AgentStatus
from app.models.search_models import SearchResultItem
from app.services.embedding_service import EmbeddingService
from app.services.requirement_extractor import RequirementExtractor
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)


class ImpactAnalysisAgent(BaseAgent):
    """
    Agent that analyses business requirements against an indexed codebase
    and produces a structured Impact Analysis Report.

    Parameters
    ----------
    embedding_service : EmbeddingService | None
        Injected embedding service (for testing).
    vector_store : VectorStoreService | None
        Injected vector store (for testing).
    collection_name : str | None
        Override the ChromaDB collection.
    top_k : int
        Number of code chunks to retrieve per search query.
    use_llm_extraction : bool
        If True, use the LLM for requirement extraction.
        If False, use deterministic heuristic only.
    use_llm_reasoning : bool
        If True, use the LLM for impact reasoning.
        If False, produce a report from search results alone.
    """

    def __init__(
        self,
        *,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStoreService] = None,
        collection_name: Optional[str] = None,
        top_k: int = 15,
        use_llm_extraction: bool = False,
        use_llm_reasoning: bool = False,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="ImpactAnalysisAgent",
            system_prompt=IMPACT_ANALYSIS_SYSTEM,
            **kwargs,
        )
        self._embedding_service = embedding_service or EmbeddingService()
        self._vector_store = vector_store or VectorStoreService(
            collection_name=collection_name,
        )
        self._top_k = top_k
        self._use_llm_extraction = use_llm_extraction
        self._use_llm_reasoning = use_llm_reasoning

        # Build the requirement extractor
        llm_callable = self._llm_for_extraction if use_llm_extraction else None
        self._extractor = RequirementExtractor(llm_callable=llm_callable)

    # ── BaseAgent contract ────────────────────────────────────────────────

    def execute(self, payload: AgentInput) -> AgentOutput:
        """
        Execute impact analysis.

        The ``payload.task`` should contain the requirement description.
        Additional fields are passed via ``payload.metadata``.
        """
        try:
            requirement = RequirementInput(
                requirement_id=payload.metadata.get(
                    "requirement_id", "REQ-001"
                ),
                title=payload.metadata.get("title", payload.task[:100]),
                description=payload.task,
                domain=payload.metadata.get("domain"),
                source=payload.metadata.get("source", "manual"),
                acceptance_criteria=payload.metadata.get(
                    "acceptance_criteria"
                ),
            )

            report = self.analyse_requirement(requirement)

            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=(
                    f"Impact analysis complete: {len(report.impacted_files)} "
                    f"components impacted, risk={report.overall_risk_level.value}"
                ),
                metadata=report.model_dump(mode="json"),
                duration_ms=report.analysis_duration_ms,
            )
        except Exception as exc:
            logger.exception("Impact analysis failed")
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                error=str(exc),
            )

    # ── Core Pipeline ─────────────────────────────────────────────────────

    def analyse_requirement(
        self, requirement: RequirementInput
    ) -> ImpactAnalysisReport:
        """
        Full impact analysis pipeline.

        Parameters
        ----------
        requirement : RequirementInput
            The business requirement to analyse.

        Returns
        -------
        ImpactAnalysisReport
            Structured impact analysis report.
        """
        start = time.perf_counter()

        # ── Step A: Extract concepts ──────────────────────────────────────
        logger.info(
            "Step A: Extracting concepts from requirement %s",
            requirement.requirement_id,
        )
        concepts = self._extractor.extract(requirement)
        logger.info(
            "Extracted %d domain concepts, %d keywords, %d risk flags",
            len(concepts.domain_concepts),
            len(concepts.explicit_keywords) + len(concepts.implicit_keywords),
            len(concepts.risk_flags),
        )

        # ── Step B: Search codebase ───────────────────────────────────────
        logger.info("Step B: Searching codebase for relevant code chunks")
        search_results = self._search_codebase(requirement, concepts)
        logger.info(
            "Found %d relevant code chunks", len(search_results)
        )

        # ── Step C & D: Reason + Synthesise ───────────────────────────────
        if self._use_llm_reasoning and search_results:
            logger.info("Step C: LLM-based impact reasoning")
            report = self._reason_with_llm(
                requirement, concepts, search_results
            )
        else:
            logger.info("Step C: Deterministic impact synthesis")
            report = self._synthesise_deterministic(
                requirement, concepts, search_results
            )

        elapsed_ms = (time.perf_counter() - start) * 1000
        report.analysis_duration_ms = round(elapsed_ms, 2)

        logger.info(
            "Impact analysis for %s complete: %d impacted files, "
            "risk=%s in %.1f ms",
            requirement.requirement_id,
            len(report.impacted_files),
            report.overall_risk_level.value,
            elapsed_ms,
        )
        return report

    # ── Step B: Codebase Search ───────────────────────────────────────────

    def _search_codebase(
        self,
        requirement: RequirementInput,
        concepts: ExtractedConcepts,
    ) -> List[SearchResultItem]:
        """
        Search the vector store using multiple query strategies
        to maximise recall.
        """
        all_results: Dict[str, SearchResultItem] = {}

        # Strategy 1: Full requirement text
        self._run_search(
            f"{requirement.title}. {requirement.description}",
            all_results,
        )

        # Strategy 2: Core intent
        if concepts.core_intent:
            self._run_search(concepts.core_intent, all_results)

        # Strategy 3: Domain concepts as queries
        if concepts.domain_concepts:
            concept_query = " ".join(concepts.domain_concepts)
            self._run_search(concept_query, all_results)

        # Strategy 4: Combined keywords
        all_keywords = concepts.explicit_keywords + concepts.implicit_keywords
        if all_keywords:
            kw_query = " ".join(all_keywords[:15])
            self._run_search(kw_query, all_results)

        # Sort by best similarity and return
        results = sorted(
            all_results.values(),
            key=lambda r: r.similarity,
            reverse=True,
        )
        return results[: self._top_k]

    def _run_search(
        self,
        query: str,
        results_map: Dict[str, SearchResultItem],
    ) -> None:
        """Execute a single search and merge results by chunk_id."""
        try:
            query_vec = self._embedding_service.embed_query(query)
            raw_results = self._vector_store.search(
                query_embedding=query_vec,
                top_k=self._top_k,
            )

            for r in raw_results:
                meta = r.get("metadata", {})
                item = SearchResultItem(
                    chunk_id=r["chunk_id"],
                    file_path=meta.get("file_path", ""),
                    language=meta.get("language", "unknown"),
                    chunk_type=meta.get("chunk_type", "general"),
                    entity_name=meta.get("entity_name", ""),
                    code_content=r.get("code_content", ""),
                    start_line=int(meta.get("start_line", 0)),
                    end_line=int(meta.get("end_line", 0)),
                    parent_entity=meta.get("parent_entity", ""),
                    docstring=meta.get("docstring", ""),
                    similarity=r.get("similarity", 0.0),
                )
                # Keep the highest similarity score
                existing = results_map.get(item.chunk_id)
                if existing is None or item.similarity > existing.similarity:
                    results_map[item.chunk_id] = item

        except Exception as exc:
            logger.warning("Search query failed: %s", exc)

    # ── Step C: LLM Reasoning ─────────────────────────────────────────────

    def _reason_with_llm(
        self,
        requirement: RequirementInput,
        concepts: ExtractedConcepts,
        search_results: List[SearchResultItem],
    ) -> ImpactAnalysisReport:
        """Use the LLM to perform deep impact reasoning."""
        code_chunks_text = self._format_chunks_for_prompt(search_results)
        all_kw = concepts.explicit_keywords + concepts.implicit_keywords

        user_msg = IMPACT_ANALYSIS_USER.format(
            requirement_id=requirement.requirement_id,
            title=requirement.title,
            domain=requirement.domain or "Unspecified",
            description=requirement.description,
            core_intent=concepts.core_intent,
            domain_concepts=", ".join(concepts.domain_concepts),
            all_keywords=", ".join(all_kw[:20]),
            risk_flags=", ".join(concepts.risk_flags) or "None identified",
            code_chunks_text=code_chunks_text,
        )

        llm_output = self._call_llm(user_msg)
        raw_json = self._parse_json(llm_output.result)

        return self._build_report_from_json(
            raw_json, requirement, concepts, search_results
        )

    def _llm_for_extraction(
        self, system_prompt: str, user_message: str
    ) -> str:
        """Adapter: call the base agent's LLM for extraction."""
        # Temporarily swap the system prompt
        original = self.system_prompt
        self.system_prompt = system_prompt
        try:
            output = self._call_llm(user_message)
            return output.result
        finally:
            self.system_prompt = original

    # ── Step D: Deterministic Synthesis ────────────────────────────────────

    def _synthesise_deterministic(
        self,
        requirement: RequirementInput,
        concepts: ExtractedConcepts,
        search_results: List[SearchResultItem],
    ) -> ImpactAnalysisReport:
        """
        Build an impact report without an LLM, using the search results
        and extracted concepts directly.
        """
        impacted: List[ImpactedComponent] = []

        for item in search_results:
            risk = self._assess_risk(item, concepts)
            impacted.append(
                ImpactedComponent(
                    file_path=item.file_path,
                    entity_name=item.entity_name,
                    chunk_type=item.chunk_type,
                    change_type=ChangeType.MODIFY,
                    risk_level=risk,
                    reason=(
                        f"Semantically relevant to requirement "
                        f"(similarity={item.similarity:.3f})"
                    ),
                    similarity_score=item.similarity,
                    start_line=item.start_line,
                    end_line=item.end_line,
                    language=item.language,
                    evidence=ComponentEvidence(
                        supported=True,
                        chunk_id=item.chunk_id,
                        file_path=item.file_path,
                        entity_name=item.entity_name,
                        start_line=item.start_line,
                        end_line=item.end_line,
                        similarity_score=item.similarity,
                        confidence=EvidenceConfidence.HIGH,
                    ),
                )
            )

        # Determine overall risk
        if any(c.risk_level == RiskLevel.CRITICAL for c in impacted):
            overall_risk = RiskLevel.CRITICAL
        elif any(c.risk_level == RiskLevel.HIGH for c in impacted):
            overall_risk = RiskLevel.HIGH
        elif any(c.risk_level == RiskLevel.MEDIUM for c in impacted):
            overall_risk = RiskLevel.MEDIUM
        else:
            overall_risk = RiskLevel.LOW

        # Build implementation order
        impl_order = self._generate_implementation_order(impacted, concepts)

        all_keywords = (
            concepts.explicit_keywords + concepts.implicit_keywords
        )

        return ImpactAnalysisReport(
            requirement_id=requirement.requirement_id,
            requirement_title=requirement.title,
            core_intent_summary=concepts.core_intent,
            extracted_keywords=all_keywords,
            domain_concepts=concepts.domain_concepts,
            impacted_files=impacted,
            affected_apis=[],
            affected_db_tables=[],
            overall_risk_level=overall_risk,
            downstream_risk_assessment=(
                f"Analysis identified {len(impacted)} potentially impacted "
                f"components. Risk flags: {', '.join(concepts.risk_flags) or 'none'}."
            ),
            risk_flags=concepts.risk_flags,
            recommended_implementation_order=impl_order,
            estimated_complexity=self._estimate_complexity(impacted),
            search_results_count=len(search_results),
        )

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _assess_risk(
        item: SearchResultItem,
        concepts: ExtractedConcepts,
    ) -> RiskLevel:
        """Heuristic risk assessment for a single code chunk."""
        text = (
            f"{item.file_path} {item.entity_name} "
            f"{item.code_content[:500]} {item.docstring}"
        ).lower()

        # Critical: security / auth / payment
        if any(
            kw in text
            for kw in [
                "password", "encrypt", "credential", "secret",
                "payment", "transaction", "billing",
            ]
        ):
            return RiskLevel.CRITICAL

        # High: shared modules, base classes, interfaces
        if any(
            kw in text
            for kw in [
                "base", "abstract", "interface", "shared", "common",
                "middleware", "decorator",
            ]
        ):
            return RiskLevel.HIGH

        if "security" in concepts.risk_flags or "financial_impact" in concepts.risk_flags:
            return RiskLevel.HIGH

        # Medium: standard code
        if item.similarity > 0.5:
            return RiskLevel.MEDIUM

        return RiskLevel.LOW

    @staticmethod
    def _generate_implementation_order(
        impacted: List[ImpactedComponent],
        concepts: ExtractedConcepts,
    ) -> List[str]:
        """Generate a recommended implementation order."""
        steps: List[str] = []

        if "database" in concepts.domain_concepts:
            steps.append("1. Database schema migration / model updates")

        if any(c.chunk_type in ("class", "module") for c in impacted):
            steps.append(
                f"{'2' if steps else '1'}. Update core classes and shared modules"
            )

        if any(c.chunk_type in ("function", "method") for c in impacted):
            steps.append(
                f"{len(steps) + 1}. Modify affected functions and methods"
            )

        if "API" in concepts.technical_areas:
            steps.append(f"{len(steps) + 1}. Update API endpoints and routes")

        steps.append(f"{len(steps) + 1}. Write / update unit and integration tests")
        steps.append(f"{len(steps) + 1}. Update documentation and API specs")
        steps.append(f"{len(steps) + 1}. Code review and security audit")

        return steps

    @staticmethod
    def _estimate_complexity(impacted: List[ImpactedComponent]) -> str:
        """Rough complexity estimate based on impacted component count."""
        n = len(impacted)
        high_risk_count = sum(
            1
            for c in impacted
            if c.risk_level in (RiskLevel.CRITICAL, RiskLevel.HIGH)
        )

        if n > 10 or high_risk_count > 3:
            return "very_high"
        elif n > 5 or high_risk_count > 1:
            return "high"
        elif n > 2:
            return "medium"
        return "low"

    @staticmethod
    def _format_chunks_for_prompt(
        results: List[SearchResultItem],
    ) -> str:
        """Format search results for the LLM reasoning prompt."""
        parts: List[str] = []
        for i, r in enumerate(results[:15], 1):
            parts.append(
                f"--- Chunk {i} (similarity={r.similarity:.3f}) ---\n"
                f"File: {r.file_path}\n"
                f"Entity: {r.entity_name} ({r.chunk_type})\n"
                f"Language: {r.language}\n"
                f"Lines: {r.start_line}-{r.end_line}\n"
                f"Docstring: {r.docstring or 'N/A'}\n"
                f"Code:\n{r.code_content[:2000]}\n"
            )
        return "\n".join(parts) if parts else "No relevant code chunks found."


    def _build_report_from_json(
        self,
        data: Dict[str, Any],
        requirement: RequirementInput,
        concepts: ExtractedConcepts,
        search_results: List[SearchResultItem],
    ) -> ImpactAnalysisReport:
        """Convert parsed LLM JSON into a validated ImpactAnalysisReport with grounded evidence."""
        all_kw = concepts.explicit_keywords + concepts.implicit_keywords

        data["requirement_id"] = requirement.requirement_id
        data["requirement_title"] = requirement.title
        data["extracted_keywords"] = all_kw
        data["domain_concepts"] = concepts.domain_concepts
        data["search_results_count"] = len(search_results)
        if "core_intent_summary" not in data:
            data["core_intent_summary"] = concepts.core_intent

        # Ground every impacted component against retrieved search results
        if "impacted_files" in data and isinstance(data["impacted_files"], list):
            enriched_files = []
            for item in data["impacted_files"]:
                if isinstance(item, dict):
                    enriched_item = self._match_impact_to_evidence(item, search_results)
                    enriched_files.append(enriched_item)
                else:
                    enriched_files.append(item)
            data["impacted_files"] = enriched_files

        try:
            return ImpactAnalysisReport.model_validate(data)
        except Exception as e:
            logger.error("Validation error in ImpactAnalysisReport: %s", e)
            return ImpactAnalysisReport(
                requirement_id=requirement.requirement_id,
                requirement_title=requirement.title,
                core_intent_summary="Failed to parse LLM reasoning output",
                extracted_keywords=all_kw,
                domain_concepts=concepts.domain_concepts,
                impacted_files=[],
                overall_risk_level=RiskLevel.HIGH,
            )

    @staticmethod
    def _match_impact_to_evidence(
        item_data: Dict[str, Any],
        search_results: List[SearchResultItem],
    ) -> Dict[str, Any]:
        """
        Match an LLM-reported impacted component against the retrieved search results.

        Performs deterministic evidence grounding:
          - High confidence: Exact file_path and exact entity_name match.
          - Medium confidence: File path matches with entity ambiguity.
          - Low confidence / Unsupported: No matching chunk in retrieved results (Inference).
        """
        if not search_results:
            item_data["similarity_score"] = 0.0
            item_data["start_line"] = 0
            item_data["end_line"] = 0
            item_data["evidence"] = {
                "supported": False,
                "chunk_id": None,
                "file_path": item_data.get("file_path", ""),
                "entity_name": item_data.get("entity_name", ""),
                "start_line": None,
                "end_line": None,
                "similarity_score": 0.0,
                "confidence": EvidenceConfidence.LOW.value,
            }
            return item_data

        target_file = (item_data.get("file_path") or "").strip().replace("\\", "/").lower()
        target_entity = (item_data.get("entity_name") or "").strip()

        matched_chunk: Optional[SearchResultItem] = None
        confidence = EvidenceConfidence.LOW

        # 1. Exact Match: file_path AND entity_name
        for r in search_results:
            r_file = r.file_path.strip().replace("\\", "/").lower()
            if r_file == target_file or r_file.endswith(target_file) or target_file.endswith(r_file):
                if target_entity and r.entity_name == target_entity:
                    matched_chunk = r
                    confidence = EvidenceConfidence.HIGH
                    break

        # 2. Case-insensitive entity match on the same file
        if not matched_chunk and target_entity:
            for r in search_results:
                r_file = r.file_path.strip().replace("\\", "/").lower()
                if r_file == target_file or r_file.endswith(target_file) or target_file.endswith(r_file):
                    if r.entity_name.lower() == target_entity.lower():
                        matched_chunk = r
                        confidence = EvidenceConfidence.HIGH
                        break

        # 3. Secondary Match: File matches, but entity is different/empty
        if not matched_chunk:
            file_matches = [
                r for r in search_results
                if (r.file_path.strip().replace("\\", "/").lower() == target_file
                    or r.file_path.strip().replace("\\", "/").lower().endswith(target_file)
                    or target_file.endswith(r.file_path.strip().replace("\\", "/").lower()))
            ]
            if file_matches:
                # Pick the highest similarity chunk from the matched file
                matched_chunk = max(file_matches, key=lambda x: x.similarity)
                confidence = EvidenceConfidence.MEDIUM

        if matched_chunk is not None:
            # Grounded evidence from the verified retrieved chunk
            item_data["file_path"] = matched_chunk.file_path
            item_data["similarity_score"] = matched_chunk.similarity
            item_data["start_line"] = matched_chunk.start_line
            item_data["end_line"] = matched_chunk.end_line
            item_data["language"] = matched_chunk.language
            if "chunk_type" not in item_data or item_data["chunk_type"] == "general":
                item_data["chunk_type"] = matched_chunk.chunk_type

            item_data["evidence"] = {
                "supported": True,
                "chunk_id": matched_chunk.chunk_id,
                "file_path": matched_chunk.file_path,
                "entity_name": matched_chunk.entity_name,
                "start_line": matched_chunk.start_line,
                "end_line": matched_chunk.end_line,
                "similarity_score": matched_chunk.similarity,
                "confidence": confidence.value,
            }
        else:
            # Unsupported / Inferred impact
            item_data["similarity_score"] = 0.0
            item_data["start_line"] = 0
            item_data["end_line"] = 0
            item_data["evidence"] = {
                "supported": False,
                "chunk_id": None,
                "file_path": item_data.get("file_path", ""),
                "entity_name": item_data.get("entity_name", ""),
                "start_line": None,
                "end_line": None,
                "similarity_score": 0.0,
                "confidence": EvidenceConfidence.LOW.value,
            }

        return item_data
