# Account System Implementation Plan

Last updated: `2026-03-04`

## Current Project Constraints

- GUI is currently a client-heavy Next.js App Router prototype and loads graph data from a static file (`gui/src/features/concept-graph/infrastructure/load-graph.ts`).
- There is no backend persistence layer, account table, or session mechanism yet.
- User progression is currently in-memory only (React state in `graph-explorer.tsx`).

## Target Basic Account Capabilities

- Create account
- Log in
- Change password
- Log off
- Save and reload user exploration progress

## Suggested Technical Direction (MVP)

- Keep Next.js App Router and add route handlers for auth/progress APIs.
- Add a relational database (SQLite for local MVP, Postgres-ready schema).
- Use secure password hashing (`argon2id`) and session tokens in `HttpOnly` cookies.
- Keep auth logic in a dedicated server module so GUI code remains clean.

## Implementation Steps

1. Add auth and persistence foundation.
: Introduce DB schema/migrations (`users`, `sessions`, `progress_snapshots`), server config, and shared validation utilities.

2. Implement account creation endpoint + UI.
: Add signup form with validation, unique email/username checks, password policy, and account creation flow.

3. Implement login/logout + session lifecycle.
: Add sign-in flow, session cookie issuance, protected API helper, and logout endpoint that invalidates session.

4. Implement password change flow.
: Add authenticated endpoint requiring current password, rotate hash, and invalidate other active sessions.

5. Persist exploration progress per authenticated user.
: Save `currentNodeId`, discovered nodes, optional camera state, and restore on next login.

6. Add end-to-end auth/progress quality gates.
: Integration tests for registration/login/logout/password-change and progress save/load semantics.

## Non-Goals for This MVP

- Social login/OAuth providers.
- Email verification and reset-by-email flow.
- Multi-device merge conflict resolution for progress beyond last-write-wins.
- Role-based authorization beyond regular user access.
