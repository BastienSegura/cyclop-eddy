from __future__ import annotations

import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import report_concept_quality as report  # noqa: E402


class ReportConceptQualityTests(unittest.TestCase):
    def test_analyze_file_raw_metrics(self) -> None:
        raw = """A: B
A: B
A: b
A: A
A: Here are semantically close related concepts
bad line
A:
B: A
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "raw.txt"
            input_path.write_text(raw, encoding="utf-8")
            metrics = report.analyze_file(input_path, mode="raw")

        self.assertEqual(metrics["line_count"], 8)
        self.assertEqual(metrics["parsed_edge_count"], 6)
        self.assertEqual(metrics["malformed_line_count"], 2)
        self.assertEqual(metrics["meta_line_count"], 1)
        self.assertEqual(metrics["self_edge_count"], 1)
        self.assertEqual(metrics["duplicate_edge_exact_count"], 1)
        self.assertEqual(metrics["duplicate_edge_canonical_count"], 2)
        self.assertEqual(metrics["duplicate_variant_group_count"], 1)
        self.assertEqual(metrics["duplicate_variant_extra_count"], 1)
        self.assertEqual(metrics["graph_unique_edge_count"], 2)
        self.assertEqual(metrics["cycle_edge_count"], 2)
        self.assertEqual(metrics["root_candidate_count"], 0)

    def test_analyze_file_cleaned_mode_supports_encoded_and_legacy_segments(self) -> None:
        raw = """~Computer%20Science: Human-Computer Interaction
~Computer%20Science.~Human-Computer%20Interaction: Error Prevention Techniques
Computer-Science.Legacy-Parent: Legacy Child
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "cleaned.txt"
            input_path.write_text(raw, encoding="utf-8")
            metrics = report.analyze_file(input_path, mode="cleaned")

        self.assertEqual(metrics["mode_detected"], "cleaned")
        self.assertEqual(metrics["malformed_line_count"], 0)
        self.assertEqual(metrics["graph_unique_edge_count"], 3)
        self.assertGreaterEqual(metrics["root_candidate_count"], 1)

    def test_threshold_defaults_fail_on_malformed_meta_self(self) -> None:
        files = [
            {
                "path": "x.txt",
                "malformed_line_count": 1,
                "meta_line_count": 0,
                "self_edge_count": 0,
                "cycle_edge_count": 0,
                "duplicate_variant_extra_count": 0,
            }
        ]

        violations = report.evaluate_thresholds(
            files=files,
            fail_on_threshold=True,
            max_malformed_lines=None,
            max_meta_lines=None,
            max_self_edges=None,
            max_cycle_edges=None,
            max_duplicate_variant_extras=None,
        )

        self.assertEqual(len(violations), 1)
        self.assertIn("malformed_line_count=1 > 0", violations[0])


if __name__ == "__main__":
    unittest.main()
