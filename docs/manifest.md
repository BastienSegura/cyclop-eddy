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

Quality reporting:
- Generate report for raw + cleaned data:

```bash
python brain/report_concept_quality.py \
  --input memory/concept_list.txt memory/concept_list_cleaned.txt \
  --output memory/concept_quality_report.md \
  --json-output memory/concept_quality_report.json
```

- Optional gate mode (`--fail-on-threshold`) defaults to:
  - malformed lines `<= 0`
  - meta leaks `<= 0`
  - self-edges `<= 0`
- Additional thresholds are opt-in (for example `--max-cycle-edges`, `--max-duplicate-variant-extras`).

Two-phase coverage workflow (recommended for broad coverage goals):
- Phase 1 (wide scan): higher children, lower depth (default guidance: `14x2`).
- Phase 2 (refinement): lower children, higher depth on selected frontier roots (default guidance: `8x3`).
- Use the orchestration script to run both phases, merge outputs, and produce quality checkpoints:

```bash
python brain/run_two_phase_coverage.py \
  --root-concept "Computer Science" \
  --phase1-children 14 \
  --phase1-depth 2 \
  --phase2-children 8 \
  --phase2-depth 3 \
  --phase2-roots "Operating Systems" "Databases" "Computer Networks"
```

- Dry-run preview mode:

```bash
python brain/run_two_phase_coverage.py \
  --phase2-roots "Operating Systems" "Databases" \
  --dry-run
```

- Manual merge utility (if running phases manually):

```bash
python brain/merge_concept_edges.py \
  --input memory/two_phase/phase1_raw.txt memory/two_phase/phase2/phase2_raw_01_operating_systems.txt \
  --output memory/two_phase/concept_list_two_phase.txt \
  --json-output memory/two_phase/reports/merge_stats.json
```

Frontier detection for refinement root selection:
- Rank under-explored nodes from cleaned data:

```bash
python brain/find_unexplored_areas.py \
  --input memory/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 25
```

- Optional: focus on non-leaf underfilled branches:

```bash
python brain/find_unexplored_areas.py \
  --input memory/concept_list_cleaned.txt \
  --target-children 8 \
  --top-n 25 \
  --exclude-leaves
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
