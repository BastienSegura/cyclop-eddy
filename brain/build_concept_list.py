"""
Build a concept graph with Ollama.

How to run
----------
1. Start a new generation:
   python brain/build_concept_list.py \
     --root-concept "Computer Science" \
     --concept-list-length 25 \
     --max-depth 3 \
     --output memory/runtime/concept_list.txt \
     --state-file memory/runtime/concept_list_state.json

2. Resume after interruption (Ctrl+C):
   python brain/build_concept_list.py --resume --state-file memory/runtime/concept_list_state.json

What this script provides
-------------------------
- Breadth-first concept expansion with configurable depth.
- Real-time progress estimation during generation.
- Persistent checkpointing so runs can be resumed safely.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import deque
from pathlib import Path
from typing import Any

import requests
from concept_identity import (
    canonical_concept_key,
    canonical_concept_label,
    concept_word_count,
    has_leading_formatting_marker,
    is_meta_concept_text,
)

BASE_URL = "http://localhost:11434"
MODEL = "llama3:8b"

DEFAULTS = {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "num_predict": 512,
    "num_ctx": 4096,
}

MAX_CONCEPT_WORDS = 4
MAX_REJECTION_EVENTS = 2000
SUPPORTED_EXCLUDE_STRATEGIES = ("global", "local", "none")
DEFAULT_EXCLUDE_STRATEGY = "local"
DEFAULT_LOCAL_EXCLUDE_LIMIT = 64


def _post(route: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Send a POST request to Ollama and return parsed JSON."""
    url = f"{BASE_URL}{route}"
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError as exc:
        raise SystemExit(
            "Cannot reach Ollama. Is it running? Try: `ollama serve`"
        ) from exc


def simple_prompt(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULTS,
    }
    result = _post("/api/generate", payload)
    return str(result["response"])


def write_to_file(content: str, output_path: str, mode: str = "truncate") -> None:
    with open(output_path, "w" if mode == "truncate" else "a", encoding="utf-8") as file:
        file.write(content)


def build_prompt(
    root_concept: str,
    concept_list_length: int,
    exclude_list: list[str] | None = None,
) -> str:
    exclude_block = ""
    if exclude_list:
        formatted_excludes = "\n".join([f"  - {concept}" for concept in exclude_list])
        exclude_block = f"""
    * Exclude any concept already listed below:
{formatted_excludes}
    """

    return f"""
    You are an expert knowledge cartographer.

    Core concept: **{root_concept}**

    Task: Identify the most semantically close and structurally related concepts to this core concept.

    Constraints:
    * Return exactly **{concept_list_length}** concepts.
    * Concepts must be directly related (first-order proximity).
    * Avoid examples, explanations, commentary, or formatting.
    * Avoid duplicates or near-synonyms of the same idea.
    * Prefer canonical academic or industry-standard concept names.
    * Each concept must be 1–4 words maximum.
    {exclude_block}

    Output format:
    * Return ONLY a plain list.
    * One concept per line.
    * No numbering.
    * No additional text before or after the list.
    """


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


def _normalize_concept(concept: str) -> str:
    return canonical_concept_key(concept)


def _count_words(concept: str) -> int:
    return concept_word_count(concept)


def _is_meta_candidate(concept: str) -> bool:
    return is_meta_concept_text(concept)


def validate_candidate(candidate: str, parent_concept: str) -> tuple[str | None, str | None]:
    raw_candidate = candidate.strip()
    if not raw_candidate:
        return None, "malformed_empty"

    if has_leading_formatting_marker(raw_candidate):
        return None, "malformed_formatting"

    concept = canonical_concept_label(raw_candidate)
    if not concept:
        return None, "malformed_empty"

    if ":" in concept:
        return None, "malformed_colon"

    if _is_meta_candidate(concept):
        return None, "meta_instruction"

    word_count = _count_words(concept)
    if word_count > MAX_CONCEPT_WORDS:
        return None, "malformed_word_count"

    if _normalize_concept(concept) == _normalize_concept(parent_concept):
        return None, "self_reference"

    return concept, None


def parse_concepts(response: str) -> list[str]:
    concepts: list[str] = []

    for raw_concept in response.split("\n"):
        concept = raw_concept.strip()
        if not concept:
            continue

        concepts.append(concept)

    return concepts


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


def sync_output_from_state(state: dict[str, Any]) -> None:
    output_lines = state.get("edges", [])
    payload = "\n".join(output_lines)
    if payload:
        payload += "\n"
    write_to_file(payload, output_path=state["output_path"], mode="truncate")


def print_progress(state: dict[str, Any]) -> None:
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

    print(
        "[progress] "
        f"concepts={generated}/{estimated} ({generated_pct:.2f}%) | "
        f"prompts={prompts_done}/{prompts_estimated} ({prompts_pct:.2f}%) | "
        f"accepted={accepted} | rejected={rejected} | "
        f"queue={queue_size} | speed={rate:.2f} concepts/s",
        flush=True,
    )


def build_new_state(
    root_concept: str,
    concept_list_length: int,
    max_depth: int,
    output_path: str,
    exclude_strategy: str,
    exclude_local_limit: int,
) -> dict[str, Any]:
    root_label = canonical_concept_label(root_concept)
    normalized_root = _normalize_concept(root_label)
    return {
        "version": 5,
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
) -> None:
    if max_depth < 1:
        raise ValueError("max_depth must be >= 1")
    if concept_list_length < 1:
        raise ValueError("concept_list_length must be >= 1")

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
        state = load_generation_state(state_file)
        if state.get("version") not in (1, 2, 3, 4, 5):
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
            if (
                requested_exclude_strategy is not None
                and requested_exclude_strategy != state_exclude_strategy
            ):
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
        state["version"] = 5

        resumed_output_path = state.get("output_path", output_path)
        if resumed_output_path.startswith("src/"):
            migrated_output_path = resumed_output_path.replace("src/", "memory/", 1)
            if Path(migrated_output_path).exists() or not Path(resumed_output_path).exists():
                resumed_output_path = migrated_output_path
        if (
            resumed_output_path.startswith("memory/")
            and not resumed_output_path.startswith("memory/runtime/")
            and not resumed_output_path.startswith("memory/fixtures/")
        ):
            migrated_output_path = resumed_output_path.replace("memory/", "memory/runtime/", 1)
            if Path(migrated_output_path).exists() or not Path(resumed_output_path).exists():
                resumed_output_path = migrated_output_path

        output_path = resumed_output_path
        state["output_path"] = output_path
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        print(f"Resuming generation from '{state_file}'", flush=True)
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
        save_generation_state(state_file, state)
        print(f"Starting generation. Checkpoint file: '{state_file}'", flush=True)
    print(
        "[config] "
        f"exclude_strategy={state['exclude_strategy']} "
        f"exclude_local_limit={state['exclude_local_limit']}",
        flush=True,
    )

    seen_normalized: set[str] = set(state["seen_normalized"])
    queue: deque[dict[str, Any]] = deque(state["queue"])
    run_started_at = time.monotonic() - float(state.get("elapsed_seconds", 0.0))
    sync_output_from_state(state)
    parent_children_index = build_parent_children_index(list(state.get("edges", [])))

    def persist_state() -> None:
        state["queue"] = list(queue)
        state["seen_normalized"] = sorted(seen_normalized)
        state["elapsed_seconds"] = time.monotonic() - run_started_at
        save_generation_state(state_file, state)

    def mark_seen(concept: str) -> bool:
        canonical_label = canonical_concept_label(concept)
        normalized = _normalize_concept(canonical_label)
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
            response = simple_prompt(prompt)
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
                write_to_file(
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
            print(
                "[prompt] "
                f"parent={json.dumps(concept)} depth={depth} "
                f"exclude_strategy={state['exclude_strategy']} prompt_excludes={len(prompt_excludes or [])} "
                f"candidates={len(response_concepts)} accepted={accepted_count} "
                f"rejected={rejected_in_prompt} reasons={reason_block}",
                flush=True,
            )
            print_progress(state)

    except KeyboardInterrupt:
        persist_state()
        print(
            "\nGeneration paused by user. "
            f"Resume with: python brain/build_concept_list.py --resume --state-file {state_file}",
            flush=True,
        )
        return

    Path(state_file).unlink(missing_ok=True)
    print(
        "Generation complete. "
        f"Total concepts generated: {state['generated_concepts']}. "
        f"Output: {state['output_path']}",
        flush=True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a concept graph with Ollama.")
    parser.add_argument("--root-concept", default="Computer Science")
    parser.add_argument("--concept-list-length", type=int, default=25)
    parser.add_argument("--max-depth", type=int, default=3)
    parser.add_argument("--output", default="memory/runtime/concept_list.txt")
    parser.add_argument("--state-file", default="memory/runtime/concept_list_state.json")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument(
        "--exclude-strategy",
        choices=SUPPORTED_EXCLUDE_STRATEGIES,
        default=None,
        help=(
            "Prompt exclude payload strategy. "
            f"Default for new runs: '{DEFAULT_EXCLUDE_STRATEGY}'. "
            "Resume uses the value stored in state."
        ),
    )
    parser.add_argument(
        "--exclude-local-limit",
        type=int,
        default=None,
        help=(
            "Maximum number of local exclude items when using --exclude-strategy local. "
            f"Default for new runs: {DEFAULT_LOCAL_EXCLUDE_LIMIT}. "
            "Resume uses the value stored in state."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generate_concept_graph(
        root_concept=args.root_concept,
        concept_list_length=args.concept_list_length,
        max_depth=args.max_depth,
        output_path=args.output,
        state_file=args.state_file,
        resume=args.resume,
        exclude_strategy=args.exclude_strategy,
        exclude_local_limit=args.exclude_local_limit,
    )


if __name__ == "__main__":
    main()
