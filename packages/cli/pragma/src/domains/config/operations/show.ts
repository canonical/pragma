import type { PragmaConfig } from "#config";
import { CHANNEL_RELEASES } from "../../shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { ConfigShowData } from "./types.js";

/**
 * Assemble the data needed for `pragma config show` output.
 *
 * Pure data assembly -- the tier chain is resolved from the path
 * string, not from the ontology.
 *
 * @param config - The resolved pragma config.
 * @param opts - Additional context: package manager, config file path, and existence flag.
 * @returns The fully resolved ConfigShowData.
 */
export default function resolveConfigShow(
  config: PragmaConfig,
  opts: {
    packageManager: string;
    installSource: string;
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
    installSource: opts.installSource,
    configFilePath: opts.configFilePath,
    configFileExists: opts.configFileExists,
  };
}
