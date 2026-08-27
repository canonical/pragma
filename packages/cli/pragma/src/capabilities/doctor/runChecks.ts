/**
 * The `doctor` run body: the unbanded environment checks plus the banded rows
 * the setup target table derives.
 *
 * Two kinds of finding live in one report and they are not the same kind. The
 * ENVIRONMENT checks — the Node version, this CLI's own version, pack refs, the
 * store — diagnose things `setup` cannot install; they carry no band and stay
 * their own section. The BANDED rows are exactly the setup targets, in both
 * bands, named with the target ids verbatim and repaired by the target's own
 * command. Adding a target adds its rows here for free.
 *
 * Checks are started eagerly (they run concurrently) and collected in
 * declaration order for a deterministic report. Each is guarded so a thrown
 * check becomes an attributable `fail` rather than aborting the whole run.
 * Lazily imported by `doctor.verb.ts`, so neither the checks nor
 * `@canonical/harnesses` land on the fast path.
 */

import { BIN_NAME } from "../../constants.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import { checkKeStore } from "./checks/checkKeStore.js";
import { checkNodeVersion } from "./checks/checkNodeVersion.js";
import { checkPackageRefs } from "./checks/checkPackageRefs.js";
import { checkPragmaVersion } from "./checks/checkPragmaVersion.js";
import { bandedChecks } from "./checks/targetHealth.js";
import type { CheckResult, DoctorData } from "./types.js";

/**
 * The unbanded environment checks, each paired with the display name used if it
 * rejects. The fallback name matches the `name` each check returns on success,
 * so a thrown check reports the same label and stays correlatable.
 */
function buildEnvironmentChecks(
  rt: PragmaRuntime,
): readonly [string, Promise<CheckResult>][] {
  return [
    ["Node version", checkNodeVersion()],
    [`${BIN_NAME} version`, checkPragmaVersion(rt)],
    ["pack refs", checkPackageRefs(rt)],
    ["store", checkKeStore(rt)],
  ];
}

/** Turn a rejected check into an attributable failure rather than a crash. */
async function guarded(
  name: string,
  promise: Promise<CheckResult>,
): Promise<CheckResult> {
  try {
    return await promise;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      name,
      status: "fail",
      detail: `Check threw an unexpected error: ${reason}`,
      remedy: `Re-run \`${BIN_NAME} doctor\`; if it persists, report this as a bug.`,
    };
  }
}

/**
 * Run every health check and aggregate the results.
 *
 * @param rt - The per-invocation runtime.
 * @returns The `{ checks, passed, failed, available, skipped }` summary.
 * @note Impure — the checks read the fs, boot the store, and detect harnesses.
 */
export async function runChecks(rt: PragmaRuntime): Promise<DoctorData> {
  // The banded rows come back as a batch (one detection pass over the table),
  // so they are guarded as a batch: a detection that throws becomes one
  // attributable failure instead of taking the environment section with it.
  const [environmentResults, bandedResults] = await Promise.all([
    Promise.all(
      buildEnvironmentChecks(rt).map(([name, promise]) =>
        guarded(name, promise),
      ),
    ),
    bandedChecks(rt, BIN_NAME).catch((error: unknown): CheckResult[] => [
      {
        name: "setup targets",
        status: "fail",
        detail: `Detection threw an unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        remedy: `Re-run \`${BIN_NAME} doctor\`; if it persists, report this as a bug.`,
      },
    ]),
  ]);

  const checks: CheckResult[] = [...environmentResults, ...bandedResults];
  return {
    checks,
    passed: checks.filter((c) => c.status === "pass").length,
    failed: checks.filter((c) => c.status === "fail").length,
    available: checks.filter((c) => c.status === "available").length,
    skipped: checks.filter((c) => c.status === "skip").length,
  };
}
