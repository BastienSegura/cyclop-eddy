# Knowledge Map Generator

`knowledge-map-gen/` is the Python engine for concept graph generation, cleanup, analysis, and CLI exploration.

## Main Responsibilities

- Generate raw concept relationships with resumable checkpoints.
- Clean and normalize generated graph data.
- Sync the canonical cleaned graph into the app data folder.
- Report graph quality issues such as malformed lines, duplicates, self-edges, and cycles.
- Rank under-explored graph areas for the next generation pass.
- Provide the `python -m knowledge-map-gen.cli` interactive and command-based graph explorer.

## Key Files

- `knowledge-map-gen/build_concept_list.py`: concept generation entrypoint.
- `knowledge-map-gen/sync_concept_data.py`: clean, sync, and verify graph data in one command.
- `knowledge-map-gen/clean_concept_list.py`: deterministic raw-to-cleaned graph conversion.
- `knowledge-map-gen/report_concept_quality.py`: Markdown and JSON quality reporting.
- `knowledge-map-gen/find_unexplored_areas.py`: frontier detection for refinement planning.
- `knowledge-map-gen/run_two_phase_coverage.py`: broad first pass plus targeted refinement workflow.
- `knowledge-map-gen/cli/`: modular CLI and REPL commands.
- `knowledge-map-gen/tests/`: regression tests for graph logic, scripts, and CLI behavior.

## Runtime Artifacts

Runtime outputs are local workflow data and live under `knowledge-map-gen/map-store/runtime/` by default.

Important paths:

- `knowledge-map-gen/map-store/runtime/concept_list.txt`: raw generated graph.
- `knowledge-map-gen/map-store/runtime/concept_list_state.json`: resumable generation checkpoint.
- `knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt`: canonical cleaned graph.
- `app/public/data/concept_list_cleaned.txt`: derived app copy produced by sync.

Committed examples belong under `knowledge-map-gen/map-store/fixtures/`.

## Common Commands

Generate a graph:

```bash
python knowledge-map-gen/build_concept_list.py \
  --root-concept "Computer Science" \
  --concept-list-length 25 \
  --max-depth 3 \
  --output knowledge-map-gen/map-store/runtime/concept_list.txt \
  --state-file knowledge-map-gen/map-store/runtime/concept_list_state.json
```

Resume an interrupted generation:

```bash
python knowledge-map-gen/build_concept_list.py --resume --state-file knowledge-map-gen/map-store/runtime/concept_list_state.json
```

Clean and sync graph data for the app:

```bash
python knowledge-map-gen/sync_concept_data.py
```

Run a quality report:

```bash
python knowledge-map-gen/report_concept_quality.py \
  --input knowledge-map-gen/map-store/runtime/concept_list.txt knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt \
  --output knowledge-map-gen/map-store/runtime/concept_quality_report.md \
  --json-output knowledge-map-gen/map-store/runtime/concept_quality_report.json
```

Find refinement candidates:

```bash
python knowledge-map-gen/find_unexplored_areas.py \
  --input knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 20
```

Run the two-phase coverage workflow:

```bash
python knowledge-map-gen/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

Use the CLI:

```bash
python -m knowledge-map-gen.cli status
python -m knowledge-map-gen.cli search "database"
python -m knowledge-map-gen.cli repl
```

Run generator tests:

```bash
python -m unittest discover -s knowledge-map-gen/tests -p 'test_*.py'
```

## Operating Notes

- `Ctrl+C` during generation writes checkpoint state before exiting.
- Run `python knowledge-map-gen/sync_concept_data.py` after every completed generation or resume.
- The cleaned graph keeps cycles by default with `--cycle-policy warn`; use `--cycle-policy enforce` to drop cycle-closing edges deterministically.
- Concept identity is centralized in `knowledge-map-gen/concept_identity.py`.
- Shared graph parsing and analysis live in `knowledge-map-gen/graph_file_utils.py` and `knowledge-map-gen/graph_analysis.py`.
- Generator state supports migration from older checkpoint versions.
