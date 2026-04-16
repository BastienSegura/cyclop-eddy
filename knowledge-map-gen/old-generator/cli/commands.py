from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .current import handle_current
from .doctor import handle_doctor
from .errors import CommandNotImplementedError, UsageError
from .load import handle_load
from .output import CommandOutput, CommandResult
from .registry import CommandArgContract, CommandRegistry, CommandSpec
from .search import handle_search
from .session import BrainCliSession
from .status import handle_status
from .use import handle_use


def _build_placeholder_handler(command_name: str):
    def handler(_session: BrainCliSession, _args: Sequence[str]) -> CommandResult:
        raise CommandNotImplementedError(
            f"Command '{command_name}' is registered but not implemented yet."
        )

    return handler


@dataclass(frozen=True)
class CommandDefinition:
    name: str
    summary: str
    synopsis: str
    notes: str = ""


COMMAND_DEFINITIONS = (
    CommandDefinition("help", "Show command help.", "help [command ...]"),
    CommandDefinition(
        "exit",
        "Exit the map shell.",
        "exit",
        notes="Use `exit` or `Ctrl+D` to leave the shell. `Ctrl+C` cancels the current input or command and returns to the prompt.",
    ),
    CommandDefinition("status", "Show shell state and key runtime artifacts.", "status [--json]"),
    CommandDefinition("doctor", "Run non-destructive environment checks.", "doctor [--json]"),
    CommandDefinition("load", "Set the active graph source.", "load <cleaned|raw|fixture|path>"),
    CommandDefinition("current", "Show current in-memory session state.", "current [--json]"),
    CommandDefinition("search", "Search concept labels in the active graph.", "search <query> [--limit <n>] [--json]"),
    CommandDefinition(
        "use",
        "Set the current concept in session state.",
        "use <concept>",
        notes="Changes session context for later omitted-argument graph commands such as `show`, `children`, `parents`, `neighbors`, and `prompt`.",
    ),
    CommandDefinition("show", "Show a summary for one concept.", "show [concept] [--json]"),
    CommandDefinition("children", "List direct children for a concept.", "children [concept] [--limit <n>] [--json]"),
    CommandDefinition("parents", "List direct parents for a concept.", "parents [concept] [--limit <n>] [--json]"),
    CommandDefinition("neighbors", "List direct parents and children together.", "neighbors [concept] [--json]"),
    CommandDefinition("path", "Find a directed path between two concepts.", "path <from> <to> [--json]"),
    CommandDefinition("prompt", "Show the learning prompt template for a concept.", "prompt [concept] [--json]"),
    CommandDefinition(
        "generate start",
        "Start a fresh concept-generation run.",
        "generate start [--root <concept>] [--children <n>] [--depth <n>] [options]",
    ),
    CommandDefinition(
        "generate resume",
        "Resume concept generation from checkpoint state.",
        "generate resume [--state <path>]",
    ),
    CommandDefinition(
        "sync",
        "Clean runtime graph data and sync it to the app artifact.",
        "sync [--input <path>] [--cleaned-output <path>] [--gui-output <path>] [options]",
    ),
    CommandDefinition(
        "quality report",
        "Generate a graph quality report.",
        "quality report [--input <file> ...] [--mode <auto|raw|cleaned>] [options]",
    ),
    CommandDefinition(
        "frontier",
        "Rank under-explored areas in the active graph.",
        "frontier [--input <path>] [--target <n>] [--top <n>] [--json] [options]",
    ),
    CommandDefinition(
        "coverage plan",
        "Preview the two-phase coverage workflow without executing it.",
        "coverage plan --roots <concept> [<concept> ...] [options]",
    ),
)


def _render_help_index(registry: CommandRegistry) -> str:
    lines = ["Available commands:"]
    for spec in registry.list_commands():
        lines.append(f"- {spec.canonical_name}: {spec.summary}")
        lines.append(f"  Usage: {spec.arg_contract.synopsis}")
    return "\n".join(lines)


def _render_command_help(spec: CommandSpec) -> str:
    lines = [
        f"Command: {spec.canonical_name}",
        f"Summary: {spec.summary}",
        f"Usage: {spec.arg_contract.synopsis}",
    ]
    if spec.arg_contract.notes:
        lines.append(f"Notes: {spec.arg_contract.notes}")
    return "\n".join(lines)


def _build_help_handler(registry: CommandRegistry):
    def handler(_session: BrainCliSession, args: Sequence[str]) -> CommandResult:
        if not args:
            return CommandResult(output=CommandOutput(text=_render_help_index(registry)))

        spec = registry.get(args)
        if spec is None:
            raise UsageError(f"Unknown help topic: {' '.join(args)}")

        return CommandResult(output=CommandOutput(text=_render_command_help(spec)))

    return handler


def _exit_handler(_session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    if args:
        raise UsageError("exit does not accept arguments. Usage: exit")

    return CommandResult(requests_exit=True)


def build_default_registry() -> CommandRegistry:
    registry = CommandRegistry()

    for definition in COMMAND_DEFINITIONS:
        name = tuple(definition.name.split())
        handler = _build_placeholder_handler(definition.name)
        if definition.name == "help":
            handler = _build_help_handler(registry)
        elif definition.name == "exit":
            handler = _exit_handler
        elif definition.name == "doctor":
            handler = handle_doctor
        elif definition.name == "current":
            handler = handle_current
        elif definition.name == "load":
            handler = handle_load
        elif definition.name == "search":
            handler = handle_search
        elif definition.name == "status":
            handler = handle_status
        elif definition.name == "use":
            handler = handle_use

        registry.register(
            CommandSpec(
                name=name,
                summary=definition.summary,
                arg_contract=CommandArgContract(
                    synopsis=definition.synopsis,
                    notes=definition.notes,
                ),
                handler=handler,
            )
        )

    return registry
