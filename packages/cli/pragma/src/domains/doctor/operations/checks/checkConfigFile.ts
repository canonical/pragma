import { configExists } from "#config";
import type { CheckContext, CheckResult } from "../types.js";

/**
 * Check that `pragma.config.json` exists in the working directory.
 *
 * @param ctx - Check context with the working directory.
 * @returns A CheckResult indicating pass or fail.
 * @note Impure
 */
export default async function checkConfigFile(
  ctx: CheckContext,
): Promise<CheckResult> {
  if (configExists(ctx.cwd)) {
    return {
      name: "pragma.config.json",
      status: "pass",
      detail: "found",
    };
  }

  return {
    name: "pragma.config.json",
    status: "fail",
    detail: "not found",
    remedy: "pragma config tier <tier>",
  };
}
