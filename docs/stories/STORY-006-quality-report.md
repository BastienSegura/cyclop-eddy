# STORY-006: Add Concept-Pipeline Quality Report

ID: `STORY-006`
Title: `Add concept-pipeline quality report`
Status: `ready`
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

- [ ] A command generates a human-readable report (Markdown or JSON + Markdown summary).
- [ ] Report includes core metrics: malformed lines, meta leaks, self-edges, duplicate variants, fanout distribution, cycle count, root candidates, line counts.
- [ ] Report can be run on both raw and cleaned files.
- [ ] Report output path and invocation are documented.

## Subtasks

- [ ] Create `brain/report_concept_quality.py` (or equivalent).
- [ ] Implement metric extraction functions with deterministic output.
- [ ] Add optional `--fail-on-threshold` flags for CI/manual gate use.
- [ ] Document default thresholds and interpretation guidelines.

## Dependencies

- STORY-002 and STORY-003 improve usefulness of quality metrics.

## Risks

- Risk: Too many metrics reduce signal and are ignored.
- Mitigation: Keep default summary short and prioritized.

## Validation

- Run report against current `memory/concept_list.txt` and cleaned file.
- Verify known issues are surfaced in report output.
- Confirm report can be committed/published alongside data refresh.
