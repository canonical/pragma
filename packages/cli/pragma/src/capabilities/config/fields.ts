/**
 * The config field table — one declarative row per writable field. Since AV-228
 * B3 retired the per-field `config tier`/`channel`/`detail` verbs, this table no
 * longer emits verbs of its own: it is the shared source of truth that drives
 * `config set <key> <value>` (via `runSet` → `runField`), giving `set` its
 * `<key>` enum, per-field reset sentinels, enum validation, and positional
 * shaping for free.
 */

import { DETAIL_LEVELS } from "../../constants.js";
import type { RawConfig } from "../../kernel/config/types.js";
import { CHANNELS } from "../../kernel/config/types.js";

/** One writable config field and how its single positional is shaped/validated. */
export interface ConfigFieldSpec {
  /** The `RawConfig` key written (also the `config set` `<key>` enum member). */
  readonly field: keyof RawConfig & ("tier" | "channel" | "detail");
  /** The positional param NAME — its usage token is `<positional>` (covenant). */
  readonly positional: string;
  /** A free string (`tier`) or a fixed enum (`channel` / `detail`). */
  readonly kind: "string" | "enum";
  /** The allowed values for an enum field. */
  readonly values?: readonly string[];
  /** One-line field summary. */
  readonly summary: string;
  /** Extended help doc. */
  readonly doc: string;
  /** Reserved values that REMOVE the field instead of setting it. */
  readonly resetSentinel?: readonly string[];
  /** Field help examples. */
  readonly examples: readonly { cmd: string; note?: string }[];
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
    positional: "path",
    kind: "string",
    resetSentinel: ["none", "default", "-"],
    summary: "Set the active design-system tier.",
    doc: "Writes the `tier` field to the global config. Pass `none`, `default`, or `-` to clear it. Written to the global layer only — project configs are authored by hand.",
    examples: [
      {
        cmd: "pragma config set tier apps/lxd",
        note: "scope reads to a tier",
      },
      { cmd: "pragma config set tier none", note: "clear the tier" },
    ],
  },
  {
    field: "channel",
    positional: "name",
    kind: "enum",
    values: CHANNELS,
    summary: "Set the release channel controlling component visibility.",
    doc: "Writes the `channel` field to the global config. Reset by setting the default, `normal`.",
    examples: [
      { cmd: "pragma config set channel experimental" },
      { cmd: "pragma config set channel normal", note: "back to the default" },
    ],
  },
  {
    field: "detail",
    positional: "level",
    kind: "enum",
    values: DETAIL_LEVELS,
    summary: "Set the default progressive-disclosure level.",
    doc: "Writes the `detail` field to the global config. Reset by setting the default, `standard`.",
    examples: [
      { cmd: "pragma config set detail detailed" },
      { cmd: "pragma config set detail standard", note: "back to the default" },
    ],
  },
];
