"""
Build a concept graph with Ollama.

How to run
----------
1. Start a new generation:
   python brain/build_concept_list.py \
     --root-concept "Computer Science" \
     --concept-list-length 25 \
     --max-depth 3 \
     --output memory/concept_list.txt \
     --state-file memory/concept_list_state.json

2. Resume after interruption (Ctrl+C):
   python brain/build_concept_list.py --resume --state-file memory/concept_list_state.json

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

BASE_URL = "http://localhost:11434"
MODEL = "llama3:8b"

DEFAULTS = {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "num_predict": 512,
    "num_ctx": 4096,
}


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


def _normalize_concept(concept: str) -> str:
    return concept.strip().casefold()


def parse_concepts(response: str) -> list[str]:
    concepts: list[str] = []
    seen: set[str] = set()

    for raw_concept in response.split("\n"):
        concept = raw_concept.strip()
        if not concept:
            continue

        normalized = _normalize_concept(concept)
        if normalized in seen:
            continue

        seen.add(normalized)
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

    generated_pct = (generated / estimated * 100.0) if estimated else 0.0
    prompts_pct = (prompts_done / prompts_estimated * 100.0) if prompts_estimated else 0.0

    print(
        "[progress] "
        f"concepts={generated}/{estimated} ({generated_pct:.2f}%) | "
        f"prompts={prompts_done}/{prompts_estimated} ({prompts_pct:.2f}%) | "
        f"queue={queue_size} | speed={rate:.2f} concepts/s",
        flush=True,
    )


def build_new_state(
    root_concept: str,
    concept_list_length: int,
    max_depth: int,
    output_path: str,
) -> dict[str, Any]:
    normalized_root = _normalize_concept(root_concept)
    return {
        "version": 2,
        "root_concept": root_concept,
        "concept_list_length": concept_list_length,
        "max_depth": max_depth,
        "output_path": output_path,
        "queue": [{"concept": root_concept, "depth": 0}],
        "exclude_list": [root_concept],
        "seen_normalized": [normalized_root],
        "edges": [],
        "generated_concepts": 0,
        "processed_prompt_calls": 0,
        "estimated_max_generated_concepts": estimate_max_generated_concepts(concept_list_length, max_depth),
        "estimated_max_prompt_calls": estimate_max_prompt_calls(concept_list_length, max_depth),
        "elapsed_seconds": 0.0,
    }


def generate_concept_graph(
    root_concept: str,
    concept_list_length: int,
    max_depth: int,
    output_path: str = "memory/concept_list.txt",
    state_file: str = "memory/concept_list_state.json",
    resume: bool = False,
) -> None:
    if max_depth < 1:
        raise ValueError("max_depth must be >= 1")
    if concept_list_length < 1:
        raise ValueError("concept_list_length must be >= 1")

    if resume:
        state_path = Path(state_file)
        if not state_path.exists():
            raise SystemExit(f"Cannot resume: state file not found at '{state_file}'")
        state = load_generation_state(state_file)
        if state.get("version") not in (1, 2):
            raise SystemExit("Unsupported state file version.")
        state.setdefault("edges", [])
        state["version"] = 2

        resumed_output_path = state.get("output_path", output_path)
        if resumed_output_path.startswith("src/"):
            migrated_output_path = resumed_output_path.replace("src/", "memory/", 1)
            if Path(migrated_output_path).exists() or not Path(resumed_output_path).exists():
                resumed_output_path = migrated_output_path

        output_path = resumed_output_path
        state["output_path"] = output_path
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        print(f"Resuming generation from '{state_file}'", flush=True)
    else:
        state = build_new_state(root_concept, concept_list_length, max_depth, output_path)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(state_file).parent.mkdir(parents=True, exist_ok=True)
        save_generation_state(state_file, state)
        print(f"Starting generation. Checkpoint file: '{state_file}'", flush=True)

    seen_normalized: set[str] = set(state["seen_normalized"])
    queue: deque[dict[str, Any]] = deque(state["queue"])
    run_started_at = time.monotonic() - float(state.get("elapsed_seconds", 0.0))
    sync_output_from_state(state)

    def persist_state() -> None:
        state["queue"] = list(queue)
        state["seen_normalized"] = sorted(seen_normalized)
        state["elapsed_seconds"] = time.monotonic() - run_started_at
        save_generation_state(state_file, state)

    def mark_seen(concept: str) -> bool:
        normalized = _normalize_concept(concept)
        if not normalized or normalized in seen_normalized:
            return False

        seen_normalized.add(normalized)
        state["exclude_list"].append(concept)
        return True

    try:
        while queue:
            current = queue[0]
            concept = str(current["concept"])
            depth = int(current["depth"])
            new_edges: list[str] = []

            if depth >= int(state["max_depth"]):
                queue.popleft()
                persist_state()
                continue

            prompt = build_prompt(concept, int(state["concept_list_length"]), state["exclude_list"])
            response = simple_prompt(prompt)
            response_concepts = parse_concepts(response)

            child_depth = depth + 1
            for candidate in response_concepts:
                if not mark_seen(candidate):
                    continue
                new_edges.append(f"{concept}: {candidate}")
                queue.append({"concept": candidate, "depth": child_depth})

            if new_edges:
                state["edges"].extend(new_edges)
                state["generated_concepts"] += len(new_edges)

            queue.popleft()
            state["processed_prompt_calls"] += 1
            persist_state()

            if new_edges:
                write_to_file(
                    "\n".join(new_edges) + "\n",
                    output_path=state["output_path"],
                    mode="append",
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
    parser.add_argument("--output", default="memory/concept_list.txt")
    parser.add_argument("--state-file", default="memory/concept_list_state.json")
    parser.add_argument("--resume", action="store_true")
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
    )


if __name__ == "__main__":
    main()
