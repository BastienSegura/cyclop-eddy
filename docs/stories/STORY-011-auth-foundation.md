# STORY-011: Add Auth and Persistence Foundation

ID: `STORY-011`
Title: `Add auth and persistence foundation`
Status: `draft`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- The current GUI is a prototype with no account/session backend.
- `docs/manifest.md` explicitly marks production auth as out of scope in current scope.
- The graph view is directly accessible and state is local React state in `gui/src/features/concept-graph/ui/graph-explorer.tsx`.
- Graph data is currently loaded from a static file (`gui/src/features/concept-graph/infrastructure/load-graph.ts`).

## Problem

- There is no place to persist account identity or user progress.
- If registration/login are implemented without a clear server foundation, later migration to persistent progression will be expensive and brittle.

## Goal

- Introduce the minimum server-side auth/data foundation needed for account features and progress persistence.
- Keep this story strictly focused on schema, server modules, and shared security primitives.

## Out of Scope

- Registration form UI.
- Login/logout UI flows.
- Password change UX.
- Progress save/load behavior in graph explorer.

## Acceptance Criteria

- [ ] A database layer is added with migrations and a documented local setup path.
- [ ] Schema includes `users`, `sessions`, and `progress_snapshots` tables with foreign keys and timestamps.
- [ ] Shared auth server module exists for password hashing/verification and session token generation/validation.
- [ ] Session storage stores token hashes (not raw tokens) and supports expiration checks.
- [ ] Environment variables and local development defaults are documented.

## Subtasks

- [ ] Choose DB adapter for MVP (`SQLite`) and define a Postgres-compatible schema style.
- [ ] Add initial migration(s) for `users`, `sessions`, `progress_snapshots`.
- [ ] Implement server-only helpers for password hashing (`argon2id`) and secure token hashing.
- [ ] Implement a session repository API (`create`, `findValid`, `revoke`, `revokeAllForUser`).
- [ ] Add developer docs for bootstrapping DB in local environment.

## Dependencies

- `None`

## Risks

- Risk: foundation choices lock in a difficult migration path.
- Mitigation: keep schema relational and avoid framework-specific coupling in domain interfaces.

## Validation

- Run migrations from scratch on a clean environment.
- Verify created tables and constraints exist.
- Execute unit tests for password hash and session token helper utilities.
- Manually verify that expired sessions are rejected by repository validation.
