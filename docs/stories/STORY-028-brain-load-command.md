# STORY-028: Add Brain Load Command

ID: `STORY-028`
Title: `Add brain load command`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-07`

## Context

- Most inspection commands need an active graph source.
- The intended default source is `memory/runtime/concept_list_cleaned.txt`, but a fresh clone may only have committed fixture data.
- The REPL should let a user switch sources explicitly instead of retyping file paths on every command.

## Problem

- There is no session-level concept of “active graph source.”
- Inspection commands will become noisy and repetitive if every call requires a full `--input` path.
- A shell without explicit source switching will not feel stateful.

## Goal

- Add a `load` command that sets the active graph source for later graph-inspection commands.

## Out of Scope

- Searching or selecting a concept within the loaded graph (handled by later command stories).
- Auto-running graph analysis after load unless explicitly requested by another command.

## Acceptance Criteria

- [x] `load cleaned` sets the active source to `memory/runtime/concept_list_cleaned.txt`.
- [x] `load raw` sets the active source to `memory/runtime/concept_list.txt`.
- [x] `load fixture` sets the active source to `memory/fixtures/demo/concept_list_cleaned.txt`.
- [x] `load <path>` accepts an explicit path and records it as the active source when the file exists.
- [x] The shell session stores active source path, source alias, and inferred parse mode without requiring the graph to be reparsed by every later command.
- [x] If the requested source cannot be loaded, the command reports the failure and leaves the previous session source unchanged.

## Subtasks

- [x] Define source aliases and their canonical paths.
- [x] Add graph parsing/loading helpers suitable for repeated REPL use.
- [x] Cache parsed graph/source metadata in `BrainCliSession`.
- [x] Add tests for alias loads, explicit path loads, and failed load rollback behavior.

## Dependencies

- STORY-022
- STORY-023

## Risks

- Risk: raw and cleaned files behave differently and load logic drifts from existing parsing rules.
- Mitigation: reuse shared `brain` parsing utilities introduced in STORY-019.

## Validation

- Launch the REPL and run `load cleaned`, `load raw`, `load fixture`, and `load <missing-path>`.
- Confirm `status` reflects the active source after successful loads.
- Run CLI tests and `python -m unittest discover -s brain/tests -p 'test_*.py'`.
