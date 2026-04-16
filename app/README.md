# App Prototype (Next.js App Router)

This folder contains a maintainable frontend prototype for Cyclop Eddy.

## Stack

- Next.js App Router
- React + TypeScript
- Feature-based architecture (domain/application/infrastructure/ui)

## Run

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000.

Production build check:

```bash
npm run build
```

Run regression tests:

```bash
npm run test
```

For the full repository bootstrap order, use the root [`README.md`](../README.md):
Python environment first, then App environment, then regression tests, then app commands.

## Auth Foundation (Story 11)

This repository now includes auth/persistence foundation modules in `src/server/auth/`
and Prisma schema/migrations in `prisma/`.

Bootstrap local auth persistence:

```bash
cp .env.example .env
npm run db:migrate:dev
npm run db:generate
```

## Local-only Files

These files and directories are local development artifacts and should not be committed:

- `.env`
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`
- `.next/`
- `node_modules/`
- `prisma/dev.db` and other `prisma/dev.db*` SQLite sidecar files

Keep `.env.example` committed; it is the checked-in template for local setup.

Migration scripts:

```bash
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:migrate:status
```

Security contracts established by the foundation:

- Password hashing uses `argon2id` (`src/server/auth/password.ts`).
- Session storage keeps only hashed session tokens (`sha256(token + pepper)`).
- Session cookie policy is centralized in `src/server/auth/config.ts`:
  - `HttpOnly`
  - `SameSite=Lax` (or stricter in future)
  - `Path=/`
  - `Secure` in production
  - `__Host-` cookie naming guidance
- Auth/password/session handlers must run on Node.js runtime (`AUTH_RUNTIME = "nodejs"`).

## Registration Flow (Story 12)

Current registration surface:

- API: `POST /api/auth/register`
- Page: `/register`

Behavior:

- Valid registration creates the user and auto-creates a session.
- The route sets the session cookie and the registration page redirects to `/`.
- Error mapping is deterministic: `400` (invalid payload), `409` (duplicate), `429` (throttled), `500` (unexpected).

Manual check:

```bash
npm run dev
# Open /register, create an account, confirm redirect to /
```

## Session Lifecycle (Story 13)

Current auth/session endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Current pages and shell behavior:

- `/login` provides credential login.
- `/register` provides account creation.
- Explorer header now shows logged-in/logged-out state and a logout button.

Session contract:

- login sets the session cookie.
- logout revokes current session and clears session cookie.
- `/api/auth/me` returns `401` when unauthenticated and user profile when authenticated.
- login uses non-enumerating credential errors (unknown email and wrong password share the same message).

## Password Change (Story 14)

Current password maintenance surface:

- API: `POST /api/auth/change-password`
- Page: `/settings/account`

Behavior:

- Requires an authenticated session.
- Verifies the current password before rotating the hash.
- Reuses the shared password policy from registration.
- Revokes all other active sessions for the same user after a successful change.

## Architecture

`src/features/concept-graph/` is split by responsibility:

- `domain/`: pure types + parsers (`parse-edge-list.ts`)
- `application/`: graph assembly, prompt generation, layout entrypoint, and pure layout helpers (`graph-layout-*.ts`)
- `infrastructure/`: data loading from file source (`/public/data/...`)
- `ui/`: React composition shell, hooks, and rendering helpers (`graph-explorer-*`, `use-graph-*`, `constellation-*`)

This split keeps business logic testable and reusable when UI evolves.

Current auth/server shape lives outside the concept-graph feature folder:

- `src/app/`: App Router pages and `api/auth/*` route handlers
- `src/server/auth/`: Node-only auth services, handlers, throttling, session cookies, and repositories
- `src/server/db/`: Prisma bootstrap

## Data Source

Prototype loading order:

- First try the derived sync target: `public/data/concept_list_cleaned.txt`
- Fall back to the committed demo fixture: `public/data/fixtures/demo_concept_list_cleaned.txt`

Path prefix compatibility:
- New cleaner format encodes each path segment as `~<percent-encoded-label>` to preserve literal hyphens.
- Legacy files using `-` as a space substitute are still supported by fallback parsing.
- A regression fixture is available at `public/data/fixtures/concept_list_cleaned_hyphen_fixture.txt`.

Runtime artifact policy:
- `public/data/concept_list_cleaned.txt` is a derived file written by `knowledge-map-gen/sync_concept_data.py` and is git-ignored.
- `public/data/fixtures/` contains the committed App data fixtures that remain versioned.

Refresh the derived App data from the canonical cleaned artifact from the repo root:

Example:

```bash
cd ..
python knowledge-map-gen/sync_concept_data.py
```

## Current UX

- Loads concept graph from cleaned text file
- Includes auth-aware routes/pages for login, registration, and account password change
- Explorer header shows current session state and exposes logout when authenticated
- Starts with `Computer Science` and its direct neighbors visible
- Expands visible graph progressively as you select new nodes
- Uses force-directed positioning so connected nodes stay spatially closer
- Supports smooth camera travel when selecting a node
- Supports drag-to-pan navigation
- Supports mouse-wheel / trackpad zoom centered on cursor
- Supports edge click navigation (click a link to move to its target node)
- Applies fog-of-war visibility:
  - selected node: gold
  - connected nodes: bright blue
  - farther discovered nodes: pale/transparent
- Highlights dead-end concepts (leaf nodes) with a diamond marker
- Adds a subtle starry-night background in the graph canvas
- Runs a local collision-avoidance pass for visible nodes/labels to reduce overlap
- Generates and copies a learning prompt template for the selected node

## Next Iterations

- Consider a larger-graph rendering engine (Sigma.js/Graphology) if dataset size grows
- Persist user exploration state
- Add authenticated exploration history / saved trails once story 15 lands
- Add richer node details and learning progression indicators
