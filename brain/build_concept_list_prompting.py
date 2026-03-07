from __future__ import annotations

from typing import Any

import requests

from ollama_config import DEFAULT_GENERATE_OPTIONS, resolve_ollama_base_url, resolve_ollama_model

from concept_identity import (
    canonical_concept_key,
    canonical_concept_label,
    concept_word_count,
    has_leading_formatting_marker,
    is_meta_concept_text,
)

BASE_URL = resolve_ollama_base_url()
MODEL = resolve_ollama_model()
DEFAULTS = dict(DEFAULT_GENERATE_OPTIONS)

MAX_CONCEPT_WORDS = 4


def _post(route: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Send a POST request to Ollama and return parsed JSON."""
    url = f"{BASE_URL}{route}"
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError as exc:
        raise SystemExit(
            "Cannot reach Ollama. Is it running? Try: `ollama serve`"
        ) from exc


def simple_prompt(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": DEFAULTS,
    }
    result = _post("/api/generate", payload)
    return str(result["response"])


def build_prompt(
    root_concept: str,
    concept_list_length: int,
    exclude_list: list[str] | None = None,
) -> str:
    exclude_block = ""
    if exclude_list:
        formatted_excludes = "\n".join([f"  - {concept}" for concept in exclude_list])
        exclude_block = f"""
    * Exclude any concept already listed below:
{formatted_excludes}
    """

    return f"""
    You are an expert knowledge cartographer.

    Core concept: **{root_concept}**

    Task: Identify the most semantically close and structurally related concepts to this core concept.

    Constraints:
    * Return exactly **{concept_list_length}** concepts.
    * Concepts must be directly related (first-order proximity).
    * Avoid examples, explanations, commentary, or formatting.
    * Avoid duplicates or near-synonyms of the same idea.
    * Prefer canonical academic or industry-standard concept names.
    * Each concept must be 1–4 words maximum.
    {exclude_block}

    Output format:
    * Return ONLY a plain list.
    * One concept per line.
    * No numbering.
    * No additional text before or after the list.
    """


def validate_candidate(candidate: str, parent_concept: str) -> tuple[str | None, str | None]:
    raw_candidate = candidate.strip()
    if not raw_candidate:
        return None, "malformed_empty"

    if has_leading_formatting_marker(raw_candidate):
        return None, "malformed_formatting"

    concept = canonical_concept_label(raw_candidate)
    if not concept:
        return None, "malformed_empty"

    if ":" in concept:
        return None, "malformed_colon"

    if is_meta_concept_text(concept):
        return None, "meta_instruction"

    if concept_word_count(concept) > MAX_CONCEPT_WORDS:
        return None, "malformed_word_count"

    if canonical_concept_key(concept) == canonical_concept_key(parent_concept):
        return None, "self_reference"

    return concept, None


def parse_concepts(response: str) -> list[str]:
    concepts: list[str] = []

    for raw_concept in response.split("\n"):
        concept = raw_concept.strip()
        if not concept:
            continue

        concepts.append(concept)

    return concepts
