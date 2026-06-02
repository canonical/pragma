import { $, gen, type Task, writeFile } from "@canonical/task";
import { readConfig } from "../../../config/index.js";
import resolveConfigPath from "../../../config/resolveConfigPath.js";

/**
 * Build a config-write task for enabling or disabling query tracing.
 *
 * @param cwd - Working directory containing pragma.config.json.
 * @param trace - `true` to enable, `false` to disable.
 * @returns Task yielding the persisted field/value payload.
 */
export default function setTrace(
  cwd: string,
  trace: boolean,
): Task<{ field: "trace"; value: boolean }> {
  return gen(function* () {
    // Merge onto the full existing config so other fields (e.g. `packages`)
    // survive — rebuilding from a fixed field list silently drops everything
    // not listed, and `packages` is runtime-consumed, so dropping it is data
    // loss. `readConfig` normalises defaults (tier: undefined, channel:
    // "normal"); strip those so we keep the file minimal, matching the
    // existing convention of not persisting unset defaults.
    const current = readConfig(cwd);
    const { tier, channel, ...rest } = current;
    const next = {
      ...rest,
      ...(tier !== undefined ? { tier } : {}),
      ...(channel !== "normal" ? { channel } : {}),
      trace,
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "trace", value: trace };
  });
}
