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
  /** The field's prior value, or absent when it was unset. */
  readonly previous?: string;
  /**
   * Whether the value actually changed. False for a no-op (setting a field to
   * the value it already holds, or resetting an already-absent field) — the
   * recap then reports "unchanged" and no write happened.
   */
  readonly changed: boolean;
}
