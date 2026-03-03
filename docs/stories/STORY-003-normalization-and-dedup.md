# STORY-003: Harden Normalization and Dedup Rules

ID: `STORY-003`
Title: `Harden normalization and dedup rules`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- Dedup during generation uses only `strip + casefold`.
- Raw dataset contains many marker-prefixed variants (`* Concept`) that are treated as unique during generation.
- Observed counts from current `memory/concept_list.txt`:
- 417 total edges.
- 201 children with leading marker patterns.
- 417 unique raw casefold child strings.
- 257 unique child strings after cleaner normalization.
- Difference of 160 indicates major duplicate/variant inflation before cleaning.

## Problem

- Canonical identity is inconsistent across pipeline stages.
- Generator and cleaner disagree on what represents the same concept.
- This causes queue pollution, noisy expansions, and unstable graph shape.

## Goal

- Define one canonical normalization contract reused by generation and cleaning.
- Prevent formatting-only variants from entering the queue.

Boundary:
- This story owns canonicalization and dedup identity rules only.
- Prompt exclude strategy changes are owned by STORY-008.

## Out of Scope

- Ontology-level synonym resolution (e.g., true semantic duplicates).
- Language localization.
- Prompt exclude strategy (`global/local/none`) and prompt payload size tuning.
- Multi-run generation orchestration.

## Acceptance Criteria

- [ ] Generator canonicalization strips bullet/number markers and collapses whitespace before dedup decisions.
- [ ] Cleaner and generator share the same canonicalization rules (single implementation source or proven parity tests).
- [ ] Self-edges are blocked consistently at generation and cleaning stages.
- [ ] Dedup identity key definition is documented once and referenced by both scripts.
- [ ] Re-running cleaner no longer collapses large numbers of format-only variants generated in the same run.

## Subtasks

- [ ] Extract canonicalization helpers into a shared module in `brain/`.
- [ ] Apply canonicalization before adding to `exclude_list`, `seen_normalized`, and queue.
- [ ] Add a migration note for existing state files when canonical rules change.
- [ ] Add a short "identity contract" section to docs (`brain/README.md`) defining canonical key behavior.
- [ ] Add unit tests covering markers, spacing, punctuation, and case behavior.

## Dependencies

- STORY-002 for input validation alignment.

## Risks

- Risk: Canonicalization may over-collapse legitimate distinct concepts.
- Mitigation: Preserve raw label for display while deduping on canonical key.

## Validation

- Generate a controlled sample that contains marker variants.
- Confirm only one canonical concept is enqueued.
- Compare pre/post run statistics on duplicate variant collapse.
