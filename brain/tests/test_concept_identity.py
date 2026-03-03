from __future__ import annotations

import sys
from pathlib import Path
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

from concept_identity import (  # noqa: E402
    canonical_concept_key,
    canonical_concept_label,
    concept_word_count,
    has_leading_formatting_marker,
    is_meta_concept_text,
)


class ConceptIdentityTests(unittest.TestCase):
    def test_canonical_label_strips_markers_and_collapses_spaces(self) -> None:
        self.assertEqual(canonical_concept_label("  1) **Data   Mining**  "), "Data Mining")
        self.assertEqual(canonical_concept_label("-   Graph   Theory"), "Graph Theory")

    def test_canonical_key_collapses_case_and_formatting_variants(self) -> None:
        left = canonical_concept_key("* DATA   Mining")
        right = canonical_concept_key("data mining")
        self.assertEqual(left, right)

    def test_word_count_uses_canonical_label(self) -> None:
        self.assertEqual(concept_word_count("  C++   Programming  "), 2)

    def test_formatting_marker_detection(self) -> None:
        self.assertTrue(has_leading_formatting_marker("- Item"))
        self.assertTrue(has_leading_formatting_marker("2) Item"))
        self.assertFalse(has_leading_formatting_marker("Human-Computer Interaction"))

    def test_meta_detection(self) -> None:
        self.assertTrue(is_meta_concept_text("Here are the semantically close related concepts"))
        self.assertFalse(is_meta_concept_text("Graph Theory"))

    def test_punctuation_is_preserved_in_label(self) -> None:
        self.assertEqual(canonical_concept_label("C#/.NET"), "C#/.NET")
        self.assertEqual(canonical_concept_key("C#/.NET"), "c#/.net")


if __name__ == "__main__":
    unittest.main()
