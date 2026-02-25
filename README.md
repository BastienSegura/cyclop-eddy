# cyclop-eddy

Cyclop Eddy is a concept-universe project focused on making learning feel engaging, exploratory, and game-like.

## Vision

- Move through connected concepts like traveling a skill tree.
- Stop at any node and use prompt templates to learn deeper with an LLM.
- Build toward a Skyrim-like constellation navigation experience.

## Repository layout

- `brain/`: active Python engine (`build_concept_list.py`, `clean_concept_list.py`).
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

Clean generated graph data:

```bash
python brain/clean_concept_list.py
```

Run GUI prototype:

```bash
cd gui
npm install
npm run dev
```
