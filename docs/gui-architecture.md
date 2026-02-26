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

## Why this stays maintainable

- Parsing or graph rules can evolve without rewriting UI.
- UI redesign can happen without touching domain logic.
- Data source can switch (file -> API -> DB) with localized changes.
- Each layer has a clear owner/responsibility.

## Current Data Flow

1. `load-graph.ts` fetches `public/data/concept_list_cleaned.txt`.
2. `parse-edge-list.ts` converts raw lines into structured entries.
3. `build-concept-graph.ts` builds nodes and directional links.
4. `compute-graph-layout.ts` generates world coordinates using a force-directed pass to reduce long confusing edges.
5. `graph-explorer.tsx` computes dead-end nodes (leaf concepts) and tracks progressive reveal state.
6. `graph-explorer.tsx` animates a camera through the world when users select nodes.
7. `constellation-view.tsx` handles drag-pan and cursor-centered wheel zoom gestures.
8. `constellation-view.tsx` exposes edge-hit interactions so users can navigate by clicking links.
9. `constellation-view.tsx` runs a local collision-avoidance pass for visible nodes/labels.
10. `graph-explorer.tsx` applies fog-of-war style visibility (selected, near, far) on discovered nodes.
11. Graph canvas styles in `globals.css` provide the starry-night backdrop and node state styling.

## Current Interaction Model

- Initial focus is static on `Computer Science` (fallback to graph root when unavailable).
- Visible universe starts as: selected node + direct neighbors.
- Selecting a node reveals its neighbors and recenters camera smoothly.
- Clicking a visible edge directly selects the target node.
- Dead-end concepts are rendered with a distinct diamond shape to reduce exploration friction.

## Planned Evolution

- Add authentication pages and session-aware exploration history.
- Add persistent user progression (visited nodes, saved trails, notes).
- Replace simple constellation renderer with scalable graph engine.
- Add test coverage per layer (domain/application first).
