import { $, gen, type Task, writeFile } from "@canonical/task";
import { readConfig } from "../../../config/index.js";
import resolveConfigPath from "../../../config/resolveConfigPath.js";

/**
 * Build a config-write task for setting or resetting the active tier.
 *
 * @param cwd - Working directory containing pragma.config.json.
 * @param tier - Tier path to persist, or `undefined` to reset.
 * @returns Task yielding the persisted field/value payload.
 * @note - Impure — reads config and writes to the file system.
 */
export default function setTier(
  cwd: string,
  tier: string | undefined,
): Task<{
  field: "tier";
  value: string | undefined;
}> {
  return gen(function* () {
    const current = readConfig(cwd);
    const next = {
      ...(tier !== undefined ? { tier } : {}),
      ...(current.channel !== undefined ? { channel: current.channel } : {}),
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "tier", value: tier };
  });
}
