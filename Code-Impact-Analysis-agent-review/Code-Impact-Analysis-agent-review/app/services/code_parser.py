"""
Code Chunking & Parsing Service
================================
Parses raw source-file text into structured ``CodeChunk`` objects.

Strategy per language:
  - **Python**: Uses the built-in ``ast`` module for precise, tree-based
    extraction of classes, methods, functions, and their docstrings.
  - **Other languages** (JS/TS/Java): Uses a robust regex + indentation /
    bracket-matching heuristic to segment classes and functions.

Both strategies produce the same ``CodeChunk`` output model so the
downstream pipeline is language-agnostic.
"""

from __future__ import annotations

import ast
import hashlib
import logging
import re
from pathlib import Path
from typing import List, Optional

from app.models.code_models import (
    EXTENSION_LANGUAGE_MAP,
    ChunkType,
    CodeChunk,
    ParsedFile,
    SupportedLanguage,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  Public API
# ═══════════════════════════════════════════════════════════════════════════════


def parse_file(
    file_path: Path,
    repo_root: Path,
) -> ParsedFile:
    """
    Read a source file and break it into ``CodeChunk`` objects.

    Parameters
    ----------
    file_path : Path
        Absolute path to the source file.
    repo_root : Path
        Repository root used to compute relative paths.

    Returns
    -------
    ParsedFile
        Parsed file with its list of code chunks.
    """
    relative = file_path.relative_to(repo_root).as_posix()
    ext = file_path.suffix.lower()
    language = EXTENSION_LANGUAGE_MAP.get(ext, SupportedLanguage.UNKNOWN)

    try:
        source = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        logger.error("Failed to read file %s: %s", relative, exc)
        return ParsedFile(
            file_path=relative,
            language=language,
            total_lines=0,
            parse_errors=[f"Read error: {exc}"],
        )

    total_lines = source.count("\n") + 1
    errors: List[str] = []
    chunks: List[CodeChunk] = []

    try:
        if language == SupportedLanguage.PYTHON:
            chunks = _parse_python(source, relative, language)
        else:
            chunks = _parse_generic(source, relative, language)
    except Exception as exc:
        logger.warning("Parse error for %s: %s", relative, exc)
        errors.append(str(exc))

    # If no structured chunks were extracted, create a single module chunk
    if not chunks:
        chunks = [
            _make_chunk(
                file_path=relative,
                language=language,
                chunk_type=ChunkType.MODULE,
                entity_name=Path(relative).stem,
                code_content=source,
                start_line=1,
                end_line=total_lines,
            )
        ]

    return ParsedFile(
        file_path=relative,
        language=language,
        total_lines=total_lines,
        chunks=chunks,
        parse_errors=errors,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  Python Parser (AST-based)
# ═══════════════════════════════════════════════════════════════════════════════


def _parse_python(
    source: str,
    file_path: str,
    language: SupportedLanguage,
) -> List[CodeChunk]:
    """
    Parse Python source using the ``ast`` module.

    Extracts:
      - Module-level import blocks
      - Top-level functions
      - Classes and their methods (with parent tracking)
      - Docstrings and decorators
    """
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        logger.warning("AST parse failed for %s: %s", file_path, exc)
        raise

    lines = source.splitlines()
    chunks: List[CodeChunk] = []

    # ── Collect import block ──────────────────────────────────────────────
    import_lines = _extract_import_block(tree)
    if import_lines:
        start, end = import_lines
        chunks.append(
            _make_chunk(
                file_path=file_path,
                language=language,
                chunk_type=ChunkType.IMPORT_BLOCK,
                entity_name="imports",
                code_content="\n".join(lines[start - 1 : end]),
                start_line=start,
                end_line=end,
            )
        )

    # ── Walk top-level nodes ──────────────────────────────────────────────
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            chunks.append(
                _ast_function_to_chunk(node, lines, file_path, language)
            )

        elif isinstance(node, ast.ClassDef):
            # Class-level chunk
            class_chunk = _ast_class_to_chunk(node, lines, file_path, language)
            chunks.append(class_chunk)

            # Individual method chunks
            for item in ast.iter_child_nodes(node):
                if isinstance(item, ast.FunctionDef | ast.AsyncFunctionDef):
                    chunks.append(
                        _ast_function_to_chunk(
                            item,
                            lines,
                            file_path,
                            language,
                            parent_class=node.name,
                        )
                    )

    return chunks


def _extract_import_block(tree: ast.Module) -> Optional[tuple[int, int]]:
    """Return (start_line, end_line) for the contiguous import block."""
    import_lines: List[int] = []
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Import | ast.ImportFrom):
            import_lines.append(node.lineno)
            import_lines.append(node.end_lineno or node.lineno)
        elif import_lines:
            break  # stop at first non-import after imports started

    if not import_lines:
        return None
    return min(import_lines), max(import_lines)


def _ast_function_to_chunk(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    lines: List[str],
    file_path: str,
    language: SupportedLanguage,
    parent_class: Optional[str] = None,
) -> CodeChunk:
    """Convert an AST FunctionDef node to a CodeChunk."""
    start = node.lineno
    end = node.end_lineno or node.lineno
    # Include decorator lines
    if node.decorator_list:
        start = min(d.lineno for d in node.decorator_list)

    decorators = [
        ast.get_source_segment(
            "\n".join(lines), d
        ) or ""
        for d in node.decorator_list
    ]

    chunk_type = ChunkType.METHOD if parent_class else ChunkType.FUNCTION
    docstring = ast.get_docstring(node)

    return _make_chunk(
        file_path=file_path,
        language=language,
        chunk_type=chunk_type,
        entity_name=node.name,
        code_content="\n".join(lines[start - 1 : end]),
        start_line=start,
        end_line=end,
        docstring=docstring,
        parent_entity=parent_class,
        decorators=[d for d in decorators if d],
    )


def _ast_class_to_chunk(
    node: ast.ClassDef,
    lines: List[str],
    file_path: str,
    language: SupportedLanguage,
) -> CodeChunk:
    """Convert an AST ClassDef node to a CodeChunk."""
    start = node.lineno
    end = node.end_lineno or node.lineno
    if node.decorator_list:
        start = min(d.lineno for d in node.decorator_list)

    decorators = [
        ast.get_source_segment(
            "\n".join(lines), d
        ) or ""
        for d in node.decorator_list
    ]
    docstring = ast.get_docstring(node)

    return _make_chunk(
        file_path=file_path,
        language=language,
        chunk_type=ChunkType.CLASS,
        entity_name=node.name,
        code_content="\n".join(lines[start - 1 : end]),
        start_line=start,
        end_line=end,
        docstring=docstring,
        decorators=[d for d in decorators if d],
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  Generic Parser (Regex + Bracket Matching)
# ═══════════════════════════════════════════════════════════════════════════════

# Patterns for JS/TS/Java class and function declarations
_PATTERNS = {
    "class": re.compile(
        r"^(?:export\s+)?(?:abstract\s+)?(?:public\s+)?class\s+(\w+)",
        re.MULTILINE,
    ),
    "interface": re.compile(
        r"^(?:export\s+)?interface\s+(\w+)",
        re.MULTILINE,
    ),
    "function": re.compile(
        r"^(?:export\s+)?(?:async\s+)?(?:public|private|protected|static|\s)*"
        r"function\s+(\w+)\s*\(",
        re.MULTILINE,
    ),
    "arrow_const": re.compile(
        r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(",
        re.MULTILINE,
    ),
    "method_java": re.compile(
        r"^\s+(?:public|private|protected)\s+(?:static\s+)?(?:[\w<>\[\]]+)\s+(\w+)\s*\(",
        re.MULTILINE,
    ),
}


def _parse_generic(
    source: str,
    file_path: str,
    language: SupportedLanguage,
) -> List[CodeChunk]:
    """
    Parse JS/TS/Java source using regex pattern matching and bracket counting.

    For each detected entity, we find its opening brace and count
    matching braces to determine the end of the block.
    """
    lines = source.splitlines()
    chunks: List[CodeChunk] = []
    claimed_ranges: List[tuple[int, int]] = []  # Track already-extracted ranges

    # Detect classes / interfaces first, then functions
    for pattern_name, pattern in _PATTERNS.items():
        for match in pattern.finditer(source):
            entity_name = match.group(1)
            match_start = match.start()

            # Determine the line number
            start_line = source[:match_start].count("\n") + 1

            # Find the block extent via brace matching
            end_line = _find_block_end(lines, start_line - 1)
            if end_line is None:
                end_line = min(start_line + 20, len(lines))

            # Skip if this range overlaps with an already-claimed range
            if _overlaps(start_line, end_line, claimed_ranges):
                continue

            # Map pattern → ChunkType
            if pattern_name == "class":
                chunk_type = ChunkType.CLASS
            elif pattern_name == "interface":
                chunk_type = ChunkType.INTERFACE
            elif pattern_name == "method_java":
                chunk_type = ChunkType.METHOD
            else:
                chunk_type = ChunkType.FUNCTION

            # Extract JSDoc / Javadoc if present above the declaration
            docstring = _extract_block_comment(lines, start_line - 1)

            code = "\n".join(lines[start_line - 1 : end_line])
            chunks.append(
                _make_chunk(
                    file_path=file_path,
                    language=language,
                    chunk_type=chunk_type,
                    entity_name=entity_name,
                    code_content=code,
                    start_line=start_line,
                    end_line=end_line,
                    docstring=docstring,
                )
            )
            claimed_ranges.append((start_line, end_line))

    # Sort by start line
    chunks.sort(key=lambda c: c.start_line)
    return chunks


def _find_block_end(lines: List[str], start_idx: int) -> Optional[int]:
    """
    Starting from ``start_idx``, find the closing brace that matches
    the first opening brace.  Returns the 1-indexed line number.
    """
    depth = 0
    found_open = False

    for i in range(start_idx, len(lines)):
        for ch in lines[i]:
            if ch == "{":
                depth += 1
                found_open = True
            elif ch == "}":
                depth -= 1

            if found_open and depth == 0:
                return i + 1  # 1-indexed

    return None


def _overlaps(
    start: int,
    end: int,
    ranges: List[tuple[int, int]],
) -> bool:
    """Check if [start, end] overlaps with any existing range."""
    for rs, re_ in ranges:
        if start <= re_ and end >= rs:
            return True
    return False


def _extract_block_comment(lines: List[str], decl_idx: int) -> Optional[str]:
    """
    Look for a ``/** ... */`` or ``/* ... */`` comment block immediately
    above the declaration line.
    """
    comment_lines: List[str] = []
    idx = decl_idx - 1
    while idx >= 0:
        stripped = lines[idx].strip()
        if stripped.endswith("*/"):
            # Walk upward to find the opening
            while idx >= 0:
                comment_lines.insert(0, lines[idx].strip())
                if lines[idx].strip().startswith("/*"):
                    break
                idx -= 1
            break
        elif stripped.startswith("//"):
            comment_lines.insert(0, stripped)
            idx -= 1
        else:
            break

    if comment_lines:
        return "\n".join(comment_lines)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════════════════


def _make_chunk(
    *,
    file_path: str,
    language: SupportedLanguage,
    chunk_type: ChunkType,
    entity_name: str,
    code_content: str,
    start_line: int,
    end_line: int,
    docstring: Optional[str] = None,
    parent_entity: Optional[str] = None,
    decorators: Optional[List[str]] = None,
) -> CodeChunk:
    """Factory helper that builds a ``CodeChunk`` with a deterministic ID."""
    chunk_id = _generate_chunk_id(file_path, entity_name, start_line)
    return CodeChunk(
        chunk_id=chunk_id,
        file_path=file_path,
        language=language,
        chunk_type=chunk_type,
        entity_name=entity_name,
        code_content=code_content,
        start_line=start_line,
        end_line=end_line,
        docstring=docstring,
        parent_entity=parent_entity,
        decorators=decorators or [],
    )


def _generate_chunk_id(file_path: str, entity_name: str, start_line: int) -> str:
    """
    Create a short, deterministic ID from the chunk's identity triple.

    Format: ``<8-char-hash>`` derived from ``file_path:entity_name:start_line``.
    """
    raw = f"{file_path}:{entity_name}:{start_line}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]
