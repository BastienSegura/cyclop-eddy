from __future__ import annotations

import contextlib
import io
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


class QueueInput:
    def __init__(self, items: list[object]) -> None:
        self.items = list(items)
        self.prompts: list[str] = []

    def __call__(self, prompt: str) -> str:
        self.prompts.append(prompt)
        if not self.items:
            raise EOFError()

        item = self.items.pop(0)
        if isinstance(item, BaseException):
            raise item
        return str(item)


class BrainCliUseTests(unittest.TestCase):
    def test_use_sets_current_concept_with_case_insensitive_exact_match(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "memory" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "\n".join(
                    [
                        "~Computer%20Science: Operating Systems",
                        "~Computer%20Science.~Operating%20Systems: Operating System Kernels",
                        "~Computer%20Science: Databases",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            stdout = io.StringIO()
            stderr = io.StringIO()

            with pushd(temp_path):
                exit_code = main(["use", "operating systems"], session=session, stdout=stdout, stderr=stderr)

            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(session.current_concept, "Operating Systems")
            self.assertIsNotNone(session.parsed_graph_cache)
            self.assertEqual(session.parsed_graph_cache.source_path, Path("memory/runtime/concept_list_cleaned.txt"))
            self.assertIn('Current concept set to "Operating Systems".', stdout.getvalue())

    def test_use_accepts_quoted_multiword_labels_in_repl(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "memory" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "~Computer%20Science: Operating Systems\n",
                encoding="utf-8",
            )

            history_path = temp_path / "history.txt"
            input_func = QueueInput(['use "Operating Systems"', "current", EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()
            session = BrainCliSession()

            with pushd(temp_path):
                exit_code = main(
                    [],
                    session=session,
                    input_func=input_func,
                    stdout=stdout,
                    stderr=stderr,
                    history_path=history_path,
                )

            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(session.current_concept, "Operating Systems")
            self.assertIn('Current concept set to "Operating Systems".', stdout.getvalue())
            self.assertIn("Current concept: Operating Systems", stdout.getvalue())

    def test_use_preserves_previous_current_concept_on_failed_resolution(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            runtime_dir = temp_path / "memory" / "runtime"
            runtime_dir.mkdir(parents=True)
            (runtime_dir / "concept_list_cleaned.txt").write_text(
                "\n".join(
                    [
                        "~Computer%20Science: Operating Systems",
                        "~Computer%20Science: Operating System Design",
                        "~Computer%20Science: Databases",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            session = BrainCliSession()
            session.current_concept = "Databases"
            stderr = io.StringIO()

            with pushd(temp_path):
                exit_code = main(["use", "Operating"], session=session, stderr=stderr)

            self.assertEqual(exit_code, 2)
            self.assertEqual(session.current_concept, "Databases")
            self.assertIn('No exact concept match for "Operating".', stderr.getvalue())
            self.assertIn("- Operating System Design [prefix]", stderr.getvalue())
            self.assertIn("- Operating Systems [prefix]", stderr.getvalue())

    def test_use_help_documents_session_context(self) -> None:
        stdout = io.StringIO()

        exit_code = main(["help", "use"], stdout=stdout)

        rendered = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Command: use", rendered)
        self.assertIn("Changes session context", rendered)
        self.assertIn("show", rendered)
        self.assertIn("prompt", rendered)

    def test_use_rejects_missing_concept(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["use"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("use requires a concept. Usage: use <concept>", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
