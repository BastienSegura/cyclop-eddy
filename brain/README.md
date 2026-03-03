# Brain

Purpose:
- Python engine for concept graph generation and cleaning.

Scripts:
- `build_concept_list.py`: generates concept relationships with live progress and resume support.
- `clean_concept_list.py`: cleans/normalizes generated relationships and rebuilds tree-style prefixes.
- `sync_concept_data.py`: canonical one-command flow to clean, copy to GUI data, and verify parity.

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
