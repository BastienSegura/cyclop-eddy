# STORY-029: Add Brain Current Command

ID: `STORY-029`
Title: `Add brain current command`
Status: `done`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-07`

## Context

- The REPL session is expected to remember the active graph source and, later, the currently selected concept.
- Users need a lightweight command that prints session state without the broader filesystem summary from `status`.
- `current` is especially useful once `load` and `use` begin mutating session state.

## Problem

- `status` is too broad for quickly checking the session context.
- Without a focused session-inspection command, users will not know which concept later omitted-argument commands will target.

## Goal

- Add a `current` command that prints the REPL’s current session context only.

## Out of Scope

- Filesystem health or artifact existence checks.
- Graph search or node inspection details beyond the current concept summary.

## Acceptance Criteria

- [x] `current` prints the active graph source path, source alias/mode, and current concept if one is selected.
- [x] If no current concept is selected, the command prints that state explicitly instead of implying a hidden default.
- [x] `current --json` returns the same session state in machine-readable form.
- [x] The command does not trigger filesystem mutations or expensive graph recomputation.

## Subtasks

- [x] Define the session-state payload shape for `current`.
- [x] Render both text and JSON views.
- [x] Add tests for “no current concept” and “current concept selected” states.

## Dependencies

- STORY-023
- STORY-028

## Risks

- Risk: `current` becomes a second copy of `status`.
- Mitigation: keep it strictly scoped to in-memory session state.

## Validation

- Launch the REPL, run `current` before and after `load`/`use`.
- Run CLI tests and `python -m unittest discover -s brain/tests -p 'test_*.py'`.
