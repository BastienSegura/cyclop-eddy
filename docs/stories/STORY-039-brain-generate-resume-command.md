# STORY-039: Add Brain Generate Resume Command

ID: `STORY-039`
Title: `Add brain generate resume command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The generator already supports `--resume` with a checkpoint file, and the default checkpoint path is `memory/runtime/concept_list_state.json`.
- The REPL needs a low-friction way to resume interrupted work without making users remember or retype the standalone script invocation.
- Resume semantics are more sensitive than fresh-start semantics because the state file already owns the run configuration.

## Problem

- There is no first-class REPL command for resuming generation from checkpoint state.
- Users must remember the standalone script syntax and state-file location even though the repo now has canonical runtime paths.
- If resume is exposed loosely, users may try to override flags that should be owned by the checkpoint state, creating ambiguous behavior.

## Goal

- Add `generate resume` as the REPL's canonical checkpoint-resume command.

## Out of Scope

- Editing checkpoint contents from the shell.
- Migrating incompatible historical checkpoint formats.
- Auto-detecting and merging multiple checkpoint files.

## Acceptance Criteria

- [ ] `generate resume` is registered as a multiword command and defaults to `memory/runtime/concept_list_state.json` when no `--state` override is provided.
- [ ] The command resumes generation using the run configuration stored in the checkpoint state instead of silently overriding it with fresh-start flags.
- [ ] Unsupported or conflicting fresh-start flags passed to `generate resume` return a clear usage error.
- [ ] Running the command from inside the REPL streams progress and respects the same `Ctrl+C` cancel-to-prompt behavior as `generate start`.
- [ ] If the checkpoint file is missing or invalid, the command fails clearly without mutating the current session context.
- [ ] `generate resume` does not implicitly run `sync`, change the active graph source, or clear the current concept.

## Subtasks

- [ ] Define the allowed argument surface for `generate resume`, including `--state`.
- [ ] Reuse the generator resume path from the extracted runtime/state modules.
- [ ] Add explicit validation for missing, malformed, or incompatible state files.
- [ ] Add tests for default-state resume, overridden-state resume, conflicting-argument errors, and command interruption behavior.

## Dependencies

- STORY-038

## Risks

- Risk: resume starts a fresh run accidentally instead of restoring from state.
- Mitigation: forbid conflicting fresh-start flags and validate state presence before execution.
- Risk: invalid state files crash with Python tracebacks instead of operator-friendly errors.
- Mitigation: normalize checkpoint validation and error rendering inside the CLI handler.

## Validation

- Launch `python -m brain.cli`, create an interrupted generation checkpoint, then run `generate resume`.
- Run `generate resume --state <missing-file>` and confirm a clear error while the shell stays alive.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
