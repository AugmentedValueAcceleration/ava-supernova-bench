# Ava Supernova — Benchmark

Public, receipted model benchmarks for the Ava Supernova fleets (Maestro,
Supernova, Aurora) and the single models behind them.

Everything here is open: the tasks, the scores, and the full **receipts** —
prompt, output, every tool call, and the grade *with its reasoning*. We publish
the losses too, including where a fleet scores below a raw model. The point
isn't a leaderboard that flatters us; it's a record anyone can audit, run weekly
so silent model degradation can't hide.

## Secret protection

This repo is public, so two layers guard it:

- **Pre-commit hook** — blocks a secret before it can be committed. Enable once
  per clone:
  ```
  git config core.hooksPath .githooks
  ```
  (needs `gitleaks` on PATH — `winget install Gitleaks.Gitleaks`)
- **CI** — `.github/workflows/secret-scan.yml` scans full history on every push.

No personal data, machine paths, or keys belong in a receipt — the runner
scrubs them before anything lands here.
