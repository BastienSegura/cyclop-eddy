# STORY-019: Extract Shared Brain Utilities and Split Generator Responsibilities

ID: `STORY-019`
Title: `Extract shared brain utilities and split generator responsibilities`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- `brain/concept_identity.py` already centralizes concept normalization and identity rules, which is a good foundation.
- Graph-file parsing helpers are currently duplicated across multiple scripts:
- `brain/find_unexplored_areas.py` implements `decode_path_segment`, `infer_line_mode`, `infer_file_mode`, and `extract_parent_label`.
- `brain/report_concept_quality.py` implements the same helper set again with effectively identical behavior.
- Cycle/path analysis helpers are also repeated across scripts instead of being shared.
- `brain/build_concept_list.py` currently combines:
- Ollama HTTP client logic
- prompt rendering
- candidate validation
- generator state creation and migration
- output sync/persistence
- traversal/orchestration loop
- CLI argument parsing
- This makes the main generator script the largest and highest-coupling unit in the Python side of the repo.

## Problem

- Shared parsing and graph-analysis behavior can drift because it lives in multiple files.
- Refactoring or bug-fixing one script requires manually remembering all duplicate implementations.
- The generator script is harder to test and change safely because multiple concerns are entangled in one entry-point file.

## Goal

- Introduce shared `brain/` utility modules for graph-file parsing and graph-analysis helpers.
- Reduce script duplication so active scripts import shared logic instead of reimplementing it.
- Turn `brain/build_concept_list.py` into a thin CLI/orchestration entry point over smaller internal modules.

## Out of Scope

- Changing the external CLI commands or default file paths unless needed for the refactor.
- Changing the concept generation algorithm, prompt strategy, or checkpoint schema semantics.
- Rewriting the Python tooling into a full installed package.

## Acceptance Criteria

- [x] Shared helpers for raw/cleaned graph-file parsing live in one module and are imported by `find_unexplored_areas.py`, `report_concept_quality.py`, and any other active script that needs them.
- [x] Shared graph-analysis helpers for adjacency/path/cycle primitives live in one module and replace duplicated local implementations where behavior is meant to match.
- [x] `brain/build_concept_list.py` delegates prompt construction, checkpoint/state handling, and generation runtime behavior to internal modules instead of keeping all concerns inline.
- [x] The refactor preserves current CLI behavior for `python brain/build_concept_list.py`, `python brain/report_concept_quality.py`, `python brain/find_unexplored_areas.py`, and `python brain/run_two_phase_coverage.py`.
- [x] Existing checkpoint resume behavior remains compatible with current state version handling.
- [x] Brain test coverage is expanded or updated to cover the newly extracted shared modules and any migrated generator state logic.
- [x] All active `brain` README/docs references remain accurate after the refactor.

## Subtasks

- [x] Create a shared graph-file utility module for path-segment decoding, file/line mode inference, parent extraction, and parsed edge normalization.
- [x] Create a shared graph-analysis module for adjacency building, path search, cycle key generation, and any other intentionally shared primitives.
- [x] Replace duplicate helper implementations in `find_unexplored_areas.py` and `report_concept_quality.py` with imports from the new shared modules.
- [x] Extract generator prompt/client logic from `build_concept_list.py` into dedicated internal module(s).
- [x] Extract generator state creation, persistence, migration, and output reconstruction from `build_concept_list.py` into dedicated internal module(s).
- [x] Leave `build_concept_list.py` responsible only for CLI parsing and high-level orchestration.
- [x] Add or update tests for shared parsing helpers, shared cycle/path helpers, and checkpoint migration behavior.
- [x] Run all existing brain commands documented in `brain/README.md` to confirm no CLI regressions.

## Dependencies

- STORY-017

## Risks

- Risk: refactoring shared helpers changes subtle parsing behavior for raw vs cleaned files.
- Mitigation: add fixture-based tests that compare before/after outputs for both raw and cleaned examples.
- Risk: generator resume compatibility regresses during state extraction.
- Mitigation: keep current state version contract and add resume tests that exercise older version migration paths.

## Validation

- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
- Run `python brain/report_concept_quality.py --input memory/concept_list.txt memory/concept_list_cleaned.txt`.
- Run `python brain/find_unexplored_areas.py --input memory/concept_list_cleaned.txt --target-children 8 --top-n 10`.
- Run `python brain/run_two_phase_coverage.py --phase2-roots "Operating Systems" "Databases" --dry-run`.
- Exercise a resume scenario for `brain/build_concept_list.py` and confirm state load/migration still works.
