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
    // Merge onto the full existing config so other fields (e.g. `packages`,
    // `trace`) survive. `readConfig` normalises defaults (tier: undefined,
    // channel: "normal"); strip those to keep the file minimal, then apply
    // the channel change (`undefined` resets it).
    const current = readConfig(cwd);
    const { tier, channel: _current, ...rest } = current;
    const next = {
      ...rest,
      ...(tier !== undefined ? { tier } : {}),
      ...(channel !== undefined ? { channel } : {}),
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "channel", value: channel };
  });
}
