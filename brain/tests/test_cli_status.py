from __future__ import annotations

import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest

from brain.cli.app import main
from brain.cli.session import BrainCliSession


@contextlib.contextmanager
def pushd(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


class BrainCliStatusTests(unittest.TestCase):
    def test_status_reports_missing_default_artifacts_without_crashing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            stdout = io.StringIO()
            stderr = io.StringIO()
            session = BrainCliSession()
            session.current_concept = "Databases"

            with pushd(temp_path):
                exit_code = main(["status"], session=session, stdout=stdout, stderr=stderr)

            rendered = stdout.getvalue()
            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertIn("Session:", rendered)
            self.assertIn("- Active graph source: memory/runtime/concept_list_cleaned.txt", rendered)
            self.assertIn("- Current concept: Databases", rendered)
            self.assertIn("Raw artifact: memory/runtime/concept_list.txt (missing)", rendered)
            self.assertIn("Canonical cleaned artifact: memory/runtime/concept_list_cleaned.txt (missing)", rendered)
            self.assertIn("Derived GUI target: gui/public/data/concept_list_cleaned.txt (missing)", rendered)
            self.assertIn("Checkpoint state file: memory/runtime/concept_list_state.json (missing)", rendered)
            self.assertIn("Fixture fallback: memory/fixtures/demo/concept_list_cleaned.txt (missing)", rendered)

    def test_status_json_reports_existing_artifacts_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "memory" / "runtime"
            fixture_dir = temp_path / "memory" / "fixtures" / "demo"
            gui_dir = temp_path / "gui" / "public" / "data"

            runtime_dir.mkdir(parents=True)
            fixture_dir.mkdir(parents=True)
            gui_dir.mkdir(parents=True)

            raw_path = runtime_dir / "concept_list.txt"
            cleaned_path = runtime_dir / "concept_list_cleaned.txt"
            checkpoint_path = runtime_dir / "concept_list_state.json"
            fixture_path = fixture_dir / "concept_list_cleaned.txt"
            gui_path = gui_dir / "concept_list_cleaned.txt"

            raw_path.write_text("Computer Science: Databases\n", encoding="utf-8")
            cleaned_path.write_text("Computer Science > Databases\n", encoding="utf-8")
            checkpoint_path.write_text("{\"version\": 1}\n", encoding="utf-8")
            fixture_path.write_text("Computer Science > Algorithms\n", encoding="utf-8")
            gui_path.write_text("Computer Science > Databases\n", encoding="utf-8")

            stdout = io.StringIO()
            stderr = io.StringIO()
            session = BrainCliSession()

            with pushd(temp_path):
                exit_code = main(["status", "--json"], session=session, stdout=stdout, stderr=stderr)

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(payload["session"]["active_graph_source_alias"], "cleaned")
            self.assertEqual(payload["session"]["current_concept"], None)
            self.assertEqual(
                payload["artifacts"]["canonical_cleaned_artifact"]["path"],
                "memory/runtime/concept_list_cleaned.txt",
            )
            self.assertTrue(payload["artifacts"]["raw_artifact"]["exists"])
            self.assertEqual(
                payload["artifacts"]["raw_artifact"]["size_bytes"],
                len("Computer Science: Databases\n".encode("utf-8")),
            )
            self.assertIsNotNone(payload["artifacts"]["raw_artifact"]["modified_at"])
            self.assertTrue(payload["artifacts"]["canonical_cleaned_artifact"]["exists"])
            self.assertTrue(payload["artifacts"]["derived_gui_target"]["exists"])
            self.assertTrue(payload["artifacts"]["checkpoint_state_file"]["exists"])
            self.assertTrue(payload["artifacts"]["fixture_fallback"]["exists"])

    def test_status_rejects_unknown_arguments(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["status", "--nope"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("status accepts no arguments except --json", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
