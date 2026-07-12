import { readConfigLayers } from "#config";
import type { CheckContext, CheckResult } from "../types.js";

/**
 * Check which config layer is active for the working directory.
 *
 * Passes when a project `pragma.config.json` is found up the tree, or —
 * pragma is global-first — when only the global XDG config exists. Fails
 * only when neither layer is configured.
 *
 * @param ctx - Check context with the working directory.
 * @returns A CheckResult indicating pass or fail with the active layer.
 * @note Impure
 */
export default async function checkConfigFile(
  ctx: CheckContext,
): Promise<CheckResult> {
  const layers = readConfigLayers(ctx.cwd);

  if (layers.project.exists) {
    return {
      name: "pragma.config.json",
      status: "pass",
      detail: `found (${layers.project.path})`,
    };
  }

  if (layers.global.exists) {
    return {
      name: "pragma.config.json",
      status: "pass",
      detail: `no project config — global config active (${layers.global.path})`,
    };
  }

  return {
    name: "pragma.config.json",
    status: "fail",
    detail: "not found",
    remedy: "pragma config tier <tier>",
  };
}
