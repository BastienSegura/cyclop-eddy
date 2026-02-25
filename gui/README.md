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

You can replace this file with newer generated data from `memory/concept_list_cleaned.txt`.

## Current UX

- Loads concept graph from cleaned text file
- Renders a larger graph field (not only one parent + children snapshot)
- Uses force-directed positioning so connected nodes stay spatially closer
- Supports smooth camera travel when selecting a node
- Supports drag-to-pan navigation
- Supports mouse-wheel / trackpad zoom centered on cursor
- Highlights local neighborhood while keeping distant stars visible
- Generates and copies a learning prompt template for the selected node

## Next Iterations

- Add dedicated auth flow (login) in App Router
- Consider a larger-graph rendering engine (Sigma.js/Graphology) if dataset size grows
- Persist user exploration state
- Add richer node details and learning progression indicators
