/**
 * Shared helpers for MCP tool handlers.
 */

import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { FilterConfig } from "../../domains/shared/types.js";

/**
 * Build filters from runtime config, optionally widening tier.
 */
export function buildFilters(
  runtime: PragmaRuntime,
  allTiers?: boolean,
): FilterConfig {
  return {
    tier: allTiers ? undefined : runtime.config.tier,
    channel: runtime.config.channel,
  };
}

/**
 * Describe active filters as human-readable key-value pairs.
 */
export function describeFilters(filters: FilterConfig): Record<string, string> {
  return {
    ...(filters.tier !== undefined && { tier: filters.tier }),
    channel: filters.channel,
  };
}
