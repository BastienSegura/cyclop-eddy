# STORY-020: Decompose Oversized Concept-Graph Frontend Modules

ID: `STORY-020`
Title: `Decompose oversized concept-graph frontend modules`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The GUI already follows a documented feature/layer split under `gui/src/features/concept-graph/` with `domain/`, `application/`, `infrastructure/`, and `ui/`.
- The current implementation keeps that high-level layering intact, but three modules now carry too much behavior:
- `gui/src/features/concept-graph/ui/graph-explorer.tsx`
- `gui/src/features/concept-graph/ui/constellation-view.tsx`
- `gui/src/features/concept-graph/application/compute-graph-layout.ts`
- `graph-explorer.tsx` currently mixes graph loading, camera state, fullscreen handling, navigation behavior, prompt copy behavior, and page composition.
- `constellation-view.tsx` currently mixes rendering styles, collision logic, viewport math, pan/zoom interaction handling, and SVG rendering.
- `compute-graph-layout.ts` currently mixes connected-component discovery, initial placement, force-layout simulation, and root-neighborhood shaping in one large file.

## Problem

- The current modules are still understandable, but they are now the most likely source of future regressions and merge friction.
- Reusing or testing specific behavior is harder because pure helpers and UI orchestration are bundled together.
- The current file sizes discourage targeted changes and make architecture drift more likely.

## Goal

- Preserve the current concept-graph architecture while splitting oversized modules into smaller, intention-revealing units.
- Keep pure math/layout logic separate from React component orchestration.
- Make the graph explorer easier to extend without rewriting large files.

## Out of Scope

- A visual redesign of the graph explorer.
- Switching to a new rendering engine such as Sigma.js.
- Changing the graph data model or current interaction contract.

## Acceptance Criteria

- [ ] `graph-explorer.tsx` becomes a composition shell that delegates loading, camera/fullscreen behavior, and secondary panel rendering to smaller modules or hooks.
- [ ] `constellation-view.tsx` no longer owns color/style utilities, label-collision logic, pointer pan/zoom behavior, and SVG rendering details in one file.
- [ ] `compute-graph-layout.ts` delegates force-layout internals and component-level layout helpers to smaller pure modules while preserving the public `computeGraphLayout(...)` contract.
- [ ] Extracted pure helpers are placed in the existing concept-graph layer that best matches their responsibility (`application/` or `ui/` helper modules) rather than introducing a parallel architecture.
- [ ] Existing graph behavior remains unchanged from a user perspective: graph load, node selection recentering, drag-pan, cursor-centered zoom, edge click navigation, fullscreen toggle, and prompt copy all still work.
- [ ] Automated tests cover at least one newly extracted pure helper area beyond current parse/build tests.
- [ ] `npm run test`, `npm run typecheck`, and `npm run build` all succeed after the refactor.

## Subtasks

- [ ] Extract graph loading and initial-node selection behavior from `graph-explorer.tsx` into a dedicated hook or helper module.
- [ ] Extract camera movement and fullscreen state handling from `graph-explorer.tsx` into dedicated hook/helper modules.
- [ ] Extract panel/header/sidebar rendering pieces from `graph-explorer.tsx` where the markup is purely presentational.
- [ ] Move color/style helper functions from `constellation-view.tsx` into a dedicated helper module.
- [ ] Move label-collision and visible-label selection logic from `constellation-view.tsx` into pure helper modules that can be unit-tested.
- [ ] Move pan/zoom pointer interaction logic from `constellation-view.tsx` into dedicated event-handling helpers or hooks.
- [ ] Split `compute-graph-layout.ts` into smaller pure modules for component discovery, initial placement, and force-layout internals while keeping the exported entry point stable.
- [ ] Add unit tests for extracted layout or label-selection helpers and keep existing graph build/parser tests green.

## Dependencies

- `None`

## Risks

- Risk: subtle interaction regressions appear even if types still compile.
- Mitigation: preserve public props/contracts during the split and use a written manual behavior checklist during validation.
- Risk: over-extraction creates many tiny files with no clear ownership.
- Mitigation: extract by responsibility, not by arbitrary line-count targets, and keep modules aligned with the existing `domain/application/infrastructure/ui` structure.

## Validation

- Run `cd gui && npm test`, `cd gui && npm run typecheck`, and `cd gui && npm run build`.
- In `cd gui && npm run dev`, manually verify graph load, node selection recentering, drag-pan, wheel zoom, edge click navigation, fullscreen toggle, and prompt copy.
