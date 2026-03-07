from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .defaults import (
    DEFAULT_ACTIVE_GRAPH_MODE,
    DEFAULT_ACTIVE_GRAPH_SOURCE_ALIAS,
    DEFAULT_ACTIVE_GRAPH_SOURCE_PATH,
)
from .output import OutputMode


@dataclass
class ParsedGraphCache:
    source_path: Path
    source_alias: str
    mode: str
    payload: Any | None = None


@dataclass
class BrainCliSession:
    active_graph_source_path: Path = field(default_factory=lambda: DEFAULT_ACTIVE_GRAPH_SOURCE_PATH)
    active_graph_source_alias: str = DEFAULT_ACTIVE_GRAPH_SOURCE_ALIAS
    active_graph_mode: str = DEFAULT_ACTIVE_GRAPH_MODE
    parsed_graph_cache: ParsedGraphCache | None = None
    current_concept: str | None = None
    output_mode: OutputMode = OutputMode.TEXT

