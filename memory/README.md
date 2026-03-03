# Memory

Purpose:
- Storage for generated artifacts and save/checkpoint state.

Typical files:
- `concept_list.txt`: raw generated concept edges.
- `concept_list_cleaned.txt`: cleaned/normalized concept edges.
- `concept_list_state.json`: resumable checkpoint state for generation.

Notes:
- This folder is runtime data-oriented.
- Keep only what you want to preserve between runs.
- Typical generation flow:
  1. `brain/build_concept_list.py` writes `concept_list.txt` and checkpoints state in `concept_list_state.json`.
  2. After generation completion (including resumed runs), run:
     `python brain/sync_concept_data.py`
  3. `brain/sync_concept_data.py` rewrites `concept_list_cleaned.txt`, copies it to
     `gui/public/data/concept_list_cleaned.txt`, and verifies line/byte parity.
