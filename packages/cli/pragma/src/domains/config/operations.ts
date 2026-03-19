/**
 * Config shared operations.
 *
 * Pure functions: Store + config → typed data.
 *
 * @see CF.03, CF.04 in B.08.CONFIG
 */

import type { Store } from "@canonical/ke";
import type { PragmaConfig } from "../../config.js";
import { type Channel, VALID_CHANNELS } from "../../constants.js";
import { PragmaError } from "../../error/index.js";
import { CHANNEL_RELEASES } from "../filters/buildChannelFilter.js";
import { resolveTierChain } from "../filters/buildTierFilter.js";
import type { TierEntry } from "../shared/types.js";
import { listTiers } from "../tier/operations.js";

/**
 * Data returned by `pragma config show`.
 */
export interface ConfigShowData {
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: Channel;
  readonly includedReleases: readonly string[];
  readonly packageManager: string;
  readonly configFilePath: string;
  readonly configFileExists: boolean;
}

/**
 * Validate a tier path against the ontology.
 *
 * @returns The matching TierEntry.
 * @throws PragmaError.invalidInput if the tier path doesn't exist in the ontology.
 */
export async function validateTier(
  store: Store,
  tierPath: string,
): Promise<TierEntry> {
  const tiers = await listTiers(store);
  const match = tiers.find((t) => t.path === tierPath);

  if (!match) {
    const validPaths = tiers.map((t) => t.path);
    throw PragmaError.invalidInput("tier", tierPath, {
      validOptions: validPaths,
      recovery: "pragma config tier --reset",
    });
  }

  return match;
}

/**
 * Validate a channel value.
 *
 * @throws PragmaError.invalidInput if the channel is not one of the three valid values.
 */
export function validateChannel(value: string): Channel {
  if (VALID_CHANNELS.includes(value as Channel)) {
    return value as Channel;
  }

  throw PragmaError.invalidInput("channel", value, {
    validOptions: [...VALID_CHANNELS],
  });
}

/**
 * Resolve data for `pragma config show`.
 *
 * Pure data assembly — no store access needed. Tier chain is resolved
 * from the configured path string, not from the ontology.
 */
export function resolveConfigShow(
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
