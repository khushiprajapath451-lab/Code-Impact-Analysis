"""
Test Gap & Coverage Analysis Engine
===================================
Analyzes source code modifications and checks against testing conventions.
"""

import os
from typing import List, Set


class TestCoverageAnalyzer:
    """Service to deduce testing context from source files."""

    def __init__(self):
        pass

    def guess_test_file_path(self, source_file_path: str) -> str:
        """
        Given a source file, guess its conventional test file path.
        Handles basic Python and Java/TS conventions.
        """
        directory, filename = os.path.split(source_file_path)
        name, ext = os.path.splitext(filename)

        if ext == ".py":
            test_filename = f"test_{name}{ext}"
            # Standard python convention often puts tests in a tests/ folder
            if directory.startswith("app/") or directory.startswith("app\\"):
                # Rough heuristic: replace app/ with tests/
                test_dir = directory.replace("app", "tests", 1)
                return os.path.join(test_dir, test_filename).replace("\\", "/")
            return os.path.join(directory, test_filename).replace("\\", "/")
            
        elif ext in [".java", ".ts", ".js"]:
            # Java/JS often use NameTest or name.test.js
            if ext == ".java":
                test_filename = f"{name}Test{ext}"
            else:
                test_filename = f"{name}.test{ext}"
            return os.path.join(directory, test_filename).replace("\\", "/")
            
        return ""

    def get_evaluated_files(self, changed_files: List[str]) -> List[str]:
        """Filter out non-source files from the diff."""
        source_exts = {".py", ".java", ".js", ".ts", ".go", ".cs"}
        return [f for f in changed_files if any(f.endswith(ext) for ext in source_exts)]
