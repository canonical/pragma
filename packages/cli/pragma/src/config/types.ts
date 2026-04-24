/**
 * Configuration data shapes for pragma.config.json.
 *
 * Separates the persisted config shape from the read/write logic
 * so consumers can import types without pulling in filesystem code.
 */

import type { Channel } from "../constants.js";
import type { RawPackageEntry } from "../domains/refs/operations/parseRef.js";

/** Parsed contents of pragma.config.json. */
interface PragmaConfig {
  /** Active tier path, or `undefined` when no tier is configured. */
  tier: string | undefined;
  /** Release channel controlling component visibility. */
  channel: Channel;
  /**
   * Semantic package sources. Each entry is a package name (npm) or an
   * object with `{ name, source }` where source is `file://` or `git+https://`.
   * When absent, the hardcoded defaults are used.
   */
  packages?: ReadonlyArray<RawPackageEntry> | undefined;
}

/** Partial update payload for writing config changes. */
interface ConfigUpdate {
  /** New tier path, `undefined` to remove the tier field. */
  tier?: string | undefined;
  /** New channel, `undefined` to remove the channel field. */
  channel?: Channel | undefined;
  /** New packages list, `undefined` to remove the field. */
  packages?: ReadonlyArray<RawPackageEntry> | undefined;
}

export type { ConfigUpdate, PragmaConfig };
