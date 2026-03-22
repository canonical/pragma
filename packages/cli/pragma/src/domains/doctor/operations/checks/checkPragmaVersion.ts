/**
 * Report pragma version, install method, and global/local status.
 * Always passes — informational.
 * @note Impure — detects package manager.
 */

import { VERSION } from "#constants";
import { detectLocalInstall, detectPackageManager } from "#package-manager";
import type { CheckResult } from "../types.js";

export default async function checkPragmaVersion(): Promise<CheckResult> {
  const pm = detectPackageManager();
  const localWarning = detectLocalInstall();
  const scope = localWarning ? "local" : "global";

  return {
    name: "pragma version",
    status: "pass",
    detail: `v${VERSION} (installed via ${pm}, ${scope})`,
  };
}
