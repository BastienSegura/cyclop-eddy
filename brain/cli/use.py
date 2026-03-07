from __future__ import annotations

from typing import Sequence

from .errors import UsageError
from .graph_lookup import ensure_session_graph_cache, resolve_exact_label, search_labels
from .output import CommandOutput, CommandResult
from .session import BrainCliSession

DEFAULT_USE_SUGGESTION_LIMIT = 5


def _parse_use_args(args: Sequence[str]) -> str:
    concept = " ".join(part.strip() for part in args if part.strip()).strip()
    if not concept:
        raise UsageError("use requires a concept. Usage: use <concept>")
    return concept


def _render_resolution_error(concept: str, suggestions: list[tuple[str, str]]) -> str:
    lines = [f'No exact concept match for "{concept}".']
    if suggestions:
        lines.append("Did you mean:")
        for label, match_type in suggestions:
            lines.append(f"- {label} [{match_type}]")
        return "\n".join(lines)

    lines.append(f'Run `search {concept}` to inspect the active graph.')
    return "\n".join(lines)


def build_use_payload(session: BrainCliSession, concept: str) -> dict[str, object]:
    cache = ensure_session_graph_cache(session)
    payload = cache.payload
    labels = payload.nodes if payload is not None else tuple()
    matched_label = resolve_exact_label(labels, concept)

    if matched_label is None:
        suggestions = search_labels(labels, concept, DEFAULT_USE_SUGGESTION_LIMIT)
        raise UsageError(
            _render_resolution_error(
                concept,
                [(match.label, match.match_type) for match in suggestions],
            )
        )

    session.current_concept = matched_label

    return {
        "current_concept": matched_label,
        "active_graph_source_path": str(session.active_graph_source_path),
        "active_graph_source_alias": session.active_graph_source_alias,
        "active_graph_mode": session.active_graph_mode,
    }


def render_use_text(payload: dict[str, object]) -> str:
    return f'Current concept set to "{payload["current_concept"]}".'


def handle_use(session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    concept = _parse_use_args(args)
    payload = build_use_payload(session, concept)
    return CommandResult(output=CommandOutput(text=render_use_text(payload), data=payload))
