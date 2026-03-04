# GUI Prototype (Next.js App Router)

This folder contains a maintainable frontend prototype for Cyclop Eddy.

## Stack

- Next.js App Router
- React + TypeScript
- Feature-based architecture (domain/application/infrastructure/ui)

## Run

```bash
cd gui
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

## Auth Foundation (Story 11)

This repository now includes auth/persistence foundation modules in `src/server/auth/`
and Prisma schema/migrations in `prisma/`.

Bootstrap local auth persistence:

```bash
cp .env.example .env
npm run db:migrate:dev
npm run db:generate
```

Migration scripts:

```bash
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:migrate:status
```

Security contracts established by the foundation:

- Password hashing uses `argon2id` (`src/server/auth/password.ts`).
- Session storage keeps only hashed session tokens (`sha256(token + pepper)`).
- Session cookie policy (for future route handlers) is centralized in `src/server/auth/config.ts`:
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

## Architecture

`src/features/concept-graph/` is split by responsibility:

- `domain/`: pure types + parsers (`parse-edge-list.ts`)
- `application/`: graph assembly and reusable prompt template logic
- `infrastructure/`: data loading from file source (`/public/data/...`)
- `ui/`: React components (`graph-explorer`, `constellation-view`)

This split keeps business logic testable and reusable when UI evolves.

## Data Source

Prototype uses:

- `public/data/concept_list_cleaned.txt`

Path prefix compatibility:
- New cleaner format encodes each path segment as `~<percent-encoded-label>` to preserve literal hyphens.
- Legacy files using `-` as a space substitute are still supported by fallback parsing.
- A regression fixture is available at `public/data/concept_list_cleaned_hyphen_fixture.txt`.

You can replace this file with newer generated data from `memory/concept_list_cleaned.txt`.

Example:

```bash
cp ../memory/concept_list_cleaned.txt public/data/concept_list_cleaned.txt
```

## Current UX

- Loads concept graph from cleaned text file
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

- Add dedicated auth flow (login) in App Router
- Consider a larger-graph rendering engine (Sigma.js/Graphology) if dataset size grows
- Persist user exploration state
- Add richer node details and learning progression indicators
