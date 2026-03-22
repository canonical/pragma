/**
 * Configuration data shapes for pragma.config.json.
 *
 * Separates the persisted config shape from the read/write logic
 * so consumers can import types without pulling in filesystem code.
 */

import type { Channel } from "../constants.js";

/** Parsed contents of pragma.config.json. */
interface PragmaConfig {
  /** Active tier path, or `undefined` when no tier is configured. */
  tier: string | undefined;
  /** Release channel controlling component visibility. */
  channel: Channel;
}

/** Partial update payload for writing config changes. */
interface ConfigUpdate {
  /** New tier path, `undefined` to remove the tier field. */
  tier?: string | undefined;
  /** New channel, `undefined` to remove the channel field. */
  channel?: Channel | undefined;
}

export type { ConfigUpdate, PragmaConfig };
