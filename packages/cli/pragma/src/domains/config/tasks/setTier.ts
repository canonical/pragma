import type { Task } from "@canonical/task";
import type { ConfigScope } from "../../../config/index.js";
import writeConfigField from "./writeConfigField.js";

/**
 * Build a config-write task for setting or resetting the active tier.
 *
 * @param cwd - Working directory the target config layer is resolved from.
 * @param tier - Tier path to persist, or `undefined` to reset.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Task yielding the persisted field/value payload and target path.
 * @note - Impure — reads and writes the target config file.
 */
export default function setTier(
  cwd: string,
  tier: string | undefined,
  scope?: ConfigScope,
): Task<{ field: "tier"; value: string | undefined; path: string }> {
  return writeConfigField(cwd, "tier", tier, scope);
}
