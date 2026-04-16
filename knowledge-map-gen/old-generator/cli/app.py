from __future__ import annotations

from pathlib import Path
from typing import Sequence, TextIO
import sys

from .commands import build_default_registry
from .errors import BrainCliError
from .output import emit_command_result
from .registry import CommandRegistry
from .repl import BrainRepl, HistoryManager
from .session import BrainCliSession


def _write_line(stream: TextIO, message: str) -> None:
    stream.write(message)
    if not message.endswith("\n"):
        stream.write("\n")


def _dispatch_once(
    registry: CommandRegistry,
    session: BrainCliSession,
    tokens: Sequence[str],
    *,
    stdout: TextIO,
    stderr: TextIO,
) -> int:
    try:
        result = registry.dispatch(session, tokens)
    except BrainCliError as exc:
        _write_line(stderr, str(exc))
        return exc.exit_code

    emit_command_result(result, session.output_mode, stdout)
    return result.exit_code


def main(
    argv: Sequence[str] | None = None,
    *,
    registry: CommandRegistry | None = None,
    session: BrainCliSession | None = None,
    input_func=None,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
    history_path: Path | None = None,
) -> int:
    tokens = list(sys.argv[1:] if argv is None else argv)
    effective_registry = registry or build_default_registry()
    effective_session = session or BrainCliSession()
    effective_stdout = stdout or sys.stdout
    effective_stderr = stderr or sys.stderr

    if not tokens:
        repl = BrainRepl(
            effective_registry,
            effective_session,
            input_func=input_func,
            stdout=effective_stdout,
            stderr=effective_stderr,
            history_manager=None if history_path is None else HistoryManager(history_path),
        )
        return repl.run()

    return _dispatch_once(
        effective_registry,
        effective_session,
        tokens,
        stdout=effective_stdout,
        stderr=effective_stderr,
    )
