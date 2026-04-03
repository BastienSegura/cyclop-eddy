# STORY-046: Add Goal Route Guidance Mode

ID: `STORY-046`
Title: `Add goal route guidance mode`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-04-03`
Updated: `2026-04-03`

## Context

- The current constellation view distinguishes selected, nearby, and discovered nodes, but it has no concept of a planned route.
- `gui/src/features/concept-graph/ui/graph-explorer.tsx` already composes the toolbar, canvas, and sidebar, so it is the natural place to host active goal-mode state.
- STORY-045 adds route preview, but preview alone does not help a user once they return to the graph and start moving.
- The product promise for goal mode depends on surfacing the next best step while preserving the existing exploration feel.

## Problem

- A static preview is easy to forget once the user resumes graph traversal.
- There is no visual distinction between a planned step and an incidental click.
- The app has no completion state for reaching the planned destination.

## Goal

- Turn an activated route into a guided exploration mode with visible progress, next-step affordances, and explicit completion behavior.

## Out of Scope

- Alternative route branches and rerouting heuristics.
- Authenticated save/restore behavior.
- XP, achievements, or mastery scoring.

## Acceptance Criteria

- [ ] Activating a preview stores active goal-route state in explorer client state without changing the graph loading flow.
- [ ] The constellation UI visually distinguishes planned route nodes/edges and the immediate next recommended node from ordinary discovered nodes.
- [ ] The toolbar, sidebar, or equivalent guidance UI shows the target concept, route progress (`step X of Y`), remaining hops, and a one-click action to focus the next planned node.
- [ ] Visiting planned nodes in order advances route progress; selecting an off-route node preserves the active goal but makes deviation visible instead of silently discarding the route.
- [ ] Reaching the target produces a clear completion state and lets the user clear the goal without clearing discovered-node progress.
- [ ] UI/component tests cover route activation, on-route advancement, off-route deviation state, and completion/reset behavior.

## Subtasks

- [ ] Add an active goal-route state model to the explorer shell.
- [ ] Extend constellation styling/rendering helpers so route nodes and edges have distinct visual states.
- [ ] Add guidance UI that exposes route progress and next-step actions.
- [ ] Add tests for guided-mode state transitions.

## Dependencies

- STORY-044
- STORY-045

## Risks

- Risk: route-highlighting visuals overwhelm the current constellation readability.
- Mitigation: add a distinct but restrained route layer and keep existing neighborhood/discovery cues intact.
- Risk: active-goal state and current-node state drift apart.
- Mitigation: keep one authoritative selection state and derive route progress from it.

## Validation

- Run `cd gui && npm run dev`, activate a route, follow the suggested nodes, intentionally click off-route once, and verify guidance and deviation states.
- Complete a guided route and verify the completion state appears without resetting normal discovery state.
- Run `cd gui && npm test`.
- Run `cd gui && npm run typecheck`.
