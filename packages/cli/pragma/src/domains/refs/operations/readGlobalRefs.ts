/**
 * Read global package refs from ~/.config/pragma/refs.json.
 *
 * Global refs provide user-level overrides that apply to all projects.
 * Project-level `pragma.config.json` overrides global refs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RawPackageEntry } from "./parseRef.js";
import { globalConfigDir } from "./paths.js";

/**
 * Read global package references.
 *
 * @returns The `packages` array from `~/.config/pragma/refs.json`, or
 *          an empty array when the file is missing or malformed.
 */
export default function readGlobalRefs(): ReadonlyArray<RawPackageEntry> {
  const refsPath = join(globalConfigDir(), "refs.json");

  let raw: string;
  try {
    raw = readFileSync(refsPath, "utf-8");
  } catch {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const packages = parsed.packages;
    if (!Array.isArray(packages)) return [];
    return packages as RawPackageEntry[];
  } catch {
    return [];
  }
}
