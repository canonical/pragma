/**
 * Orthogonal filter combination.
 *
 * Both tier and channel filters apply simultaneously as AND constraints.
 */

import type { FilterConfig } from "../types.js";
import { buildChannelFilter } from "./buildChannelFilter.js";
import { buildTierFilter } from "./buildTierFilter.js";

/**
 * Build combined WHERE clause fragments for tier + channel filters.
 *
 * Returns a string to insert into a SPARQL WHERE clause body.
 * Each filter is independently optional.
 */
export function buildFilters(config: FilterConfig): string {
  const parts: string[] = [];

  const tierClause = buildTierFilter(config.tier);
  if (tierClause) parts.push(tierClause);

  const channelClause = buildChannelFilter(config.channel);
  parts.push(channelClause);

  return parts.join("\n    ");
}
