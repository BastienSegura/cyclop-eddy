# STORY-035: Add Brain Neighbors Command

ID: `STORY-035`
Title: `Add brain neighbors command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- Some inspection tasks do not care about edge direction first; they just need a direct neighborhood view around one concept.
- The shell will already expose `children` and `parents`, so `neighbors` should provide a merged convenience view instead of inventing a third incompatible representation.
- Direction still matters and must remain visible in the output.

## Problem

- Users currently have to run two commands and mentally merge the results to understand a node's immediate neighborhood.
- If direction is hidden, the command becomes misleading; if it is omitted entirely, the shell lacks a convenient one-shot neighborhood view.

## Goal

- Add a `neighbors [concept]` command that merges direct parents and children into one deterministic view while preserving direction information.

## Out of Scope

- Multi-hop neighborhood expansion.
- Weighted or ranked neighborhoods.
- Graph visualization.

## Acceptance Criteria

- [ ] `neighbors <concept>` merges the direct parent and child sets for the target concept; `neighbors` with no argument uses the current concept.
- [ ] Each neighbor entry includes explicit direction metadata: `parent`, `child`, or `both` when the same concept appears in both sets.
- [ ] The output order is deterministic and alphabetical by canonical label.
- [ ] `neighbors --json [concept]` returns the merged neighborhood plus direction metadata in machine-readable form.
- [ ] If no concept argument is provided and no current concept exists, the command fails clearly.
- [ ] `neighbors` does not modify the current concept or any files on disk.

## Subtasks

- [ ] Reuse the parent and child lookup helpers instead of re-parsing the graph separately for neighbors.
- [ ] Define a merged-neighbor payload that can represent `parent`, `child`, and `both`.
- [ ] Add text and JSON renderers with deterministic ordering.
- [ ] Add tests for parent-only, child-only, both-direction, and missing-target behavior.

## Dependencies

- STORY-033
- STORY-034

## Risks

- Risk: merged output loses direction information and becomes misleading.
- Mitigation: require explicit direction metadata in both text and JSON output.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Databases"`, then `neighbors`.
- Run `neighbors --json "Operating Systems"` and verify direction annotations.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
