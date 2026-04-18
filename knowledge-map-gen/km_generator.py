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
        self.messages: list[str] = []

    def generate_map(self, root: str, children: int = 10, depth: int = 1) -> dict[str, list[str]]:
        if depth < 1:
            raise ValueError("depth must be at least 1")

        self._load_existing_map(root)
        queue = [root]
        expanded_this_run: set[str] = set()

        for _ in range(depth):
            next_queue: list[str] = []

            for concept in queue:
                concept_key = self._normalize_key(concept)
                if concept_key in expanded_this_run:
                    continue

                sub_concepts = self.expand_map(concept, children=children)
                expanded_this_run.add(concept_key)

                for sub_concept in sub_concepts:
                    if self._normalize_key(sub_concept) not in expanded_this_run:
                        next_queue.append(sub_concept)

            queue = next_queue

        return self.knowledge_map

    def expand_map(self, word: str, children: int = 10) -> list[str]:
        concept = self._clean_label(word)
        if not concept:
            raise ValueError("word must not be empty")
        if children < 1:
            raise ValueError("children must be at least 1")

        existing_concept = self._find_existing_concept(concept)
        if existing_concept is not None:
            existing_children = self.knowledge_map[existing_concept]
            if len(existing_children) >= children:
                self.messages.append(
                    f"'{existing_concept}' already has {len(existing_children)} children. "
                    f"Requested {children}; keeping the existing map."
                )
                return existing_children
            concept = existing_concept

        if self.root_concept is None:
            self.root_concept = concept
            self.map_file = self.maps_dir / f"{self._slugify(concept)}.json"

        prompt = (
            f"Give exactly {children} important concepts closest to the concept : '{concept}'. "
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

        self.knowledge_map[concept] = self._clean_children(sub_concepts, limit=children)
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

    def list_maps(self) -> list[str]:
        if not self.maps_dir.exists():
            return []

        maps: list[str] = []
        for path in sorted(self.maps_dir.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            maps.append(str(data.get("root") or path.stem))
        return maps

    def load_map(self, name: str) -> dict[str, object]:
        map_file = self.maps_dir / f"{self._slugify(name)}.json"
        if not map_file.exists():
            raise FileNotFoundError(f"Knowledge map not found: {name}")

        return json.loads(map_file.read_text(encoding="utf-8"))

    def _load_existing_map(self, root: str) -> None:
        root_concept = self._clean_label(root)
        self.root_concept = root_concept
        self.map_file = self.maps_dir / f"{self._slugify(root_concept)}.json"

        if not self.map_file.exists():
            return

        data = json.loads(self.map_file.read_text(encoding="utf-8"))
        concepts = data.get("concepts", {})
        if isinstance(concepts, dict):
            self.knowledge_map = {
                self._clean_label(str(concept)): self._clean_children(list(children), limit=len(children))
                for concept, children in concepts.items()
                if isinstance(children, list)
            }

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
        return slug or "knowledge-map"

    def _clean_label(self, text: str) -> str:
        return " ".join(text.strip().split())

    def _normalize_key(self, text: str) -> str:
        return self._clean_label(text).casefold()

    def _find_existing_concept(self, text: str) -> str | None:
        key = self._normalize_key(text)
        for concept in self.knowledge_map:
            if self._normalize_key(concept) == key:
                return concept
        return None

    def _clean_children(self, children: list[str], limit: int) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for child in children:
            label = self._clean_label(str(child))
            key = self._normalize_key(label)
            if not label or key in seen:
                continue

            seen.add(key)
            cleaned.append(label)
            if len(cleaned) == limit:
                break

        return cleaned
