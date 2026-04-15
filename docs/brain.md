# Brain Documentation

`brain/` is the Python engine for concept graph generation, cleanup, analysis, and CLI exploration.

## Main Responsibilities

- Generate raw concept relationships with resumable checkpoints.
- Clean and normalize generated graph data.
- Sync the canonical cleaned graph into the GUI data folder.
- Report graph quality issues such as malformed lines, duplicates, self-edges, and cycles.
- Rank under-explored graph areas for the next generation pass.
- Provide the `python -m brain.cli` interactive and command-based graph explorer.

## Key Files

- `brain/build_concept_list.py`: concept generation entrypoint.
- `brain/sync_concept_data.py`: clean, sync, and verify graph data in one command.
- `brain/clean_concept_list.py`: deterministic raw-to-cleaned graph conversion.
- `brain/report_concept_quality.py`: Markdown and JSON quality reporting.
- `brain/find_unexplored_areas.py`: frontier detection for refinement planning.
- `brain/run_two_phase_coverage.py`: broad first pass plus targeted refinement workflow.
- `brain/cli/`: modular CLI and REPL commands.
- `brain/tests/`: regression tests for graph logic, scripts, and CLI behavior.

## Runtime Artifacts

Runtime outputs are local workflow data and live under `memory/runtime/` by default.

Important paths:

- `memory/runtime/concept_list.txt`: raw generated graph.
- `memory/runtime/concept_list_state.json`: resumable generation checkpoint.
- `memory/runtime/concept_list_cleaned.txt`: canonical cleaned graph.
- `gui/public/data/concept_list_cleaned.txt`: derived GUI copy produced by sync.

Committed examples belong under `memory/fixtures/`.

## Common Commands

Generate a graph:

```bash
python brain/build_concept_list.py \
  --root-concept "Computer Science" \
  --concept-list-length 25 \
  --max-depth 3 \
  --output memory/runtime/concept_list.txt \
  --state-file memory/runtime/concept_list_state.json
```

Resume an interrupted generation:

```bash
python brain/build_concept_list.py --resume --state-file memory/runtime/concept_list_state.json
```

Clean and sync graph data for the GUI:

```bash
python brain/sync_concept_data.py
```

Run a quality report:

```bash
python brain/report_concept_quality.py \
  --input memory/runtime/concept_list.txt memory/runtime/concept_list_cleaned.txt \
  --output memory/runtime/concept_quality_report.md \
  --json-output memory/runtime/concept_quality_report.json
```

Find refinement candidates:

```bash
python brain/find_unexplored_areas.py \
  --input memory/runtime/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 20
```

Run the two-phase coverage workflow:

```bash
python brain/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

Use the CLI:

```bash
python -m brain.cli status
python -m brain.cli search "database"
python -m brain.cli repl
```

Run brain tests:

```bash
python -m unittest discover -s brain/tests -p 'test_*.py'
```

## Operating Notes

- `Ctrl+C` during generation writes checkpoint state before exiting.
- Run `python brain/sync_concept_data.py` after every completed generation or resume.
- The cleaned graph keeps cycles by default with `--cycle-policy warn`; use `--cycle-policy enforce` to drop cycle-closing edges deterministically.
- Concept identity is centralized in `brain/concept_identity.py`.
- Shared graph parsing and analysis live in `brain/graph_file_utils.py` and `brain/graph_analysis.py`.
- Generator state supports migration from older checkpoint versions.
