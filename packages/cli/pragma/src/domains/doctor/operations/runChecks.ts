/**
 * Orchestrate all environment health checks for `pragma doctor`.
 *
 * Runs checks in parallel via Promise.allSettled and collects
 * results into a DoctorData summary (order is stable).
 *
 * @note Impure — delegates to individual check functions.
 */

import {
  checkConfigFile,
  checkKeStore,
  checkMcpConfigured,
  checkNodeVersion,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
  checkTerrazzo,
} from "./checks/index.js";
import type { CheckContext, CheckResult, DoctorData } from "./types.js";

export default async function runChecks(
  ctx: CheckContext,
): Promise<DoctorData> {
  const settled = await Promise.allSettled([
    checkNodeVersion(),
    checkPragmaVersion(),
    checkConfigFile(ctx),
    checkKeStore(ctx),
    checkShellCompletions(),
    checkTerrazzo(ctx),
    checkMcpConfigured(ctx),
    checkSkillsSymlinked(ctx),
  ]);

  const checks: CheckResult[] = settled.map((s) => {
    if (s.status === "fulfilled") return s.value;
    return { name: "unknown", status: "fail" as const, message: String(s.reason) };
  });

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;

  return { checks, passed, failed, skipped };
}
