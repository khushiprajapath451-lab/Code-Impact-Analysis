"""
Interactive Chat API Router
===========================
Endpoints for conversational codebase RAG chat.
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException, status

from app.agents.chat_agent import RepoChatAgent
from app.models.chat_models import (
    ChatMessage,
    ChatQueryRequest,
    ChatQueryResponse,
    Role,
)
from app.services.chat_memory import chat_memory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask the codebase a question",
)
async def query_codebase(request: ChatQueryRequest) -> ChatQueryResponse:
    """
    Process a natural language question against the indexed codebase.
    Maintains conversational history via session_id.
    """
    try:
        # Get history text before adding current message (for rewriting logic)
        history_text = chat_memory.get_history_as_text(request.session_id)
        
        # Add user query to memory
        user_msg = ChatMessage(
            session_id=request.session_id,
            role=Role.USER,
            content=request.query_text,
        )
        chat_memory.add_message(user_msg)

        # Run Agent
        agent = RepoChatAgent()
        response = agent.process_chat(request, history_text)

        # Add assistant response to memory
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role=Role.ASSISTANT,
            content=response.answer,
            citations=response.citations,
        )
        chat_memory.add_message(assistant_msg)

        return response

    except Exception as exc:
        logger.exception("Chat query failed for session %s", request.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat agent error: {str(exc)}"
        )


@router.get(
    "/history/{session_id}",
    response_model=List[ChatMessage],
    summary="Get chat session history",
)
async def get_history(session_id: str) -> List[ChatMessage]:
    """Retrieve the conversation history for a given session."""
    return chat_memory.get_history(session_id)


@router.delete(
    "/history/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear chat session memory",
)
async def clear_history(session_id: str):
    """Clear memory for a given session."""
    cleared = chat_memory.clear_session(session_id)
    if not cleared:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found in active memory."
        )
