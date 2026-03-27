import { $, gen, type Task, writeFile } from "@canonical/task";
import { readConfig } from "../../../config/index.js";
import resolveConfigPath from "../../../config/resolveConfigPath.js";

/**
 * Build a config-write task for setting or resetting the release channel.
 *
 * @param cwd - Working directory containing pragma.config.json.
 * @param channel - Channel value to persist, or `undefined` to reset.
 * @returns Task yielding the persisted field/value payload.
 * @note - Impure — reads config and writes to the file system.
 */
export default function setChannel(
  cwd: string,
  channel: string | undefined,
): Task<{ field: "channel"; value: string | undefined }> {
  return gen(function* () {
    const current = readConfig(cwd);
    const next = {
      ...(current.tier !== undefined ? { tier: current.tier } : {}),
      ...(channel !== undefined ? { channel } : {}),
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "channel", value: channel };
  });
}
