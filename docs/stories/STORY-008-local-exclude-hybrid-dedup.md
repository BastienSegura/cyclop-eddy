# STORY-008: Replace Global Prompt Exclude With Local Exclude + Runtime Dedup

ID: `STORY-008`
Title: `Replace global prompt exclude with local exclude + runtime dedup`
Status: `ready`
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

## Out of Scope

- Changing model/provider.
- Ontology-level semantic dedup (synonyms).

## Acceptance Criteria

- [ ] Prompt builder no longer includes full global `exclude_list` by default.
- [ ] Runtime dedup before enqueue remains enforced globally.
- [ ] Optional local exclude mode exists (for example only parent-local accepted children).
- [ ] New mode and tradeoffs are documented in `brain/README.md`.

## Subtasks

- [ ] Add generation option for exclude strategy (`global`, `local`, `none`).
- [ ] Implement local exclude payload construction with bounded size.
- [ ] Keep `seen_normalized`/queue dedup unchanged as hard safety.
- [ ] Log chosen exclude strategy in run output/state metadata.
- [ ] Document defaults and migration notes for resumed runs.

## Dependencies

- STORY-003 for stronger normalization parity.
- STORY-007 for regression tests on dedup behavior.

## Risks

- Risk: Reduced prompt excludes may increase attempted duplicates in model output.
- Mitigation: Keep strict runtime dedup and rejection counters.

## Validation

- Run two comparable generations (`global` vs `local`) on same root and params.
- Compare rejection ratios, unique concepts added, and under-filled parent counts.
- Confirm queue dedup still blocks repeated concepts globally.
