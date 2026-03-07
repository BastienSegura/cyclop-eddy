from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import json
from typing import Any, TextIO


class OutputMode(str, Enum):
    TEXT = "text"
    JSON = "json"


@dataclass(frozen=True)
class CommandOutput:
    text: str = ""
    data: Any | None = None


@dataclass(frozen=True)
class CommandResult:
    output: CommandOutput | None = None
    exit_code: int = 0
    requests_exit: bool = False


def render_command_output(output: CommandOutput, mode: OutputMode) -> str:
    if mode == OutputMode.JSON:
        if output.data is not None:
            return json.dumps(output.data, ensure_ascii=False, indent=2)
        return json.dumps({"message": output.text}, ensure_ascii=False, indent=2)

    if output.text:
        return output.text

    if output.data is not None:
        return json.dumps(output.data, ensure_ascii=False, indent=2)

    return ""


def emit_command_result(result: CommandResult, mode: OutputMode, stream: TextIO) -> None:
    if result.output is None:
        return

    rendered = render_command_output(result.output, mode)
    if not rendered:
        return

    stream.write(rendered)
    if not rendered.endswith("\n"):
        stream.write("\n")
