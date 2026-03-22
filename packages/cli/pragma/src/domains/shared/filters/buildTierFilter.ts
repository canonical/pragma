import { P } from "../prefixes.js";

/**
 * Tier filter — hierarchical visibility.
 *
 * Setting a tier activates a parent chain filter.
 * `"apps/lxd"` -> visible tiers: `global`, `apps`, `apps/lxd`.
 *
 * @see CF.05 in B.08.CONFIG
 */

/**
 * Resolve the parent chain for a tier path.
 *
 * "apps/lxd" -> ["global", "apps", "apps/lxd"]
 * "apps" -> ["global", "apps"]
 * "global" -> ["global"]
 * undefined -> [] (no filter -- all tiers visible)
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
 */
export function tierPathToLocal(tierPath: string): string {
  return tierPath.replace(/\//g, "_");
}

/**
 * Generate a SPARQL FILTER clause for tier visibility.
 *
 * Returns an empty string when tier is undefined (no filter = all tiers visible).
 *
 * @param tierPath - Configured tier path (e.g., "apps/lxd") or undefined
 * @param varName - SPARQL variable to filter (default: "tier")
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
