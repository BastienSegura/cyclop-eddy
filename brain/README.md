# Brain

Purpose:
- Python engine for concept graph generation and cleaning.

Scripts:
- `build_concept_list.py`: generates concept relationships with live progress and resume support.
- `clean_concept_list.py`: cleans/normalizes generated relationships and rebuilds tree-style prefixes.
- `sync_concept_data.py`: canonical one-command flow to clean, copy to GUI data, and verify parity.
- `concept_identity.py`: shared canonical label/key helpers used by generation and cleaning.
- `report_concept_quality.py`: deterministic quality report for raw/cleaned concept files.
- `merge_concept_edges.py`: deterministic canonical merge for multiple raw edge files.
- `run_two_phase_coverage.py`: two-phase coverage workflow (phase 1 wide, phase 2 refinement).
- `find_unexplored_areas.py`: ranks under-explored nodes to pick next refinement roots.

How to run:

```bash
python brain/build_concept_list.py \
  --root-concept "Computer Science" \
  --concept-list-length 25 \
  --max-depth 3 \
  --exclude-strategy local \
  --exclude-local-limit 64 \
  --output memory/runtime/concept_list.txt \
  --state-file memory/runtime/concept_list_state.json

python brain/build_concept_list.py --resume --state-file memory/runtime/concept_list_state.json

python brain/sync_concept_data.py

# Optional: enforce DAG-like cleaned output by dropping cycle-closing edges
python brain/sync_concept_data.py --cycle-policy enforce

# Quality report (markdown stdout + optional files)
python brain/report_concept_quality.py --input memory/runtime/concept_list.txt memory/runtime/concept_list_cleaned.txt \
  --output memory/runtime/concept_quality_report.md \
  --json-output memory/runtime/concept_quality_report.json

# CI/manual gate examples
python brain/report_concept_quality.py --input memory/runtime/concept_list.txt --fail-on-threshold
python brain/report_concept_quality.py --input memory/runtime/concept_list_cleaned.txt --mode cleaned \
  --fail-on-threshold --max-cycle-edges 0

# Merge multiple raw runs into one deduplicated raw edge list
python brain/merge_concept_edges.py \
  --input memory/runtime/two_phase/phase1_raw.txt memory/runtime/two_phase/phase2/phase2_raw_01_algorithms.txt \
  --output memory/runtime/concept_list_merged.txt \
  --json-output memory/runtime/concept_list_merged.stats.json

# Two-phase coverage workflow (recommended for broad coverage)
python brain/run_two_phase_coverage.py \
  --root-concept "Computer Science" \
  --phase1-children 14 \
  --phase1-depth 2 \
  --phase2-children 8 \
  --phase2-depth 3 \
  --phase2-roots-file memory/runtime/frontier_roots.txt \
  --baseline-input memory/runtime/concept_list_baseline.txt

# Preview the two-phase commands without executing generation
python brain/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks" \
  --dry-run

# Frontier detection from cleaned graph (table output + copy-ready roots list)
python brain/find_unexplored_areas.py \
  --input memory/runtime/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 25

# JSON output + leaf filtering
python brain/find_unexplored_areas.py \
  --input memory/runtime/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 25 \
  --exclude-leaves \
  --output-format json \
  --json-output memory/runtime/frontier_report.json

# Brain regression tests
python -m unittest discover -s brain/tests -p 'test_*.py'
```

Notes:
- During generation, progress is printed in real time (`generated/estimated`, prompts, queue, speed).
- `Ctrl+C` saves state so generation can be resumed safely.
- Run `python brain/sync_concept_data.py` after any completed generation (new or resumed).
- Runtime outputs now live under `memory/runtime/` by default.
- Intentionally committed example artifacts live under `memory/fixtures/`.
- `brain/sync_concept_data.py` treats `memory/runtime/concept_list_cleaned.txt` as the canonical cleaned artifact and `gui/public/data/concept_list_cleaned.txt` as the derived GUI sync target.
- Generation now enforces a strict candidate contract before enqueueing:
  - rejects meta/instruction lines (for example `Here is ...`)
  - rejects formatting markers (for example bullets or numbered prefixes)
  - rejects malformed candidates (for example embedded `:` or >4 words)
  - caps accepted children per prompt call to `concept_list_length`
- Prompt exclude strategy is configurable:
  - `local` (default): include only current parent + that parent's accepted children, bounded by `--exclude-local-limit`.
  - `global`: include full historical exclude list (old behavior, larger prompt payload).
  - `none`: do not send an exclude block in the prompt.
- Runtime dedup remains global in-engine (`seen_normalized`), independent of prompt exclude strategy.
- Per prompt call, logs now include `accepted`, `rejected`, and rejection reasons.
- Rejection observability is persisted in checkpoint state (`rejection_counts`, `rejection_events`).
- Two-phase workflow defaults and tuning:
  - phase 1 (`14x2`) is a wide scan that maximizes first-pass coverage.
  - phase 2 (`8x3`) refines selected frontier roots with deeper expansion.
  - start from these defaults, then tune by report metrics:
    - if duplicate rejection is high, lower phase-2 children.
    - if frontier remains too broad, add more phase-2 roots instead of increasing depth globally.
- `run_two_phase_coverage.py` writes quality checkpoints using `report_concept_quality.py`:
  - phase 1 quality snapshot
  - merged-output quality snapshot
  - optional baseline-vs-merged comparison (when `--baseline-input` is provided)
- `find_unexplored_areas.py` ranking behavior:
  - returns nodes where `out_degree < target_children` (including leaves unless `--exclude-leaves`).
  - score prioritizes deficit first, then shallower depth, then reachable descendants.
  - supports depth filters (`--min-depth`, `--max-depth`) to focus search areas.
- Frontier-driven refinement workflow:
  - run `find_unexplored_areas.py` on cleaned data
  - copy suggested roots into `memory/runtime/frontier_roots.txt`
  - run `run_two_phase_coverage.py --phase2-roots-file memory/runtime/frontier_roots.txt`
- Use single-run mode when you want quick iterations or prompt tuning.
- Use two-phase mode when the goal is broad coverage growth with measurable checkpoints.
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
- Generator checkpoint state now uses canonical concept keys and exclude strategy metadata (`version: 5`).
- Resuming older state files (`version 1/2/3/4`) auto-migrates:
  - `root_concept`
  - `exclude_list`
  - `seen_normalized`
  - queue concept labels
  - `exclude_strategy` (defaults to `local`)
  - `exclude_local_limit` (defaults to `64`)
- Resume behavior is stable by default: if a state file already stores strategy values, resume keeps those values.
- For safety, resuming with conflicting `--exclude-strategy` or `--exclude-local-limit` exits with an error.

Two-phase dry-run transcript example:

```text
[two-phase] Dry run. Planned commands:
  1. /usr/bin/python .../brain/build_concept_list.py --root-concept 'Computer Science' --concept-list-length 14 --max-depth 2 ...
  2. /usr/bin/python .../brain/report_concept_quality.py --input memory/runtime/two_phase/phase1_raw.txt --mode raw ...
  3. /usr/bin/python .../brain/build_concept_list.py --root-concept 'Operating Systems' --concept-list-length 8 --max-depth 3 ...
  4. /usr/bin/python .../brain/build_concept_list.py --root-concept Databases --concept-list-length 8 --max-depth 3 ...
  5. /usr/bin/python .../brain/merge_concept_edges.py --input ... --output memory/runtime/two_phase/concept_list_two_phase.txt ...
  6. /usr/bin/python .../brain/report_concept_quality.py --input memory/runtime/two_phase/concept_list_two_phase.txt --mode raw ...
[two-phase] Phase2 roots (2): Operating Systems, Databases
```
