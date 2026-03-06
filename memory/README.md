# Memory

Purpose:
- Separate runtime pipeline outputs from intentionally committed example artifacts.

Layout:
- `runtime/`: default location for generated raw/cleaned files, checkpoints, reports, and two-phase workspaces.
- `fixtures/`: intentionally committed example artifacts kept for documentation, demo, or comparison.

Notes:
- `memory/runtime/` is local-only and git-ignored by default.
- `memory/fixtures/` is the only place in `memory/` where generated artifacts should stay versioned.
- Typical generation flow:
  1. `brain/build_concept_list.py` writes raw edges and checkpoints state to `memory/runtime/`.
  2. After generation completion (including resumed runs), run:
     `python brain/sync_concept_data.py`
  3. `brain/sync_concept_data.py` rewrites the canonical cleaned artifact at
     `memory/runtime/concept_list_cleaned.txt`, copies it to the derived GUI target
     `gui/public/data/concept_list_cleaned.txt`, and verifies line/byte parity.
