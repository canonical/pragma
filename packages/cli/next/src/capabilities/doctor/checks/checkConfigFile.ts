import { readConfig } from "../../../kernel/config/readConfig.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { CheckResult } from "../types.js";

/**
 * Check which config layer is active for the working directory.
 *
 * Passes when a project `pragma.config.ts` is found up the tree, or — pragma is
 * global-first — when only the global XDG config exists. Fails only when
 * neither layer is configured.
 *
 * @param rt - The per-invocation runtime (for `cwd`).
 * @returns A CheckResult indicating the active layer, or fail with a remedy.
 * @note Impure — reads the config layers from disk.
 */
export async function checkConfigFile(rt: PragmaRuntime): Promise<CheckResult> {
  const layers = await readConfig(rt.cwd);

  if (layers.project.exists) {
    return {
      name: "pragma config",
      status: "pass",
      detail: `project config active (${layers.project.path})`,
    };
  }

  if (layers.global.exists) {
    return {
      name: "pragma config",
      status: "pass",
      detail: `no project config — global config active (${layers.global.path})`,
    };
  }

  return {
    name: "pragma config",
    status: "fail",
    detail: "not found",
    remedy: "pragma config set tier <path>",
  };
}
