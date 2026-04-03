# STORY-047: Persist Active Goal Routes

ID: `STORY-047`
Title: `Persist active goal routes`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-04-03`
Updated: `2026-04-03`

## Context

- STORY-015 already defines the repository direction for auth-backed exploration persistence using `progress_snapshots`.
- STORY-013 established authenticated session restore, logout, and current-user lookup behavior in the GUI shell.
- Goal mode introduces a long-lived user intention that loses much of its value if it disappears on refresh or between sessions.
- `gui/src/features/concept-graph/ui/use-graph-explorer-data.ts` is still purely in-memory today.

## Problem

- An active goal route vanishes on refresh, new tab open, or logout/login round-trip.
- There is no server contract for saving the target concept, route steps, or current progress through the route.
- Without persistence, goal mode feels like a temporary demo instead of a durable learning workflow.

## Goal

- Persist and restore active goal-route state for authenticated users by extending the existing progress-persistence direction instead of inventing a parallel save stack.

## Out of Scope

- Publicly shareable goals or collaborative route editing.
- Multi-device merge conflict resolution beyond last-write-wins.
- Alternative-branch history analytics.

## Acceptance Criteria

- [ ] Goal-mode persistence reuses STORY-015 progress infrastructure and stores route state under a dedicated snapshot contract instead of introducing a second persistence subsystem.
- [ ] Stored payload includes at minimum `startNodeId`, `targetNodeId`, ordered route node ids, a progress marker such as `currentStepIndex`, and compatibility fields required to validate against the current graph/schema version.
- [ ] After authenticated boot and graph load, a compatible saved goal restores and re-enters goal mode automatically; incompatible or corrupt saved data is ignored safely with a visible but non-blocking fallback.
- [ ] Goal-route writes are debounced, change-detected, and skipped for anonymous users.
- [ ] Logout clears in-memory goal state and prevents further goal-route reads or writes until the next authenticated session is established.
- [ ] Tests cover restore-after-refresh, per-user isolation, compatibility rejection, anonymous no-op behavior, and logout clearing.

## Subtasks

- [ ] Define a dedicated goal-route snapshot payload and schema version.
- [ ] Implement repository/API integration on top of STORY-015 progress endpoints or services.
- [ ] Add authenticated hydration and save hooks to goal-mode client state.
- [ ] Add tests for restore, isolation, and compatibility behavior.

## Dependencies

- STORY-015
- STORY-046

## Risks

- Risk: the saved route payload drifts from planner output as goal mode evolves.
- Mitigation: version the payload explicitly and keep the saved shape narrow and test-covered.
- Risk: frequent writes during traversal create noisy DB traffic.
- Mitigation: debounce saves and skip unchanged payloads.

## Validation

- Log in, activate a goal route, refresh the page, and verify the route restores in guided mode.
- Log in as a different user and verify goal-route isolation.
- Change the graph or schema version to force incompatibility and confirm the saved route is ignored safely.
- Log out and confirm active goal state disappears and does not write again until a new authenticated session exists.
- Run `cd gui && npm test`.
- Run `cd gui && npm run typecheck`.
