from __future__ import annotations

import json
import os
import re
from pathlib import Path

import requests


class KMGenerator:
    def __init__(self, model: str | None = None, maps_dir: str = "knowledge-map-gen/maps") -> None:
        self.ollama_url = "http://localhost:11434"
        self.model = model or os.environ.get("OLLAMA_MODEL", "llama3:8b")
        self.maps_dir = Path(maps_dir)
        self.root_concept: str | None = None
        self.map_file: Path | None = None
        self.knowledge_map: dict[str, list[str]] = {}

    def expand_map(self, word: str) -> list[str]:
        concept = word.strip()
        if not concept:
            raise ValueError("word must not be empty")

        if self.root_concept is None:
            self.root_concept = concept
            self.map_file = self.maps_dir / f"{self._slugify(concept)}.json"

        prompt = (
            f"Give exactly 10 important concepts closest to the concept : '{concept}'. "
            "Return only a JSON array of strings. No markdown, no explanation."
        )
        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False},
            timeout=120,
        )
        if not response.ok:
            raise RuntimeError(f"Ollama request failed for model '{self.model}': {response.text}")

        raw_text = response.json()["response"].strip()
        sub_concepts = json.loads(raw_text)
        if not isinstance(sub_concepts, list) or not all(isinstance(item, str) for item in sub_concepts):
            raise ValueError("Ollama response must be a JSON array of strings")

        self.knowledge_map[concept] = sub_concepts[:10]
        self.save_map()
        return self.knowledge_map[concept]

    def save_map(self) -> None:
        if self.root_concept is None or self.map_file is None:
            return

        self.map_file.parent.mkdir(parents=True, exist_ok=True)
        self.map_file.write_text(
            json.dumps(
                {
                    "root": self.root_concept,
                    "concepts": self.knowledge_map,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
        return slug or "knowledge-map"
