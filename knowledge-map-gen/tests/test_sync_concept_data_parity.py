from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class SyncConceptDataParityTests(unittest.TestCase):
    def test_sync_command_writes_identical_memory_and_gui_outputs(self) -> None:
        raw = """Computer Science: Algorithms
Computer Science: Data Structures
Algorithms: Graph Theory
"""

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            input_path = temp_dir_path / "raw.txt"
            cleaned_path = temp_dir_path / "cleaned.txt"
            gui_path = temp_dir_path / "gui_cleaned.txt"
            input_path.write_text(raw, encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    "knowledge-map-gen/sync_concept_data.py",
                    "--input",
                    str(input_path),
                    "--cleaned-output",
                    str(cleaned_path),
                    "--gui-output",
                    str(gui_path),
                    "--root",
                    "Computer Science",
                    "--cycle-policy",
                    "warn",
                ],
                capture_output=True,
                text=True,
                check=True,
            )

            cleaned_bytes = cleaned_path.read_bytes()
            gui_bytes = gui_path.read_bytes()

        self.assertEqual(cleaned_bytes, gui_bytes)
        self.assertIn("[sync] Line parity:", result.stdout)
        self.assertIn("[sync] Byte parity: OK", result.stdout)


if __name__ == "__main__":
    unittest.main()
