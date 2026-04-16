from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

from concept_identity import canonical_concept_key, canonical_concept_label

SUPPORTED_EXCLUDE_STRATEGIES = ("global", "local", "none")
DEFAULT_EXCLUDE_STRATEGY = "local"
DEFAULT_LOCAL_EXCLUDE_LIMIT = 64
STATE_VERSION = 5
SUPPORTED_STATE_VERSIONS = (1, 2, 3, 4, 5)


def write_to_file(content: str, output_path: str, mode: str = "truncate") -> None:
    with open(output_path, "w" if mode == "truncate" else "a", encoding="utf-8") as file:
        file.write(content)


def estimate_max_generated_concepts(concept_list_length: int, max_depth: int) -> int:
    return sum(concept_list_length ** depth for depth in range(1, max_depth + 1))


def estimate_max_prompt_calls(concept_list_length: int, max_depth: int) -> int:
    return sum(concept_list_length ** depth for depth in range(max_depth))


def save_generation_state(state_file: str, state: dict[str, Any]) -> None:
    Path(state_file).write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_generation_state(state_file: str) -> dict[str, Any]:
    return json.loads(Path(state_file).read_text(encoding="utf-8"))


def sync_output_from_state(
    state: dict[str, Any],
    write_file_func: Callable[[str, str, str], None] = write_to_file,
) -> None:
    output_lines = state.get("edges", [])
    payload = "\n".join(output_lines)
    if payload:
        payload += "\n"
    write_file_func(payload, output_path=state["output_path"], mode="truncate")


def normalize_exclude_strategy(raw_strategy: Any) -> str:
    strategy = str(raw_strategy or "").strip().lower()
    if strategy in SUPPORTED_EXCLUDE_STRATEGIES:
        return strategy
    return DEFAULT_EXCLUDE_STRATEGY


def normalize_exclude_local_limit(raw_limit: Any) -> int:
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return DEFAULT_LOCAL_EXCLUDE_LIMIT
    return max(1, limit)


def build_new_state(
    root_concept: str,
    concept_list_length: int,
    max_depth: int,
    output_path: str,
    exclude_strategy: str,
    exclude_local_limit: int,
) -> dict[str, Any]:
    root_label = canonical_concept_label(root_concept)
    normalized_root = canonical_concept_key(root_label)
    return {
        "version": STATE_VERSION,
        "root_concept": root_label,
        "concept_list_length": concept_list_length,
        "max_depth": max_depth,
        "output_path": output_path,
        "exclude_strategy": normalize_exclude_strategy(exclude_strategy),
        "exclude_local_limit": normalize_exclude_local_limit(exclude_local_limit),
        "queue": [{"concept": root_label, "depth": 0}],
        "exclude_list": [root_label],
        "seen_normalized": [normalized_root],
        "edges": [],
        "generated_concepts": 0,
        "accepted_candidates": 0,
        "rejected_candidates": 0,
        "rejection_counts": {},
        "rejection_events": [],
        "rejection_events_dropped": 0,
        "processed_prompt_calls": 0,
        "estimated_max_generated_concepts": estimate_max_generated_concepts(concept_list_length, max_depth),
        "estimated_max_prompt_calls": estimate_max_prompt_calls(concept_list_length, max_depth),
        "elapsed_seconds": 0.0,
    }


def normalize_exclude_list(raw_excludes: list[Any]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for raw_value in raw_excludes:
        label = canonical_concept_label(str(raw_value))
        key = canonical_concept_key(label)
        if not key or key in seen:
            continue
        seen.add(key)
        normalized.append(label)

    return normalized


def normalize_queue(raw_queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_queue: list[dict[str, Any]] = []
    seen: set[str] = set()

    for raw_item in raw_queue:
        label = canonical_concept_label(str(raw_item.get("concept", "")))
        key = canonical_concept_key(label)
        if not key or key in seen:
            continue
        seen.add(key)
        normalized_queue.append({"concept": label, "depth": int(raw_item.get("depth", 0))})

    return normalized_queue


def migrate_output_path(output_path: str) -> str:
    migrated_output_path = output_path
    if migrated_output_path.startswith("src/"):
        candidate = migrated_output_path.replace("src/", "knowledge-map-gen/map-store/runtime/", 1)
        if Path(candidate).exists() or not Path(migrated_output_path).exists():
            migrated_output_path = candidate

    if migrated_output_path.startswith("memory/runtime/"):
        candidate = migrated_output_path.replace("memory/runtime/", "knowledge-map-gen/map-store/runtime/", 1)
        if Path(candidate).exists() or not Path(migrated_output_path).exists():
            migrated_output_path = candidate

    if migrated_output_path.startswith("memory/fixtures/"):
        candidate = migrated_output_path.replace("memory/fixtures/", "knowledge-map-gen/map-store/fixtures/", 1)
        if Path(candidate).exists() or not Path(migrated_output_path).exists():
            migrated_output_path = candidate

    if migrated_output_path.startswith("memory/"):
        candidate = migrated_output_path.replace("memory/", "knowledge-map-gen/map-store/runtime/", 1)
        if Path(candidate).exists() or not Path(migrated_output_path).exists():
            migrated_output_path = candidate

    if (
        migrated_output_path.startswith("knowledge-map-gen/map-store/")
        and not migrated_output_path.startswith("knowledge-map-gen/map-store/runtime/")
        and not migrated_output_path.startswith("knowledge-map-gen/map-store/fixtures/")
    ):
        candidate = migrated_output_path.replace("knowledge-map-gen/map-store/", "knowledge-map-gen/map-store/runtime/", 1)
        if Path(candidate).exists() or not Path(migrated_output_path).exists():
            migrated_output_path = candidate

    return migrated_output_path


def prepare_resumed_state(
    state: dict[str, Any],
    root_concept: str,
    output_path: str,
    requested_exclude_strategy: str | None,
    requested_exclude_local_limit: int | None,
) -> dict[str, Any]:
    if state.get("version") not in SUPPORTED_STATE_VERSIONS:
        raise SystemExit("Unsupported state file version.")

    state.setdefault("edges", [])
    state.setdefault("generated_concepts", len(state["edges"]))
    state.setdefault("accepted_candidates", int(state["generated_concepts"]))
    state.setdefault("rejected_candidates", 0)
    state.setdefault("rejection_counts", {})
    state.setdefault("rejection_events", [])
    state.setdefault("rejection_events_dropped", 0)
    state.setdefault("exclude_list", [state.get("root_concept", root_concept)])
    state.setdefault("seen_normalized", [])
    state.setdefault("queue", [])

    state["root_concept"] = canonical_concept_label(str(state.get("root_concept", root_concept)))
    if not state["root_concept"]:
        state["root_concept"] = canonical_concept_label(root_concept)

    state["exclude_list"] = normalize_exclude_list(list(state["exclude_list"]))
    if not state["exclude_list"]:
        state["exclude_list"] = [state["root_concept"]]

    state["queue"] = normalize_queue(list(state["queue"]))
    if not state["queue"]:
        state["queue"] = [{"concept": state["root_concept"], "depth": 0}]

    seen_normalized: set[str] = set()
    for raw_seen in state["seen_normalized"]:
        key = canonical_concept_key(str(raw_seen))
        if key:
            seen_normalized.add(key)
    for exclude in state["exclude_list"]:
        key = canonical_concept_key(exclude)
        if key:
            seen_normalized.add(key)
    state["seen_normalized"] = sorted(seen_normalized)

    raw_state_exclude_strategy = state.get("exclude_strategy")
    if raw_state_exclude_strategy is None:
        state_exclude_strategy = requested_exclude_strategy or DEFAULT_EXCLUDE_STRATEGY
    else:
        state_exclude_strategy = normalize_exclude_strategy(raw_state_exclude_strategy)
        if requested_exclude_strategy is not None and requested_exclude_strategy != state_exclude_strategy:
            raise SystemExit(
                "Cannot resume with a different exclude strategy. "
                f"State uses '{state_exclude_strategy}'."
            )

    raw_state_exclude_local_limit = state.get("exclude_local_limit")
    if raw_state_exclude_local_limit is None:
        state_exclude_local_limit = (
            requested_exclude_local_limit
            if requested_exclude_local_limit is not None
            else DEFAULT_LOCAL_EXCLUDE_LIMIT
        )
    else:
        state_exclude_local_limit = normalize_exclude_local_limit(raw_state_exclude_local_limit)
        if (
            requested_exclude_local_limit is not None
            and requested_exclude_local_limit != state_exclude_local_limit
        ):
            raise SystemExit(
                "Cannot resume with a different exclude local limit. "
                f"State uses '{state_exclude_local_limit}'."
            )

    state["exclude_strategy"] = state_exclude_strategy
    state["exclude_local_limit"] = state_exclude_local_limit
    state["version"] = STATE_VERSION
    state["output_path"] = migrate_output_path(str(state.get("output_path", output_path)))
    return state
