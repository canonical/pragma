/**
 * Resolve data for `pragma config show`.
 *
 * Pure data assembly — no store access needed. Tier chain is resolved
 * from the configured path string, not from the ontology.
 */

import type { PragmaConfig } from "#config";
import { CHANNEL_RELEASES } from "../../shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { ConfigShowData } from "./types.js";

/**
 * Resolve data for `pragma config show`.
 *
 * Pure data assembly — no store access needed. Tier chain is resolved
 * from the configured path string, not from the ontology.
 */
export default function resolveConfigShow(
  config: PragmaConfig,
  opts: {
    packageManager: string;
    configFilePath: string;
    configFileExists: boolean;
  },
): ConfigShowData {
  // Don't throw for stale config — show always displays what's configured.
  // resolveTierChain is pure string manipulation, doesn't need ontology.
  const tierChain =
    config.tier !== undefined ? resolveTierChain(config.tier) : [];

  const includedReleases = CHANNEL_RELEASES[config.channel];

  return {
    tier: config.tier,
    tierChain,
    channel: config.channel,
    includedReleases,
    packageManager: opts.packageManager,
    configFilePath: opts.configFilePath,
    configFileExists: opts.configFileExists,
  };
}
