import { collectStoreSummary } from "../../../info/operations/index.js";
import { bootStore } from "../../../shared/bootStore.js";
import type { CheckContext, CheckResult } from "../types.js";

/**
 * Check that the ke store boots successfully, reporting triple count
 * and boot time.
 *
 * @param ctx - Check context with the working directory.
 * @returns A CheckResult indicating pass (with triple count) or fail.
 * @note Impure
 */
export default async function checkKeStore(
  ctx: CheckContext,
): Promise<CheckResult> {
  const start = performance.now();
  let result: Awaited<ReturnType<typeof bootStore>> | undefined;
  try {
    result = await bootStore({ cwd: ctx.cwd });
    const summary = await collectStoreSummary(result.store);
    const elapsed = Math.round(performance.now() - start);
    return {
      name: "ke store",
      status: "pass",
      detail: `${summary.tripleCount.toLocaleString()} triples in ${elapsed}ms`,
    };
  } catch {
    return {
      name: "ke store",
      status: "fail",
      detail: "failed to boot",
      remedy:
        "Ensure design system packages are installed: bun add -D @canonical/ds-global @canonical/code-standards",
    };
  } finally {
    result?.store.dispose();
  }
}
