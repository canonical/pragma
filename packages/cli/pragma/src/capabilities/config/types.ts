/**
 * Data shapes for `pragma config show`.
 */

import type { ConfigOrigins, PragmaConfig } from "../../kernel/config/types.js";

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

/** The outcome of a `config <field>` setter (set, or reset via sentinel). */
export interface ConfigFieldResult {
  /** The config field written (`tier` / `channel` / `detail`). */
  readonly field: string;
  /** The value written, or absent when the field was reset (removed). */
  readonly value?: string;
  /** The global config file the write landed in. */
  readonly path: string;
  /** True when a reset sentinel removed the field rather than setting a value. */
  readonly reset: boolean;
}
