/**
 * Orchestrate all environment health checks for `pragma doctor`.
 *
 * Runs checks sequentially (order matters for display) and collects
 * results into a DoctorData summary.
 *
 * @note Impure — delegates to individual check functions.
 * @see IN.07 in B.11.INSTALL
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
} from "./checks.js";
import type { CheckContext, CheckResult, DoctorData } from "./types.js";

export default async function runChecks(
  ctx: CheckContext,
): Promise<DoctorData> {
  const checks: CheckResult[] = [];

  checks.push(await checkNodeVersion());
  checks.push(await checkPragmaVersion());
  checks.push(await checkConfigFile(ctx));
  checks.push(await checkKeStore(ctx));
  checks.push(await checkShellCompletions());
  checks.push(await checkTerrazzo(ctx));
  checks.push(await checkMcpConfigured(ctx));
  checks.push(await checkSkillsSymlinked(ctx));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;

  return { checks, passed, failed, skipped };
}
