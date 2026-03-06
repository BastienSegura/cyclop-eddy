# STORY-036: Add Brain Path Command

ID: `STORY-036`
Title: `Add brain path command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The graph is directional and often used as a learning dependency map, so pathfinding between two concepts is a natural operator task.
- STORY-019 introduced shared graph-analysis helpers, which makes a directed path command feasible without embedding graph logic in the REPL itself.
- Path exploration is distinct from the single-node inspection commands and should stay explicit.

## Problem

- There is no command to answer "how are these two concepts connected?" from inside the shell.
- Without a path command, users must reason manually from repeated `show`, `children`, and `parents` outputs.
- Ad hoc pathfinding implementations would drift unless the REPL exposes one authoritative behavior.

## Goal

- Add a `path <from> <to>` command that finds a shortest directed path between two concepts in the active graph.

## Out of Scope

- Undirected pathfinding.
- Enumerating all possible paths.
- Weighted path scoring or heuristic search.

## Acceptance Criteria

- [ ] `path <from> <to>` resolves both concepts against the active graph and computes a shortest directed path using deterministic graph traversal.
- [ ] If a path exists, the command prints the full ordered concept chain from source to target.
- [ ] If no path exists, the command prints a clear "not found" result without crashing the shell.
- [ ] `path --json <from> <to>` returns the same result in machine-readable form, including whether a path was found.
- [ ] If either endpoint cannot be resolved, the command fails clearly and does not guess from partial matches.
- [ ] `path` does not change the current concept or active graph source.

## Subtasks

- [ ] Reuse shared concept resolution and graph traversal helpers from `brain/`.
- [ ] Define a path result payload shared by text and JSON output.
- [ ] Add tests for successful paths, missing paths, unresolved endpoints, and JSON output.
- [ ] Document that v1 pathfinding is directed only.

## Dependencies

- STORY-028
- STORY-030

## Risks

- Risk: path output becomes ambiguous if multiple shortest paths exist.
- Mitigation: define deterministic neighbor ordering before traversal so the chosen shortest path is stable.
- Risk: users assume undirected behavior and misread the result.
- Mitigation: document directed semantics explicitly in help and tests.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, then verify `path "Computer Science" "Databases"` and a known no-path case.
- Run `path --json "Computer Science" "Databases"` and verify the payload shape.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
