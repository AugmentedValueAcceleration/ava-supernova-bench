import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retry } from '../src/retry.js';

test('returns on first success', async () => {
  let calls = 0;
  const r = await retry(async () => { calls++; return 'ok'; }, 3);
  assert.equal(r, 'ok');
  assert.equal(calls, 1);
});

test('retries until a later success', async () => {
  let calls = 0;
  const r = await retry(async () => { calls++; if (calls < 2) throw new Error('x'); return 'ok'; }, 3);
  assert.equal(r, 'ok');
  assert.equal(calls, 2);
});

test('attempts exactly `attempts` times, then throws the last error', async () => {
  let calls = 0;
  await assert.rejects(retry(async () => { calls++; throw new Error('boom'); }, 3), /boom/);
  assert.equal(calls, 3);
});
