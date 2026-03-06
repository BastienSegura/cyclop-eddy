# STORY-042: Add Brain Frontier Command

ID: `STORY-042`
Title: `Add brain frontier command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The unexplored-frontier workflow already exists in `brain/find_unexplored_areas.py`.
- This command is one of the best examples of why a dedicated brain REPL is useful: operators can inspect the graph, then ask for the next best expansion targets without leaving the shell.
- The proposed CLI surface uses shorter operator-friendly flags such as `--target` and `--top`, while the current script uses `--target-children` and `--top-n`.

## Problem

- There is no first-class REPL wrapper for frontier analysis.
- Users must remember the standalone script name and its longer script-specific flags.
- Without a wrapper, the command will not integrate with session defaults such as the active graph source.

## Goal

- Add a `frontier` command that wraps unexplored-area analysis with REPL-friendly defaults and argument names.

## Out of Scope

- Running the suggested expansions automatically.
- Saving accepted frontier roots into a workflow queue.
- Replacing the underlying frontier scoring model.

## Acceptance Criteria

- [ ] `frontier` uses the active graph source by default when available, with an explicit `--input` override for other files.
- [ ] The command exposes REPL-friendly flags `--target`, `--top`, `--min-depth`, `--max-depth`, `--exclude-leaves`, and `--json`, and maps them deterministically to the current frontier-analysis behavior.
- [ ] Human-readable output remains tabular by default, and `--json` returns the same frontier report in machine-readable form.
- [ ] The command preserves the current frontier-analysis validation rules for invalid numeric inputs and missing files.
- [ ] `frontier` does not change the current concept or active graph source.
- [ ] The same handler can be invoked as a one-shot command via `python -m brain.cli frontier ...`.

## Subtasks

- [ ] Define the CLI-friendly flag names and map them to the existing frontier-analysis function.
- [ ] Add active-source defaulting behavior with explicit input override precedence.
- [ ] Reuse the existing table and JSON rendering where practical.
- [ ] Add tests for active-source defaulting, flag mapping, validation failures, and JSON output.

## Dependencies

- STORY-023
- STORY-028

## Risks

- Risk: renamed flags obscure how the wrapper maps to the underlying analysis script.
- Mitigation: document the mapping in help output and keep the wrapper behavior identical to the shared analysis function.
- Risk: defaulting to the active source surprises users expecting the standalone default path.
- Mitigation: make the precedence explicit in help text and tests.

## Validation

- Launch `python -m brain.cli`, run `load cleaned`, then `frontier --target 8 --top 10`.
- Run `frontier --input memory/fixtures/demo/concept_list_cleaned.txt --json`.
- Run invalid-value cases such as `frontier --target 0` and confirm clear validation errors.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
