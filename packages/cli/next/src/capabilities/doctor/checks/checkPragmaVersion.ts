import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { detectInstallSource } from "../../shared/packageManager.js";
import type { CheckResult } from "../types.js";

/**
 * Report the pragma version and how it was installed. Always passes — purely
 * informational.
 *
 * @param rt - The per-invocation runtime (for `version`).
 * @returns A CheckResult with version and install details.
 * @note Impure — reads the process for the install heuristic.
 */
export async function checkPragmaVersion(
  rt: PragmaRuntime,
): Promise<CheckResult> {
  const install = detectInstallSource();
  return {
    name: "pragma version",
    status: "pass",
    detail: `v${rt.version} (installed via ${install.label})`,
  };
}
