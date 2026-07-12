import {
  type PackageRef,
  parsePackageEntry,
  type RawPackageEntry,
} from "../refs/operations/parseRef.js";
import readGlobalRefs from "../refs/operations/readGlobalRefs.js";
import { DEFAULT_PACKAGES } from "./packages.js";

/**
 * Merge config packages, global refs, and the built-in defaults into a
 * final parsed `PackageRef` array.
 *
 * Priority: config `packages` > global `refs.json` > hardcoded defaults.
 * A non-empty config list is a full replacement — only the listed packages
 * resolve. An empty or absent list means "not configured": global refs are
 * merged over the defaults by package name, so a global entry for
 * "@canonical/foo" overrides the default entry for the same package.
 *
 * Kept free of store imports so config-only consumers (e.g.
 * `resolveConfiguredGraphs`) can merge refs without loading the ke/WASM
 * runtime.
 *
 * @note Impure — reads global refs from `~/.config/pragma/refs.json`.
 *
 * @param configPackages - The `packages` field from `pragma.config.json`.
 * @returns Parsed refs ready for the loader chain.
 * @throws PragmaError with code CONFIG_ERROR when an entry is malformed.
 */
export function mergeAndParseRefs(
  configPackages?: ReadonlyArray<RawPackageEntry>,
): PackageRef[] {
  // A non-empty config list replaces the package set entirely.
  if (configPackages && configPackages.length > 0) {
    return configPackages.map((entry) => parsePackageEntry(entry));
  }

  // Empty or absent → merge global refs over the defaults, keyed by name.
  const merged = new Map<string, RawPackageEntry>();
  for (const entry of [...DEFAULT_PACKAGES, ...readGlobalRefs()]) {
    const name = typeof entry === "string" ? entry : entry.name;
    merged.set(name, entry);
  }
  return [...merged.values()].map((entry) => parsePackageEntry(entry));
}
