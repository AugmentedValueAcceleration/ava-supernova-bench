// Deterministic check-harness — the hard anchor of the score.
// Runs a task's `checks` against a workspace and reports per-check pass/fail.
// The model-execution half of the runner (Phase 1, next) feeds in the tool-call
// trace so `tool_called` checks can be evaluated; run standalone it scores the
// `command` and `file` checks (which don't need a model).
//
// CLI:  node runner/check-task.mjs <task.json> <workspaceDir>
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @returns {{check:object, passed:boolean, detail:string}[]} */
export function runChecks(task, workspaceDir, opts = {}) {
  const toolCalls = opts.toolCalls || [];
  const results = [];

  for (const check of task.checks) {
    let passed = false;
    let detail = '';

    if (check.kind === 'command') {
      const want = check.expect_exit ?? 0;
      try {
        execSync(check.run, { cwd: workspaceDir, stdio: 'pipe', timeout: 120_000 });
        passed = want === 0;
        detail = 'exit 0';
      } catch (e) {
        const code = typeof e.status === 'number' ? e.status : 1;
        passed = code === want;
        detail = `exit ${code}`;
      }
    } else if (check.kind === 'file') {
      try {
        const content = readFileSync(join(workspaceDir, check.path), 'utf8');
        passed = check.matches ? new RegExp(check.matches).test(content) : true;
        detail = passed ? 'matched' : 'no match';
      } catch {
        passed = false;
        detail = 'file missing';
      }
    } else if (check.kind === 'tool_called') {
      passed = toolCalls.some(
        tc => tc.name === check.tool &&
          (!check.args_match || new RegExp(check.args_match).test(JSON.stringify(tc.args ?? '')))
      );
      detail = passed ? 'tool called' : (toolCalls.length ? 'tool not called' : 'no trace (standalone)');
    } else {
      detail = `unknown check kind: ${check.kind}`;
    }

    results.push({ check, passed, detail });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , taskPath, workspaceDir] = process.argv;
  if (!taskPath || !workspaceDir) {
    console.error('usage: node runner/check-task.mjs <task.json> <workspaceDir>');
    process.exit(2);
  }
  const task = JSON.parse(readFileSync(taskPath, 'utf8'));
  const results = runChecks(task, workspaceDir);
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.check.kind.padEnd(12)} [${r.check.category}]  ${r.detail}`);
  }
  // Standalone: tool_called checks can't be judged without a run trace.
  const scored = results.filter(r => r.check.kind !== 'tool_called');
  console.log(`\nDeterministic (excl. tool_called): ${scored.filter(r => r.passed).length}/${scored.length} passed`);
}
