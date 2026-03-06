# STORY-024: Add Brain Help Command

ID: `STORY-024`
Title: `Add brain help command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The proposed REPL will expose many strict commands and multiword command families.
- STORY-022 requires command metadata in the registry specifically so discovery can be generated instead of duplicated in docs and code comments.
- A user entering the shell needs a built-in way to discover commands without leaving the interpreter.

## Problem

- Without an in-shell help command, the first REPL experience will be opaque and error-prone.
- Multiword families like `generate start` and `quality report` are easy to forget if command discovery only lives in external README files.
- The registry metadata from STORY-022 provides little value unless it is surfaced in a user-facing command.

## Goal

- Add a strict `help` command for in-shell discovery.
- Make help output authoritative from registry metadata rather than manually maintained strings scattered across handlers.

## Out of Scope

- Natural-language help queries.
- Pager integration or advanced rich-text/TUI rendering.
- Replacing README-based docs.

## Acceptance Criteria

- [ ] `help` prints the registered command list grouped or ordered deterministically, including multiword commands.
- [ ] `help <command>` works for exact single-word and multiword commands such as `help status` and `help quality report`.
- [ ] Help output includes at minimum: canonical command name, short description, and argument synopsis.
- [ ] Unknown help targets return a clear error without exiting the shell.
- [ ] Help output is generated from command registry metadata instead of hand-maintained switch statements.

## Subtasks

- [ ] Define the metadata fields required for help rendering if STORY-022 does not already finalize them.
- [ ] Implement `help` for both command index and command-specific views.
- [ ] Add tests for exact help lookup and unknown command behavior.
- [ ] Ensure future command stories include metadata updates as part of completion.

## Dependencies

- STORY-022
- STORY-023

## Risks

- Risk: help output drifts from real command behavior.
- Mitigation: drive help from registry metadata and keep handler registration authoritative.

## Validation

- Launch `python -m brain.cli` and run `help`, `help status`, and `help quality report`.
- Run CLI tests and `python -m unittest discover -s brain/tests -p 'test_*.py'`.
