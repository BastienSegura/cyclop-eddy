# Story System

Purpose:
- Keep work items traceable, standalone, and publishable on GitHub.
- Standardize how story context, scope, and execution subtasks are written.

## Folder Layout

- `docs/stories/README.md`: conventions and workflow.
- `docs/stories/STORY_TEMPLATE.md`: template for new stories.
- `docs/stories/index.md`: backlog and status overview.
- `docs/stories/STORY-XXX-<slug>.md`: one standalone story per file.

## Story Naming

- File name format: `STORY-XXX-<kebab-slug>.md`
- `XXX` is a zero-padded sequence (`001`, `002`, ...).
- Keep slugs short and implementation-oriented.

## Required Story Sections

Every story file must contain:
- `ID`
- `Title`
- `Status`
- `Priority`
- `Owner`
- `Created`
- `Updated`
- `Context`
- `Problem`
- `Goal`
- `Out of Scope`
- `Acceptance Criteria`
- `Subtasks`
- `Dependencies`
- `Risks`
- `Validation`

## Status Model

Allowed status values:
- `draft`
- `ready`
- `in_progress`
- `blocked`
- `done`
- `archived`

## Writing Rules

- A story must be understandable without opening any other story.
- Put concrete evidence in `Context` (files, observed behavior, counts, dates).
- Keep subtasks actionable and small (1-3 hours each when possible).
- Keep acceptance criteria testable and binary.
- If scope grows, split into a new story instead of expanding indefinitely.

## Workflow

1. Create from `STORY_TEMPLATE.md`.
2. Add row to `index.md`.
3. Mark status `ready` once acceptance criteria and subtasks are complete.
4. Move to `in_progress` when implementation starts.
5. Mark `done` only after validation evidence is recorded.
6. Keep history in git; do not rewrite completed story IDs.
