"""
Repository Chat Agent
=====================
Conversational RAG agent that answers questions about the codebase.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.agents.base_agent import BaseAgent
from app.agents.prompts.chat_prompts import (
    CHAT_AGENT_SYSTEM,
    CHAT_AGENT_USER,
    CHAT_REWRITE_SYSTEM,
    CHAT_REWRITE_USER,
)
from app.agents.search_agent import EmbeddingSearchAgent
from app.models.chat_models import (
    ChatQueryRequest,
    ChatQueryResponse,
    Citation,
)
from app.models.schemas import AgentInput, AgentOutput, AgentStatus

logger = logging.getLogger(__name__)


class RepoChatAgent(BaseAgent):
    """
    RAG-based chat assistant that answers queries using codebase vectors.
    """

    def __init__(
        self,
        *,
        search_agent: Optional[EmbeddingSearchAgent] = None,
        collection_name: Optional[str] = None,
        top_k: int = 5,
        **kwargs,
    ) -> None:
        super().__init__(
            agent_name="RepoChatAgent",
            system_prompt=CHAT_AGENT_SYSTEM,
            **kwargs,
        )
        self._search_agent = search_agent or EmbeddingSearchAgent(
            collection_name=collection_name
        )
        self._top_k = top_k

    def execute(self, payload: AgentInput) -> AgentOutput:
        """
        Execute chat flow. Not heavily used directly, prefer `process_chat`
        for strong typing.
        """
        req = ChatQueryRequest(
            session_id=payload.metadata.get("session_id", "default"),
            query_text=payload.task,
        )
        history = payload.metadata.get("history_text", "")
        response = self.process_chat(req, history)
        return AgentOutput(
            agent_name=self.agent_name,
            status=AgentStatus.SUCCESS,
            result=response.answer,
            metadata=response.model_dump(mode="json"),
        )

    def process_chat(
        self,
        request: ChatQueryRequest,
        history_text: str = "",
    ) -> ChatQueryResponse:
        """
        End-to-end chat processing: rewrite query, search, and generate answer.
        """
        # Step A: Rewrite query if history exists
        search_query = self._rewrite_query(request.query_text, history_text)
        logger.info("Original query: '%s', Search query: '%s'", request.query_text, search_query)

        # Step B: Retrieve context chunks
        # Convert file_filters list to a single directory/file search if needed
        # For this phase, we just rely on standard semantic search. Filtering could
        # be added to VectorStoreService in future iterations.
        chunks = self._search_agent.search_codebase(
            query=search_query,
            top_k=self._top_k,
        )

        if not chunks:
            # Fallback immediately if absolutely no chunks
            return ChatQueryResponse(
                session_id=request.session_id,
                answer="I cannot find sufficient code context in the repository to answer this accurately.",
                citations=[],
                retrieved_chunks_used=0,
                confidence_score=0.0
            )

        # Build chunks string
        chunks_text = "\n\n".join(
            f"--- Chunk {i+1} ---\n"
            f"File: {c.file_path}\n"
            f"Entity: {c.entity_name} ({c.chunk_type})\n"
            f"Lines: {c.start_line}-{c.end_line}\n"
            f"Code:\n{c.code_content}\n"
            for i, c in enumerate(chunks)
        )

        # Step C & D: RAG Generate Answer
        user_msg = CHAT_AGENT_USER.format(
            history=history_text or "No prior history.",
            code_chunks=chunks_text,
            query=request.query_text,
        )

        llm_out = self._call_llm(user_msg)
        parsed = self._parse_json(llm_out.result)

        answer_text = parsed.get(
            "answer", 
            "I encountered an error formatting my response."
        )
        
        # Parse citations safely
        citations = []
        for cite in parsed.get("citations", []):
            try:
                citations.append(
                    Citation(
                        file_path=cite.get("file_path", ""),
                        start_line=cite.get("start_line", 0),
                        end_line=cite.get("end_line", 0),
                        entity_name=cite.get("entity_name", ""),
                    )
                )
            except Exception:
                pass

        # Calculate basic confidence based on missing context phrase
        conf = 1.0
        if "cannot find sufficient code context" in answer_text.lower():
            conf = 0.0

        return ChatQueryResponse(
            session_id=request.session_id,
            answer=answer_text,
            citations=citations,
            retrieved_chunks_used=len(chunks),
            confidence_score=conf
        )

    def _rewrite_query(self, query: str, history_text: str) -> str:
        """Use the LLM to rewrite contextual queries."""
        if not history_text.strip():
            return query
            
        original_prompt = self.system_prompt
        self.system_prompt = CHAT_REWRITE_SYSTEM
        try:
            user_msg = CHAT_REWRITE_USER.format(history=history_text, query=query)
            output = self._call_llm(user_msg)
            rewritten = output.result.strip()
            # If the LLM wrapped it in quotes or failed, just return the query
            if not rewritten or len(rewritten) > 200:
                return query
            return rewritten
        except Exception as e:
            logger.warning("Query rewrite failed, using original: %s", e)
            return query
        finally:
            self.system_prompt = original_prompt


