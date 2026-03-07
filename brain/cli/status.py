from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from .current import build_current_payload
from .defaults import (
    DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    DEFAULT_CHECKPOINT_STATE_PATH,
    DEFAULT_FIXTURE_GRAPH_PATH,
    DEFAULT_GUI_SYNC_TARGET_PATH,
    DEFAULT_RAW_ARTIFACT_PATH,
)
from .errors import UsageError
from .output import CommandOutput, CommandResult
from .session import BrainCliSession


@dataclass(frozen=True)
class StatusArtifactDefinition:
    key: str
    label: str
    path: Path


ARTIFACT_DEFINITIONS = (
    StatusArtifactDefinition("raw_artifact", "Raw artifact", DEFAULT_RAW_ARTIFACT_PATH),
    StatusArtifactDefinition(
        "canonical_cleaned_artifact",
        "Canonical cleaned artifact",
        DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    ),
    StatusArtifactDefinition("derived_gui_target", "Derived GUI target", DEFAULT_GUI_SYNC_TARGET_PATH),
    StatusArtifactDefinition("checkpoint_state_file", "Checkpoint state file", DEFAULT_CHECKPOINT_STATE_PATH),
    StatusArtifactDefinition("fixture_fallback", "Fixture fallback", DEFAULT_FIXTURE_GRAPH_PATH),
)


def _isoformat_mtime(timestamp: float | None) -> str | None:
    if timestamp is None:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).replace(microsecond=0).isoformat()


def _build_artifact_entry(path: Path) -> dict[str, object]:
    if not path.exists():
        return {
            "path": str(path),
            "exists": False,
            "size_bytes": None,
            "modified_at": None,
        }

    stat = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size_bytes": stat.st_size,
        "modified_at": _isoformat_mtime(stat.st_mtime),
    }


def build_status_payload(session: BrainCliSession) -> dict[str, object]:
    artifacts = {
        definition.key: {
            "label": definition.label,
            **_build_artifact_entry(definition.path),
        }
        for definition in ARTIFACT_DEFINITIONS
    }

    return {
        "session": build_current_payload(session),
        "artifacts": artifacts,
    }


def render_status_text(payload: dict[str, object]) -> str:
    session = payload["session"]
    artifacts = payload["artifacts"]

    lines = [
        "Session:",
        f"- Active graph source: {session['active_graph_source_path']}",
        f"- Active graph alias: {session['active_graph_source_alias']}",
        f"- Active graph mode: {session['active_graph_mode']}",
        f"- Current concept: {session['current_concept'] or '(none)'}",
        f"- Parsed graph cache: {'loaded' if session['parsed_graph_cache_loaded'] else 'not loaded'}",
        "Artifacts:",
    ]

    for definition in ARTIFACT_DEFINITIONS:
        entry = artifacts[definition.key]
        line = f"- {entry['label']}: {entry['path']} ({'present' if entry['exists'] else 'missing'}"
        if entry["exists"]:
            line += f", size={entry['size_bytes']} bytes"
            if entry["modified_at"]:
                line += f", modified={entry['modified_at']}"
        line += ")"
        lines.append(line)

    return "\n".join(lines)


def handle_status(session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    json_only = False
    if args:
        if tuple(args) != ("--json",):
            raise UsageError("status accepts no arguments except --json. Usage: status [--json]")
        json_only = True

    payload = build_status_payload(session)
    if json_only:
        return CommandResult(output=CommandOutput(data=payload))

    return CommandResult(output=CommandOutput(text=render_status_text(payload), data=payload))
