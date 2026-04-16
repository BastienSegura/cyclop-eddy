from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import clean_concept_list as cleaner  # noqa: E402


class CleanConceptListCycleTests(unittest.TestCase):
    def test_analyze_cycle_stats_reports_cycle_edges_and_examples(self) -> None:
        edges = [("a", "b"), ("b", "c"), ("c", "a"), ("c", "d")]
        labels = {"a": "A", "b": "B", "c": "C", "d": "D"}

        stats = cleaner.analyze_cycle_stats(edges, labels, max_examples=3)

        self.assertEqual(stats["cycle_edge_count"], 3)
        self.assertGreaterEqual(len(stats["cycle_examples"]), 1)

    def test_apply_cycle_policy_enforce_drops_cycle_closing_edges(self) -> None:
        edges = [("a", "b"), ("b", "c"), ("c", "a"), ("c", "d")]

        kept, dropped = cleaner.apply_cycle_policy(edges, cycle_policy="enforce")
        cycle_stats_after = cleaner.analyze_cycle_stats(kept, labels={}, max_examples=3)

        self.assertEqual(kept, [("a", "b"), ("b", "c"), ("c", "d")])
        self.assertEqual(dropped, [("c", "a")])
        self.assertEqual(cycle_stats_after["cycle_edge_count"], 0)

    def test_clean_concept_file_respects_cycle_policy(self) -> None:
        raw = """A: B
B: C
C: A
C: D
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "input.txt"
            output_path = Path(temp_dir) / "output.txt"
            input_path.write_text(raw, encoding="utf-8")

            total, kept, stats = cleaner.clean_concept_file(
                input_path=input_path,
                output_path=output_path,
                root_override="A",
                cycle_policy="enforce",
                max_cycle_examples=5,
            )

            lines = output_path.read_text(encoding="utf-8").splitlines()

        self.assertEqual(total, 4)
        self.assertEqual(kept, 3)
        self.assertEqual(stats["cycle_edge_count_before"], 3)
        self.assertEqual(stats["cycle_edge_count_after"], 0)
        self.assertEqual(stats["dropped_cycle_edge_count"], 1)
        self.assertEqual(len(lines), 3)


if __name__ == "__main__":
    unittest.main()
