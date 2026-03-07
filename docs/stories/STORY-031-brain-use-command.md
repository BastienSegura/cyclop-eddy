# STORY-031: Add Brain Use Command

ID: `STORY-031`
Title: `Add brain use command`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-07`

## Context

- The REPL is expected to feel stateful, not purely stateless, and the main piece of session context beyond the active graph source is the current concept.
- Later commands such as `show`, `children`, `parents`, `neighbors`, and `prompt` are intended to accept an omitted concept argument and fall back to the session's current concept.
- `search` is the natural precursor to `use`, because users often need to discover the exact label before selecting it.

## Problem

- There is currently no command that sets the active concept in the REPL session.
- Without a `use` command, every graph-inspection command must repeat the full concept label, which defeats much of the value of a persistent shell.
- If each command resolves labels on its own, selection behavior will drift and current-context UX will remain inconsistent.

## Goal

- Add a `use <concept>` command that resolves a concept from the active graph and stores its canonical label in session state.

## Out of Scope

- Interactive selection menus or numbered pickers.
- Selecting multiple concepts at once.
- Persisting the current concept across separate shell sessions.

## Acceptance Criteria

- [x] `use <concept>` resolves the target label against the active graph using case-insensitive exact matching and stores the canonical matched label in `BrainCliSession`.
- [x] `use` accepts quoted multiword labels exactly as parsed by the shell (`use "Operating Systems"`).
- [x] If the requested concept does not resolve, `use` leaves the previous current concept unchanged and prints a clear error with a short ranked suggestion list derived from the shared search helper.
- [x] `current` and all later omitted-argument graph commands observe the newly selected concept after a successful `use`.
- [x] `use` does not mutate graph files, runtime artifacts, or the active graph source path.

## Subtasks

- [x] Reuse the shared lookup helper from STORY-030 for exact resolution and suggestions.
- [x] Update `BrainCliSession` when selection succeeds.
- [x] Add tests for successful selection, quoted labels, failed resolution, and rollback of the previous current concept on failure.
- [x] Ensure `help use` documents that `use` changes session context for later commands.

## Dependencies

- STORY-028
- STORY-030

## Risks

- Risk: selection logic accepts ambiguous partial matches and changes session state unexpectedly.
- Mitigation: require exact matching for `use` and reserve partial matching for `search` suggestions only.
- Risk: failed resolution silently clears the current concept.
- Mitigation: explicitly preserve the previous session value on errors and cover it with tests.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Operating Systems"`, then `current`.
- Run `use "Operating"` and confirm the command fails with suggestions while preserving the previous concept.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
