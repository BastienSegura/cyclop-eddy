# Brain

Purpose:
- Python engine for concept graph generation and cleaning.

Scripts:
- `build_concept_list.py`: generates concept relationships with live progress and resume support.
- `clean_concept_list.py`: cleans/normalizes generated relationships and rebuilds tree-style prefixes.
- `sync_concept_data.py`: canonical one-command flow to clean, copy to GUI data, and verify parity.
- `concept_identity.py`: shared canonical label/key helpers used by generation and cleaning.
- `report_concept_quality.py`: deterministic quality report for raw/cleaned concept files.

How to run:

```bash
python brain/build_concept_list.py \
  --root-concept "Computer Science" \
  --concept-list-length 25 \
  --max-depth 3 \
  --output memory/concept_list.txt \
  --state-file memory/concept_list_state.json

python brain/build_concept_list.py --resume --state-file memory/concept_list_state.json

python brain/sync_concept_data.py

# Optional: enforce DAG-like cleaned output by dropping cycle-closing edges
python brain/sync_concept_data.py --cycle-policy enforce

# Quality report (markdown stdout + optional files)
python brain/report_concept_quality.py --input memory/concept_list.txt memory/concept_list_cleaned.txt \
  --output memory/concept_quality_report.md \
  --json-output memory/concept_quality_report.json

# CI/manual gate examples
python brain/report_concept_quality.py --input memory/concept_list.txt --fail-on-threshold
python brain/report_concept_quality.py --input memory/concept_list_cleaned.txt --mode cleaned \
  --fail-on-threshold --max-cycle-edges 0
```

Notes:
- During generation, progress is printed in real time (`generated/estimated`, prompts, queue, speed).
- `Ctrl+C` saves state so generation can be resumed safely.
- Run `python brain/sync_concept_data.py` after any completed generation (new or resumed).
- Generation now enforces a strict candidate contract before enqueueing:
  - rejects meta/instruction lines (for example `Here is ...`)
  - rejects formatting markers (for example bullets or numbered prefixes)
  - rejects malformed candidates (for example embedded `:` or >4 words)
  - caps accepted children per prompt call to `concept_list_length`
- Per prompt call, logs now include `accepted`, `rejected`, and rejection reasons.
- Rejection observability is persisted in checkpoint state (`rejection_counts`, `rejection_events`).
- Cleaner output path prefixes now use reversible encoded segments:
  - `~<percent-encoded-label>` per segment
  - example: `~Computer%20Science.~Human-Computer%20Interaction: Child`
  - this preserves literal hyphens in concept names
- Cleaner cycle policy is explicit:
  - `warn` (default): keep cycles, print cycle counts/examples
  - `enforce`: deterministically drop cycle-closing edges in first-seen order
  - available on both `clean_concept_list.py` and `sync_concept_data.py`
- Quality report metrics include:
  - malformed lines, meta leaks, self-edges
  - duplicate edge counts + duplicate variant counts
  - fanout distribution, cycle edges/examples, root candidates, line counts
- Threshold defaults when using `--fail-on-threshold`:
  - `malformed_line_count <= 0`
  - `meta_line_count <= 0`
  - `self_edge_count <= 0`
  - cycle and duplicate-variant thresholds are opt-in (`--max-cycle-edges`, `--max-duplicate-variant-extras`)
- Interpretation guideline:
  - raw files should generally pass default gate
  - cleaned files may intentionally keep cycles under `--cycle-policy warn`; enforce cycle threshold only when desired

Identity contract:
- canonical display label: `canonical_concept_label(text)` from `concept_identity.py`
  - removes leading list markers (`-`, `*`, `1)`, `2.`), strips simple markdown bold, collapses whitespace
- canonical dedup key: `canonical_concept_key(text)` from `concept_identity.py`
  - `canonical_concept_label(text).casefold()`
- Both `build_concept_list.py` and `clean_concept_list.py` use this same contract.

State migration note:
- Generator checkpoint state now uses canonical concept keys consistently (`version: 4`).
- Resuming older state files (`version 1/2/3`) auto-migrates:
  - `root_concept`
  - `exclude_list`
  - `seen_normalized`
  - queue concept labels
