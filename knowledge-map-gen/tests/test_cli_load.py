from __future__ import annotations

import contextlib
import io
import os
from pathlib import Path
import tempfile
import unittest

import package_alias  # noqa: F401

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


class BrainCliLoadTests(unittest.TestCase):
    def test_load_aliases_update_session_and_cache(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "knowledge-map-gen" / "map-store" / "runtime"
            fixture_dir = temp_path / "knowledge-map-gen" / "map-store" / "fixtures" / "demo"

            runtime_dir.mkdir(parents=True)
            fixture_dir.mkdir(parents=True)
            (runtime_dir / "concept_list.txt").write_text(
                "Computer Science: Databases\nDatabases: SQL\n",
                encoding="utf-8",
            )
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "~Computer%20Science: Databases\n~Computer%20Science.~Databases: SQL\n",
                encoding="utf-8",
            )
            (fixture_dir / "concept_list_cleaned.txt").write_text(
                "~Computer%20Science: Algorithms\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            stdout = io.StringIO()
            stderr = io.StringIO()

            with pushd(temp_path):
                exit_code = main(["load", "raw"], session=session, stdout=stdout, stderr=stderr)
                self.assertEqual(exit_code, 0)
                self.assertEqual(session.active_graph_source_path, Path("knowledge-map-gen/map-store/runtime/concept_list.txt"))
                self.assertEqual(session.active_graph_source_alias, "raw")
                self.assertEqual(session.active_graph_mode, "raw")
                self.assertIsNotNone(session.parsed_graph_cache)
                self.assertEqual(session.parsed_graph_cache.payload.nodes, ("Computer Science", "Databases", "SQL"))
                self.assertIn("- Alias: raw", stdout.getvalue())

                stdout = io.StringIO()
                exit_code = main(["load", "cleaned"], session=session, stdout=stdout, stderr=stderr)
                self.assertEqual(exit_code, 0)
                self.assertEqual(session.active_graph_source_path, Path("knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt"))
                self.assertEqual(session.active_graph_source_alias, "cleaned")
                self.assertEqual(session.active_graph_mode, "cleaned")
                self.assertEqual(session.parsed_graph_cache.payload.unique_edge_count, 2)

                stdout = io.StringIO()
                exit_code = main(["load", "fixture"], session=session, stdout=stdout, stderr=stderr)
                self.assertEqual(exit_code, 0)
                self.assertEqual(session.active_graph_source_path, Path("knowledge-map-gen/map-store/fixtures/demo/concept_list_cleaned.txt"))
                self.assertEqual(session.active_graph_source_alias, "fixture")
                self.assertEqual(session.active_graph_mode, "cleaned")
                self.assertEqual(session.parsed_graph_cache.payload.nodes, ("Algorithms", "Computer Science"))

            self.assertEqual(stderr.getvalue(), "")

    def test_load_explicit_path_uses_custom_alias(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            custom_path = temp_path / "graph.txt"
            custom_path.write_text(
                "Computer Science: Databases\nDatabases: Transactions\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            stdout = io.StringIO()
            stderr = io.StringIO()

            with pushd(temp_path):
                exit_code = main(["load", "graph.txt"], session=session, stdout=stdout, stderr=stderr)

            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(session.active_graph_source_path, Path("graph.txt"))
            self.assertEqual(session.active_graph_source_alias, "custom")
            self.assertEqual(session.active_graph_mode, "raw")
            self.assertIsNotNone(session.parsed_graph_cache)
            self.assertEqual(session.parsed_graph_cache.payload.unique_edge_count, 2)
            self.assertIn("- Alias: custom", stdout.getvalue())

    def test_load_missing_path_preserves_previous_session_state(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "knowledge-map-gen" / "map-store" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "~Computer%20Science: Databases\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            session.current_concept = "Databases"
            stdout = io.StringIO()
            stderr = io.StringIO()

            with pushd(temp_path):
                first_exit_code = main(["load", "cleaned"], session=session, stdout=stdout, stderr=stderr)
                previous_cache = session.parsed_graph_cache

                stderr = io.StringIO()
                second_exit_code = main(["load", "missing.txt"], session=session, stdout=io.StringIO(), stderr=stderr)

            self.assertEqual(first_exit_code, 0)
            self.assertEqual(second_exit_code, 2)
            self.assertIn("Cannot load graph source because the file does not exist", stderr.getvalue())
            self.assertEqual(session.active_graph_source_path, Path("knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt"))
            self.assertEqual(session.active_graph_source_alias, "cleaned")
            self.assertEqual(session.active_graph_mode, "cleaned")
            self.assertEqual(session.current_concept, "Databases")
            self.assertIs(session.parsed_graph_cache, previous_cache)

    def test_load_rejects_wrong_argument_count(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["load"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("load requires exactly one source argument", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
