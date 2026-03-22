/**
 * Config domain types.
 *
 * Shared across config operations, commands, and formatters.
 */

import type { Channel } from "#constants";

/**
 * Data returned by `pragma config show`.
 */
export interface ConfigShowData {
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: Channel;
  readonly includedReleases: readonly string[];
  readonly packageManager: string;
  readonly installSource: string;
  readonly configFilePath: string;
  readonly configFileExists: boolean;
}
