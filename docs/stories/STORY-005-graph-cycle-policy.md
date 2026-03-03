# STORY-005: Add Graph-Cycle Policy and Safeguards

ID: `STORY-005`
Title: `Add graph-cycle policy and safeguards`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Current cleaned graph contains cycles.
- Observed cycle example:
- `Cryptography -> Key exchange protocols`
- `Key exchange protocols -> Certificate authorities`
- `Certificate authorities -> Key exchange protocols`
- Cleaner builds path prefixes using BFS from a preferred root, but cycle semantics are not explicitly managed.
- GUI currently tolerates directed cycles, but traversal/exploration behavior can become less intuitive.

## Problem

- No explicit product/engine decision exists on whether concept graph should be DAG-like or allow cycles.
- Without policy, cleaning and downstream logic may produce unstable path prefixes and ambiguous progression.

## Goal

- Define cycle policy and implement safeguards consistent with product intent.
- Ensure traversal, path prefixes, and user exploration remain coherent.

## Out of Scope

- Large-scale ontology redesign.
- Manual curation of all concept edges.

## Acceptance Criteria

- [ ] A documented policy defines whether cycles are allowed, warned, or removed.
- [ ] Cleaner/reporting surfaces cycle counts and representative cycle examples.
- [ ] If policy forbids cycles, disallowed edges are filtered deterministically.
- [ ] If policy allows cycles, UI/domain logic explicitly handles them without root ambiguity regressions.

## Subtasks

- [ ] Align with product behavior expectations (exploration tree vs general graph).
- [ ] Implement cycle detection utility in pipeline validation.
- [ ] Add policy enforcement (warn-only or filter mode).
- [ ] Document operational behavior in `brain/README.md` and `docs/manifest.md`.

## Dependencies

- STORY-006 for reporting integration.

## Risks

- Risk: Removing cycle edges may hide useful conceptual bidirectionality.
- Mitigation: Keep configurable mode (`warn` vs `enforce`) and publish cycle reports.

## Validation

- Run cycle detection on existing dataset.
- Confirm output reflects chosen policy.
- Verify GUI still initializes and navigation remains stable.
