# STORY-021: Align Active Documentation with Current Implementation and Cleanup Rules

ID: `STORY-021`
Title: `Align active documentation with current implementation and cleanup rules`
Status: `ready`
Priority: `P2`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- Active documentation is spread across `README.md`, `docs/README.md`, `docs/manifest.md`, `docs/gui-architecture.md`, `brain/README.md`, `gui/README.md`, and `memory/README.md`.
- The current docs are generally strong, but parts of them lag the implementation.
- `docs/gui-architecture.md` still lists authentication pages and session-aware exploration history as planned evolution even though auth routes/pages are already implemented in the GUI.
- `gui/README.md` documents current auth behavior earlier in the file, but the “Next Iterations” section still references adding a dedicated auth flow/login as future work.
- STORY-017 through STORY-020 will change repo hygiene, artifact ownership, brain module structure, and frontend file layout, which will create more doc drift if not handled explicitly.

## Problem

- Developers and future contributors cannot rely on the docs as the single source of truth if the docs trail the implementation.
- Architecture docs become less useful when they describe work as “upcoming” after it already exists.
- Cleanup work can land without updating the docs that teach people how the repo is organized.

## Goal

- Bring all active documentation in line with the implemented auth surface and the cleanup decisions introduced by STORIES 017-020.
- Make the docs explicit about current architecture, current bootstrap workflow, and current data ownership rules.
- Ensure the story backlog and active docs tell a consistent story about the repository.

## Out of Scope

- Writing product roadmap content unrelated to current repository organization.
- Historical archive cleanup or migration of archived notes.
- Rewriting every story file; only active docs and the backlog index need alignment.

## Acceptance Criteria

- [ ] `README.md` reflects the current bootstrap flow and active architecture without relying on outdated setup assumptions.
- [ ] `docs/gui-architecture.md` describes the current auth-aware frontend/server shape accurately and removes items that are no longer future work.
- [ ] `gui/README.md` “Current” vs “Next Iterations” sections are reconciled so implemented auth pages/routes are no longer listed as pending additions.
- [ ] `memory/README.md` reflects the runtime-vs-fixture policy established in STORY-018.
- [ ] `brain/README.md` reflects any module movement or shared utility extraction introduced by STORY-019.
- [ ] `docs/stories/index.md` includes the cleanup stories with correct IDs, titles, priorities, and statuses.
- [ ] Documentation uses exact commands and concrete file paths that match the implementation on disk.

## Subtasks

- [ ] Audit active docs for statements that now conflict with implemented auth pages, route handlers, or cleanup decisions.
- [ ] Update `README.md` to match the final bootstrap and repo-hygiene rules from STORY-017.
- [ ] Update `memory/README.md` and any related docs to match the artifact ownership model from STORY-018.
- [ ] Update `brain/README.md` to describe any shared utility modules or refactored generator structure introduced by STORY-019.
- [ ] Update `docs/gui-architecture.md` and `gui/README.md` to reflect the actual current auth surface and any frontend decomposition from STORY-020.
- [ ] Review `docs/stories/index.md` for correct status/priority rows and add cleanup stories if missing.
- [ ] Perform one final doc pass that checks every command and file path mentioned in active docs against the real tree.

## Dependencies

- STORY-017
- STORY-018
- STORY-019
- STORY-020

## Risks

- Risk: docs are updated before the cleanup stories land, causing a second wave of drift.
- Mitigation: implement this story after the code cleanup stories or in the final commit of that cleanup sequence.
- Risk: partial updates leave contradictory statements between root docs and folder-specific READMEs.
- Mitigation: include a single audit checklist covering every active README/doc touched by the cleanup.

## Validation

- Manually verify every command and path mentioned in active docs against the repository tree after STORIES 017-020 are complete.
- Re-run the documented bootstrap and test commands from the updated docs.
- Compare `docs/gui-architecture.md` and `gui/README.md` against implemented auth pages/routes to confirm there are no remaining “planned” statements for already-shipped behavior.
