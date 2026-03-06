# STORY-032: Add Brain Show Command

ID: `STORY-032`
Title: `Add brain show command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- Once a concept is selected with `use`, the next common task is inspecting that node without manually reading the edge-list files.
- The graph already contains enough information to summarize direct relationships and basic graph role (root/leaf/intermediate) from the active source.
- The command is intended to be the main single-node inspection view for the REPL.

## Problem

- There is no single-node summary command in the shell.
- Users currently need separate ad hoc scripts or manual file inspection to answer simple questions such as "how many parents does this concept have?" or "is this a leaf?".
- Without a canonical `show` view, later list commands will have no shared notion of what a "node summary" should include.

## Goal

- Add a `show [concept]` command that prints a compact deterministic summary of one concept from the active graph.

## Out of Scope

- Recursive subtree rendering or full graph visualization.
- Editing graph relationships from the REPL.
- Pathfinding between concepts (handled by `path`).

## Acceptance Criteria

- [ ] `show <concept>` resolves and displays a concept summary from the active graph; `show` with no argument uses the current concept from session state.
- [ ] The text output includes at minimum: canonical label, parent count, child count, total degree, and a root/leaf/intermediate classification based on direct degree.
- [ ] The text output includes deterministic previews of direct parents and direct children, each sorted alphabetically and limited to the first 10 items with an explicit overflow count when more relationships exist.
- [ ] `show --json [concept]` returns the same information in machine-readable form.
- [ ] If no concept argument is provided and no current concept is set, `show` fails with a clear message instead of guessing.
- [ ] `show` does not change the current concept when called with an explicit concept argument.

## Subtasks

- [ ] Define a reusable node-summary payload shared by text and JSON output.
- [ ] Reuse the same concept-resolution helper as `use` so label handling stays consistent.
- [ ] Implement deterministic parent/child preview formatting.
- [ ] Add tests for explicit-target, current-target, missing-target, and JSON output behavior.

## Dependencies

- STORY-028
- STORY-031

## Risks

- Risk: `show` grows into a dumping ground for unrelated graph analytics.
- Mitigation: keep the acceptance criteria limited to direct-node summary fields only.
- Risk: explicit `show <concept>` implicitly changes session context and surprises users.
- Mitigation: require non-mutating behavior and test for it.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, `use "Databases"`, then `show` and `show "Operating Systems"`.
- Run `show --json "Databases"` and verify the payload contains counts and previews.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
