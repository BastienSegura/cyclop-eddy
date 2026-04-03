# STORY-044: Add Goal Route Planning Foundation

ID: `STORY-044`
Title: `Add goal route planning foundation`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-04-03`
Updated: `2026-04-03`

## Context

- `docs/feature-ideas.md` already lists goal mode with shortest-path guidance as a product-aligned priority.
- The GUI graph model already exposes both `neighborsByNode` and `reverseNeighborsByNode` in `gui/src/features/concept-graph/domain/types.ts` and `gui/src/features/concept-graph/application/build-concept-graph.ts`.
- Current explorer state in `gui/src/features/concept-graph/ui/use-graph-explorer-data.ts` tracks only the active node and visible node set; there is no reusable route-planning primitive.
- If route computation is deferred to UI components, later preview, guidance, and persistence stories will each reimplement traversal and drift.

## Problem

- Users can only wander locally; they cannot ask the product for a concrete route to a distant concept.
- A useful learning route may need to backtrack through prerequisites before advancing toward the target, but the current app has no model for that.
- Without an application-layer planner, later goal-mode stories will couple graph analysis directly to React state and rendering concerns.

## Goal

- Introduce a pure application-layer goal route planner that computes a deterministic learning route from the current concept to a chosen target.

## Out of Scope

- Goal-selection UI, search, or preview panels.
- Persistence or authenticated save/restore behavior.
- LLM-generated explanations for why a route was chosen.

## Acceptance Criteria

- [ ] A new pure planner module exists under `gui/src/features/concept-graph/application/` and accepts a loaded graph, a current node id, and a target node id without any React or browser dependencies.
- [ ] The planner supports prerequisite-aware routing: if no forward-only route exists from the current node to the target, it can backtrack through reverse edges to a shared prerequisite anchor and then advance through forward edges to the target.
- [ ] The result payload includes at minimum `startNodeId`, `targetNodeId`, ordered route node ids, per-step phase classification, total hop count, and `nextNodeId` when a next step exists.
- [ ] Missing nodes or unreachable targets return structured no-plan results instead of throwing or producing partial garbage output.
- [ ] Tie-breaking between equally short valid routes is deterministic and enforced by tests.
- [ ] Unit tests cover descendant routing, prerequisite backtracking, sibling routing through a shared prerequisite anchor, already-at-target behavior, unresolved-node handling, and deterministic tie-breaking.

## Subtasks

- [ ] Define route-result types and phase labels in the concept-graph application/domain layer.
- [ ] Implement prerequisite-aware traversal over `neighborsByNode` and `reverseNeighborsByNode`.
- [ ] Keep route scoring and tie-breaking explicit and local to the planner module.
- [ ] Add focused unit tests that build small hand-authored graphs instead of relying on UI fixtures.

## Dependencies

- STORY-020

## Risks

- Risk: the planner overfits current mostly tree-like graph data and breaks once denser cross-links appear.
- Mitigation: keep traversal generic over the current directed graph shape and cover branching graphs in tests.
- Risk: equally valid routes produce unstable results across runs.
- Mitigation: sort neighbors deterministically and assert exact output order in tests.

## Validation

- Run `cd gui && npm test` and confirm planner-specific tests pass deterministically.
- Run `cd gui && npm run typecheck`.
- Exercise the planner against a hand-built graph fixture where the best route requires one prerequisite rewind before advancing to the target.
