/**
 * Configuration data shapes for pragma.config.json.
 *
 * Separates the persisted config shape from the read/write logic
 * so consumers can import types without pulling in filesystem code.
 */

import type { Channel, Framework } from "../constants.js";
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
  /** Whether query access tracing is enabled. Overridden by PRAGMA_TRACE env var. */
  trace?: boolean | undefined;
  /**
   * Preferred UI framework (`react` | `svelte` | `lit`). Currently advisory
   * only — no behaviour reads it yet; reserved for future framework defaulting.
   */
  framework?: Framework | undefined;
}

/** Partial update payload for writing config changes. */
interface ConfigUpdate {
  /** New tier path, `undefined` to remove the tier field. */
  tier?: string | undefined;
  /** New channel, `undefined` to remove the channel field. */
  channel?: Channel | undefined;
  /** New packages list, `undefined` to remove the field. */
  packages?: ReadonlyArray<RawPackageEntry> | undefined;
  /** Enable/disable query tracing, `undefined` to remove the field. */
  trace?: boolean | undefined;
  /** New preferred framework, `undefined` to remove the field. */
  framework?: Framework | undefined;
}

/**
 * Values a single config file declares. A key is present only when the
 * file sets it — presence drives which layer wins during merging.
 */
interface ConfigFileValues {
  readonly tier?: string;
  readonly channel?: Channel;
  readonly packages?: ReadonlyArray<RawPackageEntry>;
  readonly trace?: boolean;
  readonly framework?: Framework;
}

/** Which config layer supplied an effective field value. */
type ConfigOrigin = "default" | "global" | "project";

/** Per-field provenance for the effective merged config. */
interface ConfigOrigins {
  readonly tier: ConfigOrigin;
  readonly channel: ConfigOrigin;
  readonly packages: ConfigOrigin;
  readonly trace: ConfigOrigin;
  readonly framework: ConfigOrigin;
}

/** A resolved config file layer. */
interface ConfigLayer {
  /** Absolute path of the layer's config file (existing or would-be). */
  readonly path: string;
  /** Whether the file exists and was readable. */
  readonly exists: boolean;
}

/** Layered config resolution result with per-field provenance. */
interface ConfigLayers {
  /** The effective merged configuration (defaults < global < project). */
  readonly config: PragmaConfig;
  /** Which layer supplied each effective field. */
  readonly origins: ConfigOrigins;
  /** The global XDG layer (`$XDG_CONFIG_HOME/pragma/config.json`). */
  readonly global: ConfigLayer;
  /**
   * The project layer: the nearest `pragma.config.json` up the tree, or
   * the would-be path at `cwd` when none exists.
   */
  readonly project: ConfigLayer;
}

/** Target layer selector for config writes. */
type ConfigScope = "global" | "local";

export type {
  ConfigFileValues,
  ConfigLayer,
  ConfigLayers,
  ConfigOrigin,
  ConfigOrigins,
  ConfigScope,
  ConfigUpdate,
  PragmaConfig,
};
