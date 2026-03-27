/**
 * Describe active filters as human-readable key-value pairs.
 */

import type { FilterConfig } from "../types/index.js";

export default function describeFilters(
  filters: FilterConfig,
): Record<string, string> {
  return {
    ...(filters.tier !== undefined && { tier: filters.tier }),
    channel: filters.channel,
  };
}
