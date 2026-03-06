# STORY-017: Tighten Repository Hygiene and Bootstrap Contracts

ID: `STORY-017`
Title: `Tighten repository hygiene and bootstrap contracts`
Status: `done`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The repository root `.gitignore` currently contains only four entries: `.venv/`, `*.tsbuildinfo`, `__pycache__/`, and `*.py[cod]`.
- GUI bootstrap documentation in `gui/README.md` instructs developers to copy `.env.example` to `.env`, and the checked-in `gui/.env.example` defines local SQLite and auth environment variables.
- Active local development produces repo-local artifacts that are not covered by the current root ignore rules, including `gui/.env`, Next.js build output, Prisma SQLite files, and dependency/install directories.
- The Python toolchain currently depends on third-party packages such as `requests` in `brain/build_concept_list.py`, but the repository does not declare Python dependencies via `requirements.txt`, `pyproject.toml`, or an equivalent manifest.
- Root onboarding documentation in `README.md` documents commands but does not document a clean Python bootstrap flow.

## Problem

- A clean working tree currently depends on unstated global git excludes or local developer habits rather than repo-local rules.
- New contributors cannot bootstrap the Python side deterministically because dependency installation and virtualenv setup are implicit.
- Environment-specific files and generated artifacts can be accidentally committed or left to guesswork.

## Goal

- Make local setup and local ignore behavior explicit at the repository level.
- Ensure a fresh clone can be bootstrapped for both `brain/` and `gui/` using documented commands only.
- Remove hidden setup assumptions from the active codebase.

## Out of Scope

- CI pipeline creation or GitHub Actions automation.
- Runtime/generated data retention policy inside `memory/` and `gui/public/data/` (handled by STORY-018).
- Large Python packaging changes beyond what is needed to declare and install dependencies cleanly.

## Acceptance Criteria

- [x] Repository-level ignore rules explicitly cover local GUI env files, Next.js build output, dependency directories, Prisma/SQLite local database files, and common local test/build artifacts produced by the current toolchain.
- [x] The Python side has a committed dependency manifest (`requirements.txt` or `pyproject.toml`) that declares all third-party packages required to run active `brain/` scripts and tests.
- [x] `README.md` documents a clean local bootstrap flow for the Python environment, including virtualenv creation, dependency installation, and the command used to run brain tests.
- [x] `gui/README.md` documents which files are local-only artifacts and must not be committed during normal development.
- [x] After following the documented bootstrap steps on a clean clone, `python -m unittest discover -s brain/tests -p 'test_*.py'` and `cd gui && npm test` both run without undocumented setup steps.
- [x] Repo docs identify the canonical bootstrap order for a new contributor: Python env, GUI env, test commands, then app commands.

## Subtasks

- [x] Inventory all repo-local artifacts created by current workflows: Python caches, GUI install/build output, Prisma SQLite files, env files, and test artifacts.
- [x] Expand root `.gitignore` with scoped path rules that match the current repo layout instead of relying on global excludes.
- [x] Choose and add a Python dependency manifest format for the active `brain/` scripts.
- [x] Verify the manifest includes at minimum `requests` and any other third-party imports used by active scripts or tests.
- [x] Add a Python bootstrap section to `README.md` with exact commands for venv creation and dependency install.
- [x] Add a short “local-only files” section to `gui/README.md` covering `.env`, local SQLite files, build output, and dependency directories.
- [x] Run the documented bootstrap and test commands from a clean state and capture any missing steps before marking the story done.

## Dependencies

- `None`

## Risks

- Risk: broad ignore rules accidentally hide files that should remain versioned.
- Mitigation: use scoped path-based patterns (`gui/.next/`, `gui/node_modules/`, `gui/dev.db*`, `gui/.env`) instead of broad language-wide patterns where possible.
- Risk: adding a Python manifest without validating imports leaves bootstrap incomplete.
- Mitigation: verify imports in every active `brain/*.py` script before finalizing the manifest.

## Validation

- Start from a clean clone or equivalent clean working tree.
- Follow only the documented bootstrap steps in `README.md` and `gui/README.md`.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`, `cd gui && npm test`, and `cd gui && npm run build`.
- Confirm `git status --short` stays clean after bootstrap, test execution, and GUI build output generation.
