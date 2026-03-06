# STORY-033: Add Brain Children Command

ID: `STORY-033`
Title: `Add brain children command`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- Direct outgoing relationships are a frequent graph-inspection need and should have a lightweight command separate from the broader `show` summary.
- The underlying graph data is directional, so children are not interchangeable with parents or undirected neighbors.
- The shell is intended to support omitted target arguments after `use` sets the current concept.

## Problem

- There is no direct command for listing a concept's immediate children.
- Users would otherwise need to parse the broader `show` output or inspect files manually for a very common operation.
- If children listing is left implicit inside `show`, output stability and automation become harder.

## Goal

- Add a `children [concept]` command that lists the direct outgoing neighbors of a concept in deterministic order.

## Out of Scope

- Recursive descendant traversal.
- Ranking or scoring children.
- Mutating relationships.

## Acceptance Criteria

- [ ] `children <concept>` lists direct outgoing neighbors from the active graph; `children` with no argument uses the current concept.
- [ ] The output order is deterministic and alphabetical by canonical label.
- [ ] The command returns at most 20 children in text output by default and supports `--limit <n>` to override that bound.
- [ ] `children --json [concept]` returns the same direct child set in machine-readable form.
- [ ] If no concept argument is provided and no current concept exists, the command fails clearly without guessing.
- [ ] `children` does not modify the current concept or any files on disk.

## Subtasks

- [ ] Define a direct-neighbor payload shape for children output.
- [ ] Reuse shared concept resolution and active graph access helpers.
- [ ] Add text and JSON renderers with deterministic ordering and truncation behavior.
- [ ] Add tests for explicit target, current target, empty child set, limit, and JSON output.

## Dependencies

- STORY-028
- STORY-031

## Risks

- Risk: child ordering changes between runs, making the command hard to test and compare.
- Mitigation: require alphabetical sorting in both text and JSON output.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Computer Science"`, and verify `children`.
- Run `children "Operating Systems" --limit 5` and `children --json "Operating Systems"`.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
