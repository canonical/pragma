import { mkdirSync, rmdirSync, statSync } from "node:fs";

/**
 * Minimal advisory lock so concurrent `implementation-ledger collect` runs
 * (e.g. lerna building several packages in parallel) serialize their
 * read-append-write cycle instead of clobbering each other.
 *
 * Uses atomic `mkdir` as the lock primitive. A lock older than
 * `staleMs` is considered abandoned (crashed process) and is stolen.
 */
export async function withFileLock<T>(
  targetPath: string,
  fn: () => Promise<T>,
  { timeoutMs = 30_000, staleMs = 60_000, pollMs = 100 } = {},
): Promise<T> {
  const lockPath = `${targetPath}.lock`;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      mkdirSync(lockPath, { recursive: false });
      break;
    } catch {
      try {
        const age = Date.now() - statSync(lockPath).mtimeMs;
        if (age > staleMs) {
          rmdirSync(lockPath);
          continue;
        }
      } catch {
        // Lock vanished between attempts; retry immediately.
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `timed out waiting for ledger lock at ${lockPath}; ` +
            "remove it manually if no other collect is running",
        );
      }
      await new Promise((resolvePoll) => setTimeout(resolvePoll, pollMs));
    }
  }

  try {
    return await fn();
  } finally {
    try {
      rmdirSync(lockPath);
    } catch {
      // Already removed (stolen as stale); nothing to clean up.
    }
  }
}
