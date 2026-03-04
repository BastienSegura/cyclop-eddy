# STORY-012: Add Account Registration Flow

ID: `STORY-012`
Title: `Add account registration flow`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- Product direction now requires account-based progression.
- The current app has no account creation endpoint or page.
- `gui/src/app/page.tsx` currently renders the graph explorer directly for any visitor.
- STORY-011 defines foundational auth primitives and normalized email storage (`emailLower`).

## Problem

- Users cannot create an identity to persist progress.
- Without registration, later login/progress stories cannot be validated end to end.

## Goal

- Deliver a secure account creation flow with server validation and a minimal UX.
- Reuse STORY-011 primitives and schema contracts directly.

## Out of Scope

- Third-party OAuth providers.
- Email verification flow.
- Password reset-by-email.

## Acceptance Criteria

- [x] `POST /api/auth/register` endpoint exists and creates a user with hashed password.
- [x] Registration normalizes email (`trim + lowercase`) and enforces uniqueness via `emailLower`.
- [x] Password policy is enforced server-side (minimum length + basic strength guardrails).
- [x] Endpoint implements deterministic error mapping (`400`, `409`, `429`, `500`) and no raw password logging.
- [x] Client registration page/form exists with clear success and failure states.
- [x] On successful registration, user lands in authenticated state (auto-login or explicit redirect to login, chosen and documented).

## Subtasks

- [x] Define registration payload contract and validation schema.
- [x] Implement user repository create/find-by-normalized-email functions.
- [x] Add route handler that uses `hashPassword(...)` from STORY-011 primitives.
- [x] Add basic registration throttling (per IP and/or per normalized email key).
- [x] Add App Router registration page and form handling.
- [x] Add unit tests for validation, normalization, and endpoint behavior.

## Dependencies

- STORY-011

## Risks

- Risk: weak password validation allows low-security credentials.
- Mitigation: enforce server-side policy and reject common invalid patterns.
- Risk: endpoint abuse (bot signups) during MVP.
- Mitigation: add basic throttling and structured monitoring fields.

## Validation

- Register a new account with valid input and verify record insertion.
- Attempt duplicate registration with case-variant email and verify conflict response.
- Submit invalid payloads and verify stable validation error responses.
- Trigger throttling threshold and verify `429` response behavior.
- Verify password hash is stored, never plain text.

Implementation decision:

- Registration success uses auto-login + redirect to `/`.
- `POST /api/auth/register` creates the user, creates a session, sets the session cookie, and the client page navigates to the graph page.

Implemented with:

- Route:
  - `gui/src/app/api/auth/register/route.ts`
- Server auth modules:
  - `gui/src/server/auth/user-repository.ts`
  - `gui/src/server/auth/registration.ts`
  - `gui/src/server/auth/registration-throttle.ts`
- UI:
  - `gui/src/app/register/page.tsx`
  - `gui/src/app/globals.css` (auth page styles)
- Tests:
  - `gui/src/server/auth/registration.test.ts`
  - `gui/src/app/api/auth/register/route.test.ts`

Validation evidence:

- `cd gui && npm run test` (registration route and validation tests pass)
- `cd gui && npm run typecheck` (no type errors)
