# STORY-007: Add Regression Tests for Pipeline and Graph Build

ID: `STORY-007`
Title: `Add regression tests for pipeline and graph build`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Critical pipeline behavior currently lacks focused regression tests.
- Recent defects were discovered by manual inspection:
- meta line leakage from generation output
- canonicalization mismatch between stages
- hyphen decoding identity split in GUI graph assembly
- stale artifact mismatch between memory and GUI data
- Without fixed fixtures and assertions, these regressions are likely to reappear.

## Problem

- There is no automated safety net for core data-path invariants.
- Refactors in `brain/` or `gui/` can silently break graph correctness.

## Goal

- Add high-signal regression tests that lock current and future fixes.
- Ensure data-path invariants are validated in CI/local runs.

## Out of Scope

- End-to-end browser UI visual tests.
- Performance benchmarking.

## Acceptance Criteria

- [x] `brain` test suite covers parsing/cleaning normalization, meta filtering, self-edge removal, and path-prefix construction.
- [x] `gui` test suite covers edge list parsing and node identity preservation for hyphenated concepts.
- [x] Tests include fixtures reproducing known defects from this analysis.
- [x] Documentation includes commands to run all new tests locally.

## Subtasks

- [x] Add `brain/tests/` fixtures for malformed/meta/marker-rich input files.
- [x] Add unit tests for cleaner parsing and canonicalization behavior.
- [x] Add `gui` unit tests for `build-concept-graph.ts` and `parse-edge-list.ts`.
- [x] Add one cross-file parity test for artifact sync assumptions.
- [x] Document test commands in root and component READMEs.

## Dependencies

- STORY-002, STORY-003, and STORY-004 to finalize target behavior.

## Risks

- Risk: Fragile tests tied to incidental ordering.
- Mitigation: Assert stable invariants and use deterministic fixtures.

## Validation

- Run full test commands for `brain` and `gui`.
- Confirm fixtures fail on old buggy behavior and pass after fixes.
- Confirm CI can execute tests without manual data prep.

Implemented with:
- Brain fixtures:
  - `brain/tests/fixtures/raw_malformed_meta_markers.txt`
- Brain tests:
  - `brain/tests/test_clean_concept_list_parsing.py`
  - `brain/tests/test_sync_concept_data_parity.py`
  - existing regression tests retained and run together (`test_concept_identity.py`, `test_build_concept_list_canonical.py`, `test_clean_concept_list_cycles.py`, `test_report_concept_quality.py`)
- GUI tests:
  - `gui/src/features/concept-graph/domain/parse-edge-list.test.ts`
  - `gui/src/features/concept-graph/application/build-concept-graph.test.ts`
- GUI test runner setup:
  - `tsx` dev dependency
  - `npm run test` script in `gui/package.json`
- Docs commands added:
  - `README.md`
  - `brain/README.md`
  - `gui/README.md`

Validation evidence:
- `python -m unittest discover -s brain/tests -p 'test_*.py'` passed (`18` tests).
- `cd gui && npm run test` passed (`3` tests).
- `cd gui && npm run typecheck` passed.
