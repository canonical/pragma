import { SUPPORTED_NODE_RANGE } from "../../../constants.js";
import type { CheckResult } from "../types.js";
import { isSupportedNodeVersion } from "./isSupportedNodeVersion.js";

/**
 * Check that the running Node.js version satisfies this package's declared
 * `engines.node` range.
 *
 * The floor is a property of the manifest, not of this file: a check that
 * hardcodes its own number can disagree with the range the package publishes,
 * and a consumer then passes a check the install contract would have failed.
 *
 * @returns A CheckResult with the current version and pass/fail status.
 * @note Impure — reads `process.versions`.
 */
export async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.versions.node;

  if (isSupportedNodeVersion(version)) {
    return { name: "Node version", status: "pass", detail: `v${version}` };
  }

  return {
    name: "Node version",
    status: "fail",
    detail: `v${version} (requires ${SUPPORTED_NODE_RANGE})`,
    remedy: `Install Node.js ${SUPPORTED_NODE_RANGE}`,
  };
}
