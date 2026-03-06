# STORY-041: Add Brain Quality Report Command

ID: `STORY-041`
Title: `Add brain quality report command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The quality-report workflow already exists in `brain/report_concept_quality.py` and supports multiple inputs, markdown output, JSON output, and threshold-based failure.
- Quality reporting is a core safety check before or after graph cleaning and sync operations.
- The desired command grammar uses multiword families, so the shell surface should be `quality report`, not a flat overloaded `quality`.

## Problem

- The REPL has no built-in way to run the quality report workflow.
- Users must remember the standalone script and its argument surface, even though the CLI is supposed to become the operator-facing entry point.
- Without a first-class wrapper, threshold failures and output-file behavior will remain inconsistent with other REPL commands.

## Goal

- Add `quality report` as the REPL's wrapper around the existing graph quality-report workflow.

## Out of Scope

- A separate `quality gate` command surface.
- Inventing new quality metrics beyond what the existing report already computes.
- Automatically running quality reports after every generation or sync command.

## Acceptance Criteria

- [ ] `quality report` is registered as a multiword command and supports the current report options: `--input`, `--mode`, `--output`, `--json-output`, `--fail-on-threshold`, `--max-malformed-lines`, `--max-meta-lines`, `--max-self-edges`, `--max-cycle-edges`, and `--max-duplicate-variant-extras`.
- [ ] If the REPL session has an active graph source and the user does not pass `--input`, the command uses the active source by default; otherwise it preserves the standalone script's existing default-input behavior.
- [ ] The command prints the markdown report to stdout/REPL output and still supports optional markdown and JSON file outputs.
- [ ] Threshold violations surface as a clear command failure with the same non-zero semantics as the standalone report, while keeping the interactive shell alive.
- [ ] `quality report` does not mutate the current concept or active graph source.
- [ ] The same handler can also be invoked as a one-shot command via `python -m brain.cli quality report ...`.

## Subtasks

- [ ] Map the current script argument surface into the CLI command metadata and parser.
- [ ] Define the default-input precedence between active session source and standalone fallback candidates.
- [ ] Reuse the shared report functions rather than shelling out to the standalone script.
- [ ] Add tests for active-source defaulting, explicit inputs, output-file generation, and threshold-failure behavior.

## Dependencies

- STORY-023
- STORY-028

## Risks

- Risk: the wrapper changes the quality report defaults in surprising ways.
- Mitigation: define and document the exact precedence between session source and standalone defaults.
- Risk: threshold failures kill the REPL session instead of only failing the command.
- Mitigation: normalize command-failure handling through the shell's error contract.

## Validation

- Launch `python -m brain.cli`, run `load cleaned`, then `quality report`.
- Run `quality report --input memory/fixtures/demo/concept_list_cleaned.txt --json-output <tmp>.json`.
- Run a threshold-failure case and confirm the shell remains open.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
