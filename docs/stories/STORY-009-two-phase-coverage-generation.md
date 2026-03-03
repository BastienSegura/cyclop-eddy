# STORY-009: Add Two-Phase Coverage Generation Strategy

ID: `STORY-009`
Title: `Add two-phase coverage generation strategy`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Single-run deep generation does not maximize coverage reliably when strict validation and dedup are active.
- Recommended strategy for coverage goal:
- Phase 1 wide scan: higher children, lower depth (example `14x2`).
- Phase 2 refinement: lower children, higher depth (example `8x3`) on selected frontier roots.
- This aligns better with "list all CS concepts" than forcing high fullness at depth 3 for all branches.

## Problem

- Current workflow treats generation as one monolithic run.
- There is no documented or scripted approach for iterative coverage expansion by phase.

## Goal

- Establish a repeatable two-phase generation workflow optimized for concept coverage.
- Make phase outputs mergeable and comparable using existing reporting outputs.

Boundary:
- This story owns orchestration/workflow (run phases + merge + documented commands).
- Metric engine implementation is owned by STORY-006.

## Out of Scope

- Full automation of ontology completion.
- Human curation UI.
- Implementing a new quality metrics/reporting engine.

## Acceptance Criteria

- [x] A documented two-phase command sequence exists with parameter guidance.
- [x] Phase outputs can be merged into a single deduplicated edge file.
- [x] Workflow includes objective comparison checkpoints using STORY-006 report outputs.
- [x] README/docs clearly state when to use two-phase mode vs single run.

## Subtasks

- [x] Add script or command docs for Phase 1 (wide) and Phase 2 (refinement).
- [x] Add merge utility for multi-run raw outputs with deterministic dedup.
- [x] Wire merge workflow to consume metrics from STORY-006 report command.
- [x] Document recommended defaults and tuning guidance.
- [x] Add example run transcript in docs.

## Dependencies

- STORY-006 for quality/coverage reporting (required).
- STORY-010 for frontier root selection input.

## Risks

- Risk: Multi-run merging can introduce inconsistent path quality.
- Mitigation: Merge on canonical raw edges and rerun cleaner once at the end.

## Validation

- Execute Phase 1 and Phase 2 on sample root.
- Merge outputs and confirm monotonic unique edge growth.
- Compare coverage metrics against a single baseline run.

Implemented with:
- `brain/merge_concept_edges.py`
  - deterministic canonical dedup merge for multi-run raw edge files.
  - outputs merged raw file + optional JSON merge stats.
- `brain/run_two_phase_coverage.py`
  - orchestrates phase 1 (`14x2` default guidance) + phase 2 (`8x3` default guidance).
  - supports roots from CLI and/or file, canonical dedup of refinement roots.
  - runs merge step and quality checkpoints using `report_concept_quality.py`.
  - supports dry-run planning mode and optional baseline-vs-merged report.
- tests:
  - `brain/tests/test_merge_concept_edges.py`
  - `brain/tests/test_run_two_phase_coverage.py`
- docs:
  - `brain/README.md` (workflow, tuning guidance, dry-run transcript)
  - `README.md` (mode selection guidance)
  - `docs/manifest.md` (project-level two-phase workflow)

Validation evidence:
- `python -m unittest brain.tests.test_merge_concept_edges` passed (`2` tests).
- `python -m unittest brain.tests.test_run_two_phase_coverage` passed (`2` tests).
