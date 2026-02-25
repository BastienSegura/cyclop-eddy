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
