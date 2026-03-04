# STORY-012: Add Account Registration Flow

ID: `STORY-012`
Title: `Add account registration flow`
Status: `draft`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- Product direction now requires account-based progression.
- The current app has no account creation endpoint or page.
- `gui/src/app/page.tsx` currently renders the graph explorer directly for any visitor.

## Problem

- Users cannot create an identity to persist progress.
- Without registration, later login/progress stories cannot be validated end to end.

## Goal

- Deliver a secure account creation flow with server validation and a minimal UX.
- Keep implementation compatible with the foundation introduced by STORY-011.

## Out of Scope

- Third-party OAuth providers.
- Email verification flow.
- Password reset-by-email.

## Acceptance Criteria

- [ ] `POST /api/auth/register` endpoint exists and creates a user with hashed password.
- [ ] Registration enforces unique email (and unique username if username is required).
- [ ] Password policy is enforced server-side (minimum length + basic strength guardrails).
- [ ] Client registration page/form exists with clear success and failure states.
- [ ] On successful registration, user lands in authenticated state (auto-login or explicit redirect to login, chosen and documented).

## Subtasks

- [ ] Define registration payload contract and validation schema.
- [ ] Implement user repository create/find-by-email functions.
- [ ] Add route handler with deterministic error mapping (`409`, `400`, `500`).
- [ ] Add App Router registration page and form handling.
- [ ] Add unit tests for validation and endpoint behavior.

## Dependencies

- STORY-011

## Risks

- Risk: weak password validation allows low-security credentials.
- Mitigation: enforce server-side policy and reject common invalid patterns.

## Validation

- Register a new account with valid input and verify record insertion.
- Attempt duplicate registration and verify conflict response.
- Submit invalid payloads and verify stable validation error responses.
- Verify password hash is stored, never plain text.
