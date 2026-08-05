/**
 * The config field table — one declarative row per writable field. Since AV-228
 * B3 retired the per-field `config tier`/`channel`/`detail` verbs, this table no
 * longer emits verbs of its own: it is the shared source of truth that drives
 * `config set <key> <value>` (via `runSet`), giving `set` its `<key>` enum,
 * per-field reset sentinels and enum validation for free.
 *
 * It also carried a `positional` name per row until `config set` became the one
 * setter: with one param bag there is nothing to re-key, and the field had no
 * consumer beyond the round trip it existed to serve.
 */

import { DETAIL_LEVELS } from "../../constants.js";
import type { RawConfig } from "../../kernel/config/types.js";
import { CHANNELS } from "../../kernel/config/types.js";

/** One writable config field and how its single positional is shaped/validated. */
export interface ConfigFieldSpec {
  /** The `RawConfig` key written (also the `config set` `<key>` enum member). */
  readonly field: keyof RawConfig & ("tier" | "channel" | "detail");
  /** A free string (`tier`) or a fixed enum (`channel` / `detail`). */
  readonly kind: "string" | "enum";
  /** The allowed values for an enum field. */
  readonly values?: readonly string[];
  /** Reserved values that REMOVE the field instead of setting it. */
  readonly resetSentinel?: readonly string[];
}

/**
 * The three writable fields. Only `tier` (a free string with a meaningful
 * "no value") carries reset sentinels; `channel`/`detail` reset by setting
 * their default (`normal`/`standard`). The migration path for the retired
 * field-verbs is `config set <field> <value>` (e.g. `config set tier apps/lxd`,
 * `config set tier none` to clear it).
 */
export const CONFIG_FIELDS: readonly ConfigFieldSpec[] = [
  {
    field: "tier",
    kind: "string",
    resetSentinel: ["none", "default", "-"],
  },
  {
    field: "channel",
    kind: "enum",
    values: CHANNELS,
  },
  {
    field: "detail",
    kind: "enum",
    values: DETAIL_LEVELS,
  },
];
