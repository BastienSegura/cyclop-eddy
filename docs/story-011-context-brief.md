# Cyclop Eddy - STORY-011 Context Brief

Last updated: `2026-03-04`

## Project Context

Cyclop Eddy is a concept-universe learning app with two main parts:

- `brain/` (Python): generates, cleans, and analyzes concept graph data.
- `gui/` (Next.js + TypeScript): renders an interactive constellation-style graph explorer.

Current user experience in the GUI:

- Explore concepts node-by-node in a graph.
- Progressive reveal (fog-of-war style discovery).
- Smooth camera travel, pan/zoom, edge click navigation.
- Copy a learning prompt for the selected concept.

## Current Technical State

- Graph data is loaded from a static file (`gui/public/data/concept_list_cleaned.txt`).
- Explorer state (selected node, discovered nodes, camera) currently lives in client React state.
- There is no backend account system, no session layer, and no user progress persistence.
- The manifest currently marks production auth as out-of-scope for the original prototype phase.

Relevant files:

- `docs/manifest.md`
- `docs/gui-architecture.md`
- `gui/src/features/concept-graph/ui/graph-explorer.tsx`
- `gui/src/features/concept-graph/infrastructure/load-graph.ts`
- `docs/stories/STORY-011-auth-foundation.md`

## Why STORY-011 Exists

Future product direction requires account-based progression (save and restore user exploration progress).

Without a solid auth/data foundation, later stories (registration, login/logout, password change, progress save/load) would be fragile and expensive to revise.

STORY-011 is intentionally foundational and infrastructure-focused.

## STORY-011 Goal (What Must Be Achieved)

Introduce the minimum secure server-side foundation required for account features and persistent user progress.

Concretely, STORY-011 aims to establish:

1. A database layer with migrations and local setup documentation.
2. Core schema tables:
   - `users`
   - `sessions`
   - `progress_snapshots`
3. Shared server auth primitives:
   - password hash/verify (argon2id)
   - session token generation/validation
4. Session security baseline:
   - store hashed session tokens, not raw tokens
   - support expiration checks
5. Environment/config documentation for local development.

## STORY-011 Non-Goals

STORY-011 should **not** implement full user-facing auth flows:

- No registration page UX.
- No login/logout UI.
- No change-password UI.
- No graph progress hydration in the explorer UI.

Those are handled by subsequent stories (STORY-012 to STORY-015).

## Expected Output Quality for STORY-011

- Clear boundaries between data access, auth utilities, and API/session usage.
- Secure defaults that do not leak raw credentials or raw session tokens.
- Migration path preserved for later Postgres adoption (even if MVP uses SQLite).
- Testable primitives (hashing/session validation logic covered by automated tests).

## Request for Second Opinion

Please review STORY-011 architecture choices and suggest:

1. The best implementation stack choices (ORM/query builder/migrations/session approach) for this repository.
2. A minimal but robust schema design for `users`, `sessions`, and `progress_snapshots`.
3. Security pitfalls to avoid in an MVP auth foundation.
4. Any adjustments to STORY-011 acceptance criteria before implementation starts.
