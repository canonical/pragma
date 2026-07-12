import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import mergeConfigFileUpdate from "./mergeConfigFileUpdate.js";
import resolveWriteConfigPath from "./resolveWriteConfigPath.js";
import type { ConfigScope, ConfigUpdate } from "./types.js";

/**
 * Write config updates to the resolved target layer.
 *
 * The target follows the global-first write rule (see
 * `resolveWriteConfigPath`): an explicit scope wins, else the nearest
 * existing project file, else the global XDG file. Merges updates into
 * that file's own contents — a field set to `undefined` removes it —
 * creating the file (and its directory) if needed, atomically via a
 * temp file rename.
 *
 * @param cwd - Directory the project layer is resolved from.
 * @param update - Fields to set or remove.
 * @param scope - Optional explicit target layer (`"global"` | `"local"`).
 * @returns Absolute path of the file that was written.
 *
 * @note Impure — writes to the filesystem.
 */
export default function writeConfig(
  cwd: string,
  update: ConfigUpdate,
  scope?: ConfigScope,
): string {
  const configPath = resolveWriteConfigPath(cwd, scope);
  const tempPath = `${configPath}.tmp`;
  const content = mergeConfigFileUpdate(configPath, update);

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(tempPath, content);
  renameSync(tempPath, configPath);
  return configPath;
}
