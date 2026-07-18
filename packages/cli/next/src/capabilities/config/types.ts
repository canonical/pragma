/**
 * Data shapes for `pragma config show`.
 */

import type { ConfigOrigins, PragmaConfig } from "../../kernel/config/types.js";

/** The resolved configuration plus per-field provenance and layer locations. */
export interface ConfigShowData {
  readonly config: PragmaConfig;
  readonly origins: ConfigOrigins;
  readonly projectConfigPath?: string;
  readonly globalConfigPath: string;
  readonly projectExists: boolean;
  readonly globalExists: boolean;
}
