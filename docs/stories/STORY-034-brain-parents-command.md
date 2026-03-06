# STORY-034: Add Brain Parents Command

ID: `STORY-034`
Title: `Add brain parents command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- Incoming edges are just as important as outgoing edges for understanding graph placement, especially in a DAG-like learning graph.
- The shared graph utilities already make indegree analysis possible, but there is no dedicated REPL surface for it.
- `parents` is the natural inverse of `children` and should follow the same argument and output conventions.

## Problem

- There is no simple shell command for listing direct parents.
- Users cannot quickly answer "where does this concept sit under the current graph?" from inside the REPL.
- Without a dedicated parent listing command, graph-inspection UX remains asymmetric.

## Goal

- Add a `parents [concept]` command that lists direct incoming neighbors for a concept.

## Out of Scope

- Ancestor traversal beyond one hop.
- Depth/path inference.
- Mutating relationships.

## Acceptance Criteria

- [ ] `parents <concept>` lists direct incoming neighbors from the active graph; `parents` with no argument uses the current concept.
- [ ] The output order is deterministic and alphabetical by canonical label.
- [ ] The command returns at most 20 parents in text output by default and supports `--limit <n>` to override that bound.
- [ ] `parents --json [concept]` returns the same direct parent set in machine-readable form.
- [ ] If no concept argument is provided and no current concept exists, the command fails clearly.
- [ ] `parents` does not modify the current concept or any files on disk.

## Subtasks

- [ ] Build or reuse an indegree/parent index from the active graph cache.
- [ ] Reuse the shared concept-resolution path from `use` and `show`.
- [ ] Add text and JSON renderers with deterministic ordering and truncation behavior.
- [ ] Add tests for explicit target, current target, empty parent set, limit, and JSON output.

## Dependencies

- STORY-028
- STORY-031

## Risks

- Risk: parent lookup is recomputed expensively on every command.
- Mitigation: cache parent-index data alongside the loaded graph when practical.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Databases"`, and verify `parents`.
- Run `parents "Operating Systems" --limit 5` and `parents --json "Operating Systems"`.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
