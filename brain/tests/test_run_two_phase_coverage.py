from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class RunTwoPhaseCoverageTests(unittest.TestCase):
    def test_dry_run_prints_expected_plan_and_dedups_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            roots_file = temp_path / "roots.txt"
            baseline_file = temp_path / "baseline.txt"
            work_dir = temp_path / "two_phase"

            roots_file.write_text(
                "# frontier roots\nOperating Systems\nAlgorithms\n",
                encoding="utf-8",
            )
            baseline_file.write_text("Computer Science: Algorithms\n", encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    "brain/run_two_phase_coverage.py",
                    "--phase2-roots",
                    "Algorithms",
                    "algorithms",
                    "Databases",
                    "--phase2-roots-file",
                    str(roots_file),
                    "--work-dir",
                    str(work_dir),
                    "--baseline-input",
                    str(baseline_file),
                    "--dry-run",
                ],
                capture_output=True,
                text=True,
                check=True,
            )

        stdout = result.stdout
        self.assertIn("[two-phase] Dry run. Planned commands:", stdout)
        self.assertIn("build_concept_list.py", stdout)
        self.assertIn("merge_concept_edges.py", stdout)
        self.assertIn("report_concept_quality.py", stdout)
        self.assertIn("Phase2 roots (3): Algorithms, Databases, Operating Systems", stdout)
        self.assertIn("concept_list_two_phase.txt", stdout)

    def test_fails_without_phase2_roots(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                "brain/run_two_phase_coverage.py",
                "--dry-run",
            ],
            capture_output=True,
            text=True,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No phase2 roots resolved", result.stderr)


if __name__ == "__main__":
    unittest.main()
