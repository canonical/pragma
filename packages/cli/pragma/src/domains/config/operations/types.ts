import type { ConfigOrigins } from "#config";
import type { Channel } from "#constants";

/** Data returned by `pragma config show`, including resolved tier chain and channel releases. */
export interface ConfigShowData {
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: Channel;
  readonly includedReleases: readonly string[];
  readonly packageManager: string;
  readonly installSource: string;
  /** Nearest project config file (or the would-be path at cwd). */
  readonly configFilePath: string;
  readonly configFileExists: boolean;
  /** The global XDG config file. */
  readonly globalConfigPath: string;
  readonly globalConfigExists: boolean;
  /** Which layer supplied each effective field. */
  readonly origins: ConfigOrigins;
}
