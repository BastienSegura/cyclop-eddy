from __future__ import annotations

import os
from typing import Any

DEFAULT_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3:8b"

DEFAULT_GENERATE_OPTIONS: dict[str, Any] = {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "num_predict": 512,
    "num_ctx": 4096,
}

HEALTHCHECK_ROUTE = "/api/tags"


def resolve_ollama_base_url() -> str:
    return os.environ.get("OLLAMA_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


def resolve_ollama_model() -> str:
    return os.environ.get("OLLAMA_MODEL", DEFAULT_MODEL)
