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
- Dead ends should be quickly identifiable to avoid blind clicking.

## Visual Direction (Upcoming GUI)
- Skyrim-like skill-tree mood.
- Concepts represented like stars.
- Links represented like constellations.
- Exploration-first interface, with smooth movement between connected concepts.

## Current Scope
In scope now:
- Python engine to generate concept relationships.
- Python cleaner to normalize generated concept files.
- Next.js GUI prototype for constellation-style concept navigation with smooth travel.
- Repository organization and documentation.

Out of scope now:
- Production authentication/account system.
- Persistent user progression backend.
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

Cycle policy on cleaned edges:
- Default mode is `warn`: cycles are allowed and reported (count + examples).
- Optional `enforce` mode removes cycle-closing edges deterministically in first-seen order.
- Example:

```bash
python brain/clean_concept_list.py \
  --input memory/concept_list.txt \
  --output memory/concept_list_cleaned.txt \
  --root "Computer Science" \
  --cycle-policy enforce
```

## Resume / Save Behavior
Current behavior is the expected behavior:
- Progress is checkpointed to the state file.
- `Ctrl+C` pauses safely without losing progress.
- Resume continues from checkpoint state.
- On successful completion, checkpoint is removed automatically.

## Current GUI Snapshot
- Starts centered on `Computer Science` and direct neighbors.
- Progressive reveal expands the visible universe as users travel.
- Smooth camera movement, drag-pan, and cursor-centered zoom.
- Edge click navigation (clicking a link jumps to the target concept).
- Fog-of-war visual hierarchy:
  - selected node in gold
  - connected nodes in bright blue
  - farther discovered nodes faded
- Dead-end concepts rendered with a distinct diamond marker.
- Discreet starry-night graph background.

## Documentation Language
All active documentation is English.
