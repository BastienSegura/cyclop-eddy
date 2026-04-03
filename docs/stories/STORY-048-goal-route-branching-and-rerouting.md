# STORY-048: Add Goal Route Branching and Rerouting

ID: `STORY-048`
Title: `Add goal route branching and rerouting`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-04-03`
Updated: `2026-04-03`

## Context

- Idea #1 for the product explicitly calls for branch choices and a next best step from the user's current position.
- STORY-044 through STORY-047 establish a single-route goal mode, but many concepts can be reached through multiple plausible prerequisite chains.
- A single forced route will often feel arbitrary in a graph with branching subfields and cross-links.
- Once persistence exists, rerouting behavior also needs to be explicit so saved goal state does not become brittle after user deviation.

## Problem

- Users cannot compare plausible routes to the same target.
- Deviating from the route leaves the planner with no standardized recovery behavior.
- A single opaque route recommendation reduces trust in the planner and weakens the "guided learning" promise.

## Goal

- Extend goal mode to support alternative route choices and deterministic rerouting from the user's current position.

## Out of Scope

- Personalized route ranking based on mastery history or LLM scoring.
- Collaborative route curation or public route publishing.
- Rich narrative coaching copy for route explanations.

## Acceptance Criteria

- [ ] The planner can surface up to 3 ranked candidate routes for the same target with deterministic ordering and stable route identifiers or hashes.
- [ ] Goal UI shows alternative-route summaries with at minimum hop count, prerequisite/anchor summary, and an indication of which branch is active.
- [ ] Users can switch branches without losing discovered-node state or changing the active target.
- [ ] When the user deviates from the active route, goal mode offers deterministic reroute-to-target behavior from the current node and clearly reports whether it resumed an existing branch or generated a new primary route.
- [ ] When authenticated, selected-branch and reroute state are incorporated into the saved goal-route snapshot so refresh does not silently discard the user's chosen branch.
- [ ] Tests cover candidate ranking, branch switching, reroute after deviation, no-reroute behavior, and persistence of selected branch state.

## Subtasks

- [ ] Extend the planner to emit ranked candidate routes plus stable route identifiers.
- [ ] Add alternative-route UI and active-branch switching behavior.
- [ ] Implement reroute-from-current-node flow with explicit result states.
- [ ] Extend goal-route persistence tests and payload handling for branch selection.

## Dependencies

- STORY-044
- STORY-046
- STORY-047

## Risks

- Risk: multiple candidate routes overwhelm the UI and obscure the primary recommendation.
- Mitigation: cap alternatives to a small number and summarize each branch compactly.
- Risk: rerouting becomes unstable or surprising if tie-breakers are under-specified.
- Mitigation: reuse the planner's deterministic scoring rules and assert exact candidate ordering in tests.

## Validation

- Activate a goal with multiple plausible prerequisite chains and verify at least two deterministic route options appear in stable order.
- Switch branches, deviate intentionally, reroute from the new position, refresh the page, and verify the selected branch survives for authenticated users.
- Run `cd gui && npm test`.
- Run `cd gui && npm run typecheck`.
