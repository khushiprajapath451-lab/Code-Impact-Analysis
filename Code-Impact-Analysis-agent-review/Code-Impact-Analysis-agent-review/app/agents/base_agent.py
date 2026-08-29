"""
Base Agent Framework
====================
Abstract base class that standardises how all AI agents in the system behave.
Every specialised agent (Parser, Reviewer, Impact Analyser, etc.) MUST extend
this class and implement the ``execute`` method.

Key responsibilities:
  - LLM client initialisation (OpenAI / Anthropic)
  - System-prompt injection
  - Standardised input → output pipeline
  - Automatic retry with exponential back-off
  - Token-usage tracking
"""

from __future__ import annotations

import json
import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from openai import OpenAI
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import LLMProvider, Settings, get_settings
from app.models.schemas import AgentInput, AgentOutput, AgentStatus

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents.

    Parameters
    ----------
    agent_name : str
        Human-readable identifier for logging and output tagging.
    system_prompt : str
        The system-level instruction injected at the start of every LLM call.
    model : str | None
        Override the default model from settings.
    temperature : float | None
        Override the default temperature from settings.
    max_tokens : int | None
        Override the default max_tokens from settings.

    Example
    -------
    >>> class CodeReviewAgent(BaseAgent):
    ...     def execute(self, payload: AgentInput) -> AgentOutput:
    ...         return self._call_llm(payload.task, payload.context)
    """

    def __init__(
        self,
        agent_name: str,
        system_prompt: str,
        *,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> None:
        self.agent_name = agent_name
        self.system_prompt = system_prompt

        self._settings: Settings = get_settings()

        # Resolve model parameters (explicit overrides > settings defaults)
        self.model = model or self._default_model
        self.temperature = temperature if temperature is not None else self._settings.default_temperature
        self.max_tokens = max_tokens or self._settings.default_max_tokens

        # LLM client is created lazily on first _call_llm invocation
        self._client: Optional[OpenAI] = None

        logger.info(
            "Agent [%s] initialised — provider=%s  model=%s",
            self.agent_name,
            self._settings.default_llm_provider.value,
            self.model,
        )

    # ── LLM Client Setup ────────────────────────────────────────────────

    @property
    def _default_model(self) -> str:
        """Return the default model string based on the configured provider."""
        if self._settings.default_llm_provider == LLMProvider.ANTHROPIC:
            return self._settings.anthropic_model
        if self._settings.default_llm_provider == LLMProvider.GEMINI:
            return self._settings.gemini_model
        return self._settings.openai_model

    def _initialize_llm_client(self) -> OpenAI:
        """
        Create and return an OpenAI-compatible client.

        OpenAI, Anthropic, and Google Gemini all expose OpenAI-compatible
        chat-completions interfaces, so we use the OpenAI SDK as the
        unified client for all three providers.
        """
        provider = self._settings.default_llm_provider

        if provider == LLMProvider.ANTHROPIC:
            # Anthropic's OpenAI-compatible endpoint
            return OpenAI(
                api_key=self._settings.anthropic_api_key,
                base_url="https://api.anthropic.com/v1/",
            )

        if provider == LLMProvider.GEMINI:
            # Google Gemini's OpenAI-compatible endpoint
            return OpenAI(
                api_key=self._settings.gemini_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )

        # Default: OpenAI
        return OpenAI(api_key=self._settings.openai_api_key)

    # ── Message Construction ─────────────────────────────────────────────

    def _build_messages(
        self,
        user_message: str,
        context: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """
        Assemble the message list sent to the LLM.

        Returns
        -------
        list[dict]
            A list of role/content dicts: [system, (context), user].
        """
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": self.system_prompt},
        ]

        if context:
            messages.append({
                "role": "user",
                "content": f"### Context\n\n{context}",
            })

        messages.append({"role": "user", "content": user_message})
        return messages

    # ── Core LLM Call ────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type((Exception,)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    def _call_llm(
        self,
        user_message: str,
        context: Optional[str] = None,
    ) -> AgentOutput:
        """
        Execute a chat-completion call against the configured LLM.

        Includes automatic retry (3 attempts, exponential back-off) for
        transient errors such as rate limits or network hiccups.

        Returns
        -------
        AgentOutput
            Standardised output with result text and usage metadata.
        """
        messages = self._build_messages(user_message, context)
        start = time.perf_counter()

        # Lazy-init the LLM client on first call
        if self._client is None:
            self._client = self._initialize_llm_client()

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )

            elapsed_ms = (time.perf_counter() - start) * 1000
            choice = response.choices[0]

            # Extract token usage if available
            usage: Dict[str, Any] = {}
            if response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            logger.info(
                "Agent [%s] LLM call completed in %.1f ms — tokens=%s",
                self.agent_name,
                elapsed_ms,
                usage.get("total_tokens", "N/A"),
            )

            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.SUCCESS,
                result=choice.message.content or "",
                usage=usage,
                duration_ms=round(elapsed_ms, 2),
            )

        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "Agent [%s] LLM call failed after %.1f ms: %s",
                self.agent_name,
                elapsed_ms,
                str(exc),
            )
            raise  # Let tenacity handle retry

    # ── Public Contract ──────────────────────────────────────────────────

    @abstractmethod
    def execute(self, payload: AgentInput) -> AgentOutput:
        """
        Run the agent's core logic.

        Every concrete agent MUST implement this method.  It receives a
        standardised ``AgentInput`` and must return an ``AgentOutput``.

        Parameters
        ----------
        payload : AgentInput
            The task description, optional context, and metadata.

        Returns
        -------
        AgentOutput
            Standardised result with status, content, and usage info.
        """
        ...

    def safe_execute(self, payload: AgentInput) -> AgentOutput:
        """
        Execute the agent with top-level error handling.

        Catches any unhandled exception and wraps it in a proper
        ``AgentOutput`` with ``status=ERROR`` so the caller always
        receives a structured response.
        """
        start = time.perf_counter()
        try:
            return self.execute(payload)
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception("Agent [%s] unhandled error", self.agent_name)
            return AgentOutput(
                agent_name=self.agent_name,
                status=AgentStatus.ERROR,
                result="",
                error=str(exc),
                duration_ms=round(elapsed_ms, 2),
            )

    # ── Utility ───────────────────────────────────────────────────────────

    def _parse_json(self, raw: str) -> Dict[str, Any]:
        """Safely parse JSON from LLM output, stripping markdown formatting.

        Handles common LLM quirks:
        - Conversational text before/after the JSON block
        - Markdown fences (```json ... ```)
        - Trailing commas before } or ] (very common with Gemini)
        - Literal newlines inside JSON string values (Gemini code snippets)
        """
        # Step 1: Extract the JSON object by finding the first { and last }
        start = raw.find("{")
        end = raw.rfind("}")

        if start != -1 and end != -1 and end > start:
            cleaned = raw[start:end + 1]
        else:
            cleaned = raw.strip()

        # Step 2: Fix trailing commas — e.g.  ,} or ,]
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

        # Step 3: Try parsing as-is first
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Step 4: Escape literal newlines inside JSON string values.
        # Gemini often puts multi-line code snippets with real newlines
        # inside JSON strings, which is invalid JSON.
        fixed_lines = []
        in_string = False
        escape_next = False
        for ch in cleaned:
            if escape_next:
                fixed_lines.append(ch)
                escape_next = False
                continue
            if ch == '\\':
                fixed_lines.append(ch)
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                fixed_lines.append(ch)
                continue
            if in_string and ch == '\n':
                fixed_lines.append('\\n')
                continue
            if in_string and ch == '\r':
                fixed_lines.append('\\r')
                continue
            if in_string and ch == '\t':
                fixed_lines.append('\\t')
                continue
            fixed_lines.append(ch)

        cleaned = "".join(fixed_lines)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("JSON parse error on LLM output: %s", exc)
            return {"error": "Invalid JSON returned by LLM", "raw": raw}

    # ── Repr ─────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__}(name={self.agent_name!r}, "
            f"model={self.model!r})>"
        )
