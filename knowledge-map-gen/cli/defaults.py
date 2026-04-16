from __future__ import annotations

from pathlib import Path

DEFAULT_RUNTIME_DIR = Path("memory/runtime")
DEFAULT_RAW_ARTIFACT_PATH = Path("memory/runtime/concept_list.txt")
DEFAULT_ACTIVE_GRAPH_SOURCE_PATH = Path("memory/runtime/concept_list_cleaned.txt")
DEFAULT_ACTIVE_GRAPH_SOURCE_ALIAS = "cleaned"
DEFAULT_ACTIVE_GRAPH_MODE = "cleaned"
DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH = DEFAULT_ACTIVE_GRAPH_SOURCE_PATH
DEFAULT_GUI_SYNC_TARGET_PATH = Path("gui/public/data/concept_list_cleaned.txt")
DEFAULT_CHECKPOINT_STATE_PATH = Path("memory/runtime/concept_list_state.json")
DEFAULT_FIXTURE_GRAPH_PATH = Path("memory/fixtures/demo/concept_list_cleaned.txt")
DEFAULT_HISTORY_PATH = Path("memory/runtime/brain_cli/history.txt")
DEFAULT_PROMPT = "brain> "
