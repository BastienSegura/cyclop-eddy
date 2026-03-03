from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import merge_concept_edges as merge_edges  # noqa: E402


class MergeConceptEdgesTests(unittest.TestCase):
    def test_merge_raw_edge_files_dedups_canonical_edges(self) -> None:
        raw_one = """A: B
A: B
A: b
A: A
bad line
A:
"""
        raw_two = """a: b
B: C
"""

        with tempfile.TemporaryDirectory() as temp_dir:
            first_path = Path(temp_dir) / "phase1.txt"
            second_path = Path(temp_dir) / "phase2.txt"
            first_path.write_text(raw_one, encoding="utf-8")
            second_path.write_text(raw_two, encoding="utf-8")

            merged_lines, stats = merge_edges.merge_raw_edge_files([first_path, second_path])

        self.assertEqual(merged_lines, ["A: B", "B: C"])
        self.assertEqual(stats["input_file_count"], 2)
        self.assertEqual(stats["input_line_count"], 8)
        self.assertEqual(stats["parsed_edge_count"], 6)
        self.assertEqual(stats["merged_unique_edge_count"], 2)
        self.assertEqual(stats["duplicate_edge_count"], 3)
        self.assertEqual(stats["malformed_line_count"], 2)
        self.assertEqual(stats["self_edge_count"], 1)

    def test_parse_raw_edge_rejects_malformed_lines(self) -> None:
        self.assertEqual(merge_edges.parse_raw_edge("Parent: Child"), ("Parent", "Child"))
        self.assertIsNone(merge_edges.parse_raw_edge("No delimiter line"))
        self.assertIsNone(merge_edges.parse_raw_edge("Parent:"))


if __name__ == "__main__":
    unittest.main()
