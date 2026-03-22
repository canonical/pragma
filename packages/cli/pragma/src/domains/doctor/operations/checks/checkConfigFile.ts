/**
 * Check that pragma.config.json exists in the working directory.
 * @note Impure — reads filesystem.
 */

import configExists from "../../../../configExists.js";
import type { CheckContext, CheckResult } from "../types.js";

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
