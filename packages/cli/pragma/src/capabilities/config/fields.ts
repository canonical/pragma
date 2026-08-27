/**
 * The config field table — one declarative row per writable field. Since AV-228
 * B3 retired the per-field `config tier`/`channel`/`detail` verbs, this table no
 * longer emits verbs of its own: it is the shared source of truth that drives
 * `config set <key> <value>` and `config get`/`config unset` (via `runSet` →
 * `runField`), giving each its `<key>` enum, enum validation, and positional
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
}

/**
 * Values `config set` refuses for a FREE-STRING field: clearing a field is a
 * command (`config unset <key>`), not a magic value — a value spelled `none`
 * conflated "remove the field" with "set it to the string none". They stay
 * reserved (rather than becoming writable) so the strings cannot silently
 * change meaning; the rejection names `unset` as the owner of the job.
 */
export const RESERVED_CLEAR_VALUES: readonly string[] = [
  "none",
  "default",
  "-",
];

/**
 * The three writable fields. `channel`/`detail` are fixed enums;
 * `tier` is a free string, cleared with `config unset tier`.
 */
export const CONFIG_FIELDS: readonly ConfigFieldSpec[] = [
  {
    field: "tier",
    positional: "path",
    kind: "string",
  },
  {
    field: "channel",
    positional: "name",
    kind: "enum",
    values: CHANNELS,
  },
  {
    field: "detail",
    positional: "level",
    kind: "enum",
    values: DETAIL_LEVELS,
  },
];
