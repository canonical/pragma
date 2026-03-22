import { P } from "../prefixes.js";

/**
 * Tier filter — hierarchical visibility.
 *
 * Setting a tier activates a parent chain filter.
 * `"apps/lxd"` -> visible tiers: `global`, `apps`, `apps/lxd`.
 */

/**
 * Resolve the parent chain for a tier path.
 *
 * "apps/lxd" -> ["global", "apps", "apps/lxd"]
 * "apps" -> ["global", "apps"]
 * "global" -> ["global"]
 * undefined -> [] (no filter -- all tiers visible)
 *
 * @param tierPath - Slash-separated tier path, or `undefined` for no filtering.
 * @returns Ordered array of tier paths from root to leaf.
 */
export function resolveTierChain(tierPath: string | undefined): string[] {
  if (tierPath === undefined) return [];

  const chain: string[] = ["global"];
  const segments = tierPath.split("/");

  for (let i = 0; i < segments.length; i++) {
    const path = segments.slice(0, i + 1).join("/");
    if (path !== "global") {
      chain.push(path);
    }
  }

  return chain;
}

/**
 * Convert a tier path to its URI local name.
 * Slashes become underscores: `"apps/lxd"` -> `"apps_lxd"`.
 *
 * @param tierPath - Slash-separated tier path.
 * @returns Underscore-separated local name suitable for URI construction.
 */
export function tierPathToLocal(tierPath: string): string {
  return tierPath.replace(/\//g, "_");
}

/**
 * Generate a SPARQL FILTER clause for tier visibility.
 *
 * Returns an empty string when tier is undefined (no filter = all tiers visible).
 *
 * @param tierPath - Configured tier path (e.g., `"apps/lxd"`) or `undefined`.
 * @param varName - SPARQL variable to filter (default: `"tier"`).
 * @returns SPARQL FILTER clause string, or empty string when no tier is set.
 */
export function buildTierFilter(
  tierPath: string | undefined,
  varName = "tier",
): string {
  if (tierPath === undefined) return "";

  const chain = resolveTierChain(tierPath);
  const uriList = chain.map((t) => `${P.ds}${tierPathToLocal(t)}`).join(", ");

  return `FILTER(?${varName} IN (${uriList}))`;
}
