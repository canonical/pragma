import type { Task } from "@canonical/task";
import type { ConfigScope } from "../../../config/index.js";
import type { Channel } from "../../../constants.js";
import writeConfigField from "./writeConfigField.js";

/**
 * Build a config-write task for setting or resetting the release channel.
 *
 * @param cwd - Working directory the target config layer is resolved from.
 * @param channel - Channel to persist, or `undefined` to reset.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Task yielding the persisted field/value payload and target path.
 * @note - Impure — reads and writes the target config file.
 */
export default function setChannel(
  cwd: string,
  channel: Channel | undefined,
  scope?: ConfigScope,
): Task<{ field: "channel"; value: Channel | undefined; path: string }> {
  return writeConfigField(cwd, "channel", channel, scope);
}
