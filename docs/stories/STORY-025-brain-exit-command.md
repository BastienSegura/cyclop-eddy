# STORY-025: Add Brain Exit Command

ID: `STORY-025`
Title: `Add brain exit command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- STORY-023 defines `Ctrl+D` shell exit, but a first-class explicit command is still needed for scripts, demos, and predictable operator muscle memory.
- The shell is intended to be strict and explicit, so exit semantics should be equally explicit.
- Long-running command stories will rely on clear separation between “cancel current work” and “leave the shell.”

## Problem

- EOF-only exit is discoverable only to users already familiar with shell conventions.
- `Ctrl+C` and shell termination will become confusing if there is no explicit command-level exit behavior.
- Without a dedicated command, documentation and help output cannot point to a simple “leave the shell” verb.

## Goal

- Add an explicit `exit` command to leave the REPL cleanly.
- Keep exit semantics deterministic and separate from interruption semantics.

## Out of Scope

- Shell aliases or natural-language variants beyond what is explicitly approved.
- Session persistence across restarts.

## Acceptance Criteria

- [ ] `exit` is a registered command and terminates the REPL with exit code `0`.
- [ ] `exit` accepts no positional arguments; accidental extra arguments return a clear usage error instead of silently ignoring them.
- [ ] Executing `exit` from the REPL performs the same cleanup path as `Ctrl+D`.
- [ ] `Ctrl+C` does not trigger shell exit; it remains reserved for canceling the current prompt/command.
- [ ] `help exit` documents the intended difference between `exit`, `Ctrl+D`, and `Ctrl+C`.

## Subtasks

- [ ] Add an `exit` handler to the command registry.
- [ ] Define the shell-level mechanism for a handler to request process termination without throwing an unhandled exception.
- [ ] Add tests for explicit exit behavior and bad-argument handling.

## Dependencies

- STORY-023
- STORY-024

## Risks

- Risk: exit handling bypasses shell cleanup such as history flush.
- Mitigation: route `exit` through the same shutdown path as EOF.

## Validation

- Launch `python -m brain.cli`, run `exit`, and confirm a clean shell shutdown.
- Verify `exit now` returns a usage error and keeps the shell alive.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
