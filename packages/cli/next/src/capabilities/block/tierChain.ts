/**
 * Tier-chain inheritance + channel visibility for the hand-written `block list`.
 *
 * Ported from the v1 filters. Setting a tier activates a parent-chain filter
 * (`apps/lxd` → visible tiers `global`, `apps`, `apps/lxd`); the channel maps to
 * the set of visible release levels. Both are generated SPARQL clauses composed
 * only from validated pack terms — no user input reaches the query text (the
 * tier value comes from config, the channel from a closed enum).
 */

import type { Channel } from "../../kernel/config/types.js";

/** The `ds:` prefix — the store injects its PREFIX declaration. */
const DS = "ds:";

/** Release levels visible per channel setting. */
export const CHANNEL_RELEASES: Record<Channel, readonly string[]> = {
  normal: ["stable"],
  experimental: ["stable", "experimental"],
  prerelease: ["stable", "experimental", "alpha", "beta"],
};

/**
 * The parent chain for a tier path.
 *
 * `apps/lxd` → `["global", "apps", "apps/lxd"]`; `undefined` → `[]` (all tiers).
 */
export function resolveTierChain(tierPath: string | undefined): string[] {
  if (tierPath === undefined) return [];
  const normalized = tierPath.trim().toLowerCase();
  const chain: string[] = ["global"];
  const segments = normalized.split("/");
  for (let i = 0; i < segments.length; i++) {
    const path = segments.slice(0, i + 1).join("/");
    if (path !== "global") chain.push(path);
  }
  return chain;
}

/** A tier path's URI local name (slashes → underscores: `apps/lxd` → `apps_lxd`). */
export function tierPathToLocal(tierPath: string): string {
  return tierPath.trim().toLowerCase().replace(/\//g, "_");
}

/**
 * A SPARQL FILTER clause for tier visibility, or empty when no tier is set.
 *
 * @param tierPath - The configured tier path (e.g. `apps/lxd`) or `undefined`.
 * @param varName - The SPARQL variable to filter (default `tier`).
 */
export function buildTierFilter(
  tierPath: string | undefined,
  varName = "tier",
): string {
  if (tierPath === undefined) return "";
  const uriList = resolveTierChain(tierPath)
    .map((t) => `${DS}${tierPathToLocal(t)}`)
    .join(", ");
  return `FILTER(?${varName} IN (${uriList}))`;
}

/**
 * SPARQL clauses for channel visibility: bind `?release` if present, then filter
 * to allowed levels OR unbound (unannotated blocks are treated as stable).
 *
 * @param channel - The configured channel.
 * @param varName - The SPARQL variable to bind/filter (default `release`).
 */
export function buildChannelFilter(
  channel: Channel,
  varName = "release",
): string {
  const uriList = CHANNEL_RELEASES[channel].map((r) => `${DS}${r}`).join(", ");
  return [
    `OPTIONAL { ?component ${DS}release ?${varName} }`,
    `FILTER(!BOUND(?${varName}) || ?${varName} IN (${uriList}))`,
  ].join("\n    ");
}
