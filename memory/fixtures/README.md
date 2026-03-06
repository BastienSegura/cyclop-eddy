# Memory Fixtures

Purpose:
- Preserve intentionally committed example artifacts outside the runtime output paths.

What lives here:
- Demo graph snapshots used as reference examples.
- Preserved run artifacts worth keeping in git for documentation or comparison.
- Two-phase example outputs that are intentionally versioned.

What does not live here:
- Active runtime generation outputs.
- Checkpoint state files for in-progress local runs.
- Derived GUI sync files.

Notes:
- New generation/clean/report outputs should go to `memory/runtime/` by default.
- Move artifacts into `memory/fixtures/` only when they are intentionally preserved as examples.
