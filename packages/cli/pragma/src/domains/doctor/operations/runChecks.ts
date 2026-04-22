import {
  checkConfigFile,
  checkKeStore,
  checkMcpConfigured,
  checkNodeVersion,
  checkPackageRefs,
  checkPragmaVersion,
  checkShellCompletions,
  checkSkillsSymlinked,
} from "./checks/index.js";
import type { CheckContext, CheckResult, DoctorData } from "./types.js";

/**
 * Orchestrate all environment health checks sequentially and return
 * a DoctorData summary with pass/fail/skip counts.
 *
 * @param ctx - Check context containing the working directory.
 * @returns Aggregated check results.
 * @note Impure
 */
export default async function runChecks(
  ctx: CheckContext,
): Promise<DoctorData> {
  const checks: CheckResult[] = [];

  checks.push(await checkNodeVersion());
  checks.push(await checkPragmaVersion());
  checks.push(await checkConfigFile(ctx));
  checks.push(await checkPackageRefs(ctx));
  checks.push(await checkKeStore(ctx));
  checks.push(await checkShellCompletions());
  checks.push(await checkMcpConfigured(ctx));
  checks.push(await checkSkillsSymlinked(ctx));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;

  return { checks, passed, failed, skipped };
}
