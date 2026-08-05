"""
Repository Scanner
==================
Recursively walks a local directory tree and returns source files
that match the target programming-language extensions while
ignoring standard non-code directories.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Optional, Set

from app.models.code_models import EXTENSION_LANGUAGE_MAP

logger = logging.getLogger(__name__)

# ─── Default Ignore Patterns ─────────────────────────────────────────────────

DEFAULT_IGNORE_DIRS: Set[str] = {
    # Version control
    ".git",
    ".svn",
    ".hg",
    # Dependencies
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    # Build outputs
    "build",
    "dist",
    "target",
    "out",
    ".next",
    ".nuxt",
    # IDE
    ".idea",
    ".vscode",
    # Misc
    ".eggs",
    "*.egg-info",
    ".tox",
    "coverage",
    "htmlcov",
    ".terraform",
}

DEFAULT_IGNORE_FILES: Set[str] = {
    ".DS_Store",
    "Thumbs.db",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}

# Default extensions derived from the language map
DEFAULT_EXTENSIONS: Set[str] = set(EXTENSION_LANGUAGE_MAP.keys())


# ─── Data Class ──────────────────────────────────────────────────────────────


class ScannedFile:
    """Represents a discovered source file in the repository."""

    __slots__ = ("absolute_path", "relative_path", "extension", "size_bytes")

    def __init__(
        self,
        absolute_path: Path,
        relative_path: str,
        extension: str,
        size_bytes: int,
    ) -> None:
        self.absolute_path = absolute_path
        self.relative_path = relative_path
        self.extension = extension
        self.size_bytes = size_bytes

    def __repr__(self) -> str:
        return f"ScannedFile({self.relative_path!r})"


# ─── Scanner ─────────────────────────────────────────────────────────────────


class RepositoryScanner:
    """
    Scans a local directory tree for source files.

    Parameters
    ----------
    root_path : str | Path
        The root directory to scan.
    extensions : set[str] | None
        File extensions to include (e.g. {".py", ".js"}).
        Defaults to all supported language extensions.
    ignore_dirs : set[str] | None
        Directory names to skip.  Merged with the built-in defaults.
    max_file_size_bytes : int
        Skip files larger than this threshold (default 1 MB).
    """

    def __init__(
        self,
        root_path: str | Path,
        *,
        extensions: Optional[Set[str]] = None,
        ignore_dirs: Optional[Set[str]] = None,
        max_file_size_bytes: int = 1_048_576,  # 1 MB
    ) -> None:
        self.root = Path(root_path).resolve()
        if not self.root.is_dir():
            raise FileNotFoundError(
                f"Repository path does not exist or is not a directory: {self.root}"
            )

        self.extensions = extensions or DEFAULT_EXTENSIONS
        self.ignore_dirs = DEFAULT_IGNORE_DIRS | (ignore_dirs or set())
        self.max_file_size_bytes = max_file_size_bytes

    # ── Public API ────────────────────────────────────────────────────────

    def scan(self) -> List[ScannedFile]:
        """
        Walk the directory tree and return all matching source files.

        Returns
        -------
        list[ScannedFile]
            Sorted list of discovered source files.
        """
        discovered: List[ScannedFile] = []

        for dirpath, dirnames, filenames in os.walk(self.root, topdown=True):
            # Prune ignored directories in-place so os.walk skips them
            dirnames[:] = [
                d for d in dirnames
                if d not in self.ignore_dirs and not d.startswith(".")
            ]

            for filename in filenames:
                if filename in DEFAULT_IGNORE_FILES:
                    continue

                ext = Path(filename).suffix.lower()
                if ext not in self.extensions:
                    continue

                filepath = Path(dirpath) / filename

                try:
                    size = filepath.stat().st_size
                except OSError:
                    logger.warning("Cannot stat file: %s", filepath)
                    continue

                if size > self.max_file_size_bytes:
                    logger.debug(
                        "Skipping oversized file (%d bytes): %s",
                        size,
                        filepath,
                    )
                    continue

                relative = filepath.relative_to(self.root).as_posix()
                discovered.append(
                    ScannedFile(
                        absolute_path=filepath,
                        relative_path=relative,
                        extension=ext,
                        size_bytes=size,
                    )
                )

        discovered.sort(key=lambda f: f.relative_path)
        logger.info(
            "Repository scan complete: %d files found in %s",
            len(discovered),
            self.root,
        )
        return discovered
