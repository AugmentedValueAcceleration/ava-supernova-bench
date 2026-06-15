# Tasks

Each task is a folder under `tasks/bench-v1/` containing a `task.json` (shape =
`Task` in [`bench/types.ts`](../bench/types.ts)) and a `workspace/` with the
starting files the model/fleet operates on.

A good task has:
- a clear **prompt** (the instruction),
- a **workspace** to act in,
- **deterministic checks** that lead the score — tests go green, a file matches,
  the right tool fired (these are the hard pass/fail anchor),
- optional **judge** criteria for the soft dimensions a check can't capture.

Real, verifiable tasks carry the most weight. `bench-v1` is frozen — adding or
changing tasks bumps the version, so the weekly time-series stays comparable.

> Workspaces must contain **no personal data, machine paths, or keys** — this
> repo is public and receipts are published verbatim (after scrubbing).
