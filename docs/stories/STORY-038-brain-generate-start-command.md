# STORY-038: Add Brain Generate Start Command

ID: `STORY-038`
Title: `Add brain generate start command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The generator already exists as `brain/build_concept_list.py` with default runtime outputs under `memory/runtime/`.
- STORY-019 extracted generator prompting, state, and runtime helpers so a CLI wrapper can call shared code directly instead of shelling out to subprocesses.
- The desired REPL command surface uses the stricter family syntax `generate start --root "Computer Science" --children 25 --depth 3`.

## Problem

- Starting a generation run still requires calling the standalone script directly and remembering script-native flag names such as `--root-concept`, `--concept-list-length`, and `--max-depth`.
- A REPL without a first-class generation command is not useful as an operator surface for the actual brain workflow.
- If the wrapper shells out instead of reusing shared modules, progress handling and interrupt behavior will be harder to standardize.

## Goal

- Add `generate start` as the REPL's canonical command for starting a fresh graph-generation run.

## Out of Scope

- Background generation jobs.
- Interactive approval/rejection of generated candidates.
- Automatically cleaning or syncing outputs after generation.

## Acceptance Criteria

- [ ] `generate start` is registered as a multiword command and supports the repo-friendly flag surface `--root`, `--children`, `--depth`, `--output`, `--state`, `--exclude-strategy`, and `--local-exclude-limit`.
- [ ] The wrapper maps those flags to the current generator behavior without changing the generator's output/state file formats.
- [ ] Running the command from inside the REPL streams generation progress to the shell instead of hiding it until completion.
- [ ] `Ctrl+C` during `generate start` returns control to the REPL while preserving the existing checkpoint/resume semantics of the generator.
- [ ] `generate start` does not implicitly run `sync`, does not silently change the active graph source, and does not clear the current concept.
- [ ] The same handler can also be invoked as a one-shot command via `python -m brain.cli generate start ...`.

## Subtasks

- [ ] Define CLI-friendly argument names and map them to the generator's shared runtime/state API.
- [ ] Implement foreground progress streaming compatible with the REPL shell.
- [ ] Integrate command interruption with the shell's `Ctrl+C` behavior without losing checkpoint state.
- [ ] Add tests for argument mapping and command-level invocation outside the REPL.

## Dependencies

- STORY-022
- STORY-023

## Risks

- Risk: wrapper logic diverges from the standalone generator and produces different files or state.
- Mitigation: call shared generator modules directly and keep state/output formats unchanged.
- Risk: `Ctrl+C` handling exits the shell instead of canceling only the generation command.
- Mitigation: test interrupt handling through the shell contract defined in STORY-023.

## Validation

- Launch `python -m brain.cli`, run `generate start --root "Computer Science" --children 5 --depth 1` against a temporary output/state path, then interrupt once and resume manually.
- Run `python -m brain.cli generate start --root "Computer Science" --children 3 --depth 1 --output <tmp> --state <tmp>` outside the REPL.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
