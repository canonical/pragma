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
    // Merge onto the full existing config so other fields (e.g. `packages`,
    // `trace`) survive. `readConfig` normalises defaults (tier: undefined,
    // channel: "normal"); strip those to keep the file minimal, then apply
    // the tier change (`undefined` resets it).
    const current = readConfig(cwd);
    const { tier: _current, channel, ...rest } = current;
    const next = {
      ...rest,
      ...(tier !== undefined ? { tier } : {}),
      ...(channel !== "normal" ? { channel } : {}),
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "tier", value: tier };
  });
}
