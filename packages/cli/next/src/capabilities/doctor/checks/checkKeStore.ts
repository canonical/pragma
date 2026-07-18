import { entityTotal } from "../../../kernel/completion/entitySource.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { CheckResult } from "../types.js";

/**
 * Check that the ke store boots, reporting the entity total and boot time.
 *
 * This is the ONE check that touches the store — it boots the shared lazy store
 * inside a try/catch, so doctor stays storeless-by-default at the dispatch level
 * (the verb declares `needsStore: false`; only this check pays the boot, only
 * when reached). On success it reads the entity total from the session's
 * storeless index rather than a fresh triple COUNT — cheaper, and the store is
 * already booted.
 *
 * @param rt - The per-invocation runtime.
 * @returns A CheckResult: pass with the entity total, or fail with a remedy.
 * @note Impure — boots the store.
 */
export async function checkKeStore(rt: PragmaRuntime): Promise<CheckResult> {
  const start = performance.now();
  try {
    const session = await rt.store.get();
    const total = entityTotal(session.index);
    const elapsed = Math.round(performance.now() - start);
    return {
      name: "ke store",
      status: "pass",
      detail: `${total.toLocaleString()} entities in ${elapsed}ms`,
    };
  } catch {
    return {
      name: "ke store",
      status: "fail",
      detail: "failed to boot",
      remedy:
        "Ensure design-system packages are installed and run `pragma sources update`.",
    };
  }
}
