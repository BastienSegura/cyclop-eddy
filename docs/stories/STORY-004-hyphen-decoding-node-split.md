# STORY-004: Fix Hyphen Decoding Node-Split Bug

ID: `STORY-004`
Title: `Fix hyphen decoding node-split bug`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Cleaner encodes path segments by replacing spaces with `-`.
- GUI graph builder decodes all `-` to spaces when deriving parent label from path prefix.
- This conflates encoding hyphens with literal hyphens and creates node identity drift.
- Example from cleaned data:
- `Computer-Science: Human-Computer Interaction`
- `Computer-Science.Human-Computer-Interaction: Error Prevention Techniques`
- The first yields child node label `Human-Computer Interaction`.
- The second yields parent label `Human Computer Interaction` after decode.
- Result: one concept appears as two disconnected node IDs.

## Problem

- The graph build path parser is not reversible with the cleaner encoding strategy.
- Hyphenated concept names are corrupted in parent extraction.

## Goal

- Preserve literal concept labels end-to-end without accidental character transformation.
- Ensure a single stable node ID is used for each concept.

## Out of Scope

- Visual styling updates.
- Changing existing concept content.

## Acceptance Criteria

- [ ] Path encoding/decoding scheme is bijective for spaces and literal hyphens.
- [ ] `Human-Computer Interaction` resolves to one node ID in graph build.
- [ ] Root candidate selection no longer surfaces accidental roots from split identities.
- [ ] Backward compatibility strategy exists for older cleaned files.

## Subtasks

- [ ] Decide on robust segment encoding (escaped hyphen, URL encoding, or delimiter-safe serialization).
- [ ] Update cleaner path writer and GUI parser consistently.
- [ ] Add regression fixture containing hyphenated labels.
- [ ] Add migration note in docs for existing cleaned datasets.

## Dependencies

- STORY-007 for regression tests.

## Risks

- Risk: Breaking compatibility with previously cleaned files.
- Mitigation: Support legacy parse mode temporarily with explicit deprecation.

## Validation

- Build graph from fixture containing `Human-Computer Interaction`.
- Assert single node identity and expected inbound/outbound edges.
- Verify root detection remains `Computer Science`.
