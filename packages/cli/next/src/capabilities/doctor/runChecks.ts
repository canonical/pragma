/**
 * The `doctor` run body: orchestrate all environment health checks.
 *
 * Checks are started eagerly (they run concurrently) and collected in
 * declaration order for a deterministic report. Each is guarded so a thrown
 * check becomes an attributable `fail` rather than aborting the whole run — the
 * same discipline the old shell used. Lazily imported by `doctor.verb.ts`, so
 * neither the checks nor `@canonical/harnesses` land on the fast path.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { checkConfigFile } from "./checks/checkConfigFile.js";
import { checkKeStore } from "./checks/checkKeStore.js";
import { checkMcpCommands } from "./checks/checkMcpCommands.js";
import { checkMcpConfigured } from "./checks/checkMcpConfigured.js";
import { checkNodeVersion } from "./checks/checkNodeVersion.js";
import { checkPackageRefs } from "./checks/checkPackageRefs.js";
import { checkPragmaVersion } from "./checks/checkPragmaVersion.js";
import { checkShellCompletions } from "./checks/checkShellCompletions.js";
import { checkSkillsSymlinked } from "./checks/checkSkillsSymlinked.js";
import type { CheckResult, DoctorData, ScopeBand } from "./types.js";

/**
 * Which band each check concerns, by name. Per-project config checks (MCP,
 * skills) are project-band; the shell-completion check is global (user/machine).
 * The rest are environment checks with no band. (A simplification: an aggregate
 * MCP/skills check spans whatever harnesses were detected, but the default band
 * for the common project/both harnesses is `project`.)
 */
const CHECK_BANDS: Record<string, ScopeBand> = {
  "MCP configured": "project",
  "MCP commands": "project",
  "Skills symlinked": "project",
  "Shell completions": "global",
};

/** Attach a band tag to a check result by name, if one is defined. */
function withBand(result: CheckResult): CheckResult {
  const band = CHECK_BANDS[result.name];
  return band ? { ...result, band } : result;
}

/**
 * Each check paired with the display name used if it rejects. The fallback name
 * matches the `name` each check returns on success, so a thrown check reports
 * the same label and stays correlatable. Declaration order fixes the report
 * order.
 */
function buildChecks(
  rt: PragmaRuntime,
): readonly [string, Promise<CheckResult>][] {
  return [
    ["Node version", checkNodeVersion()],
    ["pragma version", checkPragmaVersion(rt)],
    ["pragma config", checkConfigFile(rt)],
    ["package refs", checkPackageRefs(rt)],
    ["ke store", checkKeStore(rt)],
    ["Shell completions", checkShellCompletions(rt.cwd)],
    ["MCP configured", checkMcpConfigured(rt.cwd)],
    ["MCP commands", checkMcpCommands(rt.cwd)],
    ["Skills symlinked", checkSkillsSymlinked(rt.cwd)],
  ];
}

/**
 * Run every environment health check and aggregate the results.
 *
 * @param rt - The per-invocation runtime.
 * @returns The `{ checks, passed, failed, skipped }` summary.
 * @note Impure — the checks read the fs, boot the store, and detect harnesses.
 */
export async function runChecks(rt: PragmaRuntime): Promise<DoctorData> {
  const checks: CheckResult[] = await Promise.all(
    buildChecks(rt).map(async ([name, promise]): Promise<CheckResult> => {
      try {
        return withBand(await promise);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return withBand({
          name,
          status: "fail",
          detail: `Check threw an unexpected error: ${reason}`,
          remedy:
            "Re-run `pragma doctor`; if it persists, report this as a bug.",
        });
      }
    }),
  );

  return {
    checks,
    passed: checks.filter((c) => c.status === "pass").length,
    failed: checks.filter((c) => c.status === "fail").length,
    skipped: checks.filter((c) => c.status === "skip").length,
  };
}
