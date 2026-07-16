import type { Task } from "@canonical/task";
import type { ConfigScope } from "../../../config/index.js";
import writeConfigField from "./writeConfigField.js";

/**
 * Build a config-write task for setting or resetting the default
 * disclosure level.
 *
 * @param cwd - Working directory the target config layer is resolved from.
 * @param detail - Disclosure level to persist, or `undefined` to reset.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Task yielding the persisted field/value payload and target path.
 * @note - Impure — reads and writes the target config file.
 */
export default function setDetail(
  cwd: string,
  detail: string | undefined,
  scope?: ConfigScope,
): Task<{ field: "detail"; value: string | undefined; path: string }> {
  return writeConfigField(cwd, "detail", detail, scope);
}
