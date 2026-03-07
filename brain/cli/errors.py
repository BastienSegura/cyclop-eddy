from __future__ import annotations

from typing import Sequence


class BrainCliError(Exception):
    """Base class for CLI-facing failures."""

    exit_code = 1


class UsageError(BrainCliError):
    """Raised when the user provides an invalid command or argument surface."""

    exit_code = 2


class NoCommandProvidedError(UsageError):
    """Raised when dispatch is attempted without any command tokens."""

    def __init__(self) -> None:
        super().__init__("No command provided.")


class RegistryConflictError(BrainCliError):
    """Raised when two handlers attempt to register the same command chain."""


class UnknownCommandError(UsageError):
    """Raised when a command chain cannot be resolved exactly."""

    def __init__(self, command_tokens: Sequence[str], suggestions: Sequence[str] = ()) -> None:
        self.command_tokens = tuple(command_tokens)
        self.suggestions = tuple(suggestions)
        command_text = " ".join(self.command_tokens) if self.command_tokens else "<empty>"
        message = f"Unknown command: {command_text}."
        if self.suggestions:
            message += " Available commands: " + ", ".join(self.suggestions)
        super().__init__(message)


class CommandNotImplementedError(BrainCliError):
    """Raised by placeholder handlers registered ahead of implementation."""

