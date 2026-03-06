# STORY-022: Add Brain CLI Entry Point and Command Registry

ID: `STORY-022`
Title: `Add brain CLI entry point and command registry`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The repository already contains strong `brain/` primitives (`build_concept_list.py`, `sync_concept_data.py`, `report_concept_quality.py`, `find_unexplored_areas.py`, `run_two_phase_coverage.py`), but each tool is still a standalone script.
- The desired UX is a dedicated interpreter started from one command, closer to `python` or `sqlite3`, with a persistent `brain>` prompt and strict commands.
- Multiword command families are already implied by the desired surface: `generate start`, `generate resume`, `quality report`, `coverage plan`.
- STORY-019 extracted shared `brain` modules (`build_concept_list_runtime.py`, `build_concept_list_state.py`, `graph_file_utils.py`, `graph_analysis.py`), which makes a command layer practical without driving everything through subprocesses.

## Problem

- There is no single repo-local entry point for a brain CLI.
- Without a shared registry and dispatcher, every command will invent its own parsing and output conventions.
- The REPL cannot exist cleanly until command metadata, shared session state, and command dispatch are standardized.

## Goal

- Create the reusable command foundation for a repo-local brain CLI.
- Make multiword strict commands first-class instead of bolting them onto ad hoc script wrappers.
- Establish one place where command metadata, session state, and output conventions live.

## Out of Scope

- Implementing the interactive REPL prompt loop itself.
- Implementing any specific end-user command behavior beyond registration/dispatch.
- Replacing or deleting the existing standalone `brain/*.py` scripts.

## Acceptance Criteria

- [ ] A new `brain/cli/` package exists with a repo-local entry point (`python -m brain.cli`) and shared modules for registry/dispatch, session state, output helpers, and CLI-specific errors.
- [ ] The command registry supports exact multiword command chains such as `generate start`, `generate resume`, `quality report`, and `coverage plan`.
- [ ] Every registered command exposes metadata needed by later help/discovery features: canonical name, short description, argument contract, and handler reference.
- [ ] A shared `BrainCliSession` contract exists and includes at minimum: active graph source path, active graph mode/source alias, optional parsed graph cache, current concept, and output mode.
- [ ] The dispatcher resolves command chains deterministically and passes remaining arguments to the target handler without command-specific parsing logic leaking into the REPL loop.
- [ ] Existing standalone `brain/*.py` commands remain callable exactly as they are today.

## Subtasks

- [ ] Add `brain/cli/` modules such as `__main__.py`, `registry.py`, `session.py`, `output.py`, and `errors.py` (or equivalent structure).
- [ ] Define a typed command handler contract that works for both REPL and future one-shot invocation.
- [ ] Implement exact command-chain resolution and unambiguous unknown-command errors.
- [ ] Add command metadata storage that later stories can reuse for `help`.
- [ ] Add unit tests for registry registration, dispatch resolution, and session default construction.

## Dependencies

- STORY-019

## Risks

- Risk: registry design is too narrow and later command stories work around it.
- Mitigation: require multiword command support and metadata from the start.
- Risk: the new CLI layer duplicates logic already solved inside existing scripts.
- Mitigation: keep this story focused on dispatch/session contracts only; wrapper stories must call shared modules directly where possible.

## Validation

- Add CLI-specific tests (for example `brain/tests/test_cli_registry.py`) covering registration and dispatch.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
- Confirm `python -m brain.cli` imports through the new entry point without import-path hacks or package errors.
