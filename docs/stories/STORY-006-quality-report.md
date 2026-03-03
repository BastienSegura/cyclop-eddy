# STORY-006: Add Concept-Pipeline Quality Report

ID: `STORY-006`
Title: `Add concept-pipeline quality report`
Status: `done`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Current quality checks are manual and reactive.
- Recent analysis required ad-hoc commands to detect:
- meta/instruction leaks in raw edges
- malformed and self edges
- parent fanout anomalies
- stale cleaned artifacts
- node identity drift in GUI graph build
- There is no standard artifact that summarizes data quality after generation/cleaning.

## Problem

- Teams cannot quickly assess whether a newly generated dataset is healthy.
- Regressions can be committed because no baseline report is produced by default.

## Goal

- Produce a deterministic quality report for each dataset refresh.
- Make graph health visible before copying data to GUI.

## Out of Scope

- Automatic semantic scoring by external models.
- Data warehouse/analytics infrastructure.

## Acceptance Criteria

- [x] A command generates a human-readable report (Markdown or JSON + Markdown summary).
- [x] Report includes core metrics: malformed lines, meta leaks, self-edges, duplicate variants, fanout distribution, cycle count, root candidates, line counts.
- [x] Report can be run on both raw and cleaned files.
- [x] Report output path and invocation are documented.

## Subtasks

- [x] Create `brain/report_concept_quality.py` (or equivalent).
- [x] Implement metric extraction functions with deterministic output.
- [x] Add optional `--fail-on-threshold` flags for CI/manual gate use.
- [x] Document default thresholds and interpretation guidelines.

## Dependencies

- STORY-002 and STORY-003 improve usefulness of quality metrics.

## Risks

- Risk: Too many metrics reduce signal and are ignored.
- Mitigation: Keep default summary short and prioritized.

## Validation

- Run report against current `memory/concept_list.txt` and cleaned file.
- Verify known issues are surfaced in report output.
- Confirm report can be committed/published alongside data refresh.

Implemented with:
- `brain/report_concept_quality.py`
  - supports raw/cleaned/auto mode parsing
  - outputs markdown summary to stdout and optional markdown/json files
  - reports malformed/meta/self metrics, duplicate variants, fanout distribution, cycle edges/examples, root candidates, line counts
  - supports threshold gate mode via `--fail-on-threshold` and optional max flags
- test coverage:
  - `brain/tests/test_report_concept_quality.py`

Documentation updates:
- `brain/README.md` (invocation, output files, threshold defaults and interpretation)
- `docs/manifest.md` (quality reporting workflow and gate defaults)

Validation evidence:
- `python brain/report_concept_quality.py --input memory/concept_list.txt memory/concept_list_cleaned.txt --output /tmp/concept_quality_report.story6.md --json-output /tmp/concept_quality_report.story6.json`
- `python brain/report_concept_quality.py --input memory/concept_list_cleaned.txt --mode cleaned --fail-on-threshold --max-cycle-edges 0` exited with code `2` and printed threshold violation.
