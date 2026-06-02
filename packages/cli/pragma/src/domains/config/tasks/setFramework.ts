import { $, gen, type Task, writeFile } from "@canonical/task";
import type { Framework } from "#constants";
import { readConfig } from "../../../config/index.js";
import resolveConfigPath from "../../../config/resolveConfigPath.js";

/**
 * Build a config-write task for setting or resetting the preferred framework.
 *
 * @param cwd - Working directory containing pragma.config.json.
 * @param framework - Framework to persist, or `undefined` to reset.
 * @returns Task yielding the persisted field/value payload.
 * @note - Impure — reads config and writes to the file system.
 */
export default function setFramework(
  cwd: string,
  framework: Framework | undefined,
): Task<{ field: "framework"; value: Framework | undefined }> {
  return gen(function* () {
    // Merge onto the full existing config so other fields (e.g. `packages`,
    // `trace`) survive. `readConfig` normalises defaults (tier: undefined,
    // channel: "normal"); strip those to keep the file minimal, then apply
    // the framework change (`undefined` resets it).
    const current = readConfig(cwd);
    // Destructure out `framework` too, so a reset (framework === undefined)
    // actually removes it rather than letting the old value survive in `rest`.
    const { tier, channel, framework: _current, ...rest } = current;
    const next = {
      ...rest,
      ...(tier !== undefined ? { tier } : {}),
      ...(channel !== "normal" ? { channel } : {}),
      ...(framework !== undefined ? { framework } : {}),
    };

    yield* $(
      writeFile(resolveConfigPath(cwd), `${JSON.stringify(next, null, 2)}\n`),
    );

    return { field: "framework", value: framework };
  });
}
