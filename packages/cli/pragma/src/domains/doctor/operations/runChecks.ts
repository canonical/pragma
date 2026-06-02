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
 * Each check paired with the display name used if it rejects. The checks are
 * mutually independent, so they run concurrently; this list also fixes the
 * stable display order of the results.
 */
function buildChecks(
  ctx: CheckContext,
): readonly [string, Promise<CheckResult>][] {
  return [
    ["Node version", checkNodeVersion()],
    ["pragma version", checkPragmaVersion()],
    ["config file", checkConfigFile(ctx)],
    ["package refs", checkPackageRefs(ctx)],
    ["ke store", checkKeStore(ctx)],
    ["shell completions", checkShellCompletions()],
    ["MCP configured", checkMcpConfigured(ctx)],
    ["skills symlinked", checkSkillsSymlinked(ctx)],
  ];
}

/**
 * Orchestrate all environment health checks concurrently and return a
 * DoctorData summary with pass/fail/skip counts.
 *
 * Checks run concurrently; results are collected in declaration order so the
 * report is deterministic. A check that throws is surfaced as a fail (rather
 * than aborting `pragma doctor`), tagged with the check's name so the failure
 * remains attributable.
 *
 * @param ctx - Check context containing the working directory.
 * @returns Aggregated check results.
 * @note Impure
 */
export default async function runChecks(
  ctx: CheckContext,
): Promise<DoctorData> {
  // buildChecks starts every check eagerly, so they run concurrently; each is
  // guarded so a thrown check becomes an attributable fail rather than
  // rejecting the whole run. Mapping preserves declaration order.
  const checks: CheckResult[] = await Promise.all(
    buildChecks(ctx).map(async ([name, promise]): Promise<CheckResult> => {
      try {
        return await promise;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return {
          name,
          status: "fail",
          detail: `Check threw an unexpected error: ${reason}`,
          remedy:
            "Re-run `pragma doctor`; if it persists, report this as a bug.",
        };
      }
    }),
  );

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;

  return { checks, passed, failed, skipped };
}
