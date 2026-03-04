# STORY-013: Add Login, Logout, and Session Lifecycle

ID: `STORY-013`
Title: `Add login logout and session lifecycle`
Status: `draft`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- Current prototype has no authenticated state or route protection.
- Graph explorer behavior is currently anonymous and entirely client-side.
- Account persistence requires a stable session contract and a reliable logout path.

## Problem

- Users cannot sign in after account creation.
- There is no secure session cookie lifecycle.
- There is no logoff mechanism to invalidate active session tokens.

## Goal

- Add credential login and logout with secure, expiring sessions.
- Add a minimal auth state endpoint to restore user session on refresh.

## Out of Scope

- Role-based access control.
- Multi-factor authentication.
- Social identity providers.

## Acceptance Criteria

- [ ] `POST /api/auth/login` validates credentials and issues an `HttpOnly`, `Secure`, `SameSite` session cookie.
- [ ] `POST /api/auth/logout` revokes the current session and clears auth cookie.
- [ ] `GET /api/auth/me` returns authenticated user profile when session is valid and `401` when invalid.
- [ ] Login page/form exists with deterministic user-facing error states.
- [ ] App shell supports logged-in and logged-out states (including visible logout action).

## Subtasks

- [ ] Implement credential verification against hashed passwords.
- [ ] Implement cookie/session helpers (set, read, clear) with consistent options.
- [ ] Implement login/logout/me route handlers.
- [ ] Add login page and integrate logout action in UI.
- [ ] Add middleware/helper for authenticated API route checks.

## Dependencies

- STORY-011
- STORY-012

## Risks

- Risk: cookie misconfiguration causes session theft or inconsistent behavior.
- Mitigation: centralize cookie options, add tests for attributes and expiry.

## Validation

- Log in with valid credentials and verify authenticated response from `/api/auth/me`.
- Attempt login with invalid password and verify rejection.
- Log out and verify `/api/auth/me` returns `401`.
- Confirm session cookie is `HttpOnly` and removed after logout.
