"""
Requirement Extractor Engine
==============================
Parses incoming Jira/BRD text and extracts structured technical
concepts for downstream codebase search.

Supports two modes:
  1. **LLM mode** — Uses the configured LLM with a structured prompt
     to produce rich, context-aware extraction.
  2. **Deterministic fallback** — When no LLM is available (tests,
     offline), uses NLP heuristics (keyword extraction, domain
     pattern matching) to produce a best-effort extraction.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional

from app.models.impact_models import ExtractedConcepts, RequirementInput

logger = logging.getLogger(__name__)

# ─── Domain keyword banks for heuristic extraction ───────────────────────────

_DOMAIN_KEYWORD_BANKS = {
    "authentication": [
        "login", "logout", "auth", "authenticate", "password", "credential",
        "token", "jwt", "oauth", "sso", "session", "mfa", "2fa",
        "two-factor", "identity", "principal",
    ],
    "payments": [
        "payment", "transaction", "billing", "invoice", "charge", "refund",
        "settlement", "ledger", "account", "balance", "transfer", "ach",
        "wire", "premium",
    ],
    "security": [
        "encrypt", "decrypt", "hash", "certificate", "tls", "ssl",
        "vulnerability", "xss", "csrf", "injection", "sanitize",
        "permission", "authorization", "role", "access control", "rbac",
    ],
    "database": [
        "database", "table", "schema", "migration", "query", "sql",
        "index", "foreign key", "primary key", "column", "record",
        "repository", "orm", "model",
    ],
    "api": [
        "endpoint", "rest", "graphql", "api", "route", "controller",
        "request", "response", "status code", "middleware", "cors",
        "webhook", "callback",
    ],
    "notification": [
        "email", "sms", "notification", "alert", "message", "push",
        "template", "send", "queue", "event",
    ],
    "compliance": [
        "audit", "log", "compliance", "regulation", "sox", "hipaa",
        "gdpr", "pii", "sensitive", "retention", "archive",
    ],
    "claims": [
        "claim", "policy", "coverage", "benefit", "deductible",
        "adjudication", "underwriting", "rider", "endorsement",
    ],
}

_RISK_PATTERNS = [
    (r"\b(security|auth|encrypt|password|credential|pii)\b", "security_sensitive"),
    (r"\b(payment|transaction|billing|charge|refund|ledger)\b", "financial_impact"),
    (r"\b(compliance|audit|regulation|sox|hipaa|gdpr)\b", "compliance_related"),
    (r"\b(migration|schema.change|breaking)\b", "data_migration_risk"),
    (r"\b(shared|common|base.class|interface|abstract)\b", "shared_module_risk"),
    (r"\b(delete|remove|deprecat)\b", "destructive_change"),
]

_TECH_AREA_PATTERNS = [
    (r"\b(api|endpoint|route|rest|graphql)\b", "API"),
    (r"\b(database|table|schema|sql|migration|model)\b", "Database"),
    (r"\b(ui|frontend|component|page|view|template)\b", "Frontend"),
    (r"\b(service|backend|server|handler|controller)\b", "Backend"),
    (r"\b(test|spec|assert|mock|fixture)\b", "Testing"),
    (r"\b(config|setting|environment|env)\b", "Configuration"),
    (r"\b(deploy|pipeline|ci|cd|docker|kubernetes)\b", "DevOps"),
    (r"\b(email|sms|notification|queue|event)\b", "Messaging"),
]


class RequirementExtractor:
    """
    Extracts structured technical concepts from raw requirement text.

    Parameters
    ----------
    llm_callable : callable | None
        A function ``(system_prompt, user_message) -> str`` that calls
        an LLM and returns the raw text response.  If ``None``, the
        deterministic heuristic fallback is used.
    """

    def __init__(
        self,
        llm_callable: Optional[object] = None,
    ) -> None:
        self._llm_callable = llm_callable

    def extract(self, requirement: RequirementInput) -> ExtractedConcepts:
        """
        Extract structured concepts from a requirement.

        Tries the LLM first; falls back to heuristic extraction
        on failure or if no LLM is configured.
        """
        if self._llm_callable is not None:
            try:
                return self._extract_via_llm(requirement)
            except Exception as exc:
                logger.warning(
                    "LLM extraction failed, falling back to heuristic: %s",
                    exc,
                )

        return self._extract_heuristic(requirement)

    # ── LLM-based extraction ──────────────────────────────────────────────

    def _extract_via_llm(
        self, requirement: RequirementInput
    ) -> ExtractedConcepts:
        """Use the LLM to produce a structured extraction."""
        import json

        from app.agents.prompts.impact_prompts import (
            REQUIREMENT_EXTRACTION_SYSTEM,
            REQUIREMENT_EXTRACTION_USER,
        )

        ac_section = ""
        if requirement.acceptance_criteria:
            ac_section = (
                f"ACCEPTANCE CRITERIA:\n{requirement.acceptance_criteria}"
            )

        user_msg = REQUIREMENT_EXTRACTION_USER.format(
            requirement_id=requirement.requirement_id,
            title=requirement.title,
            domain=requirement.domain or "Unspecified",
            source=requirement.source.value,
            description=requirement.description,
            acceptance_criteria_section=ac_section,
        )

        raw = self._llm_callable(REQUIREMENT_EXTRACTION_SYSTEM, user_msg)

        # Parse the JSON response
        # Strip any markdown fencing the LLM might add
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)

        data = json.loads(cleaned)
        return ExtractedConcepts(**data)

    # ── Heuristic fallback ────────────────────────────────────────────────

    def _extract_heuristic(
        self, requirement: RequirementInput
    ) -> ExtractedConcepts:
        """
        Deterministic keyword extraction using pattern matching.

        Works offline without an LLM — suitable for tests and
        fallback scenarios.
        """
        full_text = (
            f"{requirement.title} {requirement.description} "
            f"{requirement.acceptance_criteria or ''}"
        ).lower()

        # Core intent: first sentence of description or title
        core_intent = requirement.title

        # Domain concepts
        domain_concepts = self._match_domain_concepts(full_text)

        # Explicit keywords: significant words from title + description
        explicit_kw = self._extract_significant_words(
            f"{requirement.title} {requirement.description}"
        )

        # Implicit keywords from domain banks
        implicit_kw = self._expand_implicit_keywords(
            full_text, domain_concepts
        )

        # Technical areas
        tech_areas = self._detect_technical_areas(full_text)

        # Risk flags
        risk_flags = self._detect_risk_flags(full_text)

        # Add domain if provided
        if requirement.domain and requirement.domain.lower() not in [
            c.lower() for c in domain_concepts
        ]:
            domain_concepts.insert(0, requirement.domain)

        return ExtractedConcepts(
            core_intent=core_intent,
            domain_concepts=domain_concepts,
            explicit_keywords=explicit_kw[:20],
            implicit_keywords=implicit_kw[:15],
            technical_areas=tech_areas,
            risk_flags=risk_flags,
        )

    @staticmethod
    def _match_domain_concepts(text: str) -> List[str]:
        """Match text against domain keyword banks."""
        matched: List[str] = []
        for domain, keywords in _DOMAIN_KEYWORD_BANKS.items():
            for kw in keywords:
                if kw in text:
                    if domain not in matched:
                        matched.append(domain)
                    break
        return matched

    @staticmethod
    def _extract_significant_words(text: str) -> List[str]:
        """Extract significant words (length > 3, not stop words)."""
        stop_words = {
            "the", "and", "for", "are", "but", "not", "you", "all",
            "can", "had", "her", "was", "one", "our", "out", "has",
            "have", "been", "from", "that", "this", "with", "they",
            "will", "each", "make", "like", "into", "when", "need",
            "should", "would", "could", "must", "also", "than",
            "them", "then", "some", "what", "about", "which", "their",
            "other", "more", "very", "after", "most", "only",
            "user", "system", "able", "allow", "update", "ensure",
        }
        words = re.findall(r"\b[a-z][a-z_-]{2,}\b", text.lower())
        seen: set = set()
        result: List[str] = []
        for w in words:
            if w not in stop_words and w not in seen:
                seen.add(w)
                result.append(w)
        return result

    @staticmethod
    def _expand_implicit_keywords(
        text: str, domains: List[str]
    ) -> List[str]:
        """Pull additional keywords from matched domain banks."""
        implicit: List[str] = []
        seen = set(text.split())
        for domain in domains:
            bank = _DOMAIN_KEYWORD_BANKS.get(domain, [])
            for kw in bank:
                if kw not in text and kw not in seen:
                    implicit.append(kw)
                    seen.add(kw)
        return implicit

    @staticmethod
    def _detect_technical_areas(text: str) -> List[str]:
        """Detect which technical areas the requirement touches."""
        areas: List[str] = []
        for pattern, area in _TECH_AREA_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE) and area not in areas:
                areas.append(area)
        return areas

    @staticmethod
    def _detect_risk_flags(text: str) -> List[str]:
        """Detect risk indicators in the requirement text."""
        flags: List[str] = []
        for pattern, flag in _RISK_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE) and flag not in flags:
                flags.append(flag)
        return flags
