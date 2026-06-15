# Build plan — Ava Supernova Benchmark

A weekly, public, receipted benchmark of the Ava Supernova fleets and the single
models behind them. The runner lives in the hub (operator-driven, local); this
repo is the public source of truth; the extension / IDE / website display the
results and link straight here.

## Locked decisions

- **Two repos, not branches:** this repo = benchmarks; `Ava-AugmentedValueAcceleration-Data` = datasets (later).
- **Hub is the runner.** All runs execute on the operator's machine through the
  `@ava-supernova/core` sidecar. ext/IDE/web are display-only + a link here.
- **Frozen + versioned spine.** Same tasks, same scoring, week over week,
  versioned (`bench-v1`) — so a score change inside a version is the *model*
  moving, not the bench. This is what makes degradation visible.
- **Full receipts are the product.** Every run publishes its complete trace —
  prompt, output, every tool call, tokens/cost/latency, and the grade *with its
  reasoning*. We publish losses too, including a fleet scoring below a raw model.
- **Accountability includes us.** If a provider we lean on degrades, or our own
  orchestration regresses, the same weekly run catches it, publicly.
- **Task set v1:** ~10 real, *verifiable* agentic-coding tasks, each with a hard
  pass/fail anchor. Real-world ones carry the most weight.
- **The judge is an outside model** — never one of our own fleets grading itself
  — and its reasoning is published in every receipt.

## Phases

| Phase | What we build | Done = |
|---|---|---|
| **0 · Spine** | task set v1 + scoring method (`docs/SCORING.md`) + repo skeleton (`bench/types.ts`, `tasks/`, `runs/`, `receipts/`) + re-point Bench.tsx | one task runs end-to-end by hand |
| **1 · Runner (single model)** | hub drives a run via the sidecar → full receipt → scored → leaderboard updated; + the receipt scrubber | one model benchmarked, scores land |
| **2 · Fleets** | extend the runner to the 3 modes (full orchestration) | Maestro/Supernova/Aurora scored beside the singles |
| **3 · Cadence** | dated, immutable weekly snapshots + week-over-week regression flags | a second week shows the trend / catches drift |
| **4 · Publish + display** | publish flow (hub → here) + ext/IDE/web leaderboard + GitHub button + trends | the board is live where users see it |
| **5 · Social** | Ava writes the weekly drop | a real post goes out |

## Privacy

This repo is public. No personal data, machine paths, or keys belong in a
receipt — the runner scrubs them before anything is written. Guarded by a
pre-commit gitleaks hook + secret-scan CI (see README).
