#!/usr/bin/env python3
"""Generate deterministic quality reports for concept graph edge files.

Examples:
    python knowledge-map-gen/report_concept_quality.py --input knowledge-map-gen/map-store/runtime/concept_list.txt
    python knowledge-map-gen/report_concept_quality.py --input knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt --mode cleaned
    python knowledge-map-gen/report_concept_quality.py --input knowledge-map-gen/map-store/runtime/concept_list.txt knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt \
      --output knowledge-map-gen/map-store/runtime/concept_quality_report.md --json-output knowledge-map-gen/map-store/runtime/concept_quality_report.json
    python knowledge-map-gen/report_concept_quality.py --input knowledge-map-gen/map-store/runtime/concept_list.txt --fail-on-threshold
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Any

from concept_identity import canonical_concept_key, canonical_concept_label, is_meta_concept_text
from graph_analysis import analyze_cycle_edges, build_adjacency_list, build_indegree_map
from graph_file_utils import infer_file_mode, parse_graph_edge_line, split_edge_line

DEFAULT_INPUT_CANDIDATES = [
    "knowledge-map-gen/map-store/runtime/concept_list.txt",
    "knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt",
]

MAX_ROOT_CANDIDATES = 20
MAX_SAMPLE_ITEMS = 5

def analyze_file(path: Path, mode: str) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    effective_auto_mode = infer_file_mode(path, lines) if mode == "auto" else mode

    line_count = len(lines)
    malformed_line_count = 0
    parsed_edge_count = 0
    meta_line_count = 0
    self_edge_count = 0
    duplicate_edge_exact_count = 0
    duplicate_edge_canonical_count = 0

    malformed_samples: list[str] = []
    meta_samples: list[str] = []
    self_edge_samples: list[str] = []

    seen_exact_edges: set[tuple[str, str]] = set()
    seen_canonical_edges: set[tuple[str, str]] = set()

    unique_graph_edges: list[tuple[str, str]] = []
    labels_by_key: dict[str, str] = {}
    variants_by_key: dict[str, set[str]] = defaultdict(set)

    mode_counter: Counter[str] = Counter()

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        if not split_edge_line(line):
            malformed_line_count += 1
            if len(malformed_samples) < MAX_SAMPLE_ITEMS:
                malformed_samples.append(line)
            continue

        parsed = parse_graph_edge_line(line, effective_auto_mode)
        if not parsed:
            malformed_line_count += 1
            if len(malformed_samples) < MAX_SAMPLE_ITEMS:
                malformed_samples.append(line)
            continue

        parent_label, child_label, line_mode = parsed
        mode_counter[line_mode] += 1

        parsed_edge_count += 1

        parent_key = canonical_concept_key(parent_label)
        child_key = canonical_concept_key(child_label)

        labels_by_key.setdefault(parent_key, parent_label)
        labels_by_key.setdefault(child_key, child_label)
        variants_by_key[parent_key].add(parent_label)
        variants_by_key[child_key].add(child_label)

        exact_edge = (parent_label, child_label)
        if exact_edge in seen_exact_edges:
            duplicate_edge_exact_count += 1
        else:
            seen_exact_edges.add(exact_edge)

        canonical_edge = (parent_key, child_key)
        if canonical_edge in seen_canonical_edges:
            duplicate_edge_canonical_count += 1
        else:
            seen_canonical_edges.add(canonical_edge)

        if is_meta_concept_text(child_label):
            meta_line_count += 1
            if len(meta_samples) < MAX_SAMPLE_ITEMS:
                meta_samples.append(f"{parent_label}: {child_label}")
            continue

        if parent_key == child_key:
            self_edge_count += 1
            if len(self_edge_samples) < MAX_SAMPLE_ITEMS:
                self_edge_samples.append(f"{parent_label}: {child_label}")
            continue

        if canonical_edge not in unique_graph_edges:
            unique_graph_edges.append(canonical_edge)

    variant_groups = [labels for labels in variants_by_key.values() if len(labels) > 1]
    duplicate_variant_group_count = len(variant_groups)
    duplicate_variant_extra_count = sum(len(labels) - 1 for labels in variant_groups)

    nodes: set[str] = set()
    adjacency = build_adjacency_list(unique_graph_edges)
    indegree = build_indegree_map(unique_graph_edges)
    for parent_key, child_key in unique_graph_edges:
        nodes.add(parent_key)
        nodes.add(child_key)

    out_degree_items = sorted(((node, len(children)) for node, children in adjacency.items()), key=lambda item: item[0])
    out_degrees = [value for _, value in out_degree_items]
    fanout_distribution: dict[str, int] = {}
    if out_degrees:
        fanout_counter = Counter(out_degrees)
        fanout_distribution = {str(key): fanout_counter[key] for key in sorted(fanout_counter)}

    root_candidates = [
        node
        for node in nodes
        if indegree.get(node, 0) == 0 and len(adjacency.get(node, [])) > 0
    ]
    root_candidates_sorted = sorted(
        root_candidates,
        key=lambda node: (-len(adjacency.get(node, [])), labels_by_key.get(node, node)),
    )

    cycle_edge_count, cycle_examples = analyze_cycle_edges(
        unique_graph_edges,
        labels_by_key,
        MAX_SAMPLE_ITEMS,
    )

    mode_detected = "mixed"
    if not mode_counter:
        mode_detected = mode if mode != "auto" else "unknown"
    elif len(mode_counter) == 1:
        mode_detected = next(iter(mode_counter.keys()))

    return {
        "path": str(path),
        "mode_requested": mode,
        "mode_detected": mode_detected,
        "line_count": line_count,
        "parsed_edge_count": parsed_edge_count,
        "graph_unique_edge_count": len(unique_graph_edges),
        "node_count": len(nodes),
        "parent_count": len(out_degree_items),
        "malformed_line_count": malformed_line_count,
        "meta_line_count": meta_line_count,
        "self_edge_count": self_edge_count,
        "duplicate_edge_exact_count": duplicate_edge_exact_count,
        "duplicate_edge_canonical_count": duplicate_edge_canonical_count,
        "duplicate_variant_group_count": duplicate_variant_group_count,
        "duplicate_variant_extra_count": duplicate_variant_extra_count,
        "fanout": {
            "min": min(out_degrees) if out_degrees else 0,
            "max": max(out_degrees) if out_degrees else 0,
            "avg": round(mean(out_degrees), 3) if out_degrees else 0.0,
            "distribution": fanout_distribution,
        },
        "cycle_edge_count": cycle_edge_count,
        "cycle_examples": cycle_examples,
        "root_candidate_count": len(root_candidates_sorted),
        "root_candidates": [labels_by_key.get(node, node) for node in root_candidates_sorted[:MAX_ROOT_CANDIDATES]],
        "samples": {
            "malformed": malformed_samples,
            "meta": meta_samples,
            "self_edges": self_edge_samples,
        },
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Concept Quality Report")
    lines.append("")

    for entry in report["files"]:
        lines.append(f"## {entry['path']}")
        lines.append("")
        lines.append(f"- Mode: requested `{entry['mode_requested']}`, detected `{entry['mode_detected']}`")
        lines.append(f"- Lines: `{entry['line_count']}`")
        lines.append(f"- Parsed edges: `{entry['parsed_edge_count']}`")
        lines.append(f"- Unique graph edges: `{entry['graph_unique_edge_count']}`")
        lines.append(f"- Nodes: `{entry['node_count']}`")
        lines.append(f"- Parents (out-degree > 0): `{entry['parent_count']}`")
        lines.append(f"- Malformed lines: `{entry['malformed_line_count']}`")
        lines.append(f"- Meta leaks: `{entry['meta_line_count']}`")
        lines.append(f"- Self-edges: `{entry['self_edge_count']}`")
        lines.append(f"- Duplicate edges (exact): `{entry['duplicate_edge_exact_count']}`")
        lines.append(f"- Duplicate edges (canonical): `{entry['duplicate_edge_canonical_count']}`")
        lines.append(f"- Duplicate variant groups: `{entry['duplicate_variant_group_count']}`")
        lines.append(f"- Duplicate variant extras: `{entry['duplicate_variant_extra_count']}`")
        lines.append(
            "- Fanout (min/avg/max): "
            f"`{entry['fanout']['min']}` / `{entry['fanout']['avg']}` / `{entry['fanout']['max']}`"
        )
        lines.append(f"- Cycle edges: `{entry['cycle_edge_count']}`")
        lines.append(f"- Root candidates: `{entry['root_candidate_count']}`")

        lines.append("")
        lines.append("### Fanout Distribution")
        lines.append("")
        lines.append("| Out Degree | Parent Count |")
        lines.append("|---|---|")
        if entry["fanout"]["distribution"]:
            for degree, count in entry["fanout"]["distribution"].items():
                lines.append(f"| {degree} | {count} |")
        else:
            lines.append("| 0 | 0 |")

        if entry["root_candidates"]:
            lines.append("")
            lines.append("### Root Candidates")
            lines.append("")
            for label in entry["root_candidates"]:
                lines.append(f"- {label}")

        if entry["cycle_examples"]:
            lines.append("")
            lines.append("### Cycle Examples")
            lines.append("")
            for example in entry["cycle_examples"]:
                lines.append(f"- {example}")

        for sample_key, title in (
            ("malformed", "Malformed Samples"),
            ("meta", "Meta Leak Samples"),
            ("self_edges", "Self-Edge Samples"),
        ):
            samples = entry["samples"][sample_key]
            if not samples:
                continue
            lines.append("")
            lines.append(f"### {title}")
            lines.append("")
            for sample in samples:
                lines.append(f"- {sample}")

        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def resolve_inputs(raw_inputs: list[str]) -> list[Path]:
    if raw_inputs:
        return [Path(value) for value in raw_inputs]

    resolved: list[Path] = []
    for candidate in DEFAULT_INPUT_CANDIDATES:
        path = Path(candidate)
        if path.exists():
            resolved.append(path)

    if not resolved:
        raise SystemExit(
            "No inputs provided and no default input candidates found. "
            "Pass --input <file> [<file> ...]."
        )

    return resolved


def evaluate_thresholds(
    files: list[dict[str, Any]],
    fail_on_threshold: bool,
    max_malformed_lines: int | None,
    max_meta_lines: int | None,
    max_self_edges: int | None,
    max_cycle_edges: int | None,
    max_duplicate_variant_extras: int | None,
) -> list[str]:
    if not fail_on_threshold:
        return []

    # Defaults are intentionally strict for malformed/meta/self (0), while
    # cycle/variant thresholds are opt-in due dataset-specific expectations.
    effective_max_malformed = 0 if max_malformed_lines is None else max_malformed_lines
    effective_max_meta = 0 if max_meta_lines is None else max_meta_lines
    effective_max_self = 0 if max_self_edges is None else max_self_edges
    effective_max_cycle = max_cycle_edges
    effective_max_variant_extras = max_duplicate_variant_extras

    violations: list[str] = []
    for entry in files:
        path = entry["path"]

        if entry["malformed_line_count"] > effective_max_malformed:
            violations.append(
                f"{path}: malformed_line_count={entry['malformed_line_count']} > {effective_max_malformed}"
            )

        if entry["meta_line_count"] > effective_max_meta:
            violations.append(
                f"{path}: meta_line_count={entry['meta_line_count']} > {effective_max_meta}"
            )

        if entry["self_edge_count"] > effective_max_self:
            violations.append(
                f"{path}: self_edge_count={entry['self_edge_count']} > {effective_max_self}"
            )

        if effective_max_cycle is not None and entry["cycle_edge_count"] > effective_max_cycle:
            violations.append(
                f"{path}: cycle_edge_count={entry['cycle_edge_count']} > {effective_max_cycle}"
            )

        if (
            effective_max_variant_extras is not None
            and entry["duplicate_variant_extra_count"] > effective_max_variant_extras
        ):
            violations.append(
                f"{path}: duplicate_variant_extra_count={entry['duplicate_variant_extra_count']} > "
                f"{effective_max_variant_extras}"
            )

    return violations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate quality report for concept edge files.")
    parser.add_argument(
        "--input",
        nargs="+",
        default=[],
        help="Input files to analyze. If omitted, existing defaults are used.",
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "raw", "cleaned"),
        default="auto",
        help="Parsing mode for parent labels (default: auto).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional markdown output path. Report is always printed to stdout.",
    )
    parser.add_argument(
        "--json-output",
        default=None,
        help="Optional JSON output path.",
    )
    parser.add_argument(
        "--fail-on-threshold",
        action="store_true",
        help="Exit non-zero if threshold checks fail.",
    )
    parser.add_argument("--max-malformed-lines", type=int, default=None)
    parser.add_argument("--max-meta-lines", type=int, default=None)
    parser.add_argument("--max-self-edges", type=int, default=None)
    parser.add_argument("--max-cycle-edges", type=int, default=None)
    parser.add_argument("--max-duplicate-variant-extras", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_paths = resolve_inputs(args.input)
    for path in input_paths:
        if not path.exists():
            raise SystemExit(f"Input file not found: {path}")

    files = [analyze_file(path, args.mode) for path in input_paths]
    report = {"files": files}

    markdown = render_markdown(report)
    print(markdown, end="")

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(markdown, encoding="utf-8")

    if args.json_output:
        json_path = Path(args.json_output)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    violations = evaluate_thresholds(
        files=files,
        fail_on_threshold=args.fail_on_threshold,
        max_malformed_lines=args.max_malformed_lines,
        max_meta_lines=args.max_meta_lines,
        max_self_edges=args.max_self_edges,
        max_cycle_edges=args.max_cycle_edges,
        max_duplicate_variant_extras=args.max_duplicate_variant_extras,
    )
    if violations:
        print("\n[quality-report] Threshold violations:")
        for violation in violations:
            print(f"- {violation}")
        raise SystemExit(2)


if __name__ == "__main__":
    main()
