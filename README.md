# cyclop-eddy

## Repository layout

- `brain/`: Python engine (concept generation + cleaning).
- `memory/`: generated data files (concept lists, checkpoints, derived outputs).
- `archive/`: legacy/archived material and historical snapshots.

## Quick commands

Generate concepts:

```bash
python brain/build_concept_list.py
```

Clean generated concepts:

```bash
python brain/clean_concept_list.py
```
