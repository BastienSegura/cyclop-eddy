from __future__ import annotations

import contextlib
import io
from pathlib import Path
import subprocess
import sys
import unittest

import package_alias  # noqa: F401

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

        exit_command = registry.get("exit")
        generate_start = registry.get(("generate", "start"))
        quality_report = registry.get("quality report")
        coverage_plan = registry.get(("coverage", "plan"))

        self.assertIsNotNone(exit_command)
        self.assertIsNotNone(generate_start)
        self.assertIsNotNone(quality_report)
        self.assertIsNotNone(coverage_plan)
        self.assertIn("Ctrl+D", exit_command.arg_contract.notes)
        self.assertIn("Ctrl+C", exit_command.arg_contract.notes)
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

        self.assertEqual(session.active_graph_source_path, Path("knowledge-map-gen/map-store/runtime/concept_list_cleaned.txt"))
        self.assertEqual(session.active_graph_source_alias, "cleaned")
        self.assertEqual(session.active_graph_mode, "cleaned")
        self.assertIsNone(session.parsed_graph_cache)
        self.assertIsNone(session.current_concept)
        self.assertEqual(session.output_mode, OutputMode.TEXT)

    def test_one_shot_main_still_dispatches_registered_command(self) -> None:
        result = subprocess.run(
            [sys.executable, "-m", "knowledge-map-gen.cli", "generate", "start"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("Command 'generate start' is registered but not implemented yet.", result.stderr)

    def test_main_help_lists_commands_from_registry_metadata(self) -> None:
        stdout = io.StringIO()

        exit_code = main(["help"], stdout=stdout)

        rendered = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Available commands:", rendered)
        self.assertIn("- exit: Exit the map shell.", rendered)
        self.assertIn("Usage: quality report [--input <file> ...] [--mode <auto|raw|cleaned>] [options]", rendered)

    def test_main_help_for_exact_multiword_command_uses_metadata(self) -> None:
        stdout = io.StringIO()

        exit_code = main(["help", "quality", "report"], stdout=stdout)

        rendered = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Command: quality report", rendered)
        self.assertIn("Summary: Generate a graph quality report.", rendered)
        self.assertIn("Usage: quality report [--input <file> ...] [--mode <auto|raw|cleaned>] [options]", rendered)

    def test_main_help_exit_documents_exit_vs_ctrl_d_vs_ctrl_c(self) -> None:
        stdout = io.StringIO()

        exit_code = main(["help", "exit"], stdout=stdout)

        rendered = stdout.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Command: exit", rendered)
        self.assertIn("Ctrl+D", rendered)
        self.assertIn("Ctrl+C", rendered)

    def test_main_exit_returns_zero(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()

        exit_code = main(["exit"], stdout=stdout, stderr=stderr)

        self.assertEqual(exit_code, 0)
        self.assertEqual(stdout.getvalue(), "")
        self.assertEqual(stderr.getvalue(), "")

    def test_main_returns_usage_error_for_unknown_command(self) -> None:
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            exit_code = main(["unknown"])

        self.assertEqual(exit_code, 2)
        self.assertIn("Unknown command: unknown.", stderr.getvalue())

    def test_main_returns_usage_error_for_unknown_help_topic(self) -> None:
        stderr = io.StringIO()

        exit_code = main(["help", "missing"], stderr=stderr)

        self.assertEqual(exit_code, 2)
        self.assertIn("Unknown help topic: missing", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
