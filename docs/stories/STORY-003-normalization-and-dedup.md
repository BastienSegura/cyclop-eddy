# STORY-003: Harden Normalization and Dedup Rules

ID: `STORY-003`
Title: `Harden normalization and dedup rules`
Status: `done`
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

- [x] Generator canonicalization strips bullet/number markers and collapses whitespace before dedup decisions.
- [x] Cleaner and generator share the same canonicalization rules (single implementation source or proven parity tests).
- [x] Self-edges are blocked consistently at generation and cleaning stages.
- [x] Dedup identity key definition is documented once and referenced by both scripts.
- [x] Re-running cleaner no longer collapses large numbers of format-only variants generated in the same run.

## Subtasks

- [x] Extract canonicalization helpers into a shared module in `brain/`.
- [x] Apply canonicalization before adding to `exclude_list`, `seen_normalized`, and queue.
- [x] Add a migration note for existing state files when canonical rules change.
- [x] Add a short "identity contract" section to docs (`brain/README.md`) defining canonical key behavior.
- [x] Add unit tests covering markers, spacing, punctuation, and case behavior.

## Dependencies

- STORY-002 for input validation alignment.

## Risks

- Risk: Canonicalization may over-collapse legitimate distinct concepts.
- Mitigation: Preserve raw label for display while deduping on canonical key.

## Validation

- Generate a controlled sample that contains marker variants.
- Confirm only one canonical concept is enqueued.
- Compare pre/post run statistics on duplicate variant collapse.

Implemented with:
- `brain/concept_identity.py` as shared identity source:
  - `canonical_concept_label(...)`
  - `canonical_concept_key(...)`
- `brain/build_concept_list.py` migrated to shared canonicalization for:
  - validation normalization
  - `exclude_list`
  - `seen_normalized`
  - queue migration/normalization on resume (`state version 4`)
- `brain/clean_concept_list.py` migrated to shared canonicalization.
- `brain/README.md` documents identity contract and state migration behavior.
- Unit tests:
  - `brain/tests/test_concept_identity.py`
  - `brain/tests/test_build_concept_list_canonical.py`

Validation evidence:
- `python -m py_compile brain/build_concept_list.py brain/clean_concept_list.py brain/concept_identity.py brain/sync_concept_data.py`
- `python -m unittest discover -s brain/tests -p 'test_*.py'` (8 tests, pass)
- `python brain/clean_concept_list.py --input memory/concept_list.txt --output /tmp/concept_list_cleaned.story3.txt --root \"Computer Science\"` produced `Input lines: 476`, `Output lines: 476`.
