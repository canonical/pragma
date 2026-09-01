/**
 * Data shapes for `pragma info`.
 */

import type { ConfigOrigins } from "../../kernel/config/types.js";
import type { InstallKind } from "../../kernel/render/vocabulary.js";

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
  /** The package-manager command that would apply the update — only for a
   * GLOBAL install; every other state carries {@link guidance} instead. */
  readonly command?: string;
  /** The honest sentence for an install with no sanctioned update command
   * (linked / ephemeral / workspace / unknown). */
  readonly guidance?: string;
}

/**
 * The full `info` payload. Storeless (never boots the store) but network-aware
 * (PR6): an update-check and a storeless entity total enrich PR1's version +
 * install-source + resolved config with per-field provenance.
 */
export interface InfoData {
  readonly version: string;
  /** The install-source display label (e.g. `npm (global)`). */
  readonly installSource: string;
  /** The install-source state the label renders. */
  readonly installKind: InstallKind;
  /** Set when a newer CLI release is available on the active channel. */
  readonly update?: InfoUpdate;
  /** True when the registry could not be reached (the update-check was skipped). */
  readonly updateSkipped: boolean;
  /** Total indexed entities from the storeless pack index, when reachable. */
  readonly entities?: number;
  readonly config: InfoConfig;
}
