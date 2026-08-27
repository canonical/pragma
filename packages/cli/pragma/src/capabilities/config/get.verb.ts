/**
 * `config get <key>` — read ONE resolved config value, scriptably.
 *
 * `config show` dumps everything with provenance; scripting one value out of
 * it needed `--format json` plus a JSON tool. `get` prints the bare resolved
 * value on stdout (an unset field prints nothing, exit 0), so shell
 * substitution works directly; the json form carries the field, the value,
 * and the layer that supplied it.
 *
 * The plain and llm forms are the SAME bare value, which is the one place in
 * the grammar where those two forms may not differ: `TIER=$(… config get
 * tier)` pipes stdout, and a pipe auto-selects llm, so a decorated llm line
 * would put backticks and a provenance clause into the variable the command
 * exists to fill. Provenance has a home already — `--format json` here, and
 * `config show` for the whole picture.
 */

import { BIN_NAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { Formatters, VerbSpec } from "../../kernel/spec/index.js";
import { CONFIG_FIELDS } from "./fields.js";
import type { ConfigGetData } from "./types.js";

/** The readable field names — the `<key>` enum, in covenant order. */
const CONFIG_KEYS = CONFIG_FIELDS.map((field) => field.field);

/** The bare value, or nothing at all when the field is unset. */
const bareValue = (data: ConfigGetData): string =>
  data.value === undefined ? "" : String(data.value);

const configGetFormatters: Formatters<ConfigGetData> = {
  // The bare value IS the contract: `TIER=$(pragma config get tier)`.
  plain: bareValue,
  llm: bareValue,
  json: (data) => JSON.stringify(data),
};

const getVerb: VerbSpec<Record<string, unknown>, ConfigGetData> = {
  path: ["config", "get"],
  summary: "Print one resolved config value.",
  doc: "Reads the effective value of a single field after layering — built-in defaults, the global config, and the nearest project config. Prints the bare value (nothing when the field is unset), so the output substitutes directly into a shell.",
  params: [
    {
      kind: "enum",
      name: "key",
      doc: "The config field to read.",
      values: CONFIG_KEYS,
      required: true,
      positional: true,
    },
  ],
  output: { formatters: configGetFormatters },
  examples: [
    { cmd: `${BIN_NAME} config get tier` },
    { cmd: `${BIN_NAME} config get channel --format json` },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (params, runtime) =>
    import("./runGet.js").then((m) => m.runGet(params, runtime)),
};

/** The `config get` verb. */
export const configGetVerb = asVerb(getVerb);
