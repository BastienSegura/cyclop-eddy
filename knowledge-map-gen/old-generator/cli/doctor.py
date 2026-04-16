from __future__ import annotations

from dataclasses import dataclass
import importlib.util
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..ollama_config import HEALTHCHECK_ROUTE, resolve_ollama_base_url
from .defaults import (
    DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    DEFAULT_CHECKPOINT_STATE_PATH,
    DEFAULT_FIXTURE_GRAPH_PATH,
    DEFAULT_GUI_SYNC_TARGET_PATH,
    DEFAULT_RAW_ARTIFACT_PATH,
    DEFAULT_RUNTIME_DIR,
)
from .errors import UsageError
from .output import CommandOutput, CommandResult
from .session import BrainCliSession


@dataclass(frozen=True)
class DoctorCheckResult:
    key: str
    label: str
    status: str
    message: str
    details: dict[str, object]


@dataclass(frozen=True)
class OptionalArtifactDefinition:
    key: str
    label: str
    path: Path


OPTIONAL_ARTIFACTS = (
    OptionalArtifactDefinition("raw_artifact", "Raw artifact", DEFAULT_RAW_ARTIFACT_PATH),
    OptionalArtifactDefinition(
        "canonical_cleaned_artifact",
        "Canonical cleaned artifact",
        DEFAULT_CANONICAL_CLEANED_ARTIFACT_PATH,
    ),
    OptionalArtifactDefinition("derived_gui_target", "Derived app target", DEFAULT_GUI_SYNC_TARGET_PATH),
    OptionalArtifactDefinition("checkpoint_state_file", "Checkpoint state file", DEFAULT_CHECKPOINT_STATE_PATH),
    OptionalArtifactDefinition("fixture_fallback", "Fixture fallback", DEFAULT_FIXTURE_GRAPH_PATH),
)

STATUS_PASS = "PASS"
STATUS_WARN = "WARN"
STATUS_FAIL = "FAIL"


def _check_python_dependency(module_name: str) -> DoctorCheckResult:
    if importlib.util.find_spec(module_name) is None:
        return DoctorCheckResult(
            key=f"python_dependency_{module_name}",
            label=f"Python dependency: {module_name}",
            status=STATUS_FAIL,
            message=f"Required Python dependency '{module_name}' is not installed.",
            details={"module": module_name},
        )

    return DoctorCheckResult(
        key=f"python_dependency_{module_name}",
        label=f"Python dependency: {module_name}",
        status=STATUS_PASS,
        message=f"Required Python dependency '{module_name}' is installed.",
        details={"module": module_name},
    )


def _check_runtime_directory(runtime_dir: Path) -> DoctorCheckResult:
    created = False
    try:
        if not runtime_dir.exists():
            runtime_dir.mkdir(parents=True, exist_ok=True)
            created = True

        if not runtime_dir.is_dir():
            return DoctorCheckResult(
                key="runtime_directory",
                label="Runtime directory",
                status=STATUS_FAIL,
                message=f"{runtime_dir} exists but is not a directory.",
                details={"path": str(runtime_dir), "created": created},
            )

        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=runtime_dir, delete=True) as temp_file:
            temp_file.write("doctor\n")
            temp_file.flush()
    except OSError as exc:
        return DoctorCheckResult(
            key="runtime_directory",
            label="Runtime directory",
            status=STATUS_FAIL,
            message=f"{runtime_dir} is not writable: {exc}",
            details={"path": str(runtime_dir), "created": created, "error": str(exc)},
        )

    message = f"{runtime_dir} exists and is writable."
    if created:
        message = f"{runtime_dir} was created and is writable."

    return DoctorCheckResult(
        key="runtime_directory",
        label="Runtime directory",
        status=STATUS_PASS,
        message=message,
        details={"path": str(runtime_dir), "created": created},
    )


def _check_optional_artifact(definition: OptionalArtifactDefinition) -> DoctorCheckResult:
    if definition.path.exists():
        return DoctorCheckResult(
            key=definition.key,
            label=definition.label,
            status=STATUS_PASS,
            message=f"{definition.path} is present.",
            details={"path": str(definition.path), "exists": True},
        )

    return DoctorCheckResult(
        key=definition.key,
        label=definition.label,
        status=STATUS_WARN,
        message=f"{definition.path} is missing. This is optional until the related workflow is run.",
        details={"path": str(definition.path), "exists": False},
    )


def _probe_ollama(base_url: str, timeout_seconds: float = 2.0) -> DoctorCheckResult:
    url = f"{base_url}{HEALTHCHECK_ROUTE}"
    request = Request(url, method="GET")

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            status_code = getattr(response, "status", response.getcode())
    except HTTPError as exc:
        return DoctorCheckResult(
            key="ollama_reachability",
            label="Ollama reachability",
            status=STATUS_FAIL,
            message=f"Ollama returned HTTP {exc.code} for {url}.",
            details={"base_url": base_url, "url": url, "status_code": exc.code},
        )
    except URLError as exc:
        return DoctorCheckResult(
            key="ollama_reachability",
            label="Ollama reachability",
            status=STATUS_FAIL,
            message=f"Cannot reach Ollama at {base_url}: {exc.reason}",
            details={"base_url": base_url, "url": url, "error": str(exc.reason)},
        )

    if 200 <= status_code < 300:
        return DoctorCheckResult(
            key="ollama_reachability",
            label="Ollama reachability",
            status=STATUS_PASS,
            message=f"Ollama is reachable at {base_url}.",
            details={"base_url": base_url, "url": url, "status_code": status_code},
        )

    return DoctorCheckResult(
        key="ollama_reachability",
        label="Ollama reachability",
        status=STATUS_FAIL,
        message=f"Ollama returned unexpected HTTP {status_code} for {url}.",
        details={"base_url": base_url, "url": url, "status_code": status_code},
    )


def _compute_overall_status(checks: Sequence[DoctorCheckResult]) -> str:
    statuses = {check.status for check in checks}
    if STATUS_FAIL in statuses:
        return STATUS_FAIL
    if STATUS_WARN in statuses:
        return STATUS_WARN
    return STATUS_PASS


def run_doctor_checks() -> list[DoctorCheckResult]:
    checks = [
        _check_python_dependency("requests"),
        _check_runtime_directory(DEFAULT_RUNTIME_DIR),
    ]

    checks.extend(_check_optional_artifact(definition) for definition in OPTIONAL_ARTIFACTS)
    checks.append(_probe_ollama(resolve_ollama_base_url()))
    return checks


def build_doctor_payload() -> dict[str, object]:
    checks = run_doctor_checks()
    overall_status = _compute_overall_status(checks)

    return {
        "overall_status": overall_status,
        "checks": [
            {
                "key": check.key,
                "label": check.label,
                "status": check.status,
                "message": check.message,
                "details": check.details,
            }
            for check in checks
        ],
    }


def render_doctor_text(payload: dict[str, object]) -> str:
    lines = [f"Doctor summary: {payload['overall_status']}"]
    for check in payload["checks"]:
        lines.append(f"- [{check['status']}] {check['label']}: {check['message']}")
    return "\n".join(lines)


def handle_doctor(_session: BrainCliSession, args: Sequence[str]) -> CommandResult:
    json_only = False
    if args:
        if tuple(args) != ("--json",):
            raise UsageError("doctor accepts no arguments except --json. Usage: doctor [--json]")
        json_only = True

    payload = build_doctor_payload()
    exit_code = 1 if payload["overall_status"] == STATUS_FAIL else 0
    if json_only:
        return CommandResult(output=CommandOutput(data=payload), exit_code=exit_code)

    return CommandResult(
        output=CommandOutput(text=render_doctor_text(payload), data=payload),
        exit_code=exit_code,
    )
