from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import build_concept_list as builder  # noqa: E402


class BuildConceptListCanonicalTests(unittest.TestCase):
    def test_validate_candidate_canonicalizes_and_blocks_self_reference(self) -> None:
        normalized, reason = builder.validate_candidate("  Data   Mining  ", "Computer Science")
        self.assertEqual(normalized, "Data Mining")
        self.assertIsNone(reason)

        normalized, reason = builder.validate_candidate("Computer   Science", "computer science")
        self.assertIsNone(normalized)
        self.assertEqual(reason, "self_reference")

    def test_generation_dedups_spacing_and_case_variants(self) -> None:
        responses = [
            "Data Mining\ndata   mining\nDATA MINING\nGraph Theory\nGraph  Theory\n",
        ]
        call = {"index": 0}

        def fake_prompt(_prompt: str) -> str:
            index = call["index"]
            call["index"] += 1
            return responses[min(index, len(responses) - 1)]

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"

                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=10,
                    max_depth=1,
                    output_path=str(output_path),
                    state_file=str(state_path),
                )

                lines = output_path.read_text(encoding="utf-8").splitlines()
        finally:
            builder.simple_prompt = original_prompt

        self.assertEqual(
            lines,
            [
                "Computer Science: Data Mining",
                "Computer Science: Graph Theory",
            ],
        )


if __name__ == "__main__":
    unittest.main()
