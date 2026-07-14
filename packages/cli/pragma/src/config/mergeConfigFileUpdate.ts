import { readFileSync } from "node:fs";
import type { ConfigUpdate } from "./types.js";

/**
 * Compute a config file's new contents after applying an update.
 *
 * Reads the target file itself (not the merged layers — a write must
 * never copy values from another layer into this file), applies the
 * update per field (`undefined` with the key present removes the field),
 * and returns the serialized JSON. Unknown keys already in the file are
 * preserved verbatim.
 *
 * @param configPath - Absolute path of the config file to update.
 * @param update - Fields to set or remove.
 * @returns The file's new contents, newline-terminated.
 * @throws The raw filesystem/parse error when the existing file is
 *   present but unreadable or not valid JSON — never silently clobbers.
 * @note Impure — reads the current file contents.
 */
export default function mergeConfigFileUpdate(
  configPath: string,
  update: ConfigUpdate,
): string {
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

  applyField(existing, update, "tier");
  applyField(existing, update, "channel");
  applyField(existing, update, "packages");
  applyField(existing, update, "trace");
  applyField(existing, update, "framework");

  return `${JSON.stringify(existing, null, 2)}\n`;
}

function applyField(
  existing: Record<string, unknown>,
  update: ConfigUpdate,
  field: keyof ConfigUpdate,
): void {
  if (update[field] !== undefined) {
    existing[field] = update[field];
  } else if (field in update) {
    delete existing[field];
  }
}
