from __future__ import annotations

import json
import sys
from pathlib import Path
import subprocess
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import find_unexplored_areas as frontier  # noqa: E402


class FindUnexploredAreasTests(unittest.TestCase):
    def test_analyze_frontier_cleaned_includes_leaf_and_underfilled(self) -> None:
        cleaned = """~Computer%20Science: Algorithms
~Computer%20Science: Databases
~Computer%20Science.~Algorithms: Graph Theory
~Computer%20Science.~Algorithms: Dynamic Programming
~Computer%20Science.~Databases: SQL
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "cleaned.txt"
            input_path.write_text(cleaned, encoding="utf-8")

            report = frontier.analyze_frontier(
                input_path=input_path,
                mode="cleaned",
                target_children=3,
                top_n=20,
                min_depth=0,
                max_depth=None,
                include_leaves=True,
            )

        concepts = {item["concept"] for item in report["candidates"]}
        self.assertIn("Computer Science", concepts)
        self.assertIn("Algorithms", concepts)
        self.assertIn("Graph Theory", concepts)
        self.assertGreaterEqual(report["underfilled_leaf_count"], 1)
        self.assertEqual(report["mode_detected"], "cleaned")

    def test_analyze_frontier_exclude_leaves_filter(self) -> None:
        cleaned = """~Computer%20Science: Algorithms
~Computer%20Science: Databases
~Computer%20Science.~Algorithms: Graph Theory
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "cleaned.txt"
            input_path.write_text(cleaned, encoding="utf-8")

            report = frontier.analyze_frontier(
                input_path=input_path,
                mode="cleaned",
                target_children=3,
                top_n=20,
                min_depth=0,
                max_depth=None,
                include_leaves=False,
            )

        self.assertTrue(report["candidates"])
        self.assertTrue(all(item["out_degree"] > 0 for item in report["candidates"]))
        self.assertTrue(all(item["classification"] == "underfilled" for item in report["candidates"]))

    def test_cli_json_output_raw_mode(self) -> None:
        raw = """Computer Science: Algorithms
Computer Science: Databases
Algorithms: Graph Theory
"""
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "raw.txt"
            input_path.write_text(raw, encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    "brain/find_unexplored_areas.py",
                    "--input",
                    str(input_path),
                    "--mode",
                    "raw",
                    "--target-children",
                    "3",
                    "--top-n",
                    "5",
                    "--output-format",
                    "json",
                ],
                capture_output=True,
                text=True,
                check=True,
            )

        payload = json.loads(result.stdout)
        self.assertEqual(payload["mode_detected"], "raw")
        self.assertEqual(payload["target_children"], 3)
        self.assertGreaterEqual(payload["returned_count"], 1)
        self.assertIn("suggested_roots", payload)


if __name__ == "__main__":
    unittest.main()
