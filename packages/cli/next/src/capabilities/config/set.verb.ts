/**
 * `config set <key> <value>` — the one-command config setter (ADDITIVE).
 *
 * The user-facing primary form for writing config: `pragma config set tier
 * apps/lxd` instead of the per-field `pragma config tier apps/lxd`. It is purely
 * additive — the frozen `config tier`/`channel`/`detail` verbs stay — and shares
 * their exact write path (`runField` via `runSet`), so it inherits reset
 * sentinels, enum re-validation, and the global-layer-only write for free.
 *
 * Covenant shape: `<key>` is an ENUM over the field names (better completion +
 * validation; the token still emits as `<key>`), `<value>` a free string, so
 * the verb emits `{ v:"set", args:["<key>","<value>"], mutates:true,
 * mcp:"config_set" }` — no flags, storeless, exposed to MCP.
 */

import type { Task } from "@canonical/task";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { configFieldFormatters } from "./field.render.js";
import { CONFIG_FIELDS } from "./fields.js";
import type { ConfigFieldResult } from "./types.js";

/** The writable field names, in covenant order — the `<key>` enum. */
const CONFIG_KEYS = CONFIG_FIELDS.map((field) => field.field);

const setVerb: VerbSpec<Record<string, unknown>, ConfigFieldResult> = {
  path: ["config", "set"],
  summary: "Set a config field by name.",
  doc: "Write a global config field by name — the one-command form of the per-field setters. `key` is one of `tier`, `channel`, or `detail`; the field's own reset rules apply (e.g. `set tier none` clears it). Written to the global layer only — project configs are authored by hand.",
  params: [
    {
      kind: "enum",
      name: "key",
      doc: "The config field to write.",
      values: CONFIG_KEYS,
      required: true,
      positional: true,
    },
    {
      kind: "string",
      name: "value",
      doc: "The value to write (or a field's reset sentinel, e.g. `none`).",
      required: true,
      positional: true,
    },
  ],
  output: { formatters: configFieldFormatters },
  examples: [
    { cmd: "pragma config set tier apps/lxd", note: "scope reads to a tier" },
    { cmd: "pragma config set channel experimental" },
    { cmd: "pragma config set tier none", note: "clear the tier" },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
  },
  // Lazily import the write body (off the fast path); the `Task` arm is the same
  // honest cast the per-field verbs use — see fields.ts.
  run: (params) =>
    import("./runSet.js").then((m) =>
      m.runSet(params),
    ) as unknown as Task<ConfigFieldResult>,
};

/** The `config set` verb. */
export const configSetVerb = asVerb(setVerb);
