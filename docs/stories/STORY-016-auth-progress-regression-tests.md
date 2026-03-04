# STORY-016: Add Auth and Progress Regression Test Coverage

ID: `STORY-016`
Title: `Add auth and progress regression test coverage`
Status: `draft`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- Current repository already uses tests for core logic (`brain/tests` and GUI domain/application tests).
- Account and session code introduces security-critical behavior with many edge cases.
- Without regression coverage, auth bugs can silently break persistence and user trust.

## Problem

- Future account stories can pass manual checks while still regressing under edge conditions.
- No existing automated test suite covers registration/login/logout/password-change/progress persistence together.

## Goal

- Add deterministic automated tests for auth and progress lifecycle.
- Cover both happy paths and key failure cases.

## Out of Scope

- Full browser E2E testing stack migration.
- Load/performance testing at scale.
- Security pentest automation.

## Acceptance Criteria

- [ ] Automated tests cover: register, duplicate register, login success/failure, logout, `/api/auth/me` session checks.
- [ ] Automated tests cover password change success/failure and session invalidation behavior.
- [ ] Automated tests cover progress save/load and per-user isolation.
- [ ] Test commands are documented and integrated into repository docs.
- [ ] CI/local run fails when auth/progress contracts break.

## Subtasks

- [ ] Select test style for API routes (unit/integration with test DB).
- [ ] Add fixtures/helpers for creating users/sessions/progress snapshots.
- [ ] Add auth endpoint tests with explicit HTTP status assertions.
- [ ] Add progress endpoint tests including isolation and fallback behavior.
- [ ] Update docs with exact test commands and expected outcomes.

## Dependencies

- STORY-012
- STORY-013
- STORY-014
- STORY-015

## Risks

- Risk: flaky tests due to shared mutable state.
- Mitigation: isolate test DB per test module and reset fixtures deterministically.

## Validation

- Run full auth/progress test suite locally from a clean state.
- Intentionally break a contract (for example remove session cookie set) and verify tests fail.
- Restore implementation and verify suite returns to green.
