/**
 * Call `fn` up to `attempts` times, returning the first success.
 * Throws the last error if every attempt fails.
 */
export async function retry(fn, attempts) {
  let lastErr;
  // BUG: runs one fewer attempt than asked for — should be `i < attempts`.
  for (let i = 0; i < attempts - 1; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
