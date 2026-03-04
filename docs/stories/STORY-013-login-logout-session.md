# STORY-013: Add Login, Logout, and Session Lifecycle

ID: `STORY-013`
Title: `Add login logout and session lifecycle`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- Current prototype has no authenticated state or route protection.
- Graph explorer behavior is currently anonymous and entirely client-side.
- Account persistence requires a stable session contract and a reliable logout path.
- STORY-011 defines DB-backed sessions with hashed tokens and shared primitives.

## Problem

- Users cannot sign in after account creation.
- There is no secure session cookie lifecycle.
- There is no logoff mechanism to invalidate active session tokens.

## Goal

- Add credential login and logout with secure, expiring, DB-backed sessions.
- Add a minimal auth state endpoint to restore user session on refresh.

## Out of Scope

- Role-based access control.
- Multi-factor authentication.
- Social identity providers.

## Acceptance Criteria

- [x] `POST /api/auth/login` validates credentials and issues a `__Host-` prefixed session cookie (`HttpOnly`, `SameSite=Lax` or stricter, `Path=/`, `Secure` in production).
- [x] `POST /api/auth/logout` revokes the current DB session and clears auth cookie.
- [x] `GET /api/auth/me` returns authenticated user profile when session is valid and `401` when invalid.
- [x] Login failures return non-enumerating credential errors (same external behavior for unknown email vs wrong password).
- [x] Login endpoint includes basic throttling to reduce brute-force attempts.
- [x] Auth route handlers for login/logout/me explicitly run on Node.js runtime.
- [x] Login page/form exists with deterministic user-facing error states.
- [x] App shell supports logged-in and logged-out states (including visible logout action).

## Subtasks

- [x] Implement credential verification against hashed passwords.
- [x] Implement cookie/session helpers (set, read, clear) with consistent options.
- [x] Implement login/logout/me route handlers using `createSession` and `validateSession` primitives.
- [x] Add basic login throttling keyed by IP and/or normalized identifier.
- [x] Add login page and integrate logout action in UI.
- [x] Add middleware/helper for authenticated API route checks.

## Dependencies

- STORY-011
- STORY-012

## Risks

- Risk: cookie misconfiguration causes session theft or inconsistent behavior.
- Mitigation: centralize cookie options, add tests for attributes and expiry.
- Risk: brute-force attempts on login endpoint.
- Mitigation: apply throttling and deterministic error responses.

## Validation

- Log in with valid credentials and verify authenticated response from `/api/auth/me`.
- Attempt login with unknown email and with wrong password; confirm equivalent external error semantics.
- Trigger throttle threshold and verify `429` behavior.
- Log out and verify `/api/auth/me` returns `401`.
- Confirm session cookie policy (`__Host-`, `HttpOnly`, `SameSite`, `Secure` in production) and cookie removal after logout.

Implemented with:

- API routes:
  - `gui/src/app/api/auth/login/route.ts`
  - `gui/src/app/api/auth/logout/route.ts`
  - `gui/src/app/api/auth/me/route.ts`
- Server handlers/helpers:
  - `gui/src/server/auth/login-handler.ts`
  - `gui/src/server/auth/logout-handler.ts`
  - `gui/src/server/auth/me-handler.ts`
  - `gui/src/server/auth/login.ts`
  - `gui/src/server/auth/login-throttle.ts`
  - `gui/src/server/auth/session-cookie.ts`
  - `gui/src/server/auth/current-user.ts`
  - `gui/src/server/auth/user-repository.ts` (`findById` support)
- UI:
  - `gui/src/app/login/page.tsx`
  - `gui/src/features/auth/ui/session-status.tsx`
  - `gui/src/features/concept-graph/ui/graph-explorer.tsx` (shell integration)
  - `gui/src/app/globals.css` (auth/session UI styles)
- Tests:
  - `gui/src/app/api/auth/login/route.test.ts`
  - `gui/src/app/api/auth/logout/route.test.ts`
  - `gui/src/app/api/auth/me/route.test.ts`
  - `gui/src/server/auth/login.test.ts`

Validation evidence:

- `cd gui && npm run test` (includes login/logout/me + non-enumeration + throttling tests)
- `cd gui && npm run typecheck`
