# STORY-001: Enforce Pipeline Artifact Sync

ID: `STORY-001`
Title: `Enforce pipeline artifact sync`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- The raw generator output and cleaned output are out of sync.
- Observed timestamps:
- `memory/concept_list.txt`: `2026-02-26 11:50`
- `memory/concept_list_cleaned.txt`: `2026-02-25 23:40`
- `gui/public/data/concept_list_cleaned.txt`: `2026-02-25 23:59`
- Re-cleaning current raw data yields 413 cleaned lines, while the committed cleaned files have 295 lines.
- The GUI loads `public/data/concept_list_cleaned.txt`, so stale files directly affect user-visible behavior.

## Problem

- The generation pipeline has no enforced handoff from raw output to cleaned output to GUI data source.
- Developers can run generation but forget cleaning and/or GUI sync, causing drift and invalid analysis/debugging.

## Goal

- Make artifact sync deterministic and hard to forget.
- Ensure `concept_list.txt`, `concept_list_cleaned.txt`, and `gui/public/data/concept_list_cleaned.txt` can be refreshed with one standard workflow.

## Out of Scope

- Improving LLM concept quality.
- Redesigning graph rendering.

## Acceptance Criteria

- [ ] A documented single command (or script target) regenerates cleaned data from current raw data and syncs GUI data.
- [ ] The workflow verifies line-count parity between `memory/concept_list_cleaned.txt` and `gui/public/data/concept_list_cleaned.txt`.
- [ ] Docs explicitly define when this workflow must be run (after generation/resume completion).

## Subtasks

- [ ] Add a small sync script or task runner command for clean + copy.
- [ ] Add a guard step that fails if cleaned memory file and GUI data file differ.
- [ ] Update root `README.md` and `memory/README.md` with the canonical workflow.
- [ ] Add example output so contributors can quickly confirm success.

## Dependencies

- None.

## Risks

- Risk: Contributors bypass canonical workflow and manually copy files.
- Mitigation: Keep command simple and place it in top-level docs.

## Validation

- Run canonical sync command from a fresh checkout.
- Confirm both cleaned files are byte-identical.
- Launch GUI and verify latest edges appear (no stale subset).
