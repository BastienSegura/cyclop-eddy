# STORY-027: Add Brain Doctor Command

ID: `STORY-027`
Title: `Add brain doctor command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The repo depends on local conditions that can fail silently: Ollama reachability, writable runtime directories, expected fixture/runtime paths, and imported Python dependencies.
- `build_concept_list.py` currently fails late if Ollama is unavailable.
- A REPL should provide one operator-friendly health check before users start generation or sync workflows.

## Problem

- There is no single command that answers “is this brain environment operational?”
- Users currently discover missing prerequisites only after starting a workflow command.
- Diagnostic output is split across Python exceptions and ad hoc script errors.

## Goal

- Add a `doctor` command that performs non-destructive health checks and reports pass/warn/fail results.

## Out of Scope

- Automatically fixing failed checks.
- GUI/auth environment validation outside what directly affects brain artifact workflows.
- Running generation or sync as part of the diagnosis.

## Acceptance Criteria

- [ ] `doctor` checks that the runtime directory tree under `memory/runtime/` exists or can be created and is writable.
- [ ] `doctor` checks that key repo paths used by the CLI are present where expected (for example fixture fallback files) and reports missing optional paths as warnings instead of crashes.
- [ ] `doctor` checks Ollama reachability at the configured base URL without starting a generation run.
- [ ] `doctor` reports a structured result with clear statuses (`PASS`, `WARN`, `FAIL`) and supports `--json`.
- [ ] A failed doctor run exits non-zero outside the REPL handler path but does not terminate the interactive shell session when run inside the REPL.

## Subtasks

- [ ] Define the check set and normalized doctor output shape.
- [ ] Add an Ollama reachability probe suitable for diagnosis.
- [ ] Add runtime-directory and fixture-path checks.
- [ ] Add tests for healthy and unhealthy doctor results.

## Dependencies

- STORY-022
- STORY-023

## Risks

- Risk: the doctor command performs checks that mutate files or block for too long.
- Mitigation: require all checks to be read-only except safe directory writability probes and keep timeouts short.

## Validation

- Run `doctor` with Ollama available and confirm a `PASS`/`WARN` summary.
- Run `doctor` with Ollama intentionally unavailable and confirm a clear `FAIL`.
- Run `doctor --json` and validate the payload shape in tests.
