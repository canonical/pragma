import { $, gen, type Task, writeFile } from "@canonical/task";
import {
  type ConfigScope,
  type ConfigUpdate,
  mergeConfigFileUpdate,
  resolveWriteConfigPath,
} from "../../../config/index.js";

/**
 * Build a config-write task for one field.
 *
 * Resolves the target layer with the global-first write rule (explicit
 * scope wins, else the nearest existing project file, else the global XDG
 * file), merges the update into that file's own contents — never copying
 * values from another layer — and writes through the tracked `writeFile`
 * effect so the change participates in dry-run and undo. `undefined`
 * removes the field from the target file.
 *
 * @param cwd - Working directory the project layer is resolved from.
 * @param field - Config field to set or remove.
 * @param value - New value, or `undefined` to remove the field.
 * @param scope - Optional explicit target layer.
 * @returns Task yielding the persisted field/value payload and the path written.
 * @note Impure — resolves and reads the target file, writes via effect.
 */
export default function writeConfigField<F extends keyof ConfigUpdate>(
  cwd: string,
  field: F,
  value: ConfigUpdate[F],
  scope?: ConfigScope,
): Task<{ field: F; value: ConfigUpdate[F]; path: string }> {
  return gen(function* () {
    const path = resolveWriteConfigPath(cwd, scope);
    const update = { [field]: value } as ConfigUpdate;
    const content = mergeConfigFileUpdate(path, update);

    yield* $(writeFile(path, content));

    return { field, value, path };
  });
}
