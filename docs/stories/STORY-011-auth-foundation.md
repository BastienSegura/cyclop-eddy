# STORY-011: Add Auth and Persistence Foundation

ID: `STORY-011`
Title: `Add auth and persistence foundation`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-04`
Updated: `2026-03-04`

## Context

- The current GUI is a prototype with no account/session backend.
- `docs/manifest.md` explicitly marks production auth as out of scope in current scope.
- The graph view is directly accessible and state is local React state in `gui/src/features/concept-graph/ui/graph-explorer.tsx`.
- Graph data is currently loaded from a static file (`gui/src/features/concept-graph/infrastructure/load-graph.ts`).
- The project needs an MVP foundation that is SQLite-first but keeps a low-friction path to Postgres later.

## Problem

- There is no place to persist account identity or user progress.
- If registration/login are implemented without a clear server foundation, later migration to persistent progression will be expensive and brittle.

## Goal

- Introduce the minimum secure server-side auth/data foundation needed for account features and progress persistence.
- Standardize foundation choices now: Prisma + migrations, SQLite for MVP, Postgres-compatible schema conventions.
- Keep this story strictly focused on schema, server modules, and shared security primitives.

## Out of Scope

- Registration form UI.
- Login/logout UI flows.
- Password change UX.
- Progress save/load behavior in graph explorer.

## Acceptance Criteria

- [x] Prisma is configured as the DB layer with migrations and a documented local bootstrap flow.
- [x] Initial schema includes `users`, `sessions`, and `progress_snapshots` with foreign keys, timestamps, and `ON DELETE CASCADE` where appropriate.
- [x] `users` includes unique `email` and unique normalized `emailLower` plus `passwordHash`.
- [x] `sessions` stores only `tokenHash` (no raw token), and includes `expiresAt`, optional `revokedAt`, plus indexes on `(userId, expiresAt)` and `expiresAt`, with `tokenHash` unique.
- [x] `progress_snapshots` includes `kind`, `graphVersion`, `schemaVersion`, and JSON `payload`, with index coverage for `(userId, kind, createdAt)`.
- [x] Shared auth server module exposes explicit primitives: `hashPassword`, `verifyPassword`, `createSession`, `validateSession`, `revokeSession`.
- [x] Session token hashing uses `sha256(token + pepper)` where pepper is read from environment configuration.
- [x] Foundation documentation defines required cookie policy for future auth routes: `HttpOnly`, `SameSite=Lax` (or stricter), `Path=/`, `Secure` in production, and `__Host-` cookie name guidance.
- [x] Foundation documentation states auth/password/session route handlers must run on Node.js runtime (not Edge runtime).
- [x] Unit tests cover password hash/verify and session token validation/expiration primitives.

## Subtasks

- [x] Add Prisma setup and migration tooling with SQLite MVP configuration.
- [x] Create initial migration for `users`, `sessions`, and `progress_snapshots` including required uniques and indexes.
- [x] Implement server-only password helpers using `argon2id`.
- [x] Implement server-only session helpers with hashed token persistence and expiry checks.
- [x] Implement session repository methods: `create`, `findValid`, `revoke`, `revokeAllForUser`.
- [x] Define environment variables (`DATABASE_URL`, `SESSION_TOKEN_PEPPER`, cookie/session settings) and local defaults guidance.
- [x] Document runtime and cookie policy contract for downstream auth stories.
- [x] Add unit tests for auth primitives and session expiry/revocation behavior.

## Dependencies

- `None`

## Risks

- Risk: foundation choices lock in a difficult migration path.
- Mitigation: keep schema relational, use Prisma migrations, and enforce normalized identifiers early.
- Risk: session implementation leaks sensitive token data.
- Mitigation: store hashed session tokens only and avoid logging raw secrets.

## Validation

- Run migrations from scratch on a clean environment and verify schema/indexes.
- Verify `users.emailLower` and `sessions.tokenHash` uniqueness constraints work as expected.
- Execute unit tests for password hash/verify primitives.
- Execute unit tests for session creation, validation, expiration rejection, and revocation handling.
- Confirm all foundation docs include runtime, cookie, and env configuration requirements.

Implemented with:

- Prisma stack and schema:
  - `gui/prisma/schema.prisma`
  - `gui/prisma/migrations/20260304180758_init_auth_foundation/migration.sql`
  - `gui/prisma/migrations/migration_lock.toml`
- Server foundation modules:
  - `gui/src/server/db/prisma.ts`
  - `gui/src/server/auth/config.ts`
  - `gui/src/server/auth/password.ts`
  - `gui/src/server/auth/session-token.ts`
  - `gui/src/server/auth/session-repository.ts`
  - `gui/src/server/auth/session-service.ts`
  - `gui/src/server/auth/index.ts`
- Tests:
  - `gui/src/server/auth/password.test.ts`
  - `gui/src/server/auth/session-service.test.ts`
- Documentation/env:
  - `gui/.env.example`
  - `gui/README.md`

Validation evidence:

- `cd gui && DATABASE_URL=\"file:./dev.db\" npm run db:generate`
- `cd gui && DATABASE_URL=\"file:./dev.db\" npm run db:migrate:deploy`
- `cd gui && npm run test`
- `cd gui && npm run typecheck`
