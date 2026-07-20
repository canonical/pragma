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
 * The band a check statically concerns, by name — for checks whose band is
 * fixed by construction: skills always symlink into the per-repo project dir
 * (`skillsPath` is project-rooted), and completions install into the user/home
 * shell dir. The MCP checks are NOT here: they detect harnesses across BOTH
 * bands, so each derives its own band from what it found (see `deriveBand`) and
 * sets it on its own result — {@link attachBand} preserves that.
 */
const CHECK_BANDS: Record<string, ScopeBand> = {
  "Skills symlinked": "project",
  "Shell completions": "global",
};

/**
 * Attach a band tag to a check result. A check that already set its own band
 * (the harness-derived MCP checks) keeps it; otherwise the static
 * {@link CHECK_BANDS} map fills one in by name, if defined.
 */
function attachBand(result: CheckResult): CheckResult {
  if (result.band !== undefined) return result;
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
        return attachBand(await promise);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return attachBand({
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
