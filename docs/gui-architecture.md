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
5. `graph-explorer.tsx` animates a camera through that world when users select nodes.
6. `constellation-view.tsx` handles drag-pan and cursor-centered wheel zoom gestures.

## Planned Evolution

- Add authentication pages and session-aware exploration history.
- Add persistent user progression (visited nodes, saved trails, notes).
- Replace simple constellation renderer with scalable graph engine.
- Add test coverage per layer (domain/application first).
