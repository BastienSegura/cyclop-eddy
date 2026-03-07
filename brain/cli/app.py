from __future__ import annotations

from typing import Sequence, TextIO
import sys

from .commands import build_default_registry
from .errors import BrainCliError
from .output import emit_command_result
from .session import BrainCliSession


def _write_line(stream: TextIO, message: str) -> None:
    stream.write(message)
    if not message.endswith("\n"):
        stream.write("\n")


def _render_no_command_message(command_names: Sequence[str]) -> str:
    lines = [
        "Brain CLI foundation is installed.",
        "Interactive shell support is not available yet.",
        "Registered commands:",
    ]
    lines.extend(f"- {command_name}" for command_name in command_names)
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    tokens = list(sys.argv[1:] if argv is None else argv)
    registry = build_default_registry()
    session = BrainCliSession()

    if not tokens:
        message = _render_no_command_message([spec.canonical_name for spec in registry.list_commands()])
        _write_line(sys.stdout, message)
        return 0

    try:
        result = registry.dispatch(session, tokens)
    except BrainCliError as exc:
        _write_line(sys.stderr, str(exc))
        return exc.exit_code

    emit_command_result(result, session.output_mode, sys.stdout)
    return result.exit_code
