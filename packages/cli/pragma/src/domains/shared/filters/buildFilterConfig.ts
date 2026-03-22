/**
 * Build a FilterConfig from runtime config, optionally widening tier.
 */

import type { PragmaRuntime } from "../runtime.js";
import type { FilterConfig } from "../types.js";

export default function buildFilterConfig(
  runtime: PragmaRuntime,
  allTiers?: boolean,
): FilterConfig {
  return {
    tier: allTiers ? undefined : runtime.config.tier,
    channel: runtime.config.channel,
  };
}
