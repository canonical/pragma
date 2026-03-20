/**
 * Channel filter — release stability visibility.
 *
 * Maps channel settings to the set of visible release levels.
 * Components without a release annotation are treated as stable.
 *
 * @see CF.06 in B.08.CONFIG
 */

import type { Channel } from "../../constants.js";

/**
 * Release levels visible per channel setting.
 */
export const CHANNEL_RELEASES: Record<Channel, readonly string[]> = {
  normal: ["stable"],
  experimental: ["stable", "experimental"],
  prerelease: ["stable", "experimental", "alpha", "beta"],
};

/**
 * Generate SPARQL clauses for channel visibility.
 *
 * Uses OPTIONAL + FILTER pattern: binds ?release if present,
 * then filters to allowed values OR unbound (= stable default).
 *
 * @param channel - Configured channel
 * @param varName - SPARQL variable to filter (default: "release")
 */
export function buildChannelFilter(
  channel: Channel,
  varName = "release",
): string {
  const releases = CHANNEL_RELEASES[channel];
  const uriList = releases.map((r) => `ds:${r}`).join(", ");

  return [
    `OPTIONAL { ?component dso:release ?${varName} }`,
    `FILTER(!BOUND(?${varName}) || ?${varName} IN (${uriList}))`,
  ].join("\n    ");
}
