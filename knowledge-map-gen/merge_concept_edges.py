#!/usr/bin/env python3
"""Merge multiple raw concept edge files with deterministic canonical dedup.

Usage:
    python brain/merge_concept_edges.py \
      --input memory/phase1.txt memory/phase2_a.txt memory/phase2_b.txt \
      --output memory/runtime/concept_list_merged.txt \
      --json-output memory/runtime/concept_list_merged.stats.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from concept_identity import canonical_concept_key
from graph_file_utils import parse_raw_edge_line


def parse_raw_edge(raw_line: str) -> tuple[str, str] | None:
    return parse_raw_edge_line(raw_line)


def merge_raw_edge_files(input_paths: list[Path]) -> tuple[list[str], dict[str, Any]]:
    merged_lines: list[str] = []
    seen_edges: set[tuple[str, str]] = set()

    total_line_count = 0
    total_parsed_edge_count = 0
    total_duplicate_edge_count = 0
    total_malformed_line_count = 0
    total_self_edge_count = 0

    files: list[dict[str, Any]] = []

    for path in input_paths:
        lines = path.read_text(encoding="utf-8").splitlines()
        line_count = len(lines)
        parsed_edge_count = 0
        duplicate_edge_count = 0
        malformed_line_count = 0
        self_edge_count = 0
        kept_edge_count = 0

        for raw_line in lines:
            stripped = raw_line.strip()
            if not stripped:
                continue

            parsed = parse_raw_edge(stripped)
            if not parsed:
                malformed_line_count += 1
                continue

            parent_label, child_label = parsed
            parent_key = canonical_concept_key(parent_label)
            child_key = canonical_concept_key(child_label)
            if not parent_key or not child_key:
                malformed_line_count += 1
                continue

            parsed_edge_count += 1

            if parent_key == child_key:
                self_edge_count += 1
                continue

            canonical_edge = (parent_key, child_key)
            if canonical_edge in seen_edges:
                duplicate_edge_count += 1
                continue

            seen_edges.add(canonical_edge)
            merged_lines.append(f"{parent_label}: {child_label}")
            kept_edge_count += 1

        files.append(
            {
                "path": str(path),
                "line_count": line_count,
                "parsed_edge_count": parsed_edge_count,
                "kept_edge_count": kept_edge_count,
                "duplicate_edge_count": duplicate_edge_count,
                "malformed_line_count": malformed_line_count,
                "self_edge_count": self_edge_count,
            }
        )

        total_line_count += line_count
        total_parsed_edge_count += parsed_edge_count
        total_duplicate_edge_count += duplicate_edge_count
        total_malformed_line_count += malformed_line_count
        total_self_edge_count += self_edge_count

    stats = {
        "input_file_count": len(input_paths),
        "input_line_count": total_line_count,
        "parsed_edge_count": total_parsed_edge_count,
        "merged_unique_edge_count": len(merged_lines),
        "duplicate_edge_count": total_duplicate_edge_count,
        "malformed_line_count": total_malformed_line_count,
        "self_edge_count": total_self_edge_count,
        "files": files,
    }
    return merged_lines, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge raw concept edge files with canonical dedup.")
    parser.add_argument(
        "--input",
        nargs="+",
        required=True,
        help="Raw input edge files in merge precedence order.",
    )
    parser.add_argument(
        "--output",
        default="memory/runtime/concept_list_merged.txt",
        help="Merged raw output file path (default: memory/runtime/concept_list_merged.txt).",
    )
    parser.add_argument(
        "--json-output",
        default=None,
        help="Optional JSON stats output path.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_paths = [Path(raw) for raw in args.input]

    for path in input_paths:
        if not path.exists():
            raise SystemExit(f"Input file not found: {path}")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    merged_lines, stats = merge_raw_edge_files(input_paths)
    payload = "\n".join(merged_lines)
    if payload:
        payload += "\n"
    output_path.write_text(payload, encoding="utf-8")

    if args.json_output:
        json_path = Path(args.json_output)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[merge] Input files: {stats['input_file_count']}")
    print(f"[merge] Input lines: {stats['input_line_count']}")
    print(f"[merge] Parsed edges: {stats['parsed_edge_count']}")
    print(f"[merge] Unique edges written: {stats['merged_unique_edge_count']}")
    print(f"[merge] Duplicates skipped: {stats['duplicate_edge_count']}")
    print(f"[merge] Malformed skipped: {stats['malformed_line_count']}")
    print(f"[merge] Self-edges skipped: {stats['self_edge_count']}")
    print(f"[merge] Output: {output_path}")


if __name__ == "__main__":
    main()
