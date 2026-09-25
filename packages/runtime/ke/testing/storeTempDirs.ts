import { rmSync } from "node:fs";

// Every temp dir createTestStore hands out. Removed at process exit so a
// caller that forgets cleanup() cannot leak; untracking drops a dir the
// caller has already dealt with.
const createdDirs = new Set<string>();

/** Track a temp dir so a caller that never cleans it up cannot leak it. */
export function trackTestStoreDir(dir: string): void {
  createdDirs.add(dir);
}

/** Stop tracking a dir the caller has already removed or is removing. */
export function untrackTestStoreDir(dir: string): void {
  createdDirs.delete(dir);
}

/**
 * Remove every temp dir this module has handed out and clear the set.
 *
 * Registered as a process-exit hook, so a caller that forgets `cleanup()`
 * cannot leak its dir; also exported so a process that manages its own
 * lifecycle (or a test) can drain the set on demand.
 *
 * @note Impure — removes directories from the filesystem.
 */
export function removeTestStoreDirs(): void {
  for (const dir of createdDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort — a caller's cleanup() may have raced us to it.
    }
  }
  createdDirs.clear();
}

process.on("exit", removeTestStoreDirs);
