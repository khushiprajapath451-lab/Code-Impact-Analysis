"""
Comprehensive Audit & Tracing Middleware
========================================
Enterprise logger for tracking LLM interactions, masking secrets, and measuring metrics.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Structured logger for tracking multi-agent interactions and scrubbing secrets.
    """

    # Basic regex patterns for enterprise secrets
    SECRET_PATTERNS = [
        (re.compile(r"(api_key|apikey|secret|password|token)\s*[:=]\s*[\"']?[A-Za-z0-9\-_]{16,}[\"']?", re.IGNORECASE),
         r"\1: [REDACTED_SECRET]"),
        (re.compile(r"bearer\s+[A-Za-z0-9\-\._~+\/]+", re.IGNORECASE),
         "Bearer [REDACTED_TOKEN]"),
        # Basic mock JWT matching
        (re.compile(r"ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*"),
         "[REDACTED_JWT]"),
    ]

    @classmethod
    def scrub_sensitive_data(cls, text: str) -> str:
        """Masks sensitive parameters like tokens before logging."""
        if not text:
            return text
        scrubbed = text
        for pattern, replacement in cls.SECRET_PATTERNS:
            scrubbed = pattern.sub(replacement, scrubbed)
        return scrubbed

    @classmethod
    def log_agent_execution(
        cls, 
        execution_id: str, 
        agent_name: str, 
        duration_ms: int, 
        prompt_snippet: str = "",
        status: str = "SUCCESS",
        error_msg: str = ""
    ) -> None:
        """
        Logs a structured JSON audit trail for SIEM systems.
        """
        safe_prompt = cls.scrub_sensitive_data(prompt_snippet)
        
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "execution_id": execution_id,
            "event_type": "AGENT_EXECUTION",
            "agent_name": agent_name,
            "duration_ms": duration_ms,
            "status": status,
        }

        if safe_prompt:
            log_payload["prompt_snippet"] = safe_prompt[:200] + "..." if len(safe_prompt) > 200 else safe_prompt
            
        if error_msg:
            log_payload["error_message"] = error_msg

        # Output structured JSON log
        logger.info("AUDIT_TRAIL: %s", json.dumps(log_payload))

