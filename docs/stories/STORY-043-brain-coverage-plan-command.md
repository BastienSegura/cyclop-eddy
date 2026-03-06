# STORY-043: Add Brain Coverage Plan Command

ID: `STORY-043`
Title: `Add brain coverage plan command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The two-phase coverage workflow already exists in `brain/run_two_phase_coverage.py` and supports a `--dry-run` planning mode.
- The desired REPL surface uses the multiword family `coverage plan`.
- Planning the workflow before executing it is especially useful in a REPL because users can inspect current graph state, choose refinement roots, and then preview the exact commands and artifact paths.

## Problem

- There is no first-class planning command for two-phase coverage inside the REPL.
- Users must either call the standalone script directly or skip planning entirely and go straight to execution.
- Without a dedicated wrapper, there is no shell-native way to resolve roots, inspect artifact paths, and preview the generated command sequence.

## Goal

- Add `coverage plan` as the REPL wrapper around the two-phase coverage workflow's dry-run mode.

## Out of Scope

- Executing the two-phase workflow (`coverage run`).
- Editing frontier results into a saved plan file.
- Background workflow orchestration.

## Acceptance Criteria

- [ ] `coverage plan` is registered as a multiword command and wraps the existing two-phase workflow in dry-run mode without executing any generation, merge, or report commands.
- [ ] The command supports the current planning inputs: `--root`, `--phase1-children`, `--phase1-depth`, `--phase2-children`, `--phase2-depth`, `--roots`, `--roots-file`, `--exclude-strategy`, `--exclude-local-limit`, `--work-dir`, `--baseline-input`, and `--skip-quality-report`.
- [ ] The command prints a deterministic plan that includes the resolved phase-2 roots, the key artifact paths, and the exact command sequence that would be executed.
- [ ] `coverage plan --json` returns the same plan in machine-readable form without executing any workflow steps.
- [ ] Validation rules from the current workflow are preserved, including the requirement that at least one phase-2 root resolves.
- [ ] `coverage plan` does not create runtime output files or mutate the current REPL session context.

## Subtasks

- [ ] Define the CLI argument surface for `coverage plan`, keeping operator-friendly names where they improve readability.
- [ ] Reuse the existing dry-run workflow planning logic instead of recomputing command sequences in a separate code path.
- [ ] Add text and JSON renderers for the planned commands and artifact paths.
- [ ] Add tests for explicit roots, roots-file resolution, missing-root validation, and the non-mutating dry-run guarantee.

## Dependencies

- STORY-023

## Risks

- Risk: the plan path diverges from the real two-phase workflow and stops being trustworthy.
- Mitigation: drive `coverage plan` from the same workflow-planning logic as the underlying dry-run implementation.
- Risk: the planning command creates directories or files as a side effect.
- Mitigation: require dry-run mode to remain read-only and test for absence of created artifacts.

## Validation

- Launch `python -m brain.cli`, run `coverage plan --roots "Operating Systems" "Databases"`.
- Run `coverage plan --roots-file <tmp-roots-file> --json` and verify the plan payload.
- Confirm no new files are created under `memory/runtime/` after the planning command.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
