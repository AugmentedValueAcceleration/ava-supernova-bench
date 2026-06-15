# Scoring methodology (`bench-v1`)

The whole point of a public benchmark is that you can check our work. So the
scoring is written to survive an audit: deterministic wherever possible, a
single neutral judge where it can't be, and every grade shipped with its
reasoning in the receipt.

## The six categories

| Category | What it measures | How it's graded |
|---|---|---|
| `tool_reliability` | picks + calls the right tool with valid args | **deterministic** — assert the expected tool calls happened |
| `edit_precision` | changes what was asked, breaks nothing else | **deterministic** — diff scope + the task's test suite stays green |
| `multi_step_coherence` | holds a multi-step plan to completion | **deterministic anchor** (final state correct) + judge on the path |
| `instruction_adherence` | does what was asked, honours constraints | **judge** against the task's explicit constraints |
| `cost_per_success` | credits spent per *passed* task | **measured** — real credits ÷ pass |
| `latency` | wall-clock to completion | **measured** — median seconds |

## Rules that make it credible

1. **Deterministic anchors lead.** A task passes or fails on a hard check —
   tests go green, the diff matches, the right tool fired. The judge never
   overrides a deterministic result; it only scores the soft dimensions a check
   can't capture.
2. **The judge is an outside model — never one of our fleets.** Nothing here
   grades itself. The judge id is disclosed, fixed for the version, and its full
   reasoning is written into every receipt so anyone can disagree with it.
3. **Frozen + versioned.** Tasks and scoring are fixed for `bench-v1`. Any change
   to either bumps the version. Within a version, a score that moves means the
   *model* moved — that's how silent degradation shows up.
4. **Single models and fleets are scored on the same tasks but ranked in
   separate tables.** A fleet (Maestro / Supernova / Aurora) runs the full
   orchestration; it's expected to buy quality with more cost + latency, so it's
   never ranked head-to-head against a raw model — both numbers are shown.
5. **Every score carries cost, latency, and sample size.** No naked scores.
6. **We publish losses.** Including a fleet scoring below a single model. The
   record is the point, not the ranking.

## Cadence

Run weekly. Each run is a dated, immutable snapshot under `runs/YYYY-MM-DD/`
(leaderboard + receipts). Week-over-week, a model dropping beyond a set threshold
versus its own trailing average is flagged as a regression — publicly.
