/**
 * `config unset <key>` — clear one config field.
 *
 * Clearing is a COMMAND, not a magic value: `config set` refuses the values
 * that used to double as clear-markers, and this verb owns the job. Removes
 * the field from the global layer so the built-in default (or a project
 * config) applies again; project configs are authored by hand and never
 * written here.
 */

import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { configFieldFormatters } from "./field.render.js";
import { CONFIG_FIELDS } from "./fields.js";
import type { ConfigFieldResult } from "./types.js";

/** The clearable field names — the `<key>` enum, in covenant order. */
const CONFIG_KEYS = CONFIG_FIELDS.map((field) => field.field);

const unsetVerb: VerbSpec<Record<string, unknown>, ConfigFieldResult> = {
  path: ["config", "unset"],
  summary: "Clear a config field by name.",
  doc: "Removes a field from the global config so the built-in default (or a project config) applies again. The counterpart of `config set` — setting writes a value, unsetting removes one; no value doubles as a remove-marker.",
  params: [
    {
      kind: "enum",
      name: "key",
      doc: "The config field to clear.",
      values: CONFIG_KEYS,
      required: true,
      positional: true,
    },
  ],
  output: { formatters: configFieldFormatters },
  examples: [
    { cmd: `${BIN_NAME} config unset tier`, note: "read the full graph again" },
    { cmd: `${BIN_NAME} config unset channel` },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
  },
  // Lazily import the write body (off the fast path); the `Task` arm is the
  // same honest cast `config set` uses.
  run: (params) =>
    import("./runSet.js").then((m) =>
      m.runUnset(params),
    ) as unknown as Task<ConfigFieldResult>,
};

/** The `config unset` verb. */
export const configUnsetVerb = asVerb(unsetVerb);
