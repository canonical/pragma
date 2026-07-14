import findProjectConfigPath from "./findProjectConfigPath.js";
import resolveConfigPath from "./resolveConfigPath.js";
import resolveGlobalConfigPath from "./resolveGlobalConfigPath.js";
import type { ConfigScope } from "./types.js";

/**
 * Resolve which config file a write should target.
 *
 * An explicit scope wins: `"local"` targets `<cwd>/pragma.config.json`,
 * `"global"` targets the XDG file. Otherwise the nearest existing project
 * file up the tree is updated in place, and when none exists the write
 * goes to the global file — pragma is global-first: an unconfigured
 * directory should not sprout a project file as a side effect.
 *
 * @param cwd - Directory the project layer is resolved from.
 * @param scope - Optional explicit target layer.
 * @returns Absolute path of the config file to write.
 * @note Impure — probes the filesystem for the nearest project file.
 */
export default function resolveWriteConfigPath(
  cwd: string,
  scope?: ConfigScope,
): string {
  if (scope === "local") {
    return resolveConfigPath(cwd);
  }
  if (scope === "global") {
    return resolveGlobalConfigPath();
  }
  return findProjectConfigPath(cwd) ?? resolveGlobalConfigPath();
}
