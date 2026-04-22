import { readFileSync, renameSync, writeFileSync } from "node:fs";
import resolveConfigPath from "./resolveConfigPath.js";
import type { ConfigUpdate } from "./types.js";

/**
 * Write config updates to pragma.config.json.
 *
 * Merges updates into existing JSON. A field set to `undefined` removes it.
 * Creates the file if it doesn't exist.
 *
 * @param cwd - Directory containing (or to contain) pragma.config.json.
 * @param update - Fields to set or remove.
 *
 * @note Impure — writes to the filesystem.
 */
export default function writeConfig(cwd: string, update: ConfigUpdate): void {
  const configPath = resolveConfigPath(cwd);
  const tempPath = `${configPath}.tmp`;

  let existing: Record<string, unknown> = {};
  try {
    const raw = readFileSync(configPath, "utf-8");
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch (err: unknown) {
    // Only swallow "file not found" — surface parse or permission errors.
    const isNotFound =
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT";
    if (!isNotFound) {
      throw err;
    }
  }

  if (update.tier !== undefined) {
    existing.tier = update.tier;
  } else if ("tier" in update) {
    delete existing.tier;
  }

  if (update.channel !== undefined) {
    existing.channel = update.channel;
  } else if ("channel" in update) {
    delete existing.channel;
  }

  if (update.packages !== undefined) {
    existing.packages = update.packages;
  } else if ("packages" in update) {
    delete existing.packages;
  }

  writeFileSync(tempPath, `${JSON.stringify(existing, null, 2)}\n`);
  renameSync(tempPath, configPath);
}
