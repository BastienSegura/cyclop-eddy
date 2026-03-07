from __future__ import annotations

import os
from pathlib import Path
import shlex
import sys
from typing import Callable, Sequence, TextIO

from .defaults import DEFAULT_HISTORY_PATH, DEFAULT_PROMPT
from .errors import BrainCliError
from .output import emit_command_result
from .registry import CommandRegistry
from .session import BrainCliSession

try:
    import readline as _readline
except ImportError:  # pragma: no cover - platform dependent fallback
    _readline = None


InputFunc = Callable[[str], str]


def _write_line(stream: TextIO, message: str) -> None:
    stream.write(message)
    if not message.endswith("\n"):
        stream.write("\n")


class HistoryManager:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or Path(os.environ.get("BRAIN_CLI_HISTORY_PATH", DEFAULT_HISTORY_PATH))
        self._fallback_entries: list[str] = []

    def load(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)

        if _readline is None:
            self._fallback_entries = self.path.read_text(encoding="utf-8").splitlines()
            return

        if hasattr(_readline, "clear_history"):
            _readline.clear_history()
        try:
            _readline.read_history_file(str(self.path))
        except FileNotFoundError:  # pragma: no cover - path is touched above
            pass
        _readline.set_history_length(1000)

    def record(self, line: str) -> None:
        if not line.strip():
            return

        if _readline is None:
            self._fallback_entries.append(line)
            return

        history_length = _readline.get_current_history_length()
        last_item = _readline.get_history_item(history_length) if history_length else None
        if last_item != line:
            _readline.add_history(line)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)

        if _readline is None:
            payload = "\n".join(self._fallback_entries)
            if payload:
                payload += "\n"
            self.path.write_text(payload, encoding="utf-8")
            return

        _readline.write_history_file(str(self.path))


class BrainRepl:
    def __init__(
        self,
        registry: CommandRegistry,
        session: BrainCliSession,
        *,
        prompt: str = DEFAULT_PROMPT,
        input_func: InputFunc | None = None,
        stdout: TextIO | None = None,
        stderr: TextIO | None = None,
        history_manager: HistoryManager | None = None,
    ) -> None:
        self.registry = registry
        self.session = session
        self.prompt = prompt
        self.input_func = input_func or input
        self.stdout = stdout or sys.stdout
        self.stderr = stderr or sys.stderr
        self.history_manager = history_manager or HistoryManager()

    def run(self) -> int:
        self.history_manager.load()

        try:
            while True:
                try:
                    raw_line = self.input_func(self.prompt)
                except KeyboardInterrupt:
                    self.stdout.write("\n")
                    continue
                except EOFError:
                    self.stdout.write("\n")
                    return 0

                if not raw_line.strip():
                    continue

                self.history_manager.record(raw_line)

                try:
                    tokens = shlex.split(raw_line)
                except ValueError as exc:
                    _write_line(self.stderr, f"Parse error: {exc}")
                    continue

                if not tokens:
                    continue

                try:
                    result = self.registry.dispatch(self.session, tokens)
                except KeyboardInterrupt:
                    self.stdout.write("\n")
                    continue
                except BrainCliError as exc:
                    _write_line(self.stderr, str(exc))
                    continue

                emit_command_result(result, self.session.output_mode, self.stdout)
                if result.requests_exit:
                    return result.exit_code
        finally:
            self.history_manager.save()

