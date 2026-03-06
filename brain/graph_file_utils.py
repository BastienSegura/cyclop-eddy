from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote

from concept_identity import canonical_concept_label


def split_edge_line(raw_line: str) -> tuple[str, str] | None:
    line = raw_line.strip()
    if not line or ":" not in line:
        return None

    parent_raw, child_raw = line.split(":", 1)
    parent_raw = parent_raw.strip()
    child_raw = child_raw.strip()
    if not parent_raw or not child_raw:
        return None

    return parent_raw, child_raw


def parse_raw_edge_line(raw_line: str) -> tuple[str, str] | None:
    parsed = split_edge_line(raw_line)
    if not parsed:
        return None

    parent_raw, child_raw = parsed
    parent_label = canonical_concept_label(parent_raw)
    child_label = canonical_concept_label(child_raw).rstrip(":").strip()

    if not parent_label or not child_label:
        return None

    return parent_label, child_label


def decode_path_segment(segment: str) -> str:
    trimmed = segment.strip()
    if trimmed.startswith("~"):
        encoded = trimmed[1:]
        try:
            return unquote(encoded).strip()
        except Exception:
            return encoded.strip()

    # Legacy cleaned format fallback.
    return trimmed.replace("-", " ").strip()


def infer_line_mode(parent_raw: str) -> str:
    parent = parent_raw.strip()
    if parent.startswith("~"):
        return "cleaned"
    if "." in parent:
        return "cleaned"
    return "raw"


def infer_file_mode(path: Path, lines: list[str]) -> str:
    if "cleaned" in path.name.casefold():
        return "cleaned"

    cleaned_hints = 0
    raw_hints = 0
    for raw_line in lines:
        parsed = split_edge_line(raw_line)
        if not parsed:
            continue

        parent_raw, _ = parsed
        if parent_raw.startswith("~") or "." in parent_raw:
            cleaned_hints += 1
            continue

        if " " not in parent_raw and "-" in parent_raw:
            # Legacy cleaned top-level segment (e.g. "Computer-Science")
            cleaned_hints += 1
            continue

        raw_hints += 1

    return "cleaned" if cleaned_hints >= raw_hints else "raw"


def extract_parent_label(parent_raw: str, mode: str) -> str:
    if mode == "raw":
        return canonical_concept_label(parent_raw)

    if mode == "cleaned":
        segments = [segment.strip() for segment in parent_raw.split(".") if segment.strip()]
        if not segments:
            return canonical_concept_label(parent_raw)
        return canonical_concept_label(decode_path_segment(segments[-1]))

    raise ValueError(f"Unsupported mode: {mode}")


def parse_graph_edge_line(raw_line: str, mode: str) -> tuple[str, str, str] | None:
    parsed = split_edge_line(raw_line)
    if not parsed:
        return None

    parent_raw, child_raw = parsed
    line_mode = infer_line_mode(parent_raw) if mode == "auto" else mode
    parent_label = extract_parent_label(parent_raw, line_mode)
    child_label = canonical_concept_label(child_raw).rstrip(":").strip()

    if not parent_label or not child_label:
        return None

    return parent_label, child_label, line_mode
