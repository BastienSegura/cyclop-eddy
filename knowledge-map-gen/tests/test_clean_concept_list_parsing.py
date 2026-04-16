from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import clean_concept_list as cleaner  # noqa: E402

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


class CleanConceptListParsingTests(unittest.TestCase):
    def test_parse_edge_filters_meta_and_strips_markers(self) -> None:
        parsed = cleaner.parse_edge("Computer Science: * Data Mining")
        self.assertEqual(parsed, ("Computer Science", "Data Mining"))

        self.assertIsNone(
            cleaner.parse_edge(
                "Computer Science: Here are semantically close related concepts"
            )
        )

    def test_clean_concept_file_removes_self_and_malformed_lines(self) -> None:
        input_path = FIXTURE_DIR / "raw_malformed_meta_markers.txt"

        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "cleaned.txt"
            total, kept, stats = cleaner.clean_concept_file(
                input_path=input_path,
                output_path=output_path,
                root_override="Computer Science",
                cycle_policy="warn",
            )
            lines = output_path.read_text(encoding="utf-8").splitlines()

        self.assertEqual(total, 8)
        self.assertEqual(kept, 2)
        self.assertEqual(stats["cycle_edge_count_before"], 0)
        self.assertEqual(
            lines,
            [
                "~Computer%20Science: Data Mining",
                "~Computer%20Science: Graph Theory",
            ],
        )

    def test_path_prefix_construction_for_depth_chain(self) -> None:
        raw = """Computer Science: Human-Computer Interaction
Human-Computer Interaction: Error Prevention Techniques
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "raw.txt"
            output_path = Path(temp_dir) / "cleaned.txt"
            input_path.write_text(raw, encoding="utf-8")

            cleaner.clean_concept_file(
                input_path=input_path,
                output_path=output_path,
                root_override="Computer Science",
                cycle_policy="warn",
            )
            lines = output_path.read_text(encoding="utf-8").splitlines()

        self.assertEqual(
            lines,
            [
                "~Computer%20Science: Human-Computer Interaction",
                "~Computer%20Science.~Human-Computer%20Interaction: Error Prevention Techniques",
            ],
        )


if __name__ == "__main__":
    unittest.main()
