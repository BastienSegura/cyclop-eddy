# STORY-008: Replace Global Prompt Exclude With Local Exclude + Runtime Dedup

ID: `STORY-008`
Title: `Replace global prompt exclude with local exclude + runtime dedup`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-03`
Updated: `2026-03-03`

## Context

- `brain/build_concept_list.py` currently injects the full growing `exclude_list` into each prompt.
- As generation depth increases, prompt context grows significantly and can hurt response quality/diversity.
- Recent 10x3 run quality is structurally clean, but fill remains uneven (`51` of `76` parents have fewer than target `10` children).
- The project goal is broad concept coverage in Computer Science, not strict tree fullness at any single run.

## Problem

- Global prompt excludes create context bloat and can over-constrain model output at deeper levels.
- Removing dedup entirely is not viable because repeated branches would waste prompt budget.

## Goal

- Keep dedup in engine logic (`seen_normalized`) while reducing prompt bloat.
- Use a minimal prompt exclude strategy that improves diversity and keeps queue expansion efficient.

Boundary:
- This story owns prompt exclude payload strategy only.
- Canonical normalization and dedup key behavior are owned by STORY-003.

## Out of Scope

- Changing model/provider.
- Ontology-level semantic dedup (synonyms).
- Canonicalization rule changes (markers/spacing/case behavior).

## Acceptance Criteria

- [x] Prompt builder no longer includes full global `exclude_list` by default.
- [x] Runtime dedup before enqueue remains enforced globally without modifying canonical key behavior.
- [x] Optional local exclude mode exists (for example only parent-local accepted children).
- [x] Default strategy is explicitly documented and stable across resumed runs.
- [x] New mode and tradeoffs are documented in `brain/README.md`.

## Subtasks

- [x] Add generation option for exclude strategy (`global`, `local`, `none`).
- [x] Implement local exclude payload construction with bounded size.
- [x] Keep `seen_normalized`/queue dedup unchanged as hard safety.
- [x] Log chosen exclude strategy in run output/state metadata.
- [x] Document defaults and migration notes for resumed runs and existing state files.

## Dependencies

- STORY-003 (must be completed first) for stable canonical key semantics.
- STORY-007 for regression tests on dedup behavior.

## Risks

- Risk: Reduced prompt excludes may increase attempted duplicates in model output.
- Mitigation: Keep strict runtime dedup and rejection counters.

## Validation

- Run two comparable generations (`global` vs `local`) on same root and params.
- Compare rejection ratios, unique concepts added, and under-filled parent counts.
- Confirm queue dedup still blocks repeated concepts globally.

Implemented with:
- `brain/build_concept_list.py`
  - adds `--exclude-strategy {global,local,none}` and `--exclude-local-limit`.
  - defaults new runs to `local` strategy with bounded local payload.
  - persists `exclude_strategy` and `exclude_local_limit` in state (`version: 5`).
  - keeps hard runtime dedup (`seen_normalized`) unchanged before enqueue.
  - resumes with state-stored strategy/limit and rejects conflicting overrides.
  - logs strategy in run config and per-prompt metrics.
- `brain/tests/test_build_concept_list_canonical.py`
  - validates default `local` behavior.
  - validates explicit `global` and `none` behavior.
  - validates resume stability and conflicting strategy rejection.
- `brain/README.md`
  - documents strategy modes, defaults, and resume migration notes.

Validation evidence:
- `python -m unittest brain.tests.test_build_concept_list_canonical` passed (`7` tests).
- `python -m unittest discover -s brain/tests -p 'test_*.py'` passed (`23` tests).
