# STORY-014: Add Change Password Flow

ID: `STORY-014`
Title: `Add change password flow`
Status: `draft`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

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

- [ ] `POST /api/auth/change-password` exists and requires valid authenticated session.
- [ ] Endpoint validates `currentPassword`, `newPassword`, and `confirmPassword` semantics.
- [ ] Current password mismatch returns deterministic validation/auth error.
- [ ] Password hash is updated atomically on success using shared `hashPassword(...)` primitive.
- [ ] Session revocation policy is explicit and tested: revoke all other sessions for the user after successful change.
- [ ] Endpoint avoids raw password logging and runs on Node.js runtime.

## Subtasks

- [ ] Define request validation schema and password policy reuse.
- [ ] Implement authenticated route handler using shared session guard.
- [ ] Verify current password with shared `verifyPassword(...)` primitive before applying new hash.
- [ ] Revoke non-current sessions after successful password change.
- [ ] Add settings UI section for password update with success/error feedback.
- [ ] Add unit/integration tests for transactional update + revocation behavior.

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
