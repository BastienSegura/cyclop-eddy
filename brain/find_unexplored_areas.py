#!/usr/bin/env python3
"""Rank under-explored concept areas to guide refinement generation.

Examples:
    python brain/find_unexplored_areas.py --input memory/concept_list_cleaned.txt
    python brain/find_unexplored_areas.py --input memory/concept_list_cleaned.txt --target-children 10 --top-n 30
    python brain/find_unexplored_areas.py --input memory/concept_list.txt --mode raw --output-format json
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from concept_identity import canonical_concept_key, canonical_concept_label


def decode_path_segment(segment: str) -> str:
    trimmed = segment.strip()
    if trimmed.startswith("~"):
        encoded = trimmed[1:]
        try:
            return unquote(encoded).strip()
        except Exception:
            return encoded.strip()
    # Legacy cleaned format fallback.
    return trimmed.replace("-", " ").strip()


def infer_line_mode(parent_raw: str) -> str:
    parent = parent_raw.strip()
    if parent.startswith("~"):
        return "cleaned"
    if "." in parent:
        return "cleaned"
    return "raw"


def infer_file_mode(path: Path, lines: list[str]) -> str:
    if "cleaned" in path.name.casefold():
        return "cleaned"

    cleaned_hints = 0
    raw_hints = 0
    for raw_line in lines:
        line = raw_line.strip()
        if not line or ":" not in line:
            continue
        parent_raw, _ = line.split(":", 1)
        parent = parent_raw.strip()
        if not parent:
            continue

        if parent.startswith("~") or "." in parent:
            cleaned_hints += 1
            continue

        if " " not in parent and "-" in parent:
            # Legacy cleaned top-level segment (e.g. "Computer-Science")
            cleaned_hints += 1
            continue

        raw_hints += 1

    return "cleaned" if cleaned_hints >= raw_hints else "raw"


def extract_parent_label(parent_raw: str, mode: str) -> str:
    if mode == "raw":
        return canonical_concept_label(parent_raw)

    if mode == "cleaned":
        segments = [segment.strip() for segment in parent_raw.split(".") if segment.strip()]
        if not segments:
            return canonical_concept_label(parent_raw)
        return canonical_concept_label(decode_path_segment(segments[-1]))

    raise ValueError(f"Unsupported mode: {mode}")


def parse_edge_line(raw_line: str, mode: str) -> tuple[str, str, str] | None:
    line = raw_line.strip()
    if not line or ":" not in line:
        return None

    parent_raw, child_raw = line.split(":", 1)
    parent_raw = parent_raw.strip()
    child_raw = child_raw.strip()
    if not parent_raw or not child_raw:
        return None

    line_mode = infer_line_mode(parent_raw) if mode == "auto" else mode
    parent_label = extract_parent_label(parent_raw, line_mode)
    child_label = canonical_concept_label(child_raw).rstrip(":").strip()

    if not parent_label or not child_label:
        return None

    return parent_label, child_label, line_mode


def compute_depths(
    nodes: set[str],
    adjacency: dict[str, set[str]],
    indegree: dict[str, int],
    labels_by_key: dict[str, str],
) -> dict[str, int]:
    sort_key = lambda node: (labels_by_key.get(node, node).casefold(), labels_by_key.get(node, node))
    depths: dict[str, int] = {}
    queue: deque[str] = deque()

    roots = sorted(
        [node for node in nodes if indegree.get(node, 0) == 0],
        key=sort_key,
    )
    for root in roots:
        depths[root] = 0
        queue.append(root)

    while queue:
        node = queue.popleft()
        child_depth = depths[node] + 1
        for child in sorted(adjacency.get(node, set()), key=sort_key):
            current_depth = depths.get(child)
            if current_depth is None or child_depth < current_depth:
                depths[child] = child_depth
                queue.append(child)

    for seed in sorted([node for node in nodes if node not in depths], key=sort_key):
        depths[seed] = 0
        queue = deque([seed])
        while queue:
            node = queue.popleft()
            child_depth = depths[node] + 1
            for child in sorted(adjacency.get(node, set()), key=sort_key):
                current_depth = depths.get(child)
                if current_depth is None or child_depth < current_depth:
                    depths[child] = child_depth
                    queue.append(child)

    return depths


def reachable_descendant_count(
    source: str,
    adjacency: dict[str, set[str]],
) -> int:
    seen: set[str] = {source}
    queue: deque[str] = deque([source])
    count = 0

    while queue:
        node = queue.popleft()
        for child in adjacency.get(node, set()):
            if child in seen:
                continue
            seen.add(child)
            queue.append(child)
            count += 1

    return count


def analyze_frontier(
    input_path: Path,
    mode: str,
    target_children: int,
    top_n: int,
    min_depth: int,
    max_depth: int | None,
    include_leaves: bool,
) -> dict[str, Any]:
    lines = input_path.read_text(encoding="utf-8").splitlines()
    effective_mode = infer_file_mode(input_path, lines) if mode == "auto" else mode

    labels_by_key: dict[str, str] = {}
    adjacency: dict[str, set[str]] = defaultdict(set)
    indegree: dict[str, int] = defaultdict(int)
    mode_counter: Counter[str] = Counter()
    nodes: set[str] = set()
    seen_edges: set[tuple[str, str]] = set()

    malformed_line_count = 0
    parsed_edge_count = 0
    duplicate_edge_count = 0
    self_edge_count = 0

    for raw_line in lines:
        parsed = parse_edge_line(raw_line, effective_mode)
        if not parsed:
            malformed_line_count += 1
            continue

        parent_label, child_label, line_mode = parsed
        mode_counter[line_mode] += 1
        parsed_edge_count += 1

        parent_key = canonical_concept_key(parent_label)
        child_key = canonical_concept_key(child_label)
        if not parent_key or not child_key:
            malformed_line_count += 1
            continue

        if parent_key == child_key:
            self_edge_count += 1
            continue

        canonical_edge = (parent_key, child_key)
        if canonical_edge in seen_edges:
            duplicate_edge_count += 1
            continue
        seen_edges.add(canonical_edge)

        labels_by_key.setdefault(parent_key, parent_label)
        labels_by_key.setdefault(child_key, child_label)
        adjacency[parent_key].add(child_key)
        adjacency.setdefault(child_key, set())
        indegree[child_key] += 1
        indegree.setdefault(parent_key, indegree.get(parent_key, 0))
        nodes.add(parent_key)
        nodes.add(child_key)

    mode_detected = "mixed"
    if not mode_counter:
        mode_detected = effective_mode
    elif len(mode_counter) == 1:
        mode_detected = next(iter(mode_counter.keys()))

    depths = compute_depths(nodes, adjacency, indegree, labels_by_key)
    descendant_counts = {
        node: reachable_descendant_count(node, adjacency)
        for node in nodes
    }

    candidates: list[dict[str, Any]] = []
    leaf_underfilled_count = 0
    non_leaf_underfilled_count = 0
    total_underfilled_count = 0

    for node in nodes:
        out_degree = len(adjacency.get(node, set()))
        deficit = max(0, target_children - out_degree)
        if deficit <= 0:
            continue

        total_underfilled_count += 1
        if out_degree == 0:
            leaf_underfilled_count += 1
            if not include_leaves:
                continue
            classification = "leaf"
        else:
            non_leaf_underfilled_count += 1
            classification = "underfilled"

        depth = depths.get(node, 0)
        if depth < min_depth:
            continue
        if max_depth is not None and depth > max_depth:
            continue

        descendants = descendant_counts.get(node, 0)
        depth_bonus = 1.0 / (depth + 1)
        descendant_bonus = min(descendants, target_children) / (target_children * 4) if target_children else 0.0
        leaf_penalty = -0.25 if out_degree == 0 else 0.0
        score = deficit + depth_bonus + descendant_bonus + leaf_penalty

        candidates.append(
            {
                "concept": labels_by_key.get(node, node),
                "depth": depth,
                "out_degree": out_degree,
                "deficit": deficit,
                "reachable_descendants": descendants,
                "classification": classification,
                "priority_score": round(score, 6),
            }
        )

    candidates.sort(
        key=lambda item: (
            -float(item["priority_score"]),
            -int(item["deficit"]),
            int(item["depth"]),
            int(item["out_degree"]),
            -int(item["reachable_descendants"]),
            str(item["concept"]).casefold(),
            str(item["concept"]),
        )
    )

    selected = candidates[:top_n]
    return {
        "input_path": str(input_path),
        "mode_requested": mode,
        "mode_detected": mode_detected,
        "target_children": target_children,
        "top_n": top_n,
        "min_depth": min_depth,
        "max_depth": max_depth,
        "include_leaves": include_leaves,
        "line_count": len(lines),
        "node_count": len(nodes),
        "unique_edge_count": len(seen_edges),
        "parsed_edge_count": parsed_edge_count,
        "malformed_line_count": malformed_line_count,
        "duplicate_edge_count": duplicate_edge_count,
        "self_edge_count": self_edge_count,
        "underfilled_total_count": total_underfilled_count,
        "underfilled_leaf_count": leaf_underfilled_count,
        "underfilled_non_leaf_count": non_leaf_underfilled_count,
        "returned_count": len(selected),
        "suggested_roots": [item["concept"] for item in selected],
        "candidates": selected,
    }


def render_table(report: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(
        "[frontier] "
        f"input={report['input_path']} "
        f"mode={report['mode_detected']} "
        f"target_children={report['target_children']}"
    )
    lines.append(
        "[frontier] "
        f"nodes={report['node_count']} edges={report['unique_edge_count']} "
        f"underfilled={report['underfilled_total_count']} "
        f"returned={report['returned_count']}"
    )
    lines.append(
        "[frontier] "
        f"malformed={report['malformed_line_count']} "
        f"duplicates={report['duplicate_edge_count']} "
        f"self_edges={report['self_edge_count']}"
    )
    lines.append("")

    if not report["candidates"]:
        lines.append("No under-explored candidates found with current filters.")
        return "\n".join(lines) + "\n"

    lines.append("Rank  Score   Deficit  Depth  Out  Desc  Type        Concept")
    lines.append("----  ------  -------  -----  ---  ----  ----------  -------")
    for index, item in enumerate(report["candidates"], start=1):
        lines.append(
            f"{index:>4}  "
            f"{float(item['priority_score']):>6.3f}  "
            f"{int(item['deficit']):>7}  "
            f"{int(item['depth']):>5}  "
            f"{int(item['out_degree']):>3}  "
            f"{int(item['reachable_descendants']):>4}  "
            f"{str(item['classification']):<10}  "
            f"{item['concept']}"
        )

    lines.append("")
    lines.append("[frontier] Suggested roots (one per line):")
    for concept in report["suggested_roots"]:
        lines.append(concept)

    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Find and rank under-explored concept graph areas.")
    parser.add_argument(
        "--input",
        default="memory/concept_list_cleaned.txt",
        help="Concept edge file path (default: memory/concept_list_cleaned.txt).",
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "cleaned", "raw"),
        default="auto",
        help="Input parsing mode (default: auto).",
    )
    parser.add_argument(
        "--target-children",
        type=int,
        default=8,
        help="Desired minimum out-degree per concept (default: 8).",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=20,
        help="Maximum number of ranked suggestions returned (default: 20).",
    )
    parser.add_argument(
        "--min-depth",
        type=int,
        default=0,
        help="Minimum node depth to include (default: 0).",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=None,
        help="Optional maximum node depth to include.",
    )
    parser.add_argument(
        "--exclude-leaves",
        action="store_true",
        help="Exclude leaf nodes (out_degree=0) from results.",
    )
    parser.add_argument(
        "--output-format",
        choices=("table", "json"),
        default="table",
        help="Output format to stdout (default: table).",
    )
    parser.add_argument(
        "--json-output",
        default=None,
        help="Optional path to also write JSON output.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.target_children < 1:
        raise SystemExit("target-children must be >= 1")
    if args.top_n < 1:
        raise SystemExit("top-n must be >= 1")
    if args.min_depth < 0:
        raise SystemExit("min-depth must be >= 0")
    if args.max_depth is not None and args.max_depth < args.min_depth:
        raise SystemExit("max-depth must be >= min-depth")

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    report = analyze_frontier(
        input_path=input_path,
        mode=args.mode,
        target_children=args.target_children,
        top_n=args.top_n,
        min_depth=args.min_depth,
        max_depth=args.max_depth,
        include_leaves=not args.exclude_leaves,
    )

    if args.output_format == "json":
        payload = json.dumps(report, ensure_ascii=False, indent=2)
        print(payload)
    else:
        print(render_table(report), end="")

    if args.json_output:
        output_path = Path(args.json_output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
