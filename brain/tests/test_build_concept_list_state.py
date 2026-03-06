from __future__ import annotations

import os
import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import build_concept_list_state as state_utils  # noqa: E402


class BuildConceptListStateTests(unittest.TestCase):
    def test_prepare_resumed_state_migrates_legacy_memory_output_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            (temp_path / "memory").mkdir()

            cwd = Path.cwd()
            try:
                os.chdir(temp_path)
                state = state_utils.build_new_state(
                    root_concept="Computer Science",
                    concept_list_length=2,
                    max_depth=1,
                    output_path="memory/concept_list.txt",
                    exclude_strategy="local",
                    exclude_local_limit=5,
                )
                state["version"] = 4

                resumed = state_utils.prepare_resumed_state(
                    state=state,
                    root_concept="Computer Science",
                    output_path="memory/runtime/concept_list.txt",
                    requested_exclude_strategy=None,
                    requested_exclude_local_limit=None,
                )
            finally:
                os.chdir(cwd)

        self.assertEqual(resumed["version"], 5)
        self.assertEqual(resumed["output_path"], "memory/runtime/concept_list.txt")
        self.assertEqual(resumed["exclude_strategy"], "local")

    def test_prepare_resumed_state_rejects_conflicting_exclude_strategy(self) -> None:
        state = state_utils.build_new_state(
            root_concept="Computer Science",
            concept_list_length=2,
            max_depth=1,
            output_path="memory/runtime/concept_list.txt",
            exclude_strategy="global",
            exclude_local_limit=5,
        )

        with self.assertRaises(SystemExit) as ctx:
            state_utils.prepare_resumed_state(
                state=state,
                root_concept="Computer Science",
                output_path="memory/runtime/concept_list.txt",
                requested_exclude_strategy="local",
                requested_exclude_local_limit=None,
            )

        self.assertIn("different exclude strategy", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
