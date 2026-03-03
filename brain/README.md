# Brain

Purpose:
- Python engine for concept graph generation and cleaning.

Scripts:
- `build_concept_list.py`: generates concept relationships with live progress and resume support.
- `clean_concept_list.py`: cleans/normalizes generated relationships and rebuilds tree-style prefixes.
- `sync_concept_data.py`: canonical one-command flow to clean, copy to GUI data, and verify parity.
- `concept_identity.py`: shared canonical label/key helpers used by generation and cleaning.

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
