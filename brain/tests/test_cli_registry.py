from __future__ import annotations

import contextlib
import io
from pathlib import Path
import subprocess
import sys
import unittest

from brain.cli.app import main
from brain.cli.commands import build_default_registry
from brain.cli.errors import UnknownCommandError
from brain.cli.output import CommandOutput, CommandResult, OutputMode
from brain.cli.registry import CommandArgContract, CommandRegistry, CommandSpec
from brain.cli.session import BrainCliSession


REPO_ROOT = Path(__file__).resolve().parents[2]


class BrainCliRegistryTests(unittest.TestCase):
    def test_default_registry_exposes_multiword_command_metadata(self) -> None:
        registry = build_default_registry()

        generate_start = registry.get(("generate", "start"))
        quality_report = registry.get("quality report")
        coverage_plan = registry.get(("coverage", "plan"))

        self.assertIsNotNone(generate_start)
        self.assertIsNotNone(quality_report)
        self.assertIsNotNone(coverage_plan)
        self.assertEqual(generate_start.canonical_name, "generate start")
        self.assertEqual(quality_report.arg_contract.synopsis, "quality report [--input <file> ...] [--mode <auto|raw|cleaned>] [options]")
        self.assertEqual(coverage_plan.summary, "Preview the two-phase coverage workflow without executing it.")
        self.assertTrue(callable(generate_start.handler))

    def test_registry_dispatch_resolves_longest_matching_command_chain(self) -> None:
        registry = CommandRegistry()
        seen: dict[str, tuple[str, ...]] = {}

        def handler(_session: BrainCliSession, args: tuple[str, ...]) -> CommandResult:
            seen["args"] = args
            return CommandResult(output=CommandOutput(text="ok"))

        registry.register(
            CommandSpec(
                name=("generate", "start"),
                summary="Test command.",
                arg_contract=CommandArgContract(synopsis="generate start [options]"),
                handler=handler,
            )
        )

        result = registry.dispatch(BrainCliSession(), ["generate", "start", "--root", "Computer Science"])

        self.assertEqual(seen["args"], ("--root", "Computer Science"))
        self.assertEqual(result.output.text, "ok")

    def test_unknown_command_reports_available_multiword_matches(self) -> None:
        registry = build_default_registry()

        with self.assertRaisesRegex(UnknownCommandError, "generate resume, generate start"):
            registry.resolve(["generate"])

    def test_session_defaults_match_story_contract(self) -> None:
        session = BrainCliSession()

        self.assertEqual(session.active_graph_source_path, Path("memory/runtime/concept_list_cleaned.txt"))
        self.assertEqual(session.active_graph_source_alias, "cleaned")
        self.assertEqual(session.active_graph_mode, "cleaned")
        self.assertIsNone(session.parsed_graph_cache)
        self.assertIsNone(session.current_concept)
        self.assertEqual(session.output_mode, OutputMode.TEXT)

    def test_main_without_args_imports_and_exits_zero(self) -> None:
        result = subprocess.run(
            [sys.executable, "-m", "brain.cli"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("Brain CLI foundation is installed.", result.stdout)
        self.assertIn("Registered commands:", result.stdout)

    def test_main_returns_usage_error_for_unknown_command(self) -> None:
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            exit_code = main(["unknown"])

        self.assertEqual(exit_code, 2)
        self.assertIn("Unknown command: unknown.", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
