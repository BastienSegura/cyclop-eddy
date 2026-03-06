# GUI Architecture (Prototype)

This document defines the baseline architecture for the `gui/` frontend.

## Goals

- Keep product iteration fast.
- Keep core graph logic independent from UI components.
- Make future migration to advanced graph rendering (e.g. Sigma.js) straightforward.

## Current Layering

`gui/src/features/concept-graph/` is split into four layers:

- `domain/`
  - Pure model types and input parsing
  - No framework or browser dependencies
- `application/`
  - Use-case logic and transformations (graph building, prompt template generation)
  - No direct data fetching
- `infrastructure/`
  - Data access and file loading adapters
  - Can later be replaced by API or database adapters
- `ui/`
  - React client components and visual composition
  - Uses application/infrastructure APIs, not raw parsing logic

Outside the feature folder, auth and persistence live in:

- `gui/src/app/`
  - App Router pages (`/`, `/login`, `/register`, `/settings/account`)
  - Auth API routes under `api/auth/`
- `gui/src/server/auth/`
  - Node-only auth handlers, session services, repositories, and cookie policy
- `gui/src/server/db/`
  - Prisma client bootstrap

## Why this stays maintainable

- Parsing or graph rules can evolve without rewriting UI.
- UI redesign can happen without touching domain logic.
- Data source can switch (file -> API -> DB) with localized changes.
- Each layer has a clear owner/responsibility.

## Current Data Flow

1. `load-graph.ts` fetches the derived GUI graph file at `public/data/concept_list_cleaned.txt` and falls back to `public/data/fixtures/demo_concept_list_cleaned.txt` when the derived file is absent.
2. `parse-edge-list.ts` converts raw lines into structured entries.
3. `build-concept-graph.ts` builds nodes and directional links.
4. `compute-graph-layout.ts` orchestrates connected-component discovery, initial placement, force simulation, and root-neighborhood shaping via the `graph-layout-*.ts` helper modules.
5. `use-graph-explorer-data.ts` loads the graph, chooses the initial node, and owns progressive reveal state.
6. `use-graph-camera.ts` owns camera state, fit-on-first-load behavior, and animated recentering.
7. `use-graph-fullscreen.ts` keeps graph fullscreen state in sync with the browser fullscreen API.
8. `graph-explorer.tsx` composes the shell from `GraphExplorerHeader`, `GraphExplorerToolbar`, `GraphExplorerSidebar`, and `ConstellationView`.
9. `constellation-view.tsx` renders the SVG scene while `use-constellation-interactions.ts` handles pointer pan/zoom and edge hit interactions.
10. `constellation-label-layout.ts` applies the local visible-node and label collision-avoidance pass.
11. `constellation-node-styles.ts` owns color/style token generation and node/edge state classes.
12. Graph canvas styles in `globals.css` provide the starry-night backdrop and node state styling.

## Current Auth Surface

- Pages:
  - `/login`
  - `/register`
  - `/settings/account`
- API routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/change-password`
- Server modules:
  - Request handlers, throttling, session cookies, and password/session primitives live under `gui/src/server/auth/`.
  - These handlers are intended for Node.js runtime only.

## Current Interaction Model

- Initial focus is static on `Computer Science` (fallback to graph root when unavailable).
- Visible universe starts as: selected node + direct neighbors.
- Selecting a node reveals its neighbors and recenters camera smoothly.
- Clicking a visible edge directly selects the target node.
- Dead-end concepts are rendered with a distinct diamond shape to reduce exploration friction.

## Planned Evolution

- Add persistent user progression (visited nodes, saved trails, notes).
- Add server-backed exploration history for authenticated users.
- Replace simple constellation renderer with scalable graph engine.
- Add browser-level interaction coverage for graph drag/zoom/fullscreen behavior.
