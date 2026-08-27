/**
 * Data shapes for `pragma config show`.
 */

import type {
  ConfigOrigin,
  ConfigOrigins,
  PragmaConfig,
} from "../../kernel/config/types.js";

/** The resolved configuration plus per-field provenance and layer locations. */
export interface ConfigShowData {
  /**
   * The effective config, MINUS declared story bodies: `packs` entries carry
   * `{ name, source }` only and the top-level `stories` array is omitted. The
   * bodies are SPARQL, and MCP returns the JSON formatter's output verbatim, so
   * carrying them would put ~2.7k tokens of query text in every `config_show`
   * call. `origins` still reports where `packs`/`stories` came from, and
   * `pragma capabilities` lists the verbs those stories produce.
   */
  readonly config: PragmaConfig;
  readonly origins: ConfigOrigins;
  readonly projectConfigPath?: string;
  readonly globalConfigPath: string;
  readonly projectExists: boolean;
  readonly globalExists: boolean;
}

/** The outcome of a config write (`set` writes a value, `unset` clears one). */
export interface ConfigFieldResult {
  /** The config field written (`tier` / `channel` / `detail`). */
  readonly field: string;
  /** The value written, or absent when the field was cleared (removed). */
  readonly value?: string;
  /** The global config file the write landed in. */
  readonly path: string;
  /** True when `unset` removed the field rather than setting a value. */
  readonly reset: boolean;
}

/** The payload of `config get <key>` — one resolved value with provenance. */
export interface ConfigGetData {
  /** The config field read (`tier` / `channel` / `detail`). */
  readonly field: string;
  /** The effective value after layering, absent when the field is unset. */
  readonly value?: unknown;
  /** The layer that supplied the value (`default` / `global` / `project`). */
  readonly source: ConfigOrigin;
}
