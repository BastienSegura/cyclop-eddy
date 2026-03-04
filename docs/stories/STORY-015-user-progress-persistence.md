# STORY-015: Persist User Exploration Progress

ID: `STORY-015`
Title: `Persist user exploration progress`
Status: `draft`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- The graph explorer currently keeps progression in local component state only.
- Current state includes selected concept, discovered nodes, and camera position in `graph-explorer.tsx`.
- After reload or logout, this state is lost.

## Problem

- Account creation/login alone does not deliver user value unless exploration progress is saved and restored.
- Users cannot continue where they stopped.

## Goal

- Persist and restore each authenticated user's exploration state.
- Keep scope intentionally minimal and deterministic for MVP.

## Out of Scope

- Team/class shared progress.
- Branching/merging progress histories.
- Achievement or XP systems.

## Acceptance Criteria

- [ ] A protected progress API exists (`GET /api/progress/me`, `PUT /api/progress/me`).
- [ ] Stored payload includes at least `currentNodeId`, `visibleNodeIds`, and `camera` state.
- [ ] Graph explorer loads saved progress after successful session restore.
- [ ] Progress updates are persisted during usage with debounced writes.
- [ ] Logout clears in-memory authenticated progress and prevents further writes until next login.

## Subtasks

- [ ] Define progress snapshot schema and serialization limits.
- [ ] Implement repository/API handlers for fetch and upsert per user.
- [ ] Add client auth-aware boot sequence: session check then progress hydration.
- [ ] Add debounced save trigger based on explorer state transitions.
- [ ] Add fallback behavior when no snapshot exists (current default root flow).

## Dependencies

- STORY-011
- STORY-013

## Risks

- Risk: write frequency can cause noisy DB traffic.
- Mitigation: debounce saves and skip writes when payload hash has not changed.

## Validation

- Log in, navigate graph, refresh page, and verify state restores.
- Log in as second user and verify progress isolation.
- Log out and confirm no authenticated progress fetch/write occurs.
- Corrupt or missing snapshot should gracefully fallback to default root experience.
