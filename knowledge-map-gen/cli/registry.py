from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Protocol, Sequence

from .errors import NoCommandProvidedError, RegistryConflictError, UnknownCommandError
from .output import CommandResult
from .session import BrainCliSession

CommandName = tuple[str, ...]


class CommandHandler(Protocol):
    def __call__(self, session: BrainCliSession, args: Sequence[str]) -> CommandResult: ...


@dataclass(frozen=True)
class CommandArgContract:
    synopsis: str
    options: tuple[str, ...] = ()
    notes: str = ""


@dataclass(frozen=True)
class CommandSpec:
    name: CommandName
    summary: str
    arg_contract: CommandArgContract
    handler: CommandHandler

    @property
    def canonical_name(self) -> str:
        return " ".join(self.name)


@dataclass(frozen=True)
class ResolvedCommand:
    spec: CommandSpec
    args: tuple[str, ...]


def normalize_command_name(value: str | Sequence[str]) -> CommandName:
    if isinstance(value, str):
        parts = tuple(part for part in value.strip().split() if part)
    else:
        parts = tuple(str(part).strip() for part in value if str(part).strip())

    if not parts:
        raise ValueError("command name must contain at least one token")

    return tuple(part.lower() for part in parts)


class CommandRegistry:
    def __init__(self) -> None:
        self._commands: dict[CommandName, CommandSpec] = {}

    def register(self, spec: CommandSpec) -> CommandSpec:
        normalized_name = normalize_command_name(spec.name)
        normalized_spec = spec if normalized_name == spec.name else replace(spec, name=normalized_name)

        if normalized_name in self._commands:
            raise RegistryConflictError(f"Command already registered: {normalized_spec.canonical_name}")

        self._commands[normalized_name] = normalized_spec
        return normalized_spec

    def list_commands(self) -> tuple[CommandSpec, ...]:
        return tuple(self._commands[name] for name in sorted(self._commands))

    def get(self, name: str | Sequence[str]) -> CommandSpec | None:
        return self._commands.get(normalize_command_name(name))

    def resolve(self, tokens: Sequence[str]) -> ResolvedCommand:
        raw_tokens = tuple(token for token in tokens if token)
        if not raw_tokens:
            raise NoCommandProvidedError()

        normalized_tokens = tuple(token.lower() for token in raw_tokens)
        for length in range(len(normalized_tokens), 0, -1):
            candidate = normalized_tokens[:length]
            spec = self._commands.get(candidate)
            if spec is not None:
                return ResolvedCommand(spec=spec, args=raw_tokens[length:])

        raise UnknownCommandError(raw_tokens, self._suggestions_for(normalized_tokens))

    def dispatch(self, session: BrainCliSession, tokens: Sequence[str]) -> CommandResult:
        resolved = self.resolve(tokens)
        return resolved.spec.handler(session, resolved.args)

    def _suggestions_for(self, tokens: Sequence[str]) -> tuple[str, ...]:
        if not tokens:
            return tuple(spec.canonical_name for spec in self.list_commands())

        for length in range(len(tokens), 0, -1):
            prefix = tuple(tokens[:length])
            matches = sorted(
                spec.canonical_name
                for name, spec in self._commands.items()
                if name[:length] == prefix
            )
            if matches:
                return tuple(matches)

        return tuple(spec.canonical_name for spec in self.list_commands())
