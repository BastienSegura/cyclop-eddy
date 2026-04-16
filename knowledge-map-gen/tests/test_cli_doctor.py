from __future__ import annotations

import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from brain.cli.app import main
from brain.cli.doctor import DoctorCheckResult, STATUS_FAIL, STATUS_PASS, STATUS_WARN


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


class BrainCliDoctorTests(unittest.TestCase):
    def test_doctor_reports_warn_for_missing_optional_paths_and_fail_for_unreachable_ollama(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            stdout = io.StringIO()
            stderr = io.StringIO()

            with (
                pushd(temp_path),
                patch(
                    "brain.cli.doctor._probe_ollama",
                    return_value=DoctorCheckResult(
                        key="ollama_reachability",
                        label="Ollama reachability",
                        status=STATUS_FAIL,
                        message="Cannot reach Ollama at http://localhost:11434: connection refused",
                        details={"base_url": "http://localhost:11434"},
                    ),
                ),
            ):
                exit_code = main(["doctor", "--json"], stdout=stdout, stderr=stderr)

            payload = json.loads(stdout.getvalue())
            self.assertEqual(exit_code, 1)
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(payload["overall_status"], STATUS_FAIL)
            statuses = {entry["key"]: entry["status"] for entry in payload["checks"]}
            self.assertEqual(statuses["runtime_directory"], STATUS_PASS)
            self.assertEqual(statuses["fixture_fallback"], STATUS_WARN)
            self.assertEqual(statuses["ollama_reachability"], STATUS_FAIL)
            self.assertTrue((temp_path / "memory" / "runtime").exists())

    def test_doctor_passes_when_runtime_and_optional_paths_exist_and_ollama_is_reachable(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            (temp_path / "memory" / "runtime").mkdir(parents=True)
            (temp_path / "memory" / "fixtures" / "demo").mkdir(parents=True)
            (temp_path / "gui" / "public" / "data").mkdir(parents=True)
            (temp_path / "memory" / "runtime" / "concept_list.txt").write_text("raw\n", encoding="utf-8")
            (temp_path / "memory" / "runtime" / "concept_list_cleaned.txt").write_text("cleaned\n", encoding="utf-8")
            (temp_path / "memory" / "runtime" / "concept_list_state.json").write_text("{}", encoding="utf-8")
            (temp_path / "memory" / "fixtures" / "demo" / "concept_list_cleaned.txt").write_text(
                "fixture\n",
                encoding="utf-8",
            )
            (temp_path / "gui" / "public" / "data" / "concept_list_cleaned.txt").write_text(
                "gui\n",
                encoding="utf-8",
            )

            stdout = io.StringIO()
            stderr = io.StringIO()

            with (
                pushd(temp_path),
                patch(
                    "brain.cli.doctor._probe_ollama",
                    return_value=DoctorCheckResult(
                        key="ollama_reachability",
                        label="Ollama reachability",
                        status=STATUS_PASS,
                        message="Ollama is reachable at http://localhost:11434.",
                        details={"base_url": "http://localhost:11434"},
                    ),
                ),
            ):
                exit_code = main(["doctor"], stdout=stdout, stderr=stderr)

            rendered = stdout.getvalue()
            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")
            self.assertIn("Doctor summary: PASS", rendered)
            self.assertIn("[PASS] Runtime directory", rendered)
            self.assertIn("[PASS] Ollama reachability", rendered)

    def test_doctor_rejects_unknown_arguments(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["doctor", "--nope"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("doctor accepts no arguments except --json", stderr.getvalue())

    def test_failed_doctor_inside_repl_does_not_exit_shell(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_func = QueueInput(["doctor", EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            with (
                pushd(temp_path),
                patch(
                    "brain.cli.doctor._probe_ollama",
                    return_value=DoctorCheckResult(
                        key="ollama_reachability",
                        label="Ollama reachability",
                        status=STATUS_FAIL,
                        message="Cannot reach Ollama at http://localhost:11434: connection refused",
                        details={"base_url": "http://localhost:11434"},
                    ),
                ),
            ):
                exit_code = main([], input_func=input_func, stdout=stdout, stderr=stderr)

            self.assertEqual(exit_code, 0)
            self.assertEqual(input_func.prompts, ["brain> ", "brain> "])
            self.assertEqual(stderr.getvalue(), "")
            self.assertIn("Doctor summary: FAIL", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
