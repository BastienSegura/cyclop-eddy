# STORY-040: Add Brain Sync Command

ID: `STORY-040`
Title: `Add brain sync command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- STORY-018 made `memory/runtime/concept_list_cleaned.txt` the canonical cleaned artifact and `gui/public/data/concept_list_cleaned.txt` the derived GUI target.
- The standalone sync workflow already exists in `brain/sync_concept_data.py` and combines clean, copy, and parity verification.
- The REPL will often be used immediately after generation, so sync is one of the core operator commands.

## Problem

- The shell currently has no first-class way to run the clean-and-sync workflow.
- Users must remember both the standalone script name and the meaning of the canonical-vs-derived output paths.
- If sync changes the file currently loaded in the session, the REPL risks serving stale cached graph data unless it handles cache invalidation explicitly.

## Goal

- Add a `sync` command that wraps the existing clean-and-sync workflow and integrates it safely with REPL session state.

## Out of Scope

- Automatically launching the GUI or refreshing browser sessions.
- Changing the canonical cleaned artifact contract established by STORY-018.
- Editing graph data manually from the shell.

## Acceptance Criteria

- [ ] `sync` runs the current clean-and-sync workflow using the documented default paths for raw input, canonical cleaned output, and derived GUI output.
- [ ] The command exposes the existing workflow knobs needed by operators: `--input`, `--cleaned-output`, `--gui-output`, `--root`, `--cycle-policy`, and `--max-cycle-examples`.
- [ ] Successful output clearly identifies the raw input, canonical cleaned artifact, derived GUI target, and parity-check result.
- [ ] If the active session graph source points at a file changed by `sync`, the command invalidates or refreshes the in-memory graph cache so later inspection commands do not use stale data.
- [ ] Failures in cleaning or parity verification surface as clear command errors; they do not terminate the interactive shell.
- [ ] `sync` does not implicitly change the current concept selection.

## Subtasks

- [ ] Add a CLI wrapper around the existing sync workflow using shared modules instead of shelling out where practical.
- [ ] Define cache invalidation rules for active sources touched by the command.
- [ ] Add tests for success, parity failure, and cache-refresh behavior.
- [ ] Document the canonical-vs-derived paths in `help sync`.

## Dependencies

- STORY-023
- STORY-028

## Risks

- Risk: sync completes successfully on disk but the REPL continues using stale in-memory graph data.
- Mitigation: require explicit cache invalidation/refresh when touched paths match the active source.
- Risk: the CLI wrapper changes sync semantics relative to the existing script.
- Mitigation: preserve the current workflow contract and reuse shared cleaning/sync logic.

## Validation

- Launch `python -m brain.cli`, run `sync`, and verify the command names the canonical cleaned path and GUI target.
- Load the cleaned graph, run `sync` again after changing raw input, and confirm later inspection commands use refreshed data.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
