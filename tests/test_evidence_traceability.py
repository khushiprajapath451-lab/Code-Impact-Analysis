"""
Unit and Integration Tests for Evidence-Based Impact Traceability (Task 3).
"""

from __future__ import annotations

import os
os.environ["DEBUG"] = "true"

import sys
sys.path.insert(0, r"c:\Users\Khushi\OneDrive\Desktop\Mass mutual ps-2")

from app.agents.impact_agent import ImpactAnalysisAgent
from app.models.impact_models import (
    ChangeType,
    ComponentEvidence,
    EvidenceConfidence,
    ExtractedConcepts,
    ImpactAnalysisReport,
    ImpactedComponent,
    RequirementInput,
    RequirementSource,
    RiskLevel,
)
from app.models.search_models import SearchResultItem


def test_1_exact_evidence_match(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 1: Exact file_path + entity_name matches retrieved chunk."""
    agent = ImpactAnalysisAgent()
    mock_llm_json = {
        "core_intent_summary": "Migrate to JWT",
        "impacted_files": [
            {
                "file_path": "app/auth.py",
                "entity_name": "create_jwt",
                "chunk_type": "function",
                "change_type": "modify",
                "risk_level": "critical",
                "reason": "[Direct] Modify JWT creation logic",
            }
        ],
        "overall_risk_level": "critical",
    }

    report = agent._build_report_from_json(
        mock_llm_json, sample_requirement, sample_concepts, retrieved_chunks
    )

    assert len(report.impacted_files) == 1
    comp = report.impacted_files[0]
    assert comp.evidence is not None
    assert comp.evidence.supported is True
    assert comp.evidence.chunk_id == "chunk_auth_jwt"
    assert comp.evidence.file_path == "app/auth.py"
    assert comp.evidence.entity_name == "create_jwt"
    assert comp.evidence.start_line == 45
    assert comp.evidence.end_line == 68
    assert comp.evidence.similarity_score == 0.895
    assert comp.evidence.confidence == EvidenceConfidence.HIGH
    assert comp.start_line == 45
    assert comp.end_line == 68
    assert comp.similarity_score == 0.895


def test_2_unsupported_inference(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 2: LLM returns component not in retrieved chunks -> marked unsupported/inferred."""
    agent = ImpactAnalysisAgent()
    mock_llm_json = {
        "core_intent_summary": "Migrate to JWT",
        "impacted_files": [
            {
                "file_path": "app/order.py",
                "entity_name": "create_order",
                "chunk_type": "function",
                "change_type": "modify",
                "risk_level": "high",
                "reason": "[Indirect] Downstream consumer of auth token",
            }
        ],
        "overall_risk_level": "high",
    }

    report = agent._build_report_from_json(
        mock_llm_json, sample_requirement, sample_concepts, retrieved_chunks
    )

    assert len(report.impacted_files) == 1
    comp = report.impacted_files[0]
    assert comp.evidence is not None
    assert comp.evidence.supported is False
    assert comp.evidence.chunk_id is None
    assert comp.evidence.start_line is None
    assert comp.evidence.end_line is None
    assert comp.evidence.similarity_score == 0.0
    assert comp.evidence.confidence == EvidenceConfidence.LOW
    # Ensure no fabricated line numbers or similarity score on the component
    assert comp.start_line == 0
    assert comp.end_line == 0
    assert comp.similarity_score == 0.0


def test_3_multiple_impacted_components(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 3: Multiple components match their distinct respective chunks."""
    agent = ImpactAnalysisAgent()
    mock_llm_json = {
        "core_intent_summary": "Migrate to JWT",
        "impacted_files": [
            {
                "file_path": "app/auth.py",
                "entity_name": "create_jwt",
                "chunk_type": "function",
                "change_type": "modify",
                "risk_level": "critical",
                "reason": "[Direct] Core JWT issuer",
            },
            {
                "file_path": "app/models/user.py",
                "entity_name": "User",
                "chunk_type": "class",
                "change_type": "review",
                "risk_level": "medium",
                "reason": "[Indirect] User entity",
            },
        ],
        "overall_risk_level": "critical",
    }

    report = agent._build_report_from_json(
        mock_llm_json, sample_requirement, sample_concepts, retrieved_chunks
    )

    assert len(report.impacted_files) == 2
    comp1 = report.impacted_files[0]
    comp2 = report.impacted_files[1]

    # Verify evidence 1
    assert comp1.evidence.supported is True
    assert comp1.evidence.chunk_id == "chunk_auth_jwt"
    assert comp1.evidence.entity_name == "create_jwt"

    # Verify evidence 2
    assert comp2.evidence.supported is True
    assert comp2.evidence.chunk_id == "chunk_user_model"
    assert comp2.evidence.entity_name == "User"

    # Strict separation
    assert comp1.evidence.chunk_id != comp2.evidence.chunk_id


def test_4_multiple_chunks_same_file(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 4: Multiple chunks in same file match exact entity, not first file chunk."""
    agent = ImpactAnalysisAgent()
    mock_llm_json = {
        "core_intent_summary": "Migrate to JWT",
        "impacted_files": [
            {
                "file_path": "app/auth.py",
                "entity_name": "validate_token",
                "chunk_type": "function",
                "change_type": "modify",
                "risk_level": "critical",
                "reason": "[Direct] Token validation",
            }
        ],
        "overall_risk_level": "critical",
    }

    report = agent._build_report_from_json(
        mock_llm_json, sample_requirement, sample_concepts, retrieved_chunks
    )

    comp = report.impacted_files[0]
    assert comp.evidence.supported is True
    # Must match validate_token chunk (lines 75-95), NOT create_jwt chunk (lines 45-68)
    assert comp.evidence.chunk_id == "chunk_auth_validate"
    assert comp.evidence.entity_name == "validate_token"
    assert comp.evidence.start_line == 75
    assert comp.evidence.end_line == 95
    assert comp.evidence.similarity_score == 0.850


def test_5_empty_search_results(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
):
    """TEST 5: Empty search results produces safe, ungrounded report."""
    agent = ImpactAnalysisAgent()
    mock_llm_json = {
        "core_intent_summary": "No context",
        "impacted_files": [
            {
                "file_path": "app/unknown.py",
                "entity_name": "unknown_func",
                "chunk_type": "function",
                "change_type": "modify",
                "risk_level": "low",
                "reason": "[Inferred] Guessed file",
            }
        ],
    }

    report = agent._build_report_from_json(
        mock_llm_json, sample_requirement, sample_concepts, []
    )

    assert len(report.impacted_files) == 1
    comp = report.impacted_files[0]
    assert comp.evidence.supported is False
    assert comp.evidence.chunk_id is None
    assert comp.evidence.confidence == EvidenceConfidence.LOW
    assert comp.similarity_score == 0.0


def test_6_deterministic_fallback(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 6: Deterministic mode attaches high-confidence evidence."""
    agent = ImpactAnalysisAgent(use_llm_reasoning=False)
    report = agent._synthesise_deterministic(
        sample_requirement, sample_concepts, retrieved_chunks
    )

    assert len(report.impacted_files) == 3
    for comp in report.impacted_files:
        assert comp.evidence is not None
        assert comp.evidence.supported is True
        assert comp.evidence.chunk_id in ("chunk_auth_jwt", "chunk_auth_validate", "chunk_user_model")
        assert comp.evidence.confidence == EvidenceConfidence.HIGH


def test_7_llm_parsing_failure_safe_fallback(
    sample_requirement: RequirementInput,
    sample_concepts: ExtractedConcepts,
    retrieved_chunks: list[SearchResultItem],
):
    """TEST 7: Corrupted LLM response triggers safe high-risk fallback."""
    agent = ImpactAnalysisAgent()
    corrupted_data = {"overall_risk_level": "INVALID_UNKNOWN_RISK_VALUE"}

    # Pass invalid payload that fails required validation
    report = agent._build_report_from_json(
        corrupted_data, sample_requirement, sample_concepts, retrieved_chunks
    )

    assert report.requirement_id == "REQ-101"
    assert report.overall_risk_level == RiskLevel.HIGH
    assert report.core_intent_summary == "Failed to parse LLM reasoning output"


if __name__ == "__main__":
    print("Running Task 3 Evidence Traceability Test Suite...")
    req = RequirementInput(
        requirement_id="REQ-101",
        title="Migrate to JWT",
        description="Auth migration",
    )
    concepts = ExtractedConcepts(core_intent="JWT", domain_concepts=["auth"])
    chunks = [
        SearchResultItem(
            chunk_id="chunk_auth_jwt",
            file_path="app/auth.py",
            entity_name="create_jwt",
            chunk_type="function",
            language="python",
            start_line=45,
            end_line=68,
            docstring="",
            code_content="",
            similarity=0.895,
        ),
        SearchResultItem(
            chunk_id="chunk_auth_validate",
            file_path="app/auth.py",
            entity_name="validate_token",
            chunk_type="function",
            language="python",
            start_line=75,
            end_line=95,
            docstring="",
            code_content="",
            similarity=0.850,
        ),
        SearchResultItem(
            chunk_id="chunk_user_model",
            file_path="app/models/user.py",
            entity_name="User",
            chunk_type="class",
            language="python",
            start_line=10,
            end_line=40,
            docstring="",
            code_content="",
            similarity=0.720,
        ),
    ]

    test_1_exact_evidence_match(req, concepts, chunks)
    print("[PASS] Test 1 -- Exact Evidence Match")
    test_2_unsupported_inference(req, concepts, chunks)
    print("[PASS] Test 2 -- Unsupported Inference")
    test_3_multiple_impacted_components(req, concepts, chunks)
    print("[PASS] Test 3 -- Multiple Impacted Components")
    test_4_multiple_chunks_same_file(req, concepts, chunks)
    print("[PASS] Test 4 -- Multiple Chunks Same File")
    test_5_empty_search_results(req, concepts)
    print("[PASS] Test 5 -- Empty Search Results")
    test_6_deterministic_fallback(req, concepts, chunks)
    print("[PASS] Test 6 -- Deterministic Fallback")
    test_7_llm_parsing_failure_safe_fallback(req, concepts, chunks)
    print("[PASS] Test 7 -- LLM Parsing Failure Safe Fallback")

    print("\nALL 7 TRACEABILITY UNIT TESTS PASSED!")
