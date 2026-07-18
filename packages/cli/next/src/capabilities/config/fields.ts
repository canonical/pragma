/**
 * The config field table — one declarative row per writable field drives all
 * three setters (`tier` / `channel` / `detail`), the way the pack grammar
 * compiles read verbs from a table.
 *
 * Covenant-exact emission is the hard gate (surfaceConformance): each verb must
 * `emitVerb` to `{ v:<field>, args:["<positional>"], mutates:true,
 * mcp:"config_<field>" }` — one REQUIRED positional, NO flags, NO needsStore
 * (config setters are storeless; the old store-backed `validateTier` is dropped
 * — PARITY_GAP `config-tier-no-ontology-validation`). The factory produces
 * exactly that shape; the `field.test.ts` deep-equals the golden slice.
 */

import type { Task } from "@canonical/task";
import { DETAIL_LEVELS } from "../../constants.js";
import type { RawConfig } from "../../kernel/config/types.js";
import { CHANNELS } from "../../kernel/config/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { ParamSpec, VerbSpec } from "../../kernel/spec/types.js";
import { configFieldFormatters } from "./field.render.js";
import type { ConfigFieldResult } from "./types.js";

/** One writable config field and how its single positional is shaped/validated. */
export interface ConfigFieldSpec {
  /** The `RawConfig` key written (also the verb label + `config_<field>` tool). */
  readonly field: keyof RawConfig & ("tier" | "channel" | "detail");
  /** The positional param NAME — its usage token is `<positional>` (covenant). */
  readonly positional: string;
  /** A free string (`tier`) or a fixed enum (`channel` / `detail`). */
  readonly kind: "string" | "enum";
  /** The allowed values for an enum field. */
  readonly values?: readonly string[];
  /** One-line verb summary. */
  readonly summary: string;
  /** Extended help doc. */
  readonly doc: string;
  /** Reserved values that REMOVE the field instead of setting it. */
  readonly resetSentinel?: readonly string[];
  /** Verb help examples. */
  readonly examples: readonly { cmd: string; note?: string }[];
}

/**
 * The three writable fields. Only `tier` (a free string with a meaningful
 * "no value") carries reset sentinels; `channel`/`detail` reset by setting
 * their default (`normal`/`standard`) — no `--reset` flag exists, because a
 * flag would emit `flags:[...]` and break the covenant (PARITY_GAP
 * `config-field-reset-sentinel`). Query is `config show` — the covenant gives
 * each setter exactly ONE required positional, so a no-arg "print current" mode
 * is impossible here (PARITY_GAP `config-field-query-via-show`).
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
      { cmd: "pragma config tier apps/lxd", note: "scope reads to a tier" },
      { cmd: "pragma config tier none", note: "clear the tier" },
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
      { cmd: "pragma config channel experimental" },
      { cmd: "pragma config channel normal", note: "back to the default" },
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
      { cmd: "pragma config detail detailed" },
      { cmd: "pragma config detail standard", note: "back to the default" },
    ],
  },
];

/** The single required positional for a field, shaped per its `kind`. */
function fieldPositional(spec: ConfigFieldSpec): ParamSpec {
  const doc = `The ${spec.field} value to write.`;
  if (spec.kind === "enum") {
    return {
      kind: "enum",
      name: spec.positional,
      doc,
      values: spec.values ?? [],
      required: true,
      positional: true,
    };
  }
  return {
    kind: "string",
    name: spec.positional,
    doc,
    required: true,
    positional: true,
  };
}

/**
 * Build one storeless, mutating config setter from a field spec.
 *
 * `run` lazily imports the write body and presents `Promise<Task<R>>` through
 * the `Task<R>` arm by the honest cast (the same seam `sources update` uses) —
 * a literal `Promise<Task>` union arm would poison async read-verb inference.
 *
 * @param spec - The field-table row.
 * @returns The verb spec for `config <field>`.
 */
export function fieldVerb(
  spec: ConfigFieldSpec,
): VerbSpec<Record<string, unknown>, ConfigFieldResult> {
  return {
    path: ["config", spec.field],
    summary: spec.summary,
    doc: spec.doc,
    params: [fieldPositional(spec)],
    output: { formatters: configFieldFormatters },
    examples: [...spec.examples],
    capability: {
      needsStore: false,
      mutates: true,
      mcp: {
        expose: true,
        annotations: { readOnlyHint: false, openWorldHint: false },
      },
    },
    run: (params) =>
      import("./runField.js").then((m) =>
        m.runField(spec, params),
      ) as unknown as Task<ConfigFieldResult>,
  };
}

/** The three config setters, in covenant order (tier, channel, detail). */
export const configFieldVerbs: VerbSpec[] =
  CONFIG_FIELDS.map(fieldVerb).map(asVerb);
