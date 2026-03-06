# cyclop-eddy

Cyclop Eddy is a concept-universe project focused on making learning feel engaging, exploratory, and game-like.

## Vision

- Move through connected concepts like traveling a skill tree.
- Stop at any node and use prompt templates to learn deeper with an LLM.
- Build toward a Skyrim-like constellation navigation experience.

## Repository layout

- `brain/`: active Python engine, shared graph utilities, and generator internals.
- `gui/`: Next.js App Router prototype for concept constellation exploration plus auth pages/routes.
- `memory/`: runtime pipeline outputs under `memory/runtime/` and committed example artifacts under `memory/fixtures/`.
- `archive/`: old experiments, historical snapshots, deprecated material.
- `docs/`: active project documentation.

## Start here

- Project documentation index: [`docs/README.md`](docs/README.md)
- Project manifest: [`docs/manifest.md`](docs/manifest.md)

## Local Bootstrap

Recommended order for a fresh clone:

1. Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

2. GUI environment

```bash
cd gui
npm install
cp .env.example .env
npm run db:migrate:dev
npm run db:generate
cd ..
```

3. Regression tests

```bash
# Brain tests
python -m unittest discover -s brain/tests -p 'test_*.py'

# GUI tests
cd gui
npm test
npm run typecheck
npm run build
cd ..
```

4. App commands

```bash
# Refresh graph data
python brain/sync_concept_data.py

# Run the GUI
cd gui
npm run dev
```

`python brain/sync_concept_data.py` writes the canonical cleaned artifact to
`memory/runtime/concept_list_cleaned.txt` and syncs the derived GUI file at
`gui/public/data/concept_list_cleaned.txt`. On a fresh clone, the GUI falls back
to `gui/public/data/fixtures/demo_concept_list_cleaned.txt` until that derived file
is regenerated.

Local-only files produced by the current workflow are ignored in git, including
`gui/.env`, `gui/.next/`, `gui/node_modules/`, and local Prisma SQLite files.

## Quick commands

Generate concept graph edges:

```bash
python brain/build_concept_list.py
```

Resume paused generation:

```bash
python brain/build_concept_list.py --resume --state-file memory/runtime/concept_list_state.json
```

Two-phase coverage workflow (recommended for broad concept coverage growth):

```bash
python brain/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

Find under-explored graph zones and get ranked refinement roots:

```bash
python brain/find_unexplored_areas.py --input memory/runtime/concept_list_cleaned.txt --target-children 8 --top-n 20
```

When to use each mode:
- Single run (`build_concept_list.py`): fast iteration on prompt/parameter tuning.
- Two-phase (`run_two_phase_coverage.py`): planned coverage expansion with merge + quality checkpoints.

After generation completes (new run or resumed run), clean the canonical artifact and sync the derived GUI target:

```bash
python brain/sync_concept_data.py
```

Example output:

```text
[sync] Input lines: 417
[sync] Cleaned lines: 413
[sync] Canonical cleaned artifact: memory/runtime/concept_list_cleaned.txt
[sync] Derived GUI target: gui/public/data/concept_list_cleaned.txt
[sync] Line parity: 413 == 413 (OK)
[sync] Byte parity: OK
```

Run GUI prototype:

```bash
cd gui
npm run dev
```

Run regression tests:

```bash
# Brain tests
python -m unittest discover -s brain/tests -p 'test_*.py'

# GUI tests
cd gui
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
