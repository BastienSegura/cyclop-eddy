# STORY-018: Separate Runtime Artifacts from Versioned Data Fixtures

ID: `STORY-018`
Title: `Separate runtime artifacts from versioned data fixtures`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- `memory/README.md` describes `memory/` as “runtime data-oriented” storage for generated artifacts and checkpoint/save state.
- `brain/sync_concept_data.py` currently rewrites `memory/concept_list_cleaned.txt`, copies it to `gui/public/data/concept_list_cleaned.txt`, and verifies byte-identical parity.
- The repository currently versions multiple generated data files under `memory/`, including raw outputs, cleaned outputs, reports, and two-phase run artifacts.
- The repository also versions `gui/public/data/concept_list_cleaned.txt`, which is a synced copy of cleaned pipeline output used by the GUI at runtime.
- Today there is no explicit repository policy that distinguishes:
- runtime-only outputs
- committed example/fixture datasets
- canonical cleaned graph data
- derived copies written for GUI serving

## Problem

- Contributors cannot tell which data files are source-of-truth, which are disposable run output, and which are intentionally committed fixtures.
- The current layout mixes operational outputs with versioned examples, making cleanup, refreshes, and reviews harder than necessary.
- The pipeline intentionally duplicates cleaned data into the GUI folder, but the repository does not define whether that duplication is canonical, derived, or temporary.

## Goal

- Define and document a clear data ownership model for `memory/` and `gui/public/data/`.
- Separate disposable runtime outputs from intentionally versioned fixtures.
- Make the cleaned graph sync contract explicit so there is no ambiguity about which file is canonical and which file is derived.

## Out of Scope

- Rewriting graph file format or changing the concept graph data model.
- Replacing file-based GUI loading with a database/API source.
- Large archive cleanup under `archive/`.

## Acceptance Criteria

- [ ] The repository defines one canonical cleaned graph artifact path and one clearly documented derived GUI-served copy path.
- [ ] `memory/README.md` is updated to distinguish runtime-only artifacts, optional preserved run artifacts, and committed fixtures/examples.
- [ ] Runtime checkpoint files, ad-hoc run outputs, and disposable report outputs are excluded from git by default unless they are intentionally moved into a dedicated fixture/example location.
- [ ] If committed sample graph data must remain for local GUI/demo use, it lives in a clearly named fixture/example location with a short README note explaining why it is versioned.
- [ ] `brain/sync_concept_data.py` help text and output messages explicitly state which path is canonical and which path is the synced GUI target.
- [ ] Root docs and GUI docs describe the exact command for refreshing GUI-served graph data from the canonical cleaned artifact.
- [ ] After running the documented data refresh workflow, a contributor can tell which files are expected to change and which files should remain untouched.

## Subtasks

- [ ] Inventory all currently versioned generated artifacts in `memory/` and classify each as runtime output, fixture/example, or documentation artifact.
- [ ] Decide the canonical cleaned graph path to keep after cleanup and document that decision in `memory/README.md`, `README.md`, and `gui/README.md`.
- [ ] Decide whether the GUI-served graph file remains versioned, moves to a dedicated fixture/example location, or becomes a derived local-only artifact.
- [ ] Update `.gitignore` rules to match the chosen policy for runtime outputs, checkpoints, and generated reports.
- [ ] Update `brain/sync_concept_data.py` wording so the sync summary names the canonical source and the derived GUI destination explicitly.
- [ ] Move any long-lived example data that must remain committed into a clearly named fixture/example location if the current paths are ambiguous.
- [ ] Verify the documented workflow still supports local GUI development without manual file hunting.

## Dependencies

- STORY-017

## Risks

- Risk: aggressive cleanup removes a versioned sample dataset that developers rely on to run the GUI immediately after clone.
- Mitigation: preserve one intentionally named fixture/example dataset if needed, and document how to refresh it.
- Risk: changing data ownership rules without updating scripts causes silent drift.
- Mitigation: update `brain/sync_concept_data.py` and all related README files in the same change.

## Validation

- From a clean state, run the documented graph refresh workflow.
- Verify that the canonical cleaned file and GUI-served file are produced in the documented locations.
- Verify `brain/sync_concept_data.py` prints a sync summary that names source and destination roles clearly.
- Verify `git status --short` after a normal generation/sync cycle only shows changes that the new policy explicitly allows.
