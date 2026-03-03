# STORY-010: Add Unexplored Frontier Detection Tool

ID: `STORY-010`
Title: `Add unexplored frontier detection tool`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Coverage work needs a fast way to identify where the graph is still under-explored.
- Current approach requires manual inspection of edge files.
- A dedicated script in `brain/` can produce ranked frontier areas to guide next generation runs.
- Proposed source input: `memory/concept_list_cleaned.txt` (or raw via optional parsing mode).

## Problem

- There is no automated signal for where to continue expansion.
- Users cannot quickly select next roots for refinement runs.

## Goal

- Provide a simple CLI tool that ranks unexplored/under-explored graph zones.
- Output should be actionable for follow-up generation commands.

Boundary:
- This story owns frontier ranking and root suggestion output only.
- General dataset quality reporting remains owned by STORY-006.

## Out of Scope

- GUI integration.
- Interactive visualization.
- Building a full quality report replacement.

## Acceptance Criteria

- [x] Add `brain/find_unexplored_areas.py` with CLI args for input path and target children.
- [x] Tool reports nodes with `out_degree=0` and `out_degree<target_children`.
- [x] Tool includes a priority score (for example deficit + shallow-depth bonus).
- [x] Tool outputs a top-N list directly usable as next roots.
- [x] Usage and examples are documented in `brain/README.md`.

## Subtasks

- [x] Parse cleaned edge file into adjacency/depth maps.
- [x] Compute metrics per node: depth, out-degree, deficit, reachable descendants (optional).
- [x] Implement deterministic priority scoring and sort.
- [x] Add output modes (`table` and optional `json`).
- [x] Document a workflow: run tool -> pick roots -> run refinement generation.

## Dependencies

- STORY-009 for two-phase coverage workflow.
- STORY-006 for shared metric conventions and terminology alignment.

## Risks

- Risk: Scoring heuristic may over-prioritize noisy leaf concepts.
- Mitigation: Include filters (min depth, max depth, include/exclude leaves).

## Validation

- Run tool against current cleaned dataset.
- Confirm top-N includes obvious under-expanded nodes.
- Use top suggestions as roots in a refinement run and verify coverage increase.

Implemented with:
- `brain/find_unexplored_areas.py`
  - parses cleaned/raw edge files (`--mode auto|cleaned|raw`) into canonical adjacency and depth maps.
  - computes node metrics: depth, out-degree, deficit, reachable descendants.
  - ranks frontier candidates using deterministic priority score (`deficit + depth bonus + descendants bonus` with leaf penalty).
  - supports filters to reduce noisy leaves (`--exclude-leaves`, `--min-depth`, `--max-depth`).
  - supports `table` and `json` output modes and optional `--json-output` artifact.
  - prints top-N suggested roots one-per-line for direct reuse in refinement workflows.
- tests:
  - `brain/tests/test_find_unexplored_areas.py` covering cleaned/raw parsing, leaf filtering, and JSON CLI output.
- docs:
  - `brain/README.md`
  - `README.md`
  - `docs/manifest.md`

Validation evidence:
- `python -m unittest brain.tests.test_find_unexplored_areas` passed (`3` tests).
- `python brain/find_unexplored_areas.py --input memory/concept_list_cleaned.txt --target-children 8 --top-n 10`
  - returned ranked leaf frontier suggestions.
- `python brain/find_unexplored_areas.py --input memory/concept_list_cleaned.txt --target-children 8 --top-n 10 --exclude-leaves`
  - returned non-leaf underfilled branches suitable for phase-2 refinement roots.
