import type { PragmaRuntime } from "../../shared/runtime.js";
import type { FilterConfig } from "../../shared/types.js";

export default function buildBlockFilters(
  rt: Pick<PragmaRuntime, "config">,
  allTiers?: boolean,
): FilterConfig {
  return {
    tier: allTiers ? undefined : rt.config.tier,
    channel: rt.config.channel,
  };
}
