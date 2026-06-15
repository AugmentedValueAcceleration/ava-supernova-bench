// Bench runner — runs ONE task through a single model OR a fleet mode, headless,
// in a throwaway copy of the task workspace, then scores it with the
// deterministic check-harness and writes a (scrubbed) receipt.
//
// Keys come from the environment ONLY (never committed). Load them e.g.:
//   node --env-file=.env.local runner/run.mjs --task 001-fix-retry-count --model qwen:qwen3.5-flash
// Fleets: --model auto | supernova | aurora
import { ProviderRegistry, ToolRegistry, Agent, AutoCoordinator, buildSystemPrompt } from '@ava-supernova/core';
import { readFileSync, cpSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runChecks } from './check-task.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');

const ENV_TO_PROVIDER = {
  QWEN_API_KEY: 'qwen',
  DEEPSEEK_API_KEY: 'deepseek',
  MISTRAL_API_KEY: 'mistral',
  KIMI_API_KEY: 'kimi',
  MINIMAX_API_KEY: 'minimax',
  ZHIPU_API_KEY: 'zhipu',
  ANTHROPIC_API_KEY: 'anthropic',
};
const FLEETS = new Set(['auto', 'supernova', 'aurora']);

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

function buildRegistry() {
  const reg = new ProviderRegistry();
  const active = [];
  for (const [env, name] of Object.entries(ENV_TO_PROVIDER)) {
    const apiKey = process.env[env];
    if (!apiKey) continue;
    try { reg.register(name, { apiKey }); active.push(name); } catch { /* not implemented in core */ }
  }
  return { reg, active };
}

const HOME = homedir();
/** Every form a path can take in the text — raw, forward-slash, JSON-escaped. */
function pathVariants(p) {
  return [...new Set([p, p.replace(/\\/g, '/'), p.replace(/\\/g, '\\\\')])];
}
/** Strip anything machine-specific (the throwaway workspace path, the user's home
 *  dir) from text bound for a PUBLIC receipt — in every separator/escaping form. */
function scrub(text, tmp) {
  if (typeof text !== 'string') text = JSON.stringify(text ?? '');
  for (const v of pathVariants(tmp)) text = text.split(v).join('<workspace>');
  for (const v of pathVariants(HOME)) text = text.split(v).join('<home>');
  return text;
}

export async function runTask(taskId, modelSpec) {
  const taskDir = join(REPO, 'tasks', 'bench-v1', taskId);
  const task = JSON.parse(readFileSync(join(taskDir, 'task.json'), 'utf8'));
  const srcWorkspace = join(REPO, task.workspace);

  const tmp = mkdtempSync(join(tmpdir(), 'bench-'));
  cpSync(srcWorkspace, tmp, { recursive: true });

  const { reg, active } = buildRegistry();
  const toolRegistry = new ToolRegistry();
  toolRegistry.registerBuiltins();
  if (toolRegistry.setPermissionMode) toolRegistry.setPermissionMode('autonomous');
  if (toolRegistry.setConfirmationHandler) toolRegistry.setConfirmationHandler(async () => true);

  const toolCalls = [];
  let usage = null, cost = 0, finalText = '';
  const onEvent = (e) => {
    if (!e || !e.type) return;
    if (e.type === 'tool_call_end') {
      let args = e.toolCall?.function?.arguments;
      try { args = typeof args === 'string' ? JSON.parse(args) : args; } catch { /* keep raw */ }
      toolCalls.push({ name: e.toolCall?.function?.name ?? 'tool', args, ok: !!e.success });
    } else if (e.type === 'usage') {
      usage = e.usage ?? usage;
      if (typeof e.cost === 'number') cost = e.cost;
    } else if (e.type === 'done') {
      const c = e.finalMessage?.content;
      finalText = typeof c === 'string' ? c : finalText;
    }
  };

  const messages = [
    { role: 'system', content: buildSystemPrompt({ cwd: tmp, platform: process.platform, shell: process.env.SHELL || 'bash' }) },
    { role: 'user', content: task.prompt },
  ];

  const isFleet = FLEETS.has(modelSpec);
  const start = Date.now();
  try {
    if (isFleet) {
      const coord = AutoCoordinator.create({
        providerRegistry: reg, toolRegistry, cwd: tmp, sharedState: {},
        availableProviders: new Set(active), mode: modelSpec,
      });
      if (!coord) throw new Error(`could not create coordinator for fleet "${modelSpec}"`);
      await coord.run(messages, onEvent);
    } else {
      const resolved = reg.resolveModel(modelSpec);
      if (!resolved) throw new Error(`model not available: "${modelSpec}" (active providers: ${active.join(', ') || 'none'})`);
      const agent = new Agent({ provider: resolved.provider, model: resolved.model, toolRegistry, cwd: tmp, surface: 'cli' });
      await agent.run(messages, onEvent);
    }
  } finally {
    // checks run against the (possibly-modified) workspace before cleanup
  }
  const latency_s = +((Date.now() - start) / 1000).toFixed(1);

  const checkResults = runChecks(task, tmp, { toolCalls });
  const anchorChecks = checkResults.filter(r => r.check.kind !== 'tool_called');
  const passed = anchorChecks.length > 0 && anchorChecks.every(r => r.passed);

  const rawReceipt = {
    task_id: task.id,
    bench_version: task.bench_version,
    entry_kind: isFleet ? 'mode' : 'model',
    subject_id: modelSpec,
    prompt: task.prompt,
    output: finalText.slice(0, 8000),
    tool_calls: toolCalls.map(tc => ({ name: tc.name, args: tc.args, ok: tc.ok })),
    checks: checkResults.map(r => ({ kind: r.check.kind, category: r.check.category, passed: r.passed, detail: r.detail })),
    passed,
    credits: cost,
    latency_s,
    tokens: usage ? { input: usage.prompt_tokens ?? usage.input ?? 0, output: usage.completion_tokens ?? usage.output ?? 0 } : null,
  };

  rmSync(tmp, { recursive: true, force: true });
  // Scrub the ENTIRE receipt in one pass before it can be published.
  return JSON.parse(scrub(JSON.stringify(rawReceipt), tmp));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const taskId = arg('task');
  const modelSpec = arg('model');
  if (!taskId || !modelSpec) {
    console.error('usage: node --env-file=.env.local runner/run.mjs --task <id> --model <provider:model | auto|supernova|aurora>');
    process.exit(2);
  }
  runTask(taskId, modelSpec)
    .then((receipt) => {
      // Receipts are FILES (the published, dated record) — keeps them off stdout
      // (which core logs to) and is the format the leaderboard aggregates later.
      const date = new Date().toISOString().slice(0, 10);
      const safe = modelSpec.replace(/[^a-z0-9.\-]/gi, '_');
      const outDir = join(REPO, 'runs', date, 'receipts');
      mkdirSync(outDir, { recursive: true });
      const outFile = join(outDir, `${taskId}__${safe}.json`);
      writeFileSync(outFile, JSON.stringify(receipt, null, 2));
      const rel = outFile.slice(REPO.length + 1).replace(/\\/g, '/');
      console.log(`${receipt.passed ? 'PASSED' : 'FAILED'}  ${receipt.subject_id} on ${receipt.task_id}  —  ${receipt.tool_calls.length} tools, ${receipt.latency_s}s, ${receipt.credits} cr`);
      console.log(`receipt: ${rel}`);
    })
    .catch((err) => { console.error('runner error:', err?.stack || err); process.exit(1); });
}
