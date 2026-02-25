# Cyclop Eddy Manifest

## Mission
Make learning fun and engaging.
The target feeling is close to gaining XP in an MMORPG: curiosity, progression, and exploration.

## Product Vision
Cyclop Eddy is a concept-universe explorer.
Users move across a connected graph of concepts, stop on any node, and copy a ready-to-use prompt template to continue learning with their preferred LLM.

## User Experience Goals
- Anyone can use it.
- You log in, enter a visible portion of the concept universe, and travel node by node.
- Every node is actionable: open details, understand local context, and copy a learning prompt.
- Navigation should feel rewarding, not academic or static.

## Visual Direction (Upcoming GUI)
- Skyrim-like skill-tree mood.
- Concepts represented like stars.
- Links represented like constellations.
- Exploration-first interface, with smooth movement between connected concepts.

## Current Scope
In scope now:
- Python engine to generate concept relationships.
- Python cleaner to normalize generated concept files.
- Next.js GUI prototype for constellation-style concept navigation.
- Repository organization and documentation.

Out of scope now:
- Full GUI implementation (planned next).
- Long-term roadmap planning (project is intentionally iterative / vibe-coded).

## Repository Responsibilities
- `brain/`: Python engine (generation + cleaning scripts).
- `memory/`: generated artifacts and runtime state (concept files, checkpoint/save files).
- `archive/`: legacy experiments, historical snapshots, and deprecated material.

## Engine Workflow
Generate graph data:

```bash
python brain/build_concept_list.py \
  --root-concept "Computer Science" \
  --concept-list-length 25 \
  --max-depth 3 \
  --output memory/concept_list.txt \
  --state-file memory/concept_list_state.json
```

Pause and resume generation:

```bash
python brain/build_concept_list.py --resume --state-file memory/concept_list_state.json
```

Clean generated graph edges:

```bash
python brain/clean_concept_list.py \
  --input memory/concept_list.txt \
  --output memory/concept_list_cleaned.txt \
  --root "Computer Science"
```

## Resume / Save Behavior
Current behavior is the expected behavior:
- Progress is checkpointed to the state file.
- `Ctrl+C` pauses safely without losing progress.
- Resume continues from checkpoint state.
- On successful completion, checkpoint is removed automatically.

## Documentation Language
All active documentation is English.
