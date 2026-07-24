/**
 * Read the global machine config: `$XDG_CONFIG_HOME/pragma/config.json`.
 *
 * The global layer holds cross-project machine state (channel, detail, tier,
 * prompts). A missing or empty file contributes no values — the layer simply
 * does not participate in the merge. A *malformed* file (a torn write) must
 * never brick every command (the old loud `CONFIG_ERROR` throw) nor be silently
 * discarded (writeConfigField's old reset-to-`{}`): it is backed up to a
 * timestamped sibling, reset to defaults, and a warning is written to stderr.
 * A structurally *invalid* shape (valid JSON, wrong types) is still a real,
 * fixable user error and surfaces as `CONFIG_ERROR` via {@link parseRawConfig}.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { globalConfigPath } from "./paths.js";
import { parseRawConfig } from "./schema.js";
import type { RawConfig } from "./types.js";

/** A read of the global config layer. */
export interface GlobalConfigRead {
  readonly values: RawConfig;
  readonly exists: boolean;
  readonly path: string;
}

/**
 * The timestamped sibling path a corrupt config is backed up to before it is
 * reset — shared by the read (this module) and write (writeConfigField) paths
 * so both name the backup identically.
 *
 * @param path - The config file path being recovered.
 * @returns `<path>.corrupt-<ISO timestamp>`.
 */
export function corruptBackupPath(path: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${path}.corrupt-${stamp}`;
}

/**
 * Recover from a corrupt (unparseable) global config: back the file up, reset it
 * to defaults, and warn on stderr. Best-effort — a read-only config dir degrades
 * to defaults without a backup but still warns. Never throws.
 *
 * @param path - The corrupt config file path.
 * @param raw - Its unparseable contents, preserved in the backup.
 * @note Impure — writes the backup + reset file and to stderr.
 */
function recoverCorruptGlobalConfig(path: string, raw: string): void {
  const backup = corruptBackupPath(path);
  try {
    writeFileSync(backup, raw);
    writeFileSync(path, "{}\n");
    process.stderr.write(
      `Warning: ${path} is not valid JSON. Backed it up to ${backup} and reset it to defaults.\n`,
    );
  } catch {
    process.stderr.write(
      `Warning: ${path} is not valid JSON; using built-in defaults.\n`,
    );
  }
}

/**
 * Read and validate the global config file.
 *
 * @returns The declared values, whether the file exists, and its path.
 * @throws PragmaError with code `CONFIG_ERROR` when the JSON is valid but its
 *   shape is not (malformed JSON is recovered, not thrown).
 * @note Impure — reads the filesystem (and may recover a corrupt file).
 */
export function readGlobalConfig(): GlobalConfigRead {
  const path = globalConfigPath();
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return { values: {}, exists: false, path };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return { values: {}, exists: true, path };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    recoverCorruptGlobalConfig(path, raw);
    return { values: {}, exists: true, path };
  }

  return { values: parseRawConfig(parsed, path), exists: true, path };
}
