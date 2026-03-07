from __future__ import annotations

from dataclasses import dataclass

from .errors import UsageError
from .load import LoadTarget, build_graph_cache
from .session import BrainCliSession, ParsedGraphCache


MATCH_TYPE_ORDER = {
    "exact": 0,
    "prefix": 1,
    "substring": 2,
}


@dataclass(frozen=True)
class LabelMatch:
    label: str
    match_type: str


def ensure_session_graph_cache(session: BrainCliSession) -> ParsedGraphCache:
    cache = session.parsed_graph_cache
    if cache is not None and cache.source_path == session.active_graph_source_path:
        return cache

    target = LoadTarget(
        source_path=session.active_graph_source_path,
        source_alias=session.active_graph_source_alias,
    )
    try:
        cache = build_graph_cache(target)
    except UsageError as exc:
        raise UsageError(
            "No active graph source is loaded or loadable. "
            f"Run `load` or fix the active source path first. Details: {exc}"
        ) from exc

    session.active_graph_mode = cache.mode
    session.parsed_graph_cache = cache
    return cache


def search_labels(labels: tuple[str, ...], query: str, limit: int) -> list[LabelMatch]:
    normalized_query = query.casefold()
    if not normalized_query:
        raise UsageError("search requires a non-empty query. Usage: search <query> [--limit <n>] [--json]")
    if limit < 1:
        raise UsageError("search --limit must be >= 1")

    matches: list[LabelMatch] = []
    for label in labels:
        normalized_label = label.casefold()
        if normalized_label == normalized_query:
            match_type = "exact"
        elif normalized_label.startswith(normalized_query):
            match_type = "prefix"
        elif normalized_query in normalized_label:
            match_type = "substring"
        else:
            continue

        matches.append(LabelMatch(label=label, match_type=match_type))

    matches.sort(key=lambda item: (MATCH_TYPE_ORDER[item.match_type], item.label.casefold(), item.label))
    return matches[:limit]
