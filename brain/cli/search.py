from __future__ import annotations

from typing import Sequence

from .errors import UsageError
from .graph_lookup import ensure_session_graph_cache, search_labels
from .output import CommandOutput, CommandResult
from .session import BrainCliSession

DEFAULT_SEARCH_LIMIT = 10


def _parse_search_args(args: Sequence[str]) -> tuple[str, int, bool]:
    json_only = False
    limit = DEFAULT_SEARCH_LIMIT
    query_parts: list[str] = []

    index = 0
    while index < len(args):
        token = args[index]
        if token == "--json":
            json_only = True
            index += 1
            continue
        if token == "--limit":
            if index + 1 >= len(args):
                raise UsageError("search --limit requires a value. Usage: search <query> [--limit <n>] [--json]")
            try:
                limit = int(args[index + 1])
            except ValueError as exc:
                raise UsageError("search --limit must be an integer.") from exc
            index += 2
            continue

        query_parts.append(token)
        index += 1

    query = " ".join(part.strip() for part in query_parts if part.strip()).strip()
    if not query:
        raise UsageError("search requires a query. Usage: search <query> [--limit <n>] [--json]")

    return query, limit, json_only


def build_search_payload(session: BrainCliSession, query: str, limit: int) -> dict[str, object]:
    cache = ensure_session_graph_cache(session)
    payload = cache.payload
    matches = search_labels(payload.nodes if payload is not None else tuple(), query, limit)

    return {
        "query": query,
        "limit": limit,
        "active_graph_source_path": str(session.active_graph_source_path),
        "active_graph_source_alias": session.active_graph_source_alias,
        "active_graph_mode": session.active_graph_mode,
        "matches": [
            {
                "label": match.label,
                "match_type": match.match_type,
            }
            for match in matches
        ],
        "result_count": len(matches),
    }


def render_search_text(payload: dict[str, object]) -> str:
    query = payload["query"]
    matches = payload["matches"]

    lines = [f'Search results for "{query}" ({payload["result_count"]}):']
    if not matches:
        lines.append("- No matches found.")
        return "\n".join(lines)

    for match in matches:
        lines.append(f"- {match['label']} [{match['match_type']}]")

    return "\n".join(lines)


def handle_search(session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    query, limit, json_only = _parse_search_args(args)
    payload = build_search_payload(session, query, limit)

    if json_only:
        return CommandResult(output=CommandOutput(data=payload))

    return CommandResult(output=CommandOutput(text=render_search_text(payload), data=payload))
