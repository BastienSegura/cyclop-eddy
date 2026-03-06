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
import time

from concept_identity import canonical_concept_key, canonical_concept_label

from build_concept_list_prompting import (
    BASE_URL,
    DEFAULTS,
    MAX_CONCEPT_WORDS,
    MODEL,
    _post,
    build_prompt,
    parse_concepts,
    simple_prompt,
    validate_candidate,
)
from build_concept_list_runtime import (
    MAX_REJECTION_EVENTS,
    add_parent_child_relation,
    build_parent_children_index,
    build_prompt_exclude_list,
    generate_concept_graph as runtime_generate_concept_graph,
    print_progress,
)
from build_concept_list_state import (
    DEFAULT_EXCLUDE_STRATEGY,
    DEFAULT_LOCAL_EXCLUDE_LIMIT,
    SUPPORTED_EXCLUDE_STRATEGIES,
    build_new_state,
    estimate_max_generated_concepts,
    estimate_max_prompt_calls,
    load_generation_state,
    migrate_output_path,
    normalize_exclude_list,
    normalize_exclude_local_limit,
    normalize_exclude_strategy,
    normalize_queue,
    prepare_resumed_state,
    save_generation_state,
    sync_output_from_state,
    write_to_file,
)


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
    runtime_generate_concept_graph(
        root_concept=root_concept,
        concept_list_length=concept_list_length,
        max_depth=max_depth,
        output_path=output_path,
        state_file=state_file,
        resume=resume,
        exclude_strategy=exclude_strategy,
        exclude_local_limit=exclude_local_limit,
        prompt_func=simple_prompt,
        save_state_func=save_generation_state,
        load_state_func=load_generation_state,
        write_file_func=write_to_file,
        monotonic_func=time.monotonic,
        printer=print,
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
