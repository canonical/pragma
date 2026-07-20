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

/** An available CLI update — present only when a newer release is published. */
export interface InfoUpdate {
  readonly current: string;
  readonly latest: string;
  /** The package-manager command that would apply the update. */
  readonly command: string;
}

/**
 * The full `info` payload. Storeless (never boots the store) but network-aware
 * (PR6): an update-check and a storeless entity total enrich PR1's version +
 * install-source + resolved config with per-field provenance.
 */
export interface InfoData {
  readonly version: string;
  readonly installSource: string;
  /** Set when a newer CLI release is available on the active channel. */
  readonly update?: InfoUpdate;
  /** True when the registry could not be reached (the update-check was skipped). */
  readonly updateSkipped: boolean;
  /** Total indexed entities from the storeless pack index, when reachable. */
  readonly entities?: number;
  readonly config: InfoConfig;
}
