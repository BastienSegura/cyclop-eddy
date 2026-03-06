# STORY-030: Add Brain Search Command

ID: `STORY-030`
Title: `Add brain search command`
Status: `ready`
Priority: `P1`
Owner: `unassigned`
Created: `2026-03-06`
Updated: `2026-03-06`

## Context

- The REPL is intended to work against one active graph source at a time, loaded through `load`.
- Concept labels in the graph frequently contain spaces and near-related names (`Operating Systems`, `Distributed Systems`, `Database Systems`), so exact recall cannot be assumed.
- The repo already has shared graph parsing utilities in `brain/graph_file_utils.py` and graph analysis helpers in `brain/graph_analysis.py`, but there is no operator-facing lookup command.
- Several later commands (`use`, `show`, `children`, `parents`, `neighbors`, `prompt`, `path`) become awkward if users must open the raw files to discover exact labels first.

## Problem

- There is no in-shell way to find concepts by label.
- A strict-command REPL becomes frustrating if every multiword label must be remembered exactly before the shell can be used effectively.
- Without a dedicated search command, later command stories will each invent their own partial lookup behavior and ranking rules.

## Goal

- Add a `search <query>` command that finds concept labels in the active graph source using deterministic matching and ranking rules.

## Out of Scope

- Typo-tolerant fuzzy matching beyond simple deterministic string matching.
- Semantic search, embeddings, or LLM-assisted lookup.
- Searching across multiple graph files at once.

## Acceptance Criteria

- [ ] `search <query>` searches concept labels from the active graph source using case-insensitive matching.
- [ ] Search results are ranked deterministically in this order: exact case-insensitive match, prefix match, substring match; ties inside each bucket are sorted alphabetically by canonical label.
- [ ] `search` returns at most 10 matches by default and supports `--limit <n>` to override that bound.
- [ ] `search --json <query>` returns machine-readable results that include at minimum the matched label and match type.
- [ ] If no active graph source is loaded or loadable, `search` returns a clear error that tells the user to run `load` or fix the active source path.
- [ ] `search` does not modify the current concept selection or any files on disk.

## Subtasks

- [ ] Define a shared concept-label lookup helper so `search` and later commands reuse the same matching and ranking rules.
- [ ] Implement the `search` handler using the active session graph cache from `load`.
- [ ] Add support for text output and `--json` output from the same result payload.
- [ ] Add tests for exact-match, prefix-match, substring-match, limit, and no-graph cases.

## Dependencies

- STORY-023
- STORY-028

## Risks

- Risk: ad hoc matching rules drift between `search` and later selection commands.
- Mitigation: require a shared lookup helper and test the ranking rules directly.
- Risk: search becomes slow on larger graphs if labels are reparsed on every command.
- Mitigation: use the active graph cache established by `load`.

## Validation

- Launch `python -m brain.cli`, run `load fixture`, then verify `search database`, `search "Operating Systems"`, and `search systems --limit 5`.
- Run `search --json database` and verify the payload contains labels plus match types.
- Run `python -m unittest discover -s brain/tests -p 'test_*.py'`.
