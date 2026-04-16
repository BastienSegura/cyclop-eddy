from __future__ import annotations

import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest

import package_alias  # noqa: F401

from brain.cli.app import main
from brain.cli.graph_lookup import search_labels
from brain.cli.session import BrainCliSession


@contextlib.contextmanager
def pushd(path: Path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


class BrainCliSearchTests(unittest.TestCase):
    def test_search_helper_ranks_exact_prefix_then_substring(self) -> None:
        labels = (
            "Databases",
            "Databases in Practice",
            "Distributed Databases",
            "Operating Systems",
        )

        matches = search_labels(labels, "databases", limit=10)

        self.assertEqual(
            [(match.label, match.match_type) for match in matches],
            [
                ("Databases", "exact"),
                ("Databases in Practice", "prefix"),
                ("Distributed Databases", "substring"),
            ],
        )

    def test_search_uses_active_graph_source_and_respects_limit(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "knowledge-map-gen" / "map-store" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "\n".join(
                    [
                        "~Computer%20Science: Databases",
                        "~Computer%20Science: Database Systems",
                        "~Computer%20Science: Distributed Databases",
                        "~Computer%20Science: Operating Systems",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            session.current_concept = "Operating Systems"
            stdout = io.StringIO()
            stderr = io.StringIO()

            with pushd(temp_path):
                exit_code = main(["search", "databases", "--limit", "2"], session=session, stdout=stdout, stderr=stderr)

            rendered = stdout.getvalue()
            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertIn('Search results for "databases" (2):', rendered)
            self.assertIn("- Databases [exact]", rendered)
            self.assertIn("- Distributed Databases [substring]", rendered)
            self.assertNotIn("Database Systems", rendered)
            self.assertEqual(session.current_concept, "Operating Systems")
            self.assertIsNotNone(session.parsed_graph_cache)
            self.assertEqual(session.parsed_graph_cache.source_path, Path("knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt"))

    def test_search_json_reports_match_types(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "knowledge-map-gen" / "map-store" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "~Computer%20Science: Operating Systems\n~Computer%20Science: Distributed Systems\n",
                encoding="utf-8",
            )

            stdout = io.StringIO()
            stderr = io.StringIO()
            with pushd(temp_path):
                exit_code = main(["search", "systems", "--json"], stdout=stdout, stderr=stderr)

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(payload["query"], "systems")
            self.assertEqual(payload["result_count"], 2)
            self.assertEqual(
                payload["matches"],
                [
                    {"label": "Distributed Systems", "match_type": "substring"},
                    {"label": "Operating Systems", "match_type": "substring"},
                ],
            )

    def test_search_fails_when_active_graph_source_is_not_loadable(self) -> None:
        session = BrainCliSession()
        session.active_graph_source_path = Path("missing.txt")
        session.active_graph_source_alias = "custom"
        session.active_graph_mode = "raw"
        session.current_concept = "Databases"
        stderr = io.StringIO()

        exit_code = main(["search", "databases"], session=session, stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("No active graph source is loaded or loadable.", stderr.getvalue())
        self.assertIn("Run `load` or fix the active source path first.", stderr.getvalue())
        self.assertEqual(session.current_concept, "Databases")

    def test_search_rejects_missing_query_and_bad_limit(self) -> None:
        stderr = io.StringIO()
        exit_code = main(["search"], stderr=stderr)
        self.assertEqual(exit_code, 2)
        self.assertIn("search requires a query", stderr.getvalue())

        stderr = io.StringIO()
        exit_code = main(["search", "databases", "--limit", "0"], stderr=stderr)
        self.assertEqual(exit_code, 2)
        self.assertIn("search --limit must be >= 1", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
