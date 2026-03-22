/**
 * Check that Node.js version meets the minimum requirement.
 * @note Impure — reads process.versions.
 */

import type { CheckResult } from "../types.js";

const MIN_NODE_MAJOR = 20;

export default async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.versions.node;
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);

  if (major >= MIN_NODE_MAJOR) {
    return { name: "Node version", status: "pass", detail: `v${version}` };
  }

  return {
    name: "Node version",
    status: "fail",
    detail: `v${version} (requires >= ${MIN_NODE_MAJOR})`,
    remedy: `Install Node.js >= ${MIN_NODE_MAJOR}`,
  };
}
