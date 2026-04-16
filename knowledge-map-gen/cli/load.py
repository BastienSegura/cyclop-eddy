from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from ..graph_file_utils import infer_file_mode, parse_graph_edge_line
from .defaults import (
    DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    DEFAULT_FIXTURE_GRAPH_PATH,
    DEFAULT_RAW_ARTIFACT_PATH,
)
from .errors import UsageError
from .output import CommandOutput, CommandResult
from .session import BrainCliSession, ParsedGraphCache, ParsedGraphData


SOURCE_ALIASES: dict[str, Path] = {
    "cleaned": DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    "raw": DEFAULT_RAW_ARTIFACT_PATH,
    "fixture": DEFAULT_FIXTURE_GRAPH_PATH,
}


@dataclass(frozen=True)
class LoadTarget:
    source_path: Path
    source_alias: str


def _sort_labels(labels: set[str]) -> tuple[str, ...]:
    return tuple(sorted(labels, key=lambda value: (value.casefold(), value)))


def resolve_load_target(raw_value: str) -> LoadTarget:
    normalized = raw_value.strip()
    if not normalized:
        raise UsageError("load requires exactly one source argument. Usage: load <cleaned|raw|fixture|path>")

    alias_path = SOURCE_ALIASES.get(normalized.casefold())
    if alias_path is not None:
        return LoadTarget(source_path=alias_path, source_alias=normalized.casefold())

    return LoadTarget(source_path=Path(normalized), source_alias="custom")


def build_graph_cache(target: LoadTarget) -> ParsedGraphCache:
    path = target.source_path
    if not path.exists():
        raise UsageError(f"Cannot load graph source because the file does not exist: {path}")
    if not path.is_file():
        raise UsageError(f"Cannot load graph source because the path is not a file: {path}")

    lines = path.read_text(encoding="utf-8").splitlines()
    mode = infer_file_mode(path, lines)

    parsed_edge_count = 0
    malformed_line_count = 0
    unique_edges: set[tuple[str, str]] = set()
    nodes: set[str] = set()
    adjacency_sets: dict[str, set[str]] = defaultdict(set)
    parent_sets: dict[str, set[str]] = defaultdict(set)

    for raw_line in lines:
        if not raw_line.strip():
            continue

        parsed = parse_graph_edge_line(raw_line, mode)
        if not parsed:
            malformed_line_count += 1
            continue

        parent_label, child_label, _line_mode = parsed
        parsed_edge_count += 1
        unique_edges.add((parent_label, child_label))
        nodes.add(parent_label)
        nodes.add(child_label)
        adjacency_sets[parent_label].add(child_label)
        adjacency_sets.setdefault(child_label, set())
        parent_sets[child_label].add(parent_label)
        parent_sets.setdefault(parent_label, set())

    sorted_nodes = _sort_labels(nodes)
    sorted_edges = tuple(sorted(unique_edges, key=lambda item: ((item[0].casefold(), item[0]), (item[1].casefold(), item[1]))))
    adjacency = {node: _sort_labels(adjacency_sets.get(node, set())) for node in sorted_nodes}
    parents = {node: _sort_labels(parent_sets.get(node, set())) for node in sorted_nodes}

    payload = ParsedGraphData(
        mode=mode,
        line_count=len(lines),
        parsed_edge_count=parsed_edge_count,
        unique_edge_count=len(sorted_edges),
        malformed_line_count=malformed_line_count,
        nodes=sorted_nodes,
        edges=sorted_edges,
        adjacency=adjacency,
        parents=parents,
    )
    return ParsedGraphCache(
        source_path=path,
        source_alias=target.source_alias,
        mode=mode,
        payload=payload,
    )


def render_load_text(cache: ParsedGraphCache) -> str:
    payload = cache.payload
    node_count = len(payload.nodes) if payload is not None else 0
    edge_count = payload.unique_edge_count if payload is not None else 0
    malformed_line_count = payload.malformed_line_count if payload is not None else 0
    lines = [
        "Loaded graph source:",
        f"- Path: {cache.source_path}",
        f"- Alias: {cache.source_alias}",
        f"- Mode: {cache.mode}",
        f"- Nodes: {node_count}",
        f"- Edges: {edge_count}",
        f"- Malformed lines skipped: {malformed_line_count}",
    ]
    return "\n".join(lines)


def handle_load(session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    if len(args) != 1:
        raise UsageError("load requires exactly one source argument. Usage: load <cleaned|raw|fixture|path>")

    target = resolve_load_target(args[0])
    cache = build_graph_cache(target)

    session.active_graph_source_path = cache.source_path
    session.active_graph_source_alias = cache.source_alias
    session.active_graph_mode = cache.mode
    session.parsed_graph_cache = cache

    return CommandResult(output=CommandOutput(text=render_load_text(cache)))
