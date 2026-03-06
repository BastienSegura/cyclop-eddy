# STORY-026: Add Brain Status Command

ID: `STORY-026`
Title: `Add brain status command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The repo now has explicit artifact ownership (`memory/runtime/`, `memory/fixtures/`, `gui/public/data/concept_list_cleaned.txt`) and a default checkpoint path (`memory/runtime/concept_list_state.json`).
- Users entering the REPL need a fast way to understand what is present before running generation, sync, or graph inspection commands.
- The command should expose both session state and key on-disk runtime state.

## Problem

- Today a contributor has to inspect multiple files manually to answer simple questions:
  - Is there a checkpoint to resume?
  - Which graph source is active in the shell?
  - Does the canonical cleaned artifact exist?
  - Has the GUI sync target been generated?
- Without this visibility, the REPL will still feel like a thin wrapper over the filesystem.

## Goal

- Add a `status` command that summarizes current shell state plus key runtime artifacts.

## Out of Scope

- Deep health checks such as Ollama/model reachability (handled by `doctor`).
- Mutating any files or shell session state.

## Acceptance Criteria

- [ ] `status` prints the active shell graph source, active graph mode/alias, and current concept selection.
- [ ] `status` reports existence and basic metadata for the default raw artifact, canonical cleaned artifact, derived GUI target, default checkpoint state file, and current fixture fallback.
- [ ] `status` clearly distinguishes missing files from existing files and does not crash when runtime outputs have not been generated yet.
- [ ] `status --json` returns the same information in machine-readable form.
- [ ] The command uses default repo paths from STORIES 017-018 rather than hard-coded duplicated literals scattered across the handler.

## Subtasks

- [ ] Define a status payload shape shared by text and JSON output.
- [ ] Implement file existence/mtime/size collection for core artifacts.
- [ ] Include session values from `BrainCliSession`.
- [ ] Add tests covering both “fresh clone-like” and “runtime artifacts present” states.

## Dependencies

- STORY-022
- STORY-023

## Risks

- Risk: `status` duplicates path constants and drifts from the actual scripts.
- Mitigation: centralize default CLI paths in one module and import them everywhere.

## Validation

- Run `status` from a shell with no current concept and no checkpoint.
- Create or point to a test checkpoint/artifact set and re-run `status`.
- Run the CLI tests and `python -m unittest discover -s brain/tests -p 'test_*.py'`.
