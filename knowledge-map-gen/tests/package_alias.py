"""Test compatibility aliases for the renamed knowledge-map-gen package."""

from __future__ import annotations

import importlib
import sys


PACKAGE_NAME = "knowledge-map-gen"


def install_brain_alias() -> None:
    package = importlib.import_module(PACKAGE_NAME)
    sys.modules.setdefault("brain", package)


install_brain_alias()
