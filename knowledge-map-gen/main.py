from __future__ import annotations

import json
import os

import requests


class KMGenerator:
    def __init__(self, ollama_url: str = "http://localhost:11434", model: str | None = None) -> None:
        self.ollama_url = ollama_url.rstrip("/")
        self.model = model or os.environ.get("OLLAMA_MODEL", "llama3:8b")
        self.knowledge_map: dict[str, list[str]] = {}

    def expand_map(self, word: str) -> list[str]:
        concept = word.strip()
        if not concept:
            raise ValueError("word must not be empty")

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
        return self.knowledge_map[concept]


if __name__ == "__main__":
    generator = KMGenerator()
    print(generator.expand_map("Computer Science"))
