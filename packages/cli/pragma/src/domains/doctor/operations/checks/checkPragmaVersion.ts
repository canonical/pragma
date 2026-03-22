/**
 * Report pragma version, install method, and global/local status.
 * Always passes — informational.
 * @note Impure — detects package manager.
 */

import { VERSION } from "#constants";
import { detectInstallSource } from "#package-manager";
import type { CheckResult } from "../types.js";

export default async function checkPragmaVersion(): Promise<CheckResult> {
  const install = detectInstallSource();

  return {
    name: "pragma version",
    status: "pass",
    detail: `v${VERSION} (installed via ${install.label})`,
  };
}
