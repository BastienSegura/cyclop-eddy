from __future__ import annotations

from typing import Sequence

from .errors import CommandNotImplementedError
from .output import CommandResult
from .registry import CommandArgContract, CommandRegistry, CommandSpec
from .session import BrainCliSession


def _build_placeholder_handler(command_name: str):
    def handler(_session: BrainCliSession, _args: Sequence[str]) -> CommandResult:
        raise CommandNotImplementedError(
            f"Command '{command_name}' is registered but not implemented yet."
        )

    return handler


COMMAND_DEFINITIONS = (
    ("help", "Show command help.", "help [command ...]"),
    ("exit", "Exit the brain shell.", "exit"),
    ("status", "Show shell state and key runtime artifacts.", "status [--json]"),
    ("doctor", "Run non-destructive environment checks.", "doctor [--json]"),
    ("load", "Set the active graph source.", "load <cleaned|raw|fixture|path>"),
    ("current", "Show current in-memory session state.", "current [--json]"),
    ("search", "Search concept labels in the active graph.", "search <query> [--limit <n>] [--json]"),
    ("use", "Set the current concept in session state.", "use <concept>"),
    ("show", "Show a summary for one concept.", "show [concept] [--json]"),
    ("children", "List direct children for a concept.", "children [concept] [--limit <n>] [--json]"),
    ("parents", "List direct parents for a concept.", "parents [concept] [--limit <n>] [--json]"),
    ("neighbors", "List direct parents and children together.", "neighbors [concept] [--json]"),
    ("path", "Find a directed path between two concepts.", "path <from> <to> [--json]"),
    ("prompt", "Show the learning prompt template for a concept.", "prompt [concept] [--json]"),
    (
        "generate start",
        "Start a fresh concept-generation run.",
        "generate start [--root <concept>] [--children <n>] [--depth <n>] [options]",
    ),
    (
        "generate resume",
        "Resume concept generation from checkpoint state.",
        "generate resume [--state <path>]",
    ),
    (
        "sync",
        "Clean runtime graph data and sync it to the GUI artifact.",
        "sync [--input <path>] [--cleaned-output <path>] [--gui-output <path>] [options]",
    ),
    (
        "quality report",
        "Generate a graph quality report.",
        "quality report [--input <file> ...] [--mode <auto|raw|cleaned>] [options]",
    ),
    (
        "frontier",
        "Rank under-explored areas in the active graph.",
        "frontier [--input <path>] [--target <n>] [--top <n>] [--json] [options]",
    ),
    (
        "coverage plan",
        "Preview the two-phase coverage workflow without executing it.",
        "coverage plan --roots <concept> [<concept> ...] [options]",
    ),
)


def build_default_registry() -> CommandRegistry:
    registry = CommandRegistry()

    for command_name, summary, synopsis in COMMAND_DEFINITIONS:
        registry.register(
            CommandSpec(
                name=tuple(command_name.split()),
                summary=summary,
                arg_contract=CommandArgContract(synopsis=synopsis),
                handler=_build_placeholder_handler(command_name),
            )
        )

    return registry
