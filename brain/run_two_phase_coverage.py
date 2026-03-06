#!/usr/bin/env python3
"""Run a two-phase concept coverage workflow and merge raw outputs.

Usage example:
    python brain/run_two_phase_coverage.py \
      --root-concept "Computer Science" \
      --phase2-roots "Operating Systems" "Databases" "Computer Networks"
"""

from __future__ import annotations

import argparse
import re
import shlex
import subprocess
import sys
from pathlib import Path

from concept_identity import canonical_concept_key, canonical_concept_label

SUPPORTED_EXCLUDE_STRATEGIES = ("global", "local", "none")


def slugify_label(label: str) -> str:
    key = canonical_concept_key(label)
    if not key:
        return "root"
    slug = re.sub(r"[^a-z0-9]+", "_", key).strip("_")
    return slug or "root"


def collect_phase2_roots(roots: list[str], roots_file: Path | None) -> list[str]:
    ordered_roots: list[str] = []
    seen_keys: set[str] = set()

    candidates: list[str] = list(roots)
    if roots_file:
        for raw_line in roots_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            candidates.append(line)

    for raw_candidate in candidates:
        label = canonical_concept_label(raw_candidate)
        key = canonical_concept_key(label)
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        ordered_roots.append(label)

    return ordered_roots


def render_command(command: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in command)


def run_command(command: list[str]) -> None:
    print(f"[two-phase] $ {render_command(command)}", flush=True)
    subprocess.run(command, check=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Execute two-phase concept coverage workflow.")
    parser.add_argument("--root-concept", default="Computer Science")
    parser.add_argument(
        "--phase1-children",
        type=int,
        default=14,
        help="Children per parent during wide scan (default: 14).",
    )
    parser.add_argument(
        "--phase1-depth",
        type=int,
        default=2,
        help="Generation depth during wide scan (default: 2).",
    )
    parser.add_argument(
        "--phase2-children",
        type=int,
        default=8,
        help="Children per parent during refinement (default: 8).",
    )
    parser.add_argument(
        "--phase2-depth",
        type=int,
        default=3,
        help="Generation depth during refinement (default: 3).",
    )
    parser.add_argument(
        "--phase2-roots",
        nargs="*",
        default=[],
        help="Refinement roots (space separated).",
    )
    parser.add_argument(
        "--phase2-roots-file",
        default=None,
        help="Optional file with refinement roots (one per line, '#' comments allowed).",
    )
    parser.add_argument(
        "--exclude-strategy",
        choices=SUPPORTED_EXCLUDE_STRATEGIES,
        default="local",
        help="Prompt exclude strategy used for both phases (default: local).",
    )
    parser.add_argument(
        "--exclude-local-limit",
        type=int,
        default=64,
        help="Prompt local exclude list bound when using local strategy (default: 64).",
    )
    parser.add_argument(
        "--work-dir",
        default="memory/runtime/two_phase",
        help="Workspace directory for phase artifacts (default: memory/runtime/two_phase).",
    )
    parser.add_argument(
        "--baseline-input",
        default=None,
        help="Optional single-run raw baseline for direct comparison with merged output.",
    )
    parser.add_argument(
        "--skip-quality-report",
        action="store_true",
        help="Skip report_concept_quality.py checkpoints.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned commands without executing them.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.phase1_children < 1 or args.phase2_children < 1:
        raise SystemExit("phase children values must be >= 1")
    if args.phase1_depth < 1 or args.phase2_depth < 1:
        raise SystemExit("phase depth values must be >= 1")
    if args.exclude_local_limit < 1:
        raise SystemExit("exclude-local-limit must be >= 1")
    if args.skip_quality_report and args.baseline_input:
        raise SystemExit("--baseline-input requires quality reports; remove --skip-quality-report.")

    roots_file_path: Path | None = None
    if args.phase2_roots_file:
        roots_file_path = Path(args.phase2_roots_file)
        if not roots_file_path.exists():
            raise SystemExit(f"phase2 roots file not found: {roots_file_path}")
    if args.baseline_input:
        baseline_path = Path(args.baseline_input)
        if not baseline_path.exists():
            raise SystemExit(f"baseline input file not found: {baseline_path}")

    phase2_roots = collect_phase2_roots(args.phase2_roots, roots_file_path)
    if not phase2_roots:
        raise SystemExit("No phase2 roots resolved. Pass --phase2-roots and/or --phase2-roots-file.")

    project_root = Path(__file__).resolve().parents[1]
    build_script = project_root / "brain" / "build_concept_list.py"
    merge_script = project_root / "brain" / "merge_concept_edges.py"
    report_script = project_root / "brain" / "report_concept_quality.py"

    work_dir = Path(args.work_dir)
    phase2_dir = work_dir / "phase2"
    reports_dir = work_dir / "reports"

    phase1_output = work_dir / "phase1_raw.txt"
    phase1_state = work_dir / "phase1_state.json"
    merged_output = work_dir / "concept_list_two_phase.txt"
    merge_stats_json = reports_dir / "merge_stats.json"

    phase1_quality_md = reports_dir / "phase1_quality.md"
    phase1_quality_json = reports_dir / "phase1_quality.json"
    merged_quality_md = reports_dir / "merged_quality.md"
    merged_quality_json = reports_dir / "merged_quality.json"
    comparison_quality_md = reports_dir / "baseline_vs_merged.md"
    comparison_quality_json = reports_dir / "baseline_vs_merged.json"

    phase2_outputs: list[Path] = []
    commands: list[list[str]] = []

    phase1_command = [
        sys.executable,
        str(build_script),
        "--root-concept",
        args.root_concept,
        "--concept-list-length",
        str(args.phase1_children),
        "--max-depth",
        str(args.phase1_depth),
        "--exclude-strategy",
        args.exclude_strategy,
        "--exclude-local-limit",
        str(args.exclude_local_limit),
        "--output",
        str(phase1_output),
        "--state-file",
        str(phase1_state),
    ]
    commands.append(phase1_command)

    if not args.skip_quality_report:
        commands.append(
            [
                sys.executable,
                str(report_script),
                "--input",
                str(phase1_output),
                "--mode",
                "raw",
                "--output",
                str(phase1_quality_md),
                "--json-output",
                str(phase1_quality_json),
            ]
        )

    for index, root in enumerate(phase2_roots, start=1):
        slug = slugify_label(root)
        phase2_output = phase2_dir / f"phase2_raw_{index:02d}_{slug}.txt"
        phase2_state = phase2_dir / f"phase2_state_{index:02d}_{slug}.json"
        phase2_outputs.append(phase2_output)
        commands.append(
            [
                sys.executable,
                str(build_script),
                "--root-concept",
                root,
                "--concept-list-length",
                str(args.phase2_children),
                "--max-depth",
                str(args.phase2_depth),
                "--exclude-strategy",
                args.exclude_strategy,
                "--exclude-local-limit",
                str(args.exclude_local_limit),
                "--output",
                str(phase2_output),
                "--state-file",
                str(phase2_state),
            ]
        )

    merge_command = [
        sys.executable,
        str(merge_script),
        "--input",
        str(phase1_output),
        *[str(path) for path in phase2_outputs],
        "--output",
        str(merged_output),
        "--json-output",
        str(merge_stats_json),
    ]
    commands.append(merge_command)

    if not args.skip_quality_report:
        commands.append(
            [
                sys.executable,
                str(report_script),
                "--input",
                str(merged_output),
                "--mode",
                "raw",
                "--output",
                str(merged_quality_md),
                "--json-output",
                str(merged_quality_json),
            ]
        )

    if args.baseline_input:
        commands.append(
            [
                sys.executable,
                str(report_script),
                "--input",
                args.baseline_input,
                str(merged_output),
                "--mode",
                "raw",
                "--output",
                str(comparison_quality_md),
                "--json-output",
                str(comparison_quality_json),
            ]
        )

    if args.dry_run:
        print("[two-phase] Dry run. Planned commands:", flush=True)
        for idx, command in enumerate(commands, start=1):
            print(f"  {idx}. {render_command(command)}", flush=True)
        print(f"[two-phase] Phase2 roots ({len(phase2_roots)}): {', '.join(phase2_roots)}", flush=True)
        print(f"[two-phase] Planned merged output: {merged_output}", flush=True)
        if not args.skip_quality_report:
            print(f"[two-phase] Planned report directory: {reports_dir}", flush=True)
        return

    work_dir.mkdir(parents=True, exist_ok=True)
    phase2_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    print(f"[two-phase] Phase2 roots ({len(phase2_roots)}): {', '.join(phase2_roots)}", flush=True)
    for command in commands:
        run_command(command)

    print(f"[two-phase] Merged output: {merged_output}", flush=True)
    if not args.skip_quality_report:
        print(f"[two-phase] Quality reports: {reports_dir}", flush=True)
    if args.baseline_input:
        print(f"[two-phase] Baseline comparison report: {comparison_quality_md}", flush=True)


if __name__ == "__main__":
    main()
