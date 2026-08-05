"""
Tests — Repository Parser (Phase 2)
=====================================
Validates the file scanner, code parser, parser agent, and API endpoint.
"""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.code_models import ChunkType, SupportedLanguage
from app.services.code_parser import parse_file
from app.services.repo_scanner import RepositoryScanner

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
#  Fixtures
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture()
def sample_repo(tmp_path: Path) -> Path:
    """Create a tiny sample repository for testing."""
    # Python file
    py_file = tmp_path / "sample.py"
    py_file.write_text(
        textwrap.dedent('''\
            """Sample module docstring."""

            import os
            import sys

            def greet(name: str) -> str:
                """Return a greeting."""
                return f"Hello, {name}"

            class Calculator:
                """A simple calculator."""

                def add(self, a: int, b: int) -> int:
                    """Add two numbers."""
                    return a + b

                def subtract(self, a: int, b: int) -> int:
                    """Subtract b from a."""
                    return a - b
        '''),
        encoding="utf-8",
    )

    # JS file
    js_file = tmp_path / "utils.js"
    js_file.write_text(
        textwrap.dedent('''\
            /**
             * Add two numbers.
             */
            function add(a, b) {
                return a + b;
            }

            class StringHelper {
                capitalize(str) {
                    return str.charAt(0).toUpperCase() + str.slice(1);
                }
            }
        '''),
        encoding="utf-8",
    )

    # Directory that should be ignored
    git_dir = tmp_path / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("ignore me", encoding="utf-8")

    node_dir = tmp_path / "node_modules"
    node_dir.mkdir()
    (node_dir / "pkg.js").write_text("ignore me too", encoding="utf-8")

    return tmp_path


# ═══════════════════════════════════════════════════════════════════════════════
#  Repository Scanner Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestRepositoryScanner:
    """Tests for the file traversal utility."""

    def test_scan_finds_source_files(self, sample_repo: Path):
        scanner = RepositoryScanner(sample_repo)
        files = scanner.scan()
        paths = {f.relative_path for f in files}
        assert "sample.py" in paths
        assert "utils.js" in paths

    def test_scan_ignores_git_directory(self, sample_repo: Path):
        scanner = RepositoryScanner(sample_repo)
        files = scanner.scan()
        for f in files:
            assert ".git" not in f.relative_path

    def test_scan_ignores_node_modules(self, sample_repo: Path):
        scanner = RepositoryScanner(sample_repo)
        files = scanner.scan()
        for f in files:
            assert "node_modules" not in f.relative_path

    def test_scan_filters_by_extension(self, sample_repo: Path):
        scanner = RepositoryScanner(sample_repo, extensions={".py"})
        files = scanner.scan()
        assert len(files) == 1
        assert files[0].extension == ".py"

    def test_scan_invalid_path_raises(self):
        with pytest.raises(FileNotFoundError):
            RepositoryScanner("/nonexistent/path/abc123")

    def test_scanned_file_has_size(self, sample_repo: Path):
        scanner = RepositoryScanner(sample_repo)
        files = scanner.scan()
        for f in files:
            assert f.size_bytes > 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Code Parser Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestCodeParserPython:
    """Tests for Python AST-based parsing."""

    def test_parses_function(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        func_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.FUNCTION
        ]
        assert any(c.entity_name == "greet" for c in func_chunks)

    def test_parses_class(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        class_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.CLASS
        ]
        assert any(c.entity_name == "Calculator" for c in class_chunks)

    def test_parses_methods(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        method_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.METHOD
        ]
        names = {c.entity_name for c in method_chunks}
        assert "add" in names
        assert "subtract" in names

    def test_methods_have_parent_class(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        method_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.METHOD
        ]
        for mc in method_chunks:
            assert mc.parent_entity == "Calculator"

    def test_extracts_docstrings(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        func_chunks = [
            c for c in result.chunks
            if c.chunk_type == ChunkType.FUNCTION and c.entity_name == "greet"
        ]
        assert len(func_chunks) == 1
        assert func_chunks[0].docstring == "Return a greeting."

    def test_extracts_imports(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        import_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.IMPORT_BLOCK
        ]
        assert len(import_chunks) == 1
        assert "import os" in import_chunks[0].code_content

    def test_chunk_ids_are_unique(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        ids = [c.chunk_id for c in result.chunks]
        assert len(ids) == len(set(ids))

    def test_language_detected_correctly(self, sample_repo: Path):
        result = parse_file(sample_repo / "sample.py", sample_repo)
        assert result.language == SupportedLanguage.PYTHON


class TestCodeParserGeneric:
    """Tests for regex/bracket-based parsing (JS)."""

    def test_parses_js_function(self, sample_repo: Path):
        result = parse_file(sample_repo / "utils.js", sample_repo)
        func_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.FUNCTION
        ]
        assert any(c.entity_name == "add" for c in func_chunks)

    def test_parses_js_class(self, sample_repo: Path):
        result = parse_file(sample_repo / "utils.js", sample_repo)
        class_chunks = [
            c for c in result.chunks if c.chunk_type == ChunkType.CLASS
        ]
        assert any(c.entity_name == "StringHelper" for c in class_chunks)

    def test_js_language_detected(self, sample_repo: Path):
        result = parse_file(sample_repo / "utils.js", sample_repo)
        assert result.language == SupportedLanguage.JAVASCRIPT


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestParseEndpoint:
    """Tests for POST /api/v1/repository/parse."""

    def test_parse_valid_repo(self, sample_repo: Path):
        response = client.post(
            "/api/v1/repository/parse",
            json={"repository_path": str(sample_repo)},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_files_parsed"] == 2
        assert data["total_chunks"] > 0
        assert "python" in data["languages_detected"]
        assert "javascript" in data["languages_detected"]

    def test_parse_returns_file_summaries(self, sample_repo: Path):
        response = client.post(
            "/api/v1/repository/parse",
            json={"repository_path": str(sample_repo)},
        )
        data = response.json()
        assert len(data["files_summary"]) == 2
        for fs in data["files_summary"]:
            assert "file_path" in fs
            assert "chunk_count" in fs
            assert fs["chunk_count"] > 0

    def test_parse_invalid_path_returns_404(self):
        response = client.post(
            "/api/v1/repository/parse",
            json={"repository_path": "/nonexistent/repo/path"},
        )
        assert response.status_code == 404

    def test_parse_with_extension_filter(self, sample_repo: Path):
        response = client.post(
            "/api/v1/repository/parse",
            json={
                "repository_path": str(sample_repo),
                "file_extensions": [".py"],
            },
        )
        data = response.json()
        assert data["total_files_parsed"] == 1
        assert data["languages_detected"] == ["python"]

    def test_parse_response_has_duration(self, sample_repo: Path):
        response = client.post(
            "/api/v1/repository/parse",
            json={"repository_path": str(sample_repo)},
        )
        data = response.json()
        assert data["parse_duration_ms"] is not None
        assert data["parse_duration_ms"] > 0
