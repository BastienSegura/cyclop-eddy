# STORY-005: Add Graph-Cycle Policy and Safeguards

ID: `STORY-005`
Title: `Add graph-cycle policy and safeguards`
Status: `done`
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

- [x] A documented policy defines whether cycles are allowed, warned, or removed.
- [x] Cleaner/reporting surfaces cycle counts and representative cycle examples.
- [x] If policy forbids cycles, disallowed edges are filtered deterministically.
- [x] If policy allows cycles, UI/domain logic explicitly handles them without root ambiguity regressions.

## Subtasks

- [x] Align with product behavior expectations (exploration tree vs general graph).
- [x] Implement cycle detection utility in pipeline validation.
- [x] Add policy enforcement (warn-only or filter mode).
- [x] Document operational behavior in `brain/README.md` and `docs/manifest.md`.

## Dependencies

- STORY-006 for reporting integration.

## Risks

- Risk: Removing cycle edges may hide useful conceptual bidirectionality.
- Mitigation: Keep configurable mode (`warn` vs `enforce`) and publish cycle reports.

## Validation

- Run cycle detection on existing dataset.
- Confirm output reflects chosen policy.
- Verify GUI still initializes and navigation remains stable.

Implemented policy:
- Default mode is `warn` (keep cycles, surface cycle counts/examples).
- Optional `enforce` mode deterministically drops cycle-closing edges in first-seen order.

Implemented with:
- `brain/clean_concept_list.py`
  - `--cycle-policy {warn,enforce}`
  - `--max-cycle-examples`
  - cycle analysis helpers + representative examples
  - deterministic edge filtering for `enforce`
- `brain/sync_concept_data.py`
  - forwards cycle policy flags to cleaner
- docs:
  - `brain/README.md`
  - `docs/manifest.md`
- tests:
  - `brain/tests/test_clean_concept_list_cycles.py`

Validation evidence:
- Existing dataset:
  - `python brain/clean_concept_list.py --input memory/concept_list.txt --output /tmp/concept_list_cleaned.warn.txt --root \"Computer Science\" --cycle-policy warn --max-cycle-examples 3`
  - `python brain/clean_concept_list.py --input memory/concept_list.txt --output /tmp/concept_list_cleaned.enforce.txt --root \"Computer Science\" --cycle-policy enforce --max-cycle-examples 3`
  - observed: `cycle_edges(before=0, after=0), dropped=0` in both modes.
- Synthetic cyclic dataset:
  - `warn`: `cycle_edges(before=3, after=3), dropped=0`
  - `enforce`: `cycle_edges(before=3, after=0), dropped=1` and output edges reduced from `4` to `3`.
- GUI stability check:
  - `cd gui && npm run typecheck` passed.
