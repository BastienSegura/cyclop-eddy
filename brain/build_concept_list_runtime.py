from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from typing import Any, Callable

from concept_identity import canonical_concept_key, canonical_concept_label

from build_concept_list_prompting import build_prompt, parse_concepts, validate_candidate
from build_concept_list_state import (
    DEFAULT_EXCLUDE_STRATEGY,
    DEFAULT_LOCAL_EXCLUDE_LIMIT,
    build_new_state,
    load_generation_state,
    normalize_exclude_list,
    normalize_exclude_local_limit,
    normalize_exclude_strategy,
    prepare_resumed_state,
    save_generation_state,
    sync_output_from_state,
    write_to_file,
)

MAX_REJECTION_EVENTS = 2000


def print_progress(
    state: dict[str, Any],
    printer: Callable[..., None] = print,
) -> None:
    generated = int(state["generated_concepts"])
    estimated = int(state["estimated_max_generated_concepts"])
    prompts_done = int(state["processed_prompt_calls"])
    prompts_estimated = int(state["estimated_max_prompt_calls"])
    queue_size = len(state["queue"])
    elapsed = float(state["elapsed_seconds"])
    rate = generated / elapsed if elapsed > 0 else 0.0
    accepted = int(state.get("accepted_candidates", generated))
    rejected = int(state.get("rejected_candidates", 0))

    generated_pct = (generated / estimated * 100.0) if estimated else 0.0
    prompts_pct = (prompts_done / prompts_estimated * 100.0) if prompts_estimated else 0.0

    printer(
        "[progress] "
        f"concepts={generated}/{estimated} ({generated_pct:.2f}%) | "
        f"prompts={prompts_done}/{prompts_estimated} ({prompts_pct:.2f}%) | "
        f"accepted={accepted} | rejected={rejected} | "
        f"queue={queue_size} | speed={rate:.2f} concepts/s",
        flush=True,
    )


def build_parent_children_index(raw_edges: list[Any]) -> dict[str, list[str]]:
    by_parent: dict[str, list[str]] = {}
    seen_by_parent: dict[str, set[str]] = {}

    for raw_edge in raw_edges:
        edge = str(raw_edge)
        if ":" not in edge:
            continue
        raw_parent, raw_child = edge.split(":", 1)
        parent = canonical_concept_label(raw_parent)
        child = canonical_concept_label(raw_child)
        parent_key = canonical_concept_key(parent)
        child_key = canonical_concept_key(child)
        if not parent_key or not child_key:
            continue

        parent_seen = seen_by_parent.setdefault(parent_key, set())
        if child_key in parent_seen:
            continue

        parent_seen.add(child_key)
        by_parent.setdefault(parent_key, []).append(child)

    return by_parent


def add_parent_child_relation(
    parent_children_index: dict[str, list[str]],
    parent_concept: str,
    child_concept: str,
) -> None:
    parent_key = canonical_concept_key(parent_concept)
    child_label = canonical_concept_label(child_concept)
    child_key = canonical_concept_key(child_label)
    if not parent_key or not child_key:
        return

    children = parent_children_index.setdefault(parent_key, [])
    existing_keys = {canonical_concept_key(item) for item in children}
    if child_key not in existing_keys:
        children.append(child_label)


def build_prompt_exclude_list(
    parent_concept: str,
    state: dict[str, Any],
    parent_children_index: dict[str, list[str]],
) -> list[str] | None:
    strategy = normalize_exclude_strategy(state.get("exclude_strategy"))

    if strategy == "none":
        return None

    if strategy == "global":
        excludes = normalize_exclude_list(list(state.get("exclude_list", [])))
        return excludes or None

    parent_key = canonical_concept_key(parent_concept)
    local_excludes: list[str] = [canonical_concept_label(parent_concept)]
    if parent_key:
        local_excludes.extend(parent_children_index.get(parent_key, []))
    local_excludes = normalize_exclude_list(local_excludes)
    local_limit = normalize_exclude_local_limit(state.get("exclude_local_limit"))
    local_excludes = local_excludes[:local_limit]
    return local_excludes or None


def generate_concept_graph(
    root_concept: str,
    concept_list_length: int,
    max_depth: int,
    output_path: str = "memory/runtime/concept_list.txt",
    state_file: str = "memory/runtime/concept_list_state.json",
    resume: bool = False,
    exclude_strategy: str | None = None,
    exclude_local_limit: int | None = None,
    *,
    prompt_func: Callable[[str], str] = None,
    save_state_func: Callable[[str, dict[str, Any]], None] = save_generation_state,
    load_state_func: Callable[[str], dict[str, Any]] = load_generation_state,
    write_file_func: Callable[[str, str, str], None] = write_to_file,
    monotonic_func: Callable[[], float],
    printer: Callable[..., None] = print,
) -> None:
    if max_depth < 1:
        raise ValueError("max_depth must be >= 1")
    if concept_list_length < 1:
        raise ValueError("concept_list_length must be >= 1")
    if prompt_func is None:
        raise ValueError("prompt_func must be provided")

    requested_exclude_strategy = (
        normalize_exclude_strategy(exclude_strategy) if exclude_strategy is not None else None
    )
    requested_exclude_local_limit = (
        normalize_exclude_local_limit(exclude_local_limit) if exclude_local_limit is not None else None
    )

    if resume:
        state_path = Path(state_file)
        if not state_path.exists():
            raise SystemExit(f"Cannot resume: state file not found at '{state_file}'")
        state = load_state_func(state_file)
        state = prepare_resumed_state(
            state=state,
            root_concept=root_concept,
            output_path=output_path,
            requested_exclude_strategy=requested_exclude_strategy,
            requested_exclude_local_limit=requested_exclude_local_limit,
        )
        output_path = str(state["output_path"])
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        printer(f"Resuming generation from '{state_file}'", flush=True)
    else:
        state = build_new_state(
            root_concept,
            concept_list_length,
            max_depth,
            output_path,
            exclude_strategy=requested_exclude_strategy or DEFAULT_EXCLUDE_STRATEGY,
            exclude_local_limit=(
                requested_exclude_local_limit
                if requested_exclude_local_limit is not None
                else DEFAULT_LOCAL_EXCLUDE_LIMIT
            ),
        )
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(state_file).parent.mkdir(parents=True, exist_ok=True)
        save_state_func(state_file, state)
        printer(f"Starting generation. Checkpoint file: '{state_file}'", flush=True)

    printer(
        "[config] "
        f"exclude_strategy={state['exclude_strategy']} "
        f"exclude_local_limit={state['exclude_local_limit']}",
        flush=True,
    )

    seen_normalized: set[str] = set(state["seen_normalized"])
    queue: deque[dict[str, Any]] = deque(state["queue"])
    run_started_at = monotonic_func() - float(state.get("elapsed_seconds", 0.0))
    sync_output_from_state(state, write_file_func=write_file_func)
    parent_children_index = build_parent_children_index(list(state.get("edges", [])))

    def persist_state() -> None:
        state["queue"] = list(queue)
        state["seen_normalized"] = sorted(seen_normalized)
        state["elapsed_seconds"] = monotonic_func() - run_started_at
        save_state_func(state_file, state)

    def mark_seen(concept: str) -> bool:
        canonical_label = canonical_concept_label(concept)
        normalized = canonical_concept_key(canonical_label)
        if not normalized or normalized in seen_normalized:
            return False

        seen_normalized.add(normalized)
        state["exclude_list"].append(canonical_label)
        return True

    def register_rejection(
        parent_concept: str,
        depth: int,
        candidate: str,
        reason: str,
        prompt_rejection_counts: dict[str, int],
    ) -> None:
        prompt_rejection_counts[reason] = prompt_rejection_counts.get(reason, 0) + 1
        state["rejected_candidates"] = int(state["rejected_candidates"]) + 1

        rejection_counts = state["rejection_counts"]
        rejection_counts[reason] = int(rejection_counts.get(reason, 0)) + 1

        rejection_events = state["rejection_events"]
        if len(rejection_events) < MAX_REJECTION_EVENTS:
            rejection_events.append(
                {
                    "prompt_call": int(state["processed_prompt_calls"]) + 1,
                    "parent_concept": parent_concept,
                    "depth": depth,
                    "candidate": candidate,
                    "reason": reason,
                }
            )
        else:
            state["rejection_events_dropped"] = int(state["rejection_events_dropped"]) + 1

    try:
        while queue:
            current = queue[0]
            concept = str(current["concept"])
            depth = int(current["depth"])
            new_edges: list[str] = []
            prompt_rejection_counts: dict[str, int] = {}

            if depth >= int(state["max_depth"]):
                queue.popleft()
                persist_state()
                continue

            prompt_excludes = build_prompt_exclude_list(concept, state, parent_children_index)
            prompt = build_prompt(concept, int(state["concept_list_length"]), prompt_excludes)
            response = prompt_func(prompt)
            response_concepts = parse_concepts(response)
            accepted_count = 0

            child_depth = depth + 1
            for candidate in response_concepts:
                cleaned_candidate, rejection_reason = validate_candidate(candidate, concept)
                if rejection_reason:
                    register_rejection(
                        parent_concept=concept,
                        depth=depth,
                        candidate=candidate,
                        reason=rejection_reason,
                        prompt_rejection_counts=prompt_rejection_counts,
                    )
                    continue

                assert cleaned_candidate is not None
                if accepted_count >= int(state["concept_list_length"]):
                    register_rejection(
                        parent_concept=concept,
                        depth=depth,
                        candidate=cleaned_candidate,
                        reason="over_limit",
                        prompt_rejection_counts=prompt_rejection_counts,
                    )
                    continue

                if not mark_seen(cleaned_candidate):
                    register_rejection(
                        parent_concept=concept,
                        depth=depth,
                        candidate=cleaned_candidate,
                        reason="duplicate_seen",
                        prompt_rejection_counts=prompt_rejection_counts,
                    )
                    continue
                add_parent_child_relation(parent_children_index, concept, cleaned_candidate)
                new_edges.append(f"{concept}: {cleaned_candidate}")
                queue.append({"concept": cleaned_candidate, "depth": child_depth})
                accepted_count += 1

            if new_edges:
                state["edges"].extend(new_edges)
                state["generated_concepts"] += len(new_edges)
                state["accepted_candidates"] = int(state["accepted_candidates"]) + len(new_edges)

            queue.popleft()
            state["processed_prompt_calls"] += 1
            persist_state()

            if new_edges:
                write_file_func(
                    "\n".join(new_edges) + "\n",
                    output_path=state["output_path"],
                    mode="append",
                )
            rejected_in_prompt = sum(prompt_rejection_counts.values())
            if prompt_rejection_counts:
                sorted_reasons = sorted(prompt_rejection_counts.items(), key=lambda item: (-item[1], item[0]))
                reason_block = ", ".join(f"{reason}={count}" for reason, count in sorted_reasons)
            else:
                reason_block = "none"
            printer(
                "[prompt] "
                f"parent={json.dumps(concept)} depth={depth} "
                f"exclude_strategy={state['exclude_strategy']} prompt_excludes={len(prompt_excludes or [])} "
                f"candidates={len(response_concepts)} accepted={accepted_count} "
                f"rejected={rejected_in_prompt} reasons={reason_block}",
                flush=True,
            )
            print_progress(state, printer=printer)

    except KeyboardInterrupt:
        persist_state()
        printer(
            "\nGeneration paused by user. "
            f"Resume with: python brain/build_concept_list.py --resume --state-file {state_file}",
            flush=True,
        )
        return

    Path(state_file).unlink(missing_ok=True)
    printer(
        "Generation complete. "
        f"Total concepts generated: {state['generated_concepts']}. "
        f"Output: {state['output_path']}",
        flush=True,
    )
