#!/usr/bin/env python3
"""Clean and restructure concept graph edges produced by brain/build_concept_list.py.

How to run
----------
1. Clean with defaults:
   python brain/clean_concept_list.py

2. Clean with explicit paths and root override:
   python brain/clean_concept_list.py \
     --input memory/concept_list.txt \
     --output memory/concept_list_cleaned.txt \
     --root "Computer Science"

Input lines are expected in the shape:
    Parent Concept: Child Concept

The script:
- removes malformed and meta/instruction lines (e.g. "Here are ...")
- strips simple list formatting markers from concepts
- de-duplicates edges
- rewrites each line with the full parent path prefix:
    ~Root%20Concept.~Sub%20Concept.~Parent: Child Concept

Path segments use an encoded format to preserve literal characters safely:
- each segment is prefixed with `~`
- segment payload uses URL percent-encoding
"""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import quote
from concept_identity import canonical_concept_key, canonical_concept_label, collapse_spaces, is_meta_concept_text


def to_path_segment(text: str) -> str:
    # Prefix with '~' so GUI parser can distinguish encoded format from legacy format.
    return f"~{quote(collapse_spaces(text), safe='')}"


def is_meta_concept(text: str) -> bool:
    return is_meta_concept_text(text)


def parse_edge(raw_line: str) -> tuple[str, str] | None:
    if ":" not in raw_line:
        return None

    parent_raw, child_raw = raw_line.split(":", 1)
    parent = canonical_concept_label(parent_raw)
    child = canonical_concept_label(child_raw).rstrip(":").strip()

    if not parent or not child:
        return None

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


def clean_concept_file(
    input_path: Path,
    output_path: Path,
    root_override: str | None = None,
) -> tuple[int, int]:
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

    root_key = choose_root(edges, labels, root_override)
    paths = build_paths(edges, root_key)

    output_lines: list[str] = []
    for parent_key, child_key in edges:
        parent_path_nodes = paths.get(parent_key, [parent_key])
        parent_prefix = ".".join(to_path_segment(labels[node]) for node in parent_path_nodes)
        child_label = labels[child_key]
        output_lines.append(f"{parent_prefix}: {child_label}")

    output_text = "\n".join(output_lines)
    if output_text:
        output_text += "\n"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output_text, encoding="utf-8")
    return len(raw_lines), len(output_lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean concept graph edge list.")
    parser.add_argument(
        "--input",
        default="memory/concept_list.txt",
        help="Input edge list file (default: memory/concept_list.txt)",
    )
    parser.add_argument(
        "--output",
        default="memory/concept_list_cleaned.txt",
        help="Output cleaned edge list file (default: memory/concept_list_cleaned.txt)",
    )
    parser.add_argument(
        "--root",
        default=None,
        help="Optional root concept override used for path prefixes.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    total_lines, kept_lines = clean_concept_file(input_path, output_path, args.root)
    print(f"Cleaned concept list written to: {output_path}")
    print(f"Input lines: {total_lines}")
    print(f"Output lines: {kept_lines}")


if __name__ == "__main__":
    main()
