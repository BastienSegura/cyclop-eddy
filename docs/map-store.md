# Map Store

Purpose:
- Store generated knowledge maps for local runs, demos, and comparison.

Layout:
- `runtime/`: default location for generated raw/cleaned files, checkpoints, reports, and two-phase workspaces.
- `fixtures/`: intentionally committed example artifacts kept for documentation, demo, or comparison.
  - `fixtures/demo/`: committed raw/cleaned/report examples used in docs and validation.
  - `fixtures/two_phase/`: committed two-phase sample outputs and reports.
  - `fixtures/runs/`: preserved example run snapshots.

Map entries can be promoted from `runtime/` into `fixtures/runs/<date-or-name>/`
when they are worth keeping as named maps. Keep active generation output in
`runtime/` until it is intentionally preserved.

Notes:
- `knowledge-map-gen/map-store/runtime/` is local-only and git-ignored by default.
- `knowledge-map-gen/map-store/fixtures/` is the only place in `knowledge-map-gen/map-store/` where generated artifacts should stay versioned.
- Typical generation flow:
  1. `knowledge-map-gen/build_concept_list.py` writes raw edges and checkpoints state to `knowledge-map-gen/map-store/runtime/`.
  2. After generation completion (including resumed runs), run:
     `python knowledge-map-gen/sync_concept_data.py`
  3. `knowledge-map-gen/sync_concept_data.py` rewrites the canonical cleaned artifact at
     `knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt`, copies it to the derived app target
     `app/public/data/concept_list_cleaned.txt`, and verifies line/byte parity.
