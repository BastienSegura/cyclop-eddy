# STORY-037: Add Brain Prompt Command

ID: `STORY-037`
Title: `Add brain prompt command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The GUI already exposes a learning prompt template through `gui/src/features/concept-graph/application/build-learning-prompt.ts`.
- The REPL is intended to support quick concept inspection and operation without requiring the GUI.
- If the CLI and GUI generate different prompt templates for the same concept, users will get inconsistent experiences from the same repo.

## Problem

- There is no shell command that prints the learning prompt template for a concept.
- Prompt rendering logic currently lives only in the GUI implementation, which risks CLI/GUI drift if the REPL reimplements the text independently.

## Goal

- Add a `prompt [concept]` command that prints the learning prompt template for a concept and keeps the CLI and GUI prompt text aligned.

## Out of Scope

- Calling Ollama or any other model.
- Editing or saving prompt templates from the shell.
- Prompt-history management or clipboard integration.

## Acceptance Criteria

- [ ] `prompt <concept>` prints the learning prompt template for the resolved concept; `prompt` with no argument uses the current concept.
- [ ] The prompt text produced for a given concept is byte-identical to the GUI prompt template, either by sharing a single source of truth or by adding a parity test that enforces exact equivalence.
- [ ] `prompt --json [concept]` returns the resolved concept label and full prompt text in machine-readable form.
- [ ] If no concept argument is provided and no current concept is set, the command fails clearly.
- [ ] `prompt` performs no network calls and does not mutate session state, graph files, or runtime artifacts.

## Subtasks

- [ ] Decide the prompt-template source of truth shared between CLI and GUI, or add a parity contract if code sharing is not practical.
- [ ] Implement the `prompt` handler using the same concept-resolution rules as other graph commands.
- [ ] Add tests that compare CLI output against the GUI prompt template for at least one concept label.
- [ ] Document the non-networked nature of the command in help output.

## Dependencies

- STORY-031

## Risks

- Risk: the CLI copies the prompt template text and drifts from the GUI implementation over time.
- Mitigation: require a shared source of truth or explicit parity tests in the same story.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Databases"`, then `prompt`.
- Compare the CLI prompt output for a sample concept against the GUI prompt builder output.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
