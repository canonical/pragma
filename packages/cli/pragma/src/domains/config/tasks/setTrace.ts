import type { Task } from "@canonical/task";
import type { ConfigScope } from "../../../config/index.js";
import writeConfigField from "./writeConfigField.js";

/**
 * Build a config-write task for enabling or disabling query tracing.
 *
 * @param cwd - Working directory the target config layer is resolved from.
 * @param trace - `true` to enable, `false` to disable.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Task yielding the persisted field/value payload and target path.
 * @note - Impure — reads and writes the target config file.
 */
export default function setTrace(
  cwd: string,
  trace: boolean,
  scope?: ConfigScope,
): Task<{ field: "trace"; value: boolean | undefined; path: string }> {
  return writeConfigField(cwd, "trace", trace, scope);
}
