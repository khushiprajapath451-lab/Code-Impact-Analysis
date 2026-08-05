"""
Tests — Chat Assistant (Phase 5)
================================
Validates memory management, chat prompt adherence (via mocks),
and API endpoints.
"""

import uuid
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.chat_models import ChatMessage, ChatQueryRequest, Role
from app.models.schemas import AgentOutput, AgentStatus
from app.services.chat_memory import ConversationalMemoryService

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  Conversational Memory Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestConversationalMemory:
    """Test sliding window and basic memory functions."""

    def test_add_and_retrieve_message(self):
        memory = ConversationalMemoryService()
        session_id = str(uuid.uuid4())
        msg = ChatMessage(session_id=session_id, role=Role.USER, content="Hello")
        
        memory.add_message(msg)
        history = memory.get_history(session_id)
        
        assert len(history) == 1
        assert history[0].content == "Hello"
        assert history[0].role == Role.USER

    def test_sliding_window_truncation(self):
        # Set small window (2 turns = 4 messages max)
        memory = ConversationalMemoryService(max_history_turns=2)
        session_id = "test_truncate"
        
        for i in range(6):  # Add 6 messages
            memory.add_message(
                ChatMessage(
                    session_id=session_id, 
                    role=Role.USER if i % 2 == 0 else Role.ASSISTANT, 
                    content=f"Message {i}"
                )
            )
            
        history = memory.get_history(session_id)
        
        assert len(history) == 4
        # Should keep the last 4 messages (2 through 5)
        assert history[0].content == "Message 2"
        assert history[-1].content == "Message 5"

    def test_get_history_as_text(self):
        memory = ConversationalMemoryService()
        session_id = "test_text"
        memory.add_message(ChatMessage(session_id=session_id, role=Role.USER, content="Q1"))
        memory.add_message(ChatMessage(session_id=session_id, role=Role.ASSISTANT, content="A1"))
        
        text = memory.get_history_as_text(session_id)
        assert "User: Q1" in text
        assert "Assistant: A1" in text

    def test_clear_session(self):
        memory = ConversationalMemoryService()
        session_id = "test_clear"
        memory.add_message(ChatMessage(session_id=session_id, role=Role.USER, content="Hello"))
        
        assert len(memory.get_history(session_id)) == 1
        
        cleared = memory.clear_session(session_id)
        assert cleared is True
        assert len(memory.get_history(session_id)) == 0
        
        # Second clear should return False
        assert memory.clear_session(session_id) is False


# ═══════════════════════════════════════════════════════════════════════════════
#  RepoChatAgent Tests (Deterministic Mocks)
# ═══════════════════════════════════════════════════════════════════════════════

class MockEmbeddingSearchAgent:
    """Mocks the vector search agent to return predictable chunks."""
    
    def search_codebase(self, query: str, top_k: int) -> List[Any]:
        from app.models.search_models import SearchResultItem
        
        if "missing" in query.lower():
            return []
            
        return [
            SearchResultItem(
                chunk_id="chunk1",
                file_path="app/auth.py",
                chunk_type="class",
                entity_name="AuthManager",
                code_content="def login(): pass",
                language="python",
                start_line=1,
                end_line=2,
                similarity=0.9
            )
        ]

class MockRepoChatAgent:
    """Mocks the LLM calls in RepoChatAgent to return deterministic JSON."""
    
    def _call_llm(self, user_message: str) -> AgentOutput:
        # Check if it's the rewrite prompt or the answer prompt
        if "Rewritten Query:" in user_message:
            return AgentOutput(
                agent_name="MockAgent",
                status=AgentStatus.SUCCESS,
                result="rewritten query text"
            )
            
        # Answer prompt
        if "missing" in user_message.lower():
            return AgentOutput(
                agent_name="MockAgent",
                status=AgentStatus.SUCCESS,
                result='{"answer": "I cannot find sufficient code context in the repository to answer this accurately."}'
            )
            
        return AgentOutput(
            agent_name="MockAgent",
            status=AgentStatus.SUCCESS,
            result='{"answer": "Here is the answer.", "citations": [{"file_path": "app/auth.py", "entity_name": "AuthManager", "start_line": 1, "end_line": 2}]}'
        )

def test_repo_chat_agent_process():
    from app.agents.chat_agent import RepoChatAgent
    
    agent = RepoChatAgent(search_agent=MockEmbeddingSearchAgent())
    # Monkey-patch the LLM call for deterministic testing
    mock = MockRepoChatAgent()
    agent._call_llm = mock._call_llm
    
    req = ChatQueryRequest(session_id="session1", query_text="how does auth work?")
    res = agent.process_chat(req)
    
    assert res.session_id == "session1"
    assert "Here is the answer" in res.answer
    assert len(res.citations) == 1
    assert res.citations[0].file_path == "app/auth.py"
    assert res.retrieved_chunks_used == 1
    assert res.confidence_score == 1.0


def test_repo_chat_agent_missing_context():
    from app.agents.chat_agent import RepoChatAgent
    
    agent = RepoChatAgent(search_agent=MockEmbeddingSearchAgent())
    # Monkey-patch
    mock = MockRepoChatAgent()
    agent._call_llm = mock._call_llm
    
    req = ChatQueryRequest(session_id="session2", query_text="missing feature")
    res = agent.process_chat(req)
    
    assert "cannot find sufficient code context" in res.answer.lower()
    assert len(res.citations) == 0
    assert res.retrieved_chunks_used == 0
    assert res.confidence_score == 0.0


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_chat_history_endpoints():
    session_id = "test_api_session"
    
    # 1. Clear it first just in case
    client.delete(f"/api/v1/chat/history/{session_id}")
    
    # 2. Get history (should be empty)
    res = client.get(f"/api/v1/chat/history/{session_id}")
    assert res.status_code == 200
    assert res.json() == []
    
    # 3. We'll skip the actual POST /chat in E2E since it calls a real LLM,
    # but we can manually add to memory to test the GET and DELETE
    from app.services.chat_memory import chat_memory
    chat_memory.add_message(ChatMessage(session_id=session_id, role=Role.USER, content="API Test"))
    
    # 4. Get history (should have 1)
    res = client.get(f"/api/v1/chat/history/{session_id}")
    assert res.status_code == 200
    assert len(res.json()) == 1
    
    # 5. Clear history
    res = client.delete(f"/api/v1/chat/history/{session_id}")
    assert res.status_code == 204
    
    # 6. Verify cleared
    res = client.get(f"/api/v1/chat/history/{session_id}")
    assert len(res.json()) == 0
    
    # 7. Clear again -> 404
    res = client.delete(f"/api/v1/chat/history/{session_id}")
    assert res.status_code == 404
