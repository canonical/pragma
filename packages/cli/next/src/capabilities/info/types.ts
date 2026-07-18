/**
 * Data shapes for `pragma info`.
 */

import type { ConfigOrigins } from "../../kernel/config/types.js";

/** The config summary `info` reports — resolved values plus provenance. */
export interface InfoConfig {
  readonly tier?: string;
  readonly channel: string;
  readonly detail?: string;
  readonly origins: ConfigOrigins;
  readonly projectConfigPath?: string;
  readonly globalConfigPath: string;
  readonly projectExists: boolean;
  readonly globalExists: boolean;
}

/**
 * The full `info` payload. Storeless and networkless (D11) — version, how the
 * binary was installed, and the resolved config with per-field provenance.
 */
export interface InfoData {
  readonly version: string;
  readonly installSource: string;
  readonly config: InfoConfig;
}
