// Shared bench types — the public contract between the runner (hub), the
// receipts/leaderboard in this repo, and the display in extension/IDE/web.
// The hub's Bench.tsx mirrors these; keep them in sync (or import this file).

export type Category =
  | 'tool_reliability'
  | 'edit_precision'
  | 'multi_step_coherence'
  | 'instruction_adherence'
  | 'cost_per_success'
  | 'latency';

export const CATEGORIES: Category[] = [
  'tool_reliability', 'edit_precision', 'multi_step_coherence',
  'instruction_adherence', 'cost_per_success', 'latency',
];

// ── Tasks (the frozen, versioned input) ──────────────────────────────────────

/** A deterministic check — the hard anchor a task passes or fails on. */
export type Check =
  // Run a command in the task workspace; pass if exit code matches (default 0).
  | { kind: 'command'; run: string; expect_exit?: number; category: Category }
  // Assert a file exists and (optionally) matches a regex.
  | { kind: 'file'; path: string; matches?: string; category: Category }
  // Assert the agent called a tool (optionally with args matching a regex).
  | { kind: 'tool_called'; tool: string; args_match?: string; category: Category };

/** A soft dimension scored by the neutral judge, not a hard check. */
export interface JudgeCriterion {
  category: Category;
  /** What the judge evaluates, in plain language. */
  rubric: string;
  /** Weight within the task's judge score (defaults to equal). */
  weight?: number;
}

export interface Task {
  id: string;                 // e.g. "001-fix-react-state-bug"
  bench_version: string;      // e.g. "bench-v1" — frozen with the scoring
  title: string;
  description: string;
  /** Categories this task contributes to. */
  categories: Category[];
  /** Relative path (in this repo) to the starting workspace / fixtures. */
  workspace: string;
  /** The instruction handed to the model / fleet. */
  prompt: string;
  /** Hard, deterministic checks — these lead the score. */
  checks: Check[];
  /** Soft dimensions for the neutral judge (optional). */
  judge?: JudgeCriterion[];
  /** Optional reference solution, for the judge's context. */
  reference?: string;
}

// ── Receipts (the published trace of a single run) ───────────────────────────

export interface ToolCallTrace {
  name: string;
  args: unknown;            // SCRUBBED before publish — no paths/keys/PII
  ok: boolean;
}

export interface CheckResult { check: Check; passed: boolean; detail?: string }

export interface CategoryGrade {
  category: Category;
  score: number;            // 0–100
  source: 'deterministic' | 'judge' | 'measured';
  reasoning?: string;       // judge's reasoning, published verbatim
}

export interface Receipt {
  task_id: string;
  bench_version: string;
  entry_kind: 'model' | 'mode';
  subject_id: string;       // model id, or mode (maestro/supernova/aurora)
  run_date: string;         // YYYY-MM-DD (the weekly snapshot)
  prompt: string;
  output: string;           // SCRUBBED
  tool_calls: ToolCallTrace[];
  checks: CheckResult[];
  grades: CategoryGrade[];
  passed: boolean;          // overall pass (deterministic anchors)
  credits: number;
  latency_s: number;
  judge_id?: string;        // the outside judge model, disclosed
}

// ── Leaderboard (the aggregate the apps fetch) ───────────────────────────────
// Mirrors the v2 shape Bench.tsx already renders.

export interface ModelScores {
  model_id: string;
  provider: string;
  display_name: string;
  overall_pass_rate: number;
  scores: Partial<Record<Category, { score: number; sample_size: number }>>;
  summary: string;
  entry_kind?: 'model' | 'mode';
  model_released?: string;
  constituent_models?: string[];
  cost_credits_per_task?: number;
  median_latency_s?: number;
  overall_sample_size?: number;
  receipts_url?: string;
}

export interface Leaderboard {
  generated_at: string;
  bench_version: string;
  categories: Category[];
  models: ModelScores[];
  total_runs: number;
}
