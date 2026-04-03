# STORY-045: Add Goal Target Selection and Route Preview

ID: `STORY-045`
Title: `Add goal target selection and route preview`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-04-03`
Updated: `2026-04-03`

## Context

- `gui/src/features/concept-graph/ui/graph-explorer-toolbar.tsx` currently exposes only parent/root/reveal-all controls.
- `gui/src/features/concept-graph/ui/graph-explorer-sidebar.tsx` is focused on the current concept, prompt template, and direct neighbors.
- STORY-044 introduces the planner foundation, but there is still no place in the GUI to ask for a destination concept.
- STORY-030 already established deterministic concept-label search semantics in the CLI, which gives the GUI a precedent for exact/prefix/substring ranking behavior.

## Problem

- Users cannot state a goal such as "take me to Distributed Systems" from inside the explorer.
- There is no safe preview step before committing to a route.
- Manual navigation to a distant target remains guesswork even if a planner exists internally.

## Goal

- Add a goal-planning entry point to the GUI that lets users search for a target concept and preview the generated route before activating it.

## Out of Scope

- Active route overlay or guided progression while traversing the graph.
- Authenticated persistence of goal state.
- Alternative-branch comparison.

## Acceptance Criteria

- [ ] The explorer exposes a `Set goal` entry point that opens a goal-planner panel, sheet, or equivalent without leaving the main graph page.
- [ ] Target search runs client-side against the loaded graph labels and uses deterministic ranking aligned with STORY-030: exact case-insensitive match, then prefix match, then substring match, alphabetical within each bucket.
- [ ] Selecting a target renders a route preview using STORY-044 planner output that shows at minimum the start concept, target concept, ordered step preview, hop count, and next recommended node.
- [ ] The preview handles already-at-target and no-plan cases with explicit UI states instead of blank or silent failure behavior.
- [ ] Activating or cancelling a preview does not mutate `currentNodeId` or `visibleNodeIds`; only explicit route activation enters goal mode.
- [ ] UI/component tests cover search ranking, preview rendering, activation, cancellation, and no-plan behavior.

## Subtasks

- [ ] Add goal-planner UI state and a dedicated preview component to the explorer shell.
- [ ] Implement deterministic label search in the GUI with ranking behavior aligned to STORY-030.
- [ ] Wire preview rendering to the pure planner from STORY-044.
- [ ] Add tests for panel state transitions and result rendering.

## Dependencies

- STORY-030
- STORY-044

## Risks

- Risk: client-side search becomes noisy or slow on larger graphs.
- Mitigation: rank deterministically, cap visible results, and debounce input updates if needed.
- Risk: goal setup competes with the existing sidebar and makes the explorer feel cluttered.
- Mitigation: keep goal planning in a clearly bounded panel or modal instead of blending it into every existing control.

## Validation

- Run `cd gui && npm run dev`, open the graph page, launch goal planning, search for concepts such as `distributed`, `dat`, and `operating`, and verify ranking order.
- Generate a preview for a reachable target, an already-selected target, and a no-plan case.
- Run `cd gui && npm test`.
- Run `cd gui && npm run typecheck`.
