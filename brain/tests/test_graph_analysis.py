from __future__ import annotations

import sys
from pathlib import Path
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import graph_analysis as graph_tools  # noqa: E402


class GraphAnalysisTests(unittest.TestCase):
    def test_analyze_cycle_edges_reports_count_and_example(self) -> None:
        edges = [("a", "b"), ("b", "c"), ("c", "a"), ("c", "d")]
        labels = {"a": "A", "b": "B", "c": "C", "d": "D"}

        cycle_edge_count, examples = graph_tools.analyze_cycle_edges(edges, labels, max_examples=3)

        self.assertEqual(cycle_edge_count, 3)
        self.assertGreaterEqual(len(examples), 1)
        self.assertIn("A", examples[0])

    def test_compute_depths_and_reachable_descendants_handle_branching_graph(self) -> None:
        edges = [
            ("root", "algorithms"),
            ("root", "databases"),
            ("algorithms", "graphs"),
            ("algorithms", "dp"),
        ]
        adjacency = graph_tools.build_adjacency_set(edges)
        indegree = graph_tools.build_indegree_map(edges)
        labels = {
            "root": "Computer Science",
            "algorithms": "Algorithms",
            "databases": "Databases",
            "graphs": "Graph Theory",
            "dp": "Dynamic Programming",
        }
        nodes = set(labels)

        depths = graph_tools.compute_depths(nodes, adjacency, indegree, labels)

        self.assertEqual(depths["root"], 0)
        self.assertEqual(depths["algorithms"], 1)
        self.assertEqual(depths["graphs"], 2)
        self.assertEqual(graph_tools.reachable_descendant_count("root", adjacency), 4)
        self.assertEqual(graph_tools.reachable_descendant_count("algorithms", adjacency), 2)

    def test_find_path_returns_none_when_unreachable(self) -> None:
        adjacency = {
            "a": ["b"],
            "b": ["c"],
            "x": ["y"],
        }

        self.assertEqual(graph_tools.find_path(adjacency, "a", "c"), ["a", "b", "c"])
        self.assertIsNone(graph_tools.find_path(adjacency, "a", "y"))


if __name__ == "__main__":
    unittest.main()
