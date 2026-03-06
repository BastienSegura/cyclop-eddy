# STORY-014: Add Change Password Flow

ID: `STORY-014`
Title: `Add change password flow`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-06`

## Context

- Basic account lifecycle is incomplete without password maintenance.
- Product requirement includes explicit ability to change password.
- Existing codebase has no account settings page or password update endpoint.
- STORY-011 provides shared password/session primitives intended to be reused here.

## Problem

- Users cannot rotate credentials after account creation.
- Without password-change support, account security posture remains weak.

## Goal

- Provide an authenticated password-change endpoint and minimal settings UI.
- Ensure old password is verified before hash replacement.

## Out of Scope

- Forgot-password email recovery.
- Account deletion.
- Security email notifications.

## Acceptance Criteria

- [x] `POST /api/auth/change-password` exists and requires valid authenticated session.
- [x] Endpoint validates `currentPassword`, `newPassword`, and `confirmPassword` semantics.
- [x] Current password mismatch returns deterministic validation/auth error.
- [x] Password hash is updated atomically on success using shared `hashPassword(...)` primitive.
- [x] Session revocation policy is explicit and tested: revoke all other sessions for the user after successful change.
- [x] Endpoint avoids raw password logging and runs on Node.js runtime.

## Subtasks

- [x] Define request validation schema and password policy reuse.
- [x] Implement authenticated route handler using shared session guard.
- [x] Verify current password with shared `verifyPassword(...)` primitive before applying new hash.
- [x] Revoke non-current sessions after successful password change.
- [x] Add settings UI section for password update with success/error feedback.
- [x] Add unit/integration tests for transactional update + revocation behavior.

## Dependencies

- STORY-011
- STORY-013

## Risks

- Risk: race conditions could leave stale sessions active after password change.
- Mitigation: perform update + revocation in a transaction.

## Validation

- Change password with valid current password and verify subsequent login works only with new password.
- Attempt change with incorrect current password and verify no hash update occurs.
- Verify previously active sessions (except current session) are invalidated.
- Confirm endpoint runtime configuration is Node.js.

Implemented with:

- API route:
  - `gui/src/app/api/auth/change-password/route.ts`
- Server handlers/helpers:
  - `gui/src/server/auth/change-password.ts`
  - `gui/src/server/auth/change-password-handler.ts`
  - `gui/src/server/auth/password-policy.ts` (shared with registration)
  - `gui/src/server/auth/current-user.ts`
  - `gui/src/server/auth/session-service.ts`
- UI:
  - `gui/src/app/settings/account/page.tsx`
  - `gui/src/features/auth/ui/session-status.tsx` (settings link)
- Tests:
  - `gui/src/server/auth/change-password.test.ts`
  - `gui/src/app/api/auth/change-password/route.test.ts`

Validation evidence:

- `cd gui && npm run test` (includes change-password route and payload tests)
- `cd gui && npm run typecheck`
