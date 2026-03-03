# STORY-002: Enforce Generator Output Contract

ID: `STORY-002`
Title: `Enforce generator output contract`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- `brain/build_concept_list.py` asks for exactly N concepts per prompt but does not enforce response shape before appending edges.
- Current raw output includes instruction/meta leak lines such as:
- `Machine Learning: Here is the output:`
- `Semantic Networks: Here is the output in the required format:`
- `Nonlinear Dynamics: Here are the 25 semantically closest ...`
- Parent fanout is inconsistent (examples: 38 children under one parent, 1 child under others), showing no strict cardinality control.

## Problem

- Generator accepts arbitrary line content and count.
- Invalid children are queued as new concepts, polluting later BFS levels and creating compounding noise.

## Goal

- Enforce a strict output contract at generation time.
- Only valid concept labels should become edges and future queue items.

## Out of Scope

- Changing Ollama model/provider.
- Semantic ranking quality improvements.

## Acceptance Criteria

- [ ] A validation layer rejects meta/instruction lines before enqueueing concepts.
- [ ] Per prompt call, accepted concepts are capped to target `concept_list_length`.
- [ ] Generation logs report accepted vs rejected candidates per prompt.
- [ ] Invalid lines are recorded for observability (log file or structured state field).

## Subtasks

- [ ] Add strict candidate validation function (shape, word-count, blacklist/meta checks).
- [ ] Enforce max accepted children per parent call.
- [ ] Add counters for rejected reasons (meta, duplicate, self, malformed).
- [ ] Update progress output to include rejection stats.
- [ ] Document new behavior in `brain/README.md`.

## Dependencies

- STORY-003 (normalization) is strongly related but can be developed in parallel.

## Risks

- Risk: Too-aggressive filtering may reduce useful concepts.
- Mitigation: Log rejected candidates and iterate rule set with real runs.

## Validation

- Run generation on a short depth/sample.
- Confirm no `Here is/Here are` style children are written.
- Confirm per-parent accepted child count never exceeds configured target.
