from __future__ import annotations

import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from brain.cli.app import main
from brain.cli.commands import build_default_registry
from brain.cli.output import CommandOutput, CommandResult
from brain.cli.registry import CommandArgContract, CommandRegistry, CommandSpec
from brain.cli.session import BrainCliSession


REPO_ROOT = Path(__file__).resolve().parents[2]


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


class BrainCliReplTests(unittest.TestCase):
    def test_repl_uses_expected_prompt_and_exits_zero_on_eof(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput([EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

            self.assertEqual(exit_code, 0)
            self.assertEqual(input_func.prompts, ["brain> "])
            self.assertTrue(history_path.exists())
            self.assertEqual(stderr.getvalue(), "")

    def test_repl_parses_quoted_commands_and_preserves_session_state(self) -> None:
        registry = CommandRegistry()
        observed: list[tuple[str, str | None]] = []

        def use_handler(session: BrainCliSession, args: tuple[str, ...]) -> CommandResult:
            session.current_concept = args[0]
            observed.append(("use", session.current_concept))
            return CommandResult(output=CommandOutput(text=f"using {session.current_concept}"))

        def current_handler(session: BrainCliSession, _args: tuple[str, ...]) -> CommandResult:
            observed.append(("current", session.current_concept))
            return CommandResult(output=CommandOutput(text=f"current={session.current_concept}"))

        registry.register(
            CommandSpec(
                name=("use",),
                summary="Select concept.",
                arg_contract=CommandArgContract(synopsis="use <concept>"),
                handler=use_handler,
            )
        )
        registry.register(
            CommandSpec(
                name=("current",),
                summary="Show current concept.",
                arg_contract=CommandArgContract(synopsis="current"),
                handler=current_handler,
            )
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(['use "Operating Systems"', "current", EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()
            session = BrainCliSession()

            exit_code = main(
                [],
                registry=registry,
                session=session,
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

        self.assertEqual(exit_code, 0)
        self.assertEqual(observed, [("use", "Operating Systems"), ("current", "Operating Systems")])
        self.assertEqual(session.current_concept, "Operating Systems")
        self.assertIn("using Operating Systems", stdout.getvalue())
        self.assertIn("current=Operating Systems", stdout.getvalue())
        self.assertEqual(stderr.getvalue(), "")

    def test_repl_blank_input_and_ctrl_c_return_to_prompt(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(["   ", KeyboardInterrupt(), EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                registry=build_default_registry(),
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

        self.assertEqual(exit_code, 0)
        self.assertEqual(input_func.prompts, ["brain> ", "brain> ", "brain> "])
        self.assertEqual(stderr.getvalue(), "")
        self.assertEqual(stdout.getvalue(), "\n\n")

    def test_repl_reports_parse_errors_and_keeps_running(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(['use "Operating Systems', EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                registry=build_default_registry(),
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

        self.assertEqual(exit_code, 0)
        self.assertIn("Parse error:", stderr.getvalue())
        self.assertEqual(input_func.prompts, ["brain> ", "brain> "])

    def test_repl_reports_command_errors_and_keeps_running(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(["unknown", EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                registry=build_default_registry(),
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

        self.assertEqual(exit_code, 0)
        self.assertIn("Unknown command: unknown.", stderr.getvalue())
        self.assertEqual(input_func.prompts, ["brain> ", "brain> "])

    def test_repl_exit_command_exits_zero_and_flushes_history(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(["exit"])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                registry=build_default_registry(),
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

            self.assertEqual(exit_code, 0)
            self.assertEqual(input_func.prompts, ["brain> "])
            self.assertEqual(stdout.getvalue(), "")
            self.assertEqual(stderr.getvalue(), "")
            self.assertEqual(history_path.read_text(encoding="utf-8"), "exit\n")

    def test_repl_exit_with_extra_arguments_returns_usage_error_and_keeps_running(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            input_func = QueueInput(["exit now", EOFError()])
            stdout = io.StringIO()
            stderr = io.StringIO()

            exit_code = main(
                [],
                registry=build_default_registry(),
                input_func=input_func,
                stdout=stdout,
                stderr=stderr,
                history_path=history_path,
            )

            self.assertEqual(exit_code, 0)
            self.assertEqual(input_func.prompts, ["brain> ", "brain> "])
            self.assertEqual(stdout.getvalue(), "\n")
            self.assertIn("exit does not accept arguments. Usage: exit", stderr.getvalue())

    def test_python_m_brain_cli_opens_prompt_and_creates_history_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            history_path = Path(temp_dir) / "history.txt"
            env = os.environ.copy()
            env["BRAIN_CLI_HISTORY_PATH"] = str(history_path)

            result = subprocess.run(
                [sys.executable, "-m", "brain.cli"],
                cwd=REPO_ROOT,
                input="",
                capture_output=True,
                text=True,
                env=env,
                check=False,
            )

            self.assertEqual(result.returncode, 0)
            self.assertIn("brain> ", result.stdout)
            self.assertTrue(history_path.exists())


if __name__ == "__main__":
    unittest.main()
