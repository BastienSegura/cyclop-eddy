"""Shared concept text normalization and identity helpers.

Identity contract:
- display label: `canonical_concept_label(...)`
- dedup key: `canonical_concept_key(...)`

Both generation and cleaning should use these functions so concept identity is
consistent across the pipeline.
"""

from __future__ import annotations

import re

MULTISPACE_RE = re.compile(r"\s+")
LEADING_MARKER_RE = re.compile(r"^(?:[-*•]+|\d+[.)])\s*")


def collapse_spaces(text: str) -> str:
    return MULTISPACE_RE.sub(" ", text).strip()


def has_leading_formatting_marker(text: str) -> bool:
    return bool(LEADING_MARKER_RE.match(text.strip()))


def strip_leading_formatting(text: str) -> str:
    return LEADING_MARKER_RE.sub("", text.strip())


def canonical_concept_label(text: str) -> str:
    cleaned = text.replace("**", "")
    cleaned = strip_leading_formatting(cleaned)
    return collapse_spaces(cleaned)


def canonical_concept_key(text: str) -> str:
    return canonical_concept_label(text).casefold()


def concept_word_count(text: str) -> int:
    label = canonical_concept_label(text)
    if not label:
        return 0
    return len(label.split(" "))


def is_meta_concept_text(text: str) -> bool:
    lowered = canonical_concept_key(text)

    if lowered.startswith("here is") or lowered.startswith("here are"):
        return True

    if "semantically close" in lowered and "related concepts" in lowered:
        return True

    if lowered.startswith("output format"):
        return True

    return False
