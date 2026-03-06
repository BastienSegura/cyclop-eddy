from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import graph_file_utils as graph_files  # noqa: E402


class GraphFileUtilsTests(unittest.TestCase):
    def test_parse_graph_edge_line_supports_encoded_and_legacy_cleaned_parents(self) -> None:
        encoded = graph_files.parse_graph_edge_line(
            "~Computer%20Science.~Human-Computer%20Interaction: Error Prevention Techniques",
            mode="cleaned",
        )
        legacy = graph_files.parse_graph_edge_line(
            "Computer-Science.Legacy-Parent: Legacy Child",
            mode="cleaned",
        )

        self.assertEqual(
            encoded,
            ("Human-Computer Interaction", "Error Prevention Techniques", "cleaned"),
        )
        self.assertEqual(
            legacy,
            ("Legacy Parent", "Legacy Child", "cleaned"),
        )

    def test_infer_file_mode_prefers_cleaned_hints_and_raw_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cleaned_path = Path(temp_dir) / "graph.txt"
            raw_path = Path(temp_dir) / "raw.txt"

            cleaned_lines = [
                "~Computer%20Science: Algorithms",
                "Computer-Science.Legacy-Parent: Legacy Child",
            ]
            raw_lines = [
                "Computer Science: Algorithms",
                "Algorithms: Graph Theory",
            ]

            self.assertEqual(graph_files.infer_file_mode(cleaned_path, cleaned_lines), "cleaned")
            self.assertEqual(graph_files.infer_file_mode(raw_path, raw_lines), "raw")

    def test_parse_raw_edge_line_rejects_malformed_rows(self) -> None:
        self.assertEqual(
            graph_files.parse_raw_edge_line("Parent: Child"),
            ("Parent", "Child"),
        )
        self.assertIsNone(graph_files.parse_raw_edge_line("No delimiter line"))
        self.assertIsNone(graph_files.parse_raw_edge_line("Parent:"))


if __name__ == "__main__":
    unittest.main()
