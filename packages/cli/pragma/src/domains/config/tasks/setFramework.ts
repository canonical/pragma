import type { Task } from "@canonical/task";
import type { ConfigScope } from "../../../config/index.js";
import type { Framework } from "../../../constants.js";
import writeConfigField from "./writeConfigField.js";

/**
 * Build a config-write task for setting or resetting the preferred framework.
 *
 * @param cwd - Working directory the target config layer is resolved from.
 * @param framework - Framework to persist, or `undefined` to reset.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Task yielding the persisted field/value payload and target path.
 * @note - Impure — reads and writes the target config file.
 */
export default function setFramework(
  cwd: string,
  framework: Framework | undefined,
  scope?: ConfigScope,
): Task<{ field: "framework"; value: Framework | undefined; path: string }> {
  return writeConfigField(cwd, "framework", framework, scope);
}
