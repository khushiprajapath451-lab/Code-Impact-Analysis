"""
Git Diff Parsing Utility
========================
Parses raw unified git diffs into structured file changes.
"""

import re
from typing import List

from app.models.review_models import FileChange


class GitDiffParser:
    """Service to parse unified git diffs into structured models."""

    # Regex patterns for unified diff format
    FILE_DIFF_START_RE = re.compile(r"^diff --git a/(.+?) b/(.+)$")
    OLD_FILE_RE = re.compile(r"^---\s+(.+)$")
    NEW_FILE_RE = re.compile(r"^\+\+\+\s+(.+)$")
    HUNK_HEADER_RE = re.compile(
        r"^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(?: (.*))?$"
    )

    def parse(self, raw_diff: str) -> List[FileChange]:
        """
        Parse a raw unified diff string into a list of FileChange objects.
        """
        changes: List[FileChange] = []
        current_change = None
        current_new_line = 0

        lines = raw_diff.splitlines()
        for line in lines:
            # Check for start of a new file diff
            file_match = self.FILE_DIFF_START_RE.match(line)
            if file_match:
                if current_change:
                    changes.append(current_change)
                current_change = FileChange(
                    old_path=file_match.group(1),
                    new_path=file_match.group(2),
                )
                continue

            if not current_change:
                continue

            current_change.diff_hunks += line + "\n"

            # Check for old/new path overrides (handles /dev/null correctly)
            if line.startswith("--- "):
                old_path = line[4:].strip()
                if old_path.startswith("a/"):
                    old_path = old_path[2:]
                current_change.old_path = old_path
                continue

            if line.startswith("+++ "):
                new_path = line[4:].strip()
                if new_path.startswith("b/"):
                    new_path = new_path[2:]
                current_change.new_path = new_path
                continue

            # Check for hunk header
            hunk_match = self.HUNK_HEADER_RE.match(line)
            if hunk_match:
                current_new_line = int(hunk_match.group(2))
                entity_context = hunk_match.group(3)
                if entity_context:
                    # Very rough heuristic to grab method/class names from hunk context
                    cleaned = entity_context.strip()
                    if cleaned and cleaned not in current_change.modified_entities:
                        current_change.modified_entities.append(cleaned)
                continue

            # Check for added/deleted lines inside a hunk
            if line.startswith("+") and not line.startswith("+++"):
                current_change.added_lines.append(current_new_line)
                current_new_line += 1
            elif line.startswith("-") and not line.startswith("---"):
                # We don't track the exact old line number accurately here,
                # but we note a deletion occurred.
                current_change.deleted_lines.append(0) 
            elif not line.startswith("\\"):  # Handle \ No newline at end of file
                current_new_line += 1

        if current_change:
            changes.append(current_change)

        return changes
