#!/usr/bin/env python3
"""Clean and restructure concept graph edges produced by brain/build_concept_list.py.

How to run
----------
1. Clean with defaults:
   python brain/clean_concept_list.py

2. Clean with explicit paths and root override:
   python brain/clean_concept_list.py \
     --input memory/runtime/concept_list.txt \
     --output memory/runtime/concept_list_cleaned.txt \
     --root "Computer Science"

Input lines are expected in the shape:
    Parent Concept: Child Concept

The script:
- removes malformed and meta/instruction lines (e.g. "Here are ...")
- strips simple list formatting markers from concepts
- de-duplicates edges
- applies a cycle policy (`warn` or `enforce`)
- rewrites each line with the full parent path prefix:
    ~Root%20Concept.~Sub%20Concept.~Parent: Child Concept

Path segments use an encoded format to preserve literal characters safely:
- each segment is prefixed with `~`
- segment payload uses URL percent-encoding

Cycle policy:
- `warn` (default): keep cyclic edges and report cycle metrics/examples.
- `enforce`: deterministically drop cycle-closing edges in first-seen order.
"""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from pathlib import Path
from typing import Any
from urllib.parse import quote
from concept_identity import canonical_concept_key, canonical_concept_label, collapse_spaces, is_meta_concept_text
from graph_analysis import analyze_cycle_edges, find_path
from graph_file_utils import parse_raw_edge_line


def to_path_segment(text: str) -> str:
    # Prefix with '~' so GUI parser can distinguish encoded format from legacy format.
    return f"~{quote(collapse_spaces(text), safe='')}"


def is_meta_concept(text: str) -> bool:
    return is_meta_concept_text(text)


def parse_edge(raw_line: str) -> tuple[str, str] | None:
    parsed = parse_raw_edge_line(raw_line)
    if not parsed:
        return None

    parent, child = parsed

    if is_meta_concept(child):
        return None

    return parent, child


def choose_root(
    edges: list[tuple[str, str]],
    labels: dict[str, str],
    root_override: str | None,
) -> str | None:
    if root_override:
        root_label = canonical_concept_label(root_override)
        root_key = canonical_concept_key(root_label)
        labels.setdefault(root_key, root_label)
        return root_key

    if not edges:
        return None

    children = {child for _, child in edges}
    for parent, _ in edges:
        if parent not in children:
            return parent

    return edges[0][0]


def build_paths(
    edges: list[tuple[str, str]],
    preferred_root: str | None,
) -> dict[str, list[str]]:
    adjacency: dict[str, list[str]] = defaultdict(list)
    parent_order: list[str] = []
    seen_parents: set[str] = set()

    for parent, child in edges:
        adjacency[parent].append(child)
        if parent not in seen_parents:
            seen_parents.add(parent)
            parent_order.append(parent)

    paths: dict[str, list[str]] = {}

    def bfs(seed: str) -> None:
        if seed in paths:
            return

        paths[seed] = [seed]
        queue: deque[str] = deque([seed])

        while queue:
            node = queue.popleft()
            for child in adjacency.get(node, []):
                if child in paths:
                    continue
                paths[child] = paths[node] + [child]
                queue.append(child)

    if preferred_root:
        bfs(preferred_root)

    for parent in parent_order:
        if parent not in paths:
            bfs(parent)

    return paths

def analyze_cycle_stats(
    edges: list[tuple[str, str]],
    labels: dict[str, str],
    max_examples: int,
) -> dict[str, Any]:
    cycle_edge_count, examples = analyze_cycle_edges(edges, labels, max_examples)
    return {
        "cycle_edge_count": cycle_edge_count,
        "cycle_examples": examples,
    }


def apply_cycle_policy(
    edges: list[tuple[str, str]],
    cycle_policy: str,
) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    if cycle_policy == "warn":
        return edges, []

    if cycle_policy != "enforce":
        raise ValueError(f"Unsupported cycle policy: {cycle_policy}")

    kept_edges: list[tuple[str, str]] = []
    dropped_edges: list[tuple[str, str]] = []
    adjacency: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        parent, child = edge
        if find_path(adjacency, child, parent):
            dropped_edges.append(edge)
            continue
        kept_edges.append(edge)
        adjacency[parent].append(child)

    return kept_edges, dropped_edges


def clean_concept_file(
    input_path: Path,
    output_path: Path,
    root_override: str | None = None,
    cycle_policy: str = "warn",
    max_cycle_examples: int = 5,
) -> tuple[int, int, dict[str, Any]]:
    if max_cycle_examples < 0:
        raise ValueError("max_cycle_examples must be >= 0")

    raw_lines = input_path.read_text(encoding="utf-8").splitlines()

    labels: dict[str, str] = {}
    edges: list[tuple[str, str]] = []
    seen_edges: set[tuple[str, str]] = set()

    for raw_line in raw_lines:
        parsed = parse_edge(raw_line)
        if not parsed:
            continue

        parent_label, child_label = parsed
        parent_key = canonical_concept_key(parent_label)
        child_key = canonical_concept_key(child_label)

        if parent_key == child_key:
            continue

        labels.setdefault(parent_key, parent_label)
        labels.setdefault(child_key, child_label)

        edge = (parent_key, child_key)
        if edge in seen_edges:
            continue

        seen_edges.add(edge)
        edges.append(edge)

    before_stats = analyze_cycle_stats(edges, labels, max_cycle_examples)
    filtered_edges, dropped_cycle_edges = apply_cycle_policy(edges, cycle_policy)
    after_stats = analyze_cycle_stats(filtered_edges, labels, max_cycle_examples)

    root_key = choose_root(filtered_edges, labels, root_override)
    paths = build_paths(filtered_edges, root_key)

    output_lines: list[str] = []
    for parent_key, child_key in filtered_edges:
        parent_path_nodes = paths.get(parent_key, [parent_key])
        parent_prefix = ".".join(to_path_segment(labels[node]) for node in parent_path_nodes)
        child_label = labels[child_key]
        output_lines.append(f"{parent_prefix}: {child_label}")

    output_text = "\n".join(output_lines)
    if output_text:
        output_text += "\n"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output_text, encoding="utf-8")
    stats = {
        "cycle_policy": cycle_policy,
        "cycle_edge_count_before": int(before_stats["cycle_edge_count"]),
        "cycle_examples_before": list(before_stats["cycle_examples"]),
        "cycle_edge_count_after": int(after_stats["cycle_edge_count"]),
        "cycle_examples_after": list(after_stats["cycle_examples"]),
        "dropped_cycle_edge_count": len(dropped_cycle_edges),
    }
    return len(raw_lines), len(output_lines), stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean concept graph edge list.")
    parser.add_argument(
        "--input",
        default="memory/runtime/concept_list.txt",
        help="Input edge list file (default: memory/runtime/concept_list.txt)",
    )
    parser.add_argument(
        "--output",
        default="memory/runtime/concept_list_cleaned.txt",
        help="Output cleaned edge list file (default: memory/runtime/concept_list_cleaned.txt)",
    )
    parser.add_argument(
        "--root",
        default=None,
        help="Optional root concept override used for path prefixes.",
    )
    parser.add_argument(
        "--cycle-policy",
        choices=("warn", "enforce"),
        default="warn",
        help="Cycle handling policy: 'warn' keeps cycles, 'enforce' drops cycle-closing edges.",
    )
    parser.add_argument(
        "--max-cycle-examples",
        type=int,
        default=5,
        help="Maximum number of representative cycle examples to print.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    total_lines, kept_lines, stats = clean_concept_file(
        input_path,
        output_path,
        root_override=args.root,
        cycle_policy=args.cycle_policy,
        max_cycle_examples=args.max_cycle_examples,
    )
    print(f"Cleaned concept list written to: {output_path}")
    print(f"Input lines: {total_lines}")
    print(f"Output lines: {kept_lines}")
    print(
        "Cycle policy: "
        f"{stats['cycle_policy']} | "
        f"cycle_edges(before={stats['cycle_edge_count_before']}, after={stats['cycle_edge_count_after']}) | "
        f"dropped={stats['dropped_cycle_edge_count']}"
    )

    before_examples = stats["cycle_examples_before"]
    if before_examples:
        print("Cycle examples before policy:")
        for example in before_examples:
            print(f"  - {example}")

    after_examples = stats["cycle_examples_after"]
    if args.cycle_policy == "enforce" and after_examples:
        print("Cycle examples after policy:")
        for example in after_examples:
            print(f"  - {example}")


if __name__ == "__main__":
    main()
