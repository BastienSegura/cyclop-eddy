#!/usr/bin/env python3
"""Clean generated concept data, sync the canonical cleaned artifact to the app, and verify parity.

Usage:
    python knowledge-map-gen/sync_concept_data.py
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from clean_concept_list import clean_concept_file


def line_count(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clean concept data, write the canonical cleaned artifact, sync it to the derived app file, and verify parity.",
    )
    parser.add_argument(
        "--input",
        default="knowledge-map-gen/map-store/runtime/concept_list.txt",
        help="Raw concept edge list (default: knowledge-map-gen/map-store/runtime/concept_list.txt)",
    )
    parser.add_argument(
        "--cleaned-output",
        default="knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt",
        help="Canonical cleaned artifact output (default: knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt)",
    )
    parser.add_argument(
        "--gui-output",
        default="app/public/data/concept_list_cleaned.txt",
        help="Derived App data target (default: app/public/data/concept_list_cleaned.txt)",
    )
    parser.add_argument(
        "--root",
        default="Computer Science",
        help="Root concept used for cleaned path prefixes (default: Computer Science)",
    )
    parser.add_argument(
        "--cycle-policy",
        choices=("warn", "enforce"),
        default="warn",
        help="Cycle handling policy forwarded to clean_concept_list.py (default: warn).",
    )
    parser.add_argument(
        "--max-cycle-examples",
        type=int,
        default=5,
        help="Maximum representative cycle examples retained during clean analysis.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    cleaned_output_path = Path(args.cleaned_output)
    gui_output_path = Path(args.gui_output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    cleaned_output_path.parent.mkdir(parents=True, exist_ok=True)
    gui_output_path.parent.mkdir(parents=True, exist_ok=True)

    input_lines, cleaned_lines, stats = clean_concept_file(
        input_path=input_path,
        output_path=cleaned_output_path,
        root_override=args.root,
        cycle_policy=args.cycle_policy,
        max_cycle_examples=args.max_cycle_examples,
    )

    shutil.copyfile(cleaned_output_path, gui_output_path)

    store_line_count = line_count(cleaned_output_path)
    gui_line_count = line_count(gui_output_path)

    if store_line_count != gui_line_count:
        raise SystemExit(
            "Sync parity check failed: "
            f"store lines={store_line_count}, gui lines={gui_line_count}."
        )

    if cleaned_output_path.read_bytes() != gui_output_path.read_bytes():
        raise SystemExit(
            "Sync parity check failed: file contents differ after copy. "
            "Expected byte-identical outputs."
        )

    print(f"[sync] Input lines: {input_lines}")
    print(f"[sync] Cleaned lines: {cleaned_lines}")
    print(
        "[sync] Cycle policy: "
        f"{stats['cycle_policy']} "
        f"(before={stats['cycle_edge_count_before']}, "
        f"after={stats['cycle_edge_count_after']}, "
        f"dropped={stats['dropped_cycle_edge_count']})"
    )
    print(f"[sync] Canonical cleaned artifact: {cleaned_output_path}")
    print(f"[sync] Derived app target: {gui_output_path}")
    print(f"[sync] Line parity: {store_line_count} == {gui_line_count} (OK)")
    print("[sync] Byte parity: OK")


if __name__ == "__main__":
    main()
