# cyclop-eddy

Cyclop Eddy is a concept-universe project focused on making learning feel engaging, exploratory, and game-like.

## Vision

- Move through connected concepts like traveling a skill tree.
- Stop at any node and use prompt templates to learn deeper with an LLM.
- Build toward a Skyrim-like constellation navigation experience.

## Repository layout

- `brain/`: active Python engine (`build_concept_list.py`, `clean_concept_list.py`, `sync_concept_data.py`).
- `gui/`: Next.js App Router prototype for concept constellation exploration.
- `memory/`: generated runtime data and checkpoint/save files.
- `archive/`: old experiments, historical snapshots, deprecated material.
- `docs/`: active project documentation.

## Start here

- Project documentation index: [`docs/README.md`](docs/README.md)
- Project manifest: [`docs/manifest.md`](docs/manifest.md)

## Quick commands

Generate concept graph edges:

```bash
python brain/build_concept_list.py
```

Resume paused generation:

```bash
python brain/build_concept_list.py --resume --state-file memory/concept_list_state.json
```

Two-phase coverage workflow (recommended for broad concept coverage growth):

```bash
python brain/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

When to use each mode:
- Single run (`build_concept_list.py`): fast iteration on prompt/parameter tuning.
- Two-phase (`run_two_phase_coverage.py`): planned coverage expansion with merge + quality checkpoints.

After generation completes (new run or resumed run), clean and sync data to the GUI source of truth:

```bash
python brain/sync_concept_data.py
```

Example output:

```text
[sync] Input lines: 417
[sync] Cleaned lines: 413
[sync] Memory output: memory/concept_list_cleaned.txt
[sync] GUI output: gui/public/data/concept_list_cleaned.txt
[sync] Line parity: 413 == 413 (OK)
[sync] Byte parity: OK
```

Run GUI prototype:

```bash
cd gui
npm install
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

- Starts at `Computer Science` and reveals neighbors first.
- Expands discovered graph progressively (fog-of-war feel).
- Supports smooth camera move, drag-pan, cursor-centered zoom.
- Supports edge click navigation to target concept.
- Highlights dead ends with diamond markers.
- Uses a subtle starry-night graph backdrop.
