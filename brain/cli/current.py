from __future__ import annotations

from typing import Sequence

from .errors import UsageError
from .output import CommandOutput, CommandResult
from .session import BrainCliSession


def build_current_payload(session: BrainCliSession) -> dict[str, object]:
    parsed_cache = session.parsed_graph_cache
    parsed_payload = parsed_cache.payload if parsed_cache is not None else None

    return {
        "active_graph_source_path": str(session.active_graph_source_path),
        "active_graph_source_alias": session.active_graph_source_alias,
        "active_graph_mode": session.active_graph_mode,
        "current_concept": session.current_concept,
        "parsed_graph_cache_loaded": parsed_cache is not None,
        "parsed_graph_cache_source_path": str(parsed_cache.source_path) if parsed_cache else None,
        "parsed_graph_cache_node_count": len(parsed_payload.nodes) if parsed_payload is not None else None,
        "parsed_graph_cache_edge_count": parsed_payload.unique_edge_count if parsed_payload is not None else None,
        "output_mode": session.output_mode.value,
    }


def render_current_text(payload: dict[str, object]) -> str:
    lines = [
        "Current session:",
        f"- Active graph source: {payload['active_graph_source_path']}",
        f"- Active graph alias: {payload['active_graph_source_alias']}",
        f"- Active graph mode: {payload['active_graph_mode']}",
        f"- Current concept: {payload['current_concept'] or '(none selected)'}",
        f"- Parsed graph cache: {'loaded' if payload['parsed_graph_cache_loaded'] else 'not loaded'}",
    ]

    if payload["parsed_graph_cache_loaded"]:
        lines.append(f"- Cached node count: {payload['parsed_graph_cache_node_count']}")
        lines.append(f"- Cached edge count: {payload['parsed_graph_cache_edge_count']}")

    return "\n".join(lines)


def handle_current(session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    json_only = False
    if args:
        if tuple(args) != ("--json",):
            raise UsageError("current accepts no arguments except --json. Usage: current [--json]")
        json_only = True

    payload = build_current_payload(session)
    if json_only:
        return CommandResult(output=CommandOutput(data=payload))

    return CommandResult(output=CommandOutput(text=render_current_text(payload), data=payload))
