from __future__ import annotations

import io
import json
import unittest

import package_alias  # noqa: F401

from brain.cli.app import main
from brain.cli.load import build_graph_cache, resolve_load_target
from brain.cli.session import BrainCliSession


class BrainCliCurrentTests(unittest.TestCase):
    def test_current_reports_session_state_without_selected_concept(self) -> None:
        session = BrainCliSession()
        stdout = io.StringIO()
        stderr = io.StringIO()

        exit_code = main(["current"], session=session, stdout=stdout, stderr=stderr)

        rendered = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertEqual(stderr.getvalue(), "")
        self.assertIn("Current session:", rendered)
        self.assertIn("- Active graph source: knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt", rendered)
        self.assertIn("- Active graph alias: cleaned", rendered)
        self.assertIn("- Active graph mode: cleaned", rendered)
        self.assertIn("- Current concept: (none selected)", rendered)
        self.assertIn("- Parsed graph cache: not loaded", rendered)

    def test_current_json_reports_selected_concept_and_loaded_cache(self) -> None:
        session = BrainCliSession()
        session.current_concept = "Databases"
        session.parsed_graph_cache = build_graph_cache(resolve_load_target("fixture"))
        session.active_graph_source_path = session.parsed_graph_cache.source_path
        session.active_graph_source_alias = session.parsed_graph_cache.source_alias
        session.active_graph_mode = session.parsed_graph_cache.mode

        stdout = io.StringIO()
        stderr = io.StringIO()
        exit_code = main(["current", "--json"], session=session, stdout=stdout, stderr=stderr)

        payload = json.loads(stdout.getvalue())
        self.assertEqual(exit_code, 0)
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(payload["active_graph_source_path"], "knowledge-map-gen/map-store/fixtures/demo/concept_list_cleaned.txt")
        self.assertEqual(payload["active_graph_source_alias"], "fixture")
        self.assertEqual(payload["active_graph_mode"], "cleaned")
        self.assertEqual(payload["current_concept"], "Databases")
        self.assertTrue(payload["parsed_graph_cache_loaded"])
        self.assertEqual(payload["parsed_graph_cache_source_path"], "knowledge-map-gen/map-store/fixtures/demo/concept_list_cleaned.txt")
        self.assertEqual(
            payload["parsed_graph_cache_node_count"],
            len(session.parsed_graph_cache.payload.nodes),
        )
        self.assertEqual(
            payload["parsed_graph_cache_edge_count"],
            session.parsed_graph_cache.payload.unique_edge_count,
        )

    def test_current_rejects_unknown_arguments(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["current", "--nope"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("current accepts no arguments except --json", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
