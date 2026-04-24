from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from km_generator import KMGenerator


class RecordingKMGenerator(KMGenerator):
    def __init__(self, maps_dir: str | Path) -> None:
        super().__init__(maps_dir=maps_dir)
        self.calls: list[tuple[str, int]] = []

    def expand_map(self, word: str, children: int = 10) -> list[str]:
        self.calls.append((word, children))
        sub_concepts = [f"{word} child {index}" for index in range(1, children + 1)]
        self.knowledge_map[word] = sub_concepts
        return sub_concepts


class GenerateMapTests(unittest.TestCase):
    def test_descendant_children_controls_non_root_expansion(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = RecordingKMGenerator(maps_dir=temp_dir)

            generator.generate_map("Root", children=10, descendant_children=4, depth=2)

        self.assertEqual(generator.calls[0], ("Root", 10))
        self.assertEqual(len(generator.calls), 11)
        self.assertTrue(all(children == 4 for _, children in generator.calls[1:]))

    def test_progress_estimate_uses_descendant_branching_factor(self) -> None:
        progress: list[tuple[int, int, str]] = []

        with tempfile.TemporaryDirectory() as temp_dir:
            generator = RecordingKMGenerator(maps_dir=temp_dir)
            generator.generate_map(
                "Root",
                children=10,
                descendant_children=4,
                depth=2,
                progress_callback=lambda current, estimated, concept: progress.append(
                    (current, estimated, concept)
                ),
            )

        self.assertEqual(progress[-1][0], 50)
        self.assertTrue(all(estimated == 50 for _, estimated, _ in progress))

    def test_descendant_children_must_be_positive(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = RecordingKMGenerator(maps_dir=temp_dir)

            with self.assertRaisesRegex(ValueError, "descendant_children must be at least 1"):
                generator.generate_map("Root", descendant_children=0)


if __name__ == "__main__":
    unittest.main()
