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

- [ ] `POST /api/auth/register` endpoint exists and creates a user with hashed password.
- [ ] Registration normalizes email (`trim + lowercase`) and enforces uniqueness via `emailLower`.
- [ ] Password policy is enforced server-side (minimum length + basic strength guardrails).
- [ ] Endpoint implements deterministic error mapping (`400`, `409`, `429`, `500`) and no raw password logging.
- [ ] Client registration page/form exists with clear success and failure states.
- [ ] On successful registration, user lands in authenticated state (auto-login or explicit redirect to login, chosen and documented).

## Subtasks

- [ ] Define registration payload contract and validation schema.
- [ ] Implement user repository create/find-by-normalized-email functions.
- [ ] Add route handler that uses `hashPassword(...)` from STORY-011 primitives.
- [ ] Add basic registration throttling (per IP and/or per normalized email key).
- [ ] Add App Router registration page and form handling.
- [ ] Add unit tests for validation, normalization, and endpoint behavior.

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
