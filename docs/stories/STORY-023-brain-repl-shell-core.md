# STORY-023: Add Brain REPL Shell Core

ID: `STORY-023`
Title: `Add brain REPL shell core`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The desired UX is a dedicated interpreter that a contributor can launch once and keep open while exploring and operating the `brain/` toolchain.
- STORY-022 introduces the command registry and shared session contract, but the user-facing shell still needs a prompt loop, input parsing rules, and lifecycle behavior.
- The shell must preserve session state across commands so `load`, `use`, and later graph inspection commands feel native instead of stateless wrappers.
- Repo-local shell artifacts can live safely under `memory/runtime/` because that tree is already git-ignored by STORY-018.

## Problem

- There is currently no persistent interactive shell for brain operations.
- Without a proper REPL, every interaction requires relaunching Python scripts and retyping file paths or target concepts.
- Interrupt behavior (`Ctrl+C`) and shell exit behavior (`Ctrl+D`) need to be standardized before long-running command stories are implemented.

## Goal

- Deliver the actual `brain>` shell loop that users launch and stay inside.
- Persist session state in memory for the lifetime of the process.
- Establish predictable shell behavior for parsing, interrupts, and history.

## Out of Scope

- Implementing command-specific behaviors beyond invoking the registry.
- Natural-language input or intent inference.
- Background job control or parallel command execution.

## Acceptance Criteria

- [ ] Running `python -m brain.cli` with no explicit command opens an interactive prompt rendered as `brain>`.
- [ ] Input parsing uses shell-like quoting rules (`shlex`) so commands such as `use "Operating Systems"` and `generate start --root "Computer Science"` are parsed correctly.
- [ ] Empty input is a no-op and does not print stack traces or duplicate prompts.
- [ ] A single `BrainCliSession` instance lives for the full shell lifetime and preserves active graph source/current concept across commands.
- [ ] `Ctrl+C` while waiting for input returns to a fresh prompt without exiting the shell or dropping session state.
- [ ] `Ctrl+D` exits the shell cleanly with status code `0`.
- [ ] Command history is stored in `memory/runtime/brain_cli/history.txt` so line history survives shell restarts without polluting git status.

## Subtasks

- [ ] Add the REPL loop and prompt rendering on top of the STORY-022 dispatcher.
- [ ] Wire `shlex`-based parsing into the prompt loop.
- [ ] Add persistent history storage under `memory/runtime/brain_cli/`.
- [ ] Define shell-level error rendering for unknown commands, bad arguments, and command failures.
- [ ] Add tests or scripted harness coverage for prompt parsing and interrupt/EOF behavior where practical.

## Dependencies

- STORY-022

## Risks

- Risk: signal handling becomes inconsistent once long-running generation commands are added.
- Mitigation: define shell-level `Ctrl+C` behavior here and require command stories to integrate with it.
- Risk: history/state files end up outside ignored runtime paths.
- Mitigation: require all shell-local persistence to live under `memory/runtime/brain_cli/`.

## Validation

- Launch `python -m brain.cli` and verify the `brain>` prompt appears.
- Type blank lines, malformed commands, quoted commands, `Ctrl+C`, and `Ctrl+D`.
- Confirm a history file is created under `memory/runtime/brain_cli/`.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
