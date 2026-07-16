/**
 * Configuration data shapes for pragma.config.json.
 *
 * Separates the persisted config shape from the read/write logic
 * so consumers can import types without pulling in filesystem code.
 */

import type { Channel, Framework } from "../constants.js";
import type { RawPackageEntry } from "../domains/refs/operations/parseRef.js";
import type { StoryPackDefinition } from "../domains/shared/stories/pack/types.js";

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
  /**
   * Declarative read stories compiled into CLI commands and MCP tools at
   * boot.
   * @experimental Story packs (v0) are experimental — the format may change.
   */
  stories?: ReadonlyArray<StoryPackDefinition> | undefined;
  /**
   * Additional namespace prefixes merged over the built-in prefix map —
   * registered on the store (usable in queries) and used for display.
   */
  prefixes?: Readonly<Record<string, string>> | undefined;
  /**
   * Default progressive-disclosure level for disclosure-capable commands
   * (e.g. `"digest"`, `"detailed"`). An explicit `--detail` flag overrides it.
   */
  detail?: string | undefined;
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
  /** New default disclosure level, `undefined` to remove the field. */
  detail?: string | undefined;
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
  readonly stories?: ReadonlyArray<StoryPackDefinition>;
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly detail?: string;
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
  readonly stories: ConfigOrigin;
  readonly prefixes: ConfigOrigin;
  readonly detail: ConfigOrigin;
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
