"""
Conversational Memory Service
=============================
Maintains multi-turn chat context for the Repository Chat Assistant.
Uses an in-memory dictionary for simplicity in this phase, with a
sliding window to prevent token bloat.
"""

import threading
from typing import Dict, List, Optional

from app.models.chat_models import ChatMessage


class ConversationalMemoryService:
    """
    Thread-safe in-memory manager for chat sessions.
    Limits the history to a sliding window of the last N turns.
    """

    def __init__(self, max_history_turns: int = 5):
        self._memory: Dict[str, List[ChatMessage]] = {}
        self._lock = threading.RLock()
        self._max_history_turns = max_history_turns

    def add_message(self, message: ChatMessage) -> None:
        """Add a message to the session history, enforcing the sliding window."""
        with self._lock:
            if message.session_id not in self._memory:
                self._memory[message.session_id] = []
            
            history = self._memory[message.session_id]
            history.append(message)
            
            # A "turn" is usually a user message + assistant response (2 messages).
            # So max_history_turns * 2 is roughly the number of messages to keep.
            max_messages = self._max_history_turns * 2
            if len(history) > max_messages:
                # Keep the last max_messages
                self._memory[message.session_id] = history[-max_messages:]

    def get_history(self, session_id: str) -> List[ChatMessage]:
        """Retrieve the recent history for a session."""
        with self._lock:
            # Return a copy to prevent external mutation
            return list(self._memory.get(session_id, []))

    def clear_session(self, session_id: str) -> bool:
        """Clear memory for a given session. Returns True if existed."""
        with self._lock:
            if session_id in self._memory:
                del self._memory[session_id]
                return True
            return False

    def get_history_as_text(
        self, session_id: str, include_system: bool = False
    ) -> str:
        """
        Format the history into a single string for LLM injection.
        """
        history = self.get_history(session_id)
        if not history:
            return ""

        parts = []
        for msg in history:
            if not include_system and msg.role.value == "system":
                continue
            parts.append(f"{msg.role.value.capitalize()}: {msg.content}")

        return "\n\n".join(parts)


# Global instance for shared memory across requests
chat_memory = ConversationalMemoryService(max_history_turns=5)
