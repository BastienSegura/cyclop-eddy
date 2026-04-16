from __future__ import annotations

import os
import sys
from pathlib import Path
import tempfile
import unittest

BRAIN_DIR = Path(__file__).resolve().parents[1]
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

import build_concept_list as builder  # noqa: E402


class BuildConceptListCanonicalTests(unittest.TestCase):
    def test_validate_candidate_canonicalizes_and_blocks_self_reference(self) -> None:
        normalized, reason = builder.validate_candidate("  Data   Mining  ", "Computer Science")
        self.assertEqual(normalized, "Data Mining")
        self.assertIsNone(reason)

        normalized, reason = builder.validate_candidate("Computer   Science", "computer science")
        self.assertIsNone(normalized)
        self.assertEqual(reason, "self_reference")

    def test_generation_dedups_spacing_and_case_variants(self) -> None:
        responses = [
            "Data Mining\ndata   mining\nDATA MINING\nGraph Theory\nGraph  Theory\n",
        ]
        call = {"index": 0}

        def fake_prompt(_prompt: str) -> str:
            index = call["index"]
            call["index"] += 1
            return responses[min(index, len(responses) - 1)]

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"

                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=10,
                    max_depth=1,
                    output_path=str(output_path),
                    state_file=str(state_path),
                )

                lines = output_path.read_text(encoding="utf-8").splitlines()
        finally:
            builder.simple_prompt = original_prompt

        self.assertEqual(
            lines,
            [
                "Computer Science: Data Mining",
                "Computer Science: Graph Theory",
            ],
        )

    def test_default_exclude_strategy_is_local(self) -> None:
        responses = [
            "A\nB\n",
            "",
            "",
        ]
        prompts: list[str] = []

        def fake_prompt(prompt: str) -> str:
            prompts.append(prompt)
            index = min(len(prompts) - 1, len(responses) - 1)
            return responses[index]

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"

                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    state_file=str(state_path),
                )
        finally:
            builder.simple_prompt = original_prompt

        self.assertGreaterEqual(len(prompts), 2)
        prompt_for_a = prompts[1]
        self.assertIn("Exclude any concept already listed below:", prompt_for_a)
        self.assertIn("  - A", prompt_for_a)
        self.assertNotIn("  - B", prompt_for_a)
        self.assertNotIn("  - Computer Science", prompt_for_a)

    def test_global_exclude_strategy_uses_full_seen_payload(self) -> None:
        responses = [
            "A\nB\n",
            "",
            "",
        ]
        prompts: list[str] = []

        def fake_prompt(prompt: str) -> str:
            prompts.append(prompt)
            index = min(len(prompts) - 1, len(responses) - 1)
            return responses[index]

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"

                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    state_file=str(state_path),
                    exclude_strategy="global",
                )
        finally:
            builder.simple_prompt = original_prompt

        self.assertGreaterEqual(len(prompts), 2)
        prompt_for_a = prompts[1]
        self.assertIn("Exclude any concept already listed below:", prompt_for_a)
        self.assertIn("  - Computer Science", prompt_for_a)
        self.assertIn("  - A", prompt_for_a)
        self.assertIn("  - B", prompt_for_a)

    def test_none_exclude_strategy_omits_prompt_excludes(self) -> None:
        responses = [
            "A\nB\n",
            "",
            "",
        ]
        prompts: list[str] = []

        def fake_prompt(prompt: str) -> str:
            prompts.append(prompt)
            index = min(len(prompts) - 1, len(responses) - 1)
            return responses[index]

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"

                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    state_file=str(state_path),
                    exclude_strategy="none",
                )
        finally:
            builder.simple_prompt = original_prompt

        self.assertGreaterEqual(len(prompts), 2)
        self.assertNotIn("Exclude any concept already listed below:", prompts[0])
        self.assertNotIn("Exclude any concept already listed below:", prompts[1])

    def test_resume_uses_state_exclude_strategy_when_not_overridden(self) -> None:
        prompts: list[str] = []

        def fake_prompt(prompt: str) -> str:
            prompts.append(prompt)
            return ""

        original_prompt = builder.simple_prompt
        builder.simple_prompt = fake_prompt
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                output_path = Path(temp_dir) / "concept_list.txt"
                state_path = Path(temp_dir) / "state.json"
                root = "Computer Science"
                root_key = builder.canonical_concept_key(root)
                child_a_key = builder.canonical_concept_key("A")
                child_b_key = builder.canonical_concept_key("B")

                state = builder.build_new_state(
                    root_concept=root,
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    exclude_strategy="global",
                    exclude_local_limit=5,
                )
                state["queue"] = [{"concept": "A", "depth": 1}]
                state["exclude_list"] = [root, "A", "B"]
                state["seen_normalized"] = sorted([root_key, child_a_key, child_b_key])
                state["edges"] = ["Computer Science: A", "Computer Science: B"]
                state["generated_concepts"] = 2
                state["accepted_candidates"] = 2
                state["estimated_max_generated_concepts"] = builder.estimate_max_generated_concepts(2, 2)
                state["estimated_max_prompt_calls"] = builder.estimate_max_prompt_calls(2, 2)
                state["processed_prompt_calls"] = 1
                builder.save_generation_state(str(state_path), state)

                builder.generate_concept_graph(
                    root_concept=root,
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    state_file=str(state_path),
                    resume=True,
                )
        finally:
            builder.simple_prompt = original_prompt

        self.assertEqual(len(prompts), 1)
        self.assertIn("Exclude any concept already listed below:", prompts[0])
        self.assertIn("  - B", prompts[0])

    def test_resume_rejects_conflicting_exclude_strategy_override(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "concept_list.txt"
            state_path = Path(temp_dir) / "state.json"
            state = builder.build_new_state(
                root_concept="Computer Science",
                concept_list_length=2,
                max_depth=2,
                output_path=str(output_path),
                exclude_strategy="global",
                exclude_local_limit=5,
            )
            builder.save_generation_state(str(state_path), state)

            with self.assertRaises(SystemExit) as ctx:
                builder.generate_concept_graph(
                    root_concept="Computer Science",
                    concept_list_length=2,
                    max_depth=2,
                    output_path=str(output_path),
                    state_file=str(state_path),
                    resume=True,
                    exclude_strategy="local",
                )

        self.assertIn("different exclude strategy", str(ctx.exception))

    def test_resume_migrates_legacy_memory_output_path_to_runtime_directory(self) -> None:
        prompts: list[str] = []
        persisted_output_paths: list[str] = []

        def fake_prompt(prompt: str) -> str:
            prompts.append(prompt)
            return ""

        original_prompt = builder.simple_prompt
        original_save_state = builder.save_generation_state
        builder.simple_prompt = fake_prompt

        def tracking_save_generation_state(state_file: str, state: dict[str, object]) -> None:
            output_path = state.get("output_path")
            if isinstance(output_path, str):
                persisted_output_paths.append(output_path)
            original_save_state(state_file, state)

        builder.save_generation_state = tracking_save_generation_state
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                legacy_memory_dir = temp_path / "memory"
                legacy_memory_dir.mkdir()
                runtime_store_dir = temp_path / "knowledge-map-gen" / "map-store" / "runtime"
                state_path = temp_path / "state.json"

                cwd = Path.cwd()
                try:
                    os.chdir(temp_path)
                    state = builder.build_new_state(
                        root_concept="Computer Science",
                        concept_list_length=2,
                        max_depth=1,
                        output_path="memory/concept_list.txt",
                        exclude_strategy="local",
                        exclude_local_limit=5,
                    )
                    builder.save_generation_state(str(state_path), state)

                    builder.generate_concept_graph(
                        root_concept="Computer Science",
                        concept_list_length=2,
                        max_depth=1,
                        output_path="knowledge-map-gen/map-store/runtime/concept_list.txt",
                        state_file=str(state_path),
                        resume=True,
                    )
                finally:
                    os.chdir(cwd)

                migrated_output_path = runtime_store_dir / "concept_list.txt"
                migrated_output_exists = migrated_output_path.exists()
        finally:
            builder.simple_prompt = original_prompt
            builder.save_generation_state = original_save_state

        self.assertEqual(len(prompts), 1)
        self.assertIn("knowledge-map-gen/map-store/runtime/concept_list.txt", persisted_output_paths)
        self.assertTrue(migrated_output_exists)


if __name__ == "__main__":
    unittest.main()
