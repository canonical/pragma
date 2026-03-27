/**
 * Build a FilterConfig from runtime config, optionally widening tier.
 */

import type { FilterConfig, PragmaRuntime } from "../types/index.js";

export default function buildFilterConfig(
  runtime: PragmaRuntime,
  allTiers?: boolean,
): FilterConfig {
  return {
    tier: allTiers ? undefined : runtime.config.tier,
    channel: runtime.config.channel,
  };
}
