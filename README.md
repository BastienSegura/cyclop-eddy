# <center>Cyclop Eddy</center>

Cyclop Eddy is an attempt to build the map of human knowledge.
Displayed through a web app, it allows the user to explore it, and to learn any concept using a generated LLM prompt.

## <center>I. UX Vision</center>

- Move through connected concepts like traveling a skill tree.
- Stop at any node and use prompt templates to learn deeper with an LLM.
- Build toward a Skyrim-like constellation navigation experience.

## <center>II. Repo layout</center>

- **`knowledge-map-gen/`**: current lightweight Python knowledge map generator and renderer.
- **`app/`**: Next.js App Router prototype for concept constellation exploration plus auth pages/routes.
- **`knowledge-map-gen/map-store/`**: runtime pipeline outputs under `knowledge-map-gen/map-store/runtime/` and committed example artifacts under `knowledge-map-gen/map-store/fixtures/`.
- **`archive/`**: old experiments, historical snapshots, deprecated material.
- **`docs/`**: active project documentation.

## Knowledge Map Gen

Current contents of `knowledge-map-gen/`:

- `main.py`: small CLI entry point for generating a knowledge map from a root concept.
- `km_generator.py`: Ollama-backed generator that expands concepts, stores JSON maps, and reloads existing maps safely.
- `maps/`: local generated knowledge maps as one JSON file per root concept.
- `render_map.py`: PyVis-based renderer that turns a saved map into an interactive HTML graph.
- `renders/`: local generated HTML graph renders.
- `old-generator/`: archived previous generator implementation kept for reference.

Current workflow:

```bash
# Generate or expand a map
python knowledge-map-gen/main.py --root "Computer Science" --children 7 --depth 2

# List saved maps
python knowledge-map-gen/main.py --list

# Show one saved map
python knowledge-map-gen/main.py --show "Computer Science"

# Render one saved map to HTML
python knowledge-map-gen/render_map.py --map "Computer Science"
```


## Local Bootstrap

Recommended order for a fresh clone:

1. Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

2. App environment

```bash
cd app
npm install
cp .env.example .env
npm run db:migrate:dev
npm run db:generate
cd ..
```

3. Regression tests

```bash
# Generator tests
python -m unittest discover -s knowledge-map-gen/tests -p 'test_*.py'

# App tests
cd app
npm test
npm run typecheck
npm run build
cd ..
```

4. App commands

```bash
# Refresh graph data
python knowledge-map-gen/sync_concept_data.py

# Run the app
cd app
npm run dev
```

`python knowledge-map-gen/sync_concept_data.py` writes the canonical cleaned artifact to
`knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt` and syncs the derived app file at
`app/public/data/concept_list_cleaned.txt`. On a fresh clone, the app falls back
to `app/public/data/fixtures/demo_concept_list_cleaned.txt` until that derived file
is regenerated.

Local-only files produced by the current workflow are ignored in git, including
`app/.env`, `app/.next/`, `app/node_modules/`, and local Prisma SQLite files.

## Quick commands

Generate concept graph edges:

```bash
python knowledge-map-gen/build_concept_list.py
```

Resume paused generation:

```bash
python knowledge-map-gen/build_concept_list.py --resume --state-file knowledge-map-gen/map-store/runtime/concept_list_state.json
```

Two-phase coverage workflow (recommended for broad concept coverage growth):

```bash
python knowledge-map-gen/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

Find under-explored graph zones and get ranked refinement roots:

```bash
python knowledge-map-gen/find_unexplored_areas.py --input knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt --target-children 8 --top-n 20
```

When to use each mode:
- Single run (`build_concept_list.py`): fast iteration on prompt/parameter tuning.
- Two-phase (`run_two_phase_coverage.py`): planned coverage expansion with merge + quality checkpoints.

After generation completes (new run or resumed run), clean the canonical artifact and sync the derived app target:

```bash
python knowledge-map-gen/sync_concept_data.py
```

Example output:

```text
[sync] Input lines: 417
[sync] Cleaned lines: 413
[sync] Canonical cleaned artifact: knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt
[sync] Derived app target: app/public/data/concept_list_cleaned.txt
[sync] Line parity: 413 == 413 (OK)
[sync] Byte parity: OK
```

Run app prototype:

```bash
cd app
npm run dev
```

Run regression tests:

```bash
# Generator tests
python -m unittest discover -s knowledge-map-gen/tests -p 'test_*.py'

# App tests
cd app
npm run test
```

## Current exploration UX

- Includes auth-aware routes/pages: `/login`, `/register`, and `/settings/account`.
- Explorer header reflects current session state and exposes logout when authenticated.
- Starts at `Computer Science` and reveals neighbors first.
- Expands discovered graph progressively (fog-of-war feel).
- Supports smooth camera move, drag-pan, cursor-centered zoom.
- Supports edge click navigation to target concept.
- Highlights dead ends with diamond markers.
- Uses a subtle starry-night graph backdrop.
