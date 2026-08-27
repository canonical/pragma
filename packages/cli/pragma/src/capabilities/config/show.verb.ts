/**
 * The `config show` verb spec (noun `config`, verb `show`).
 *
 * Storeless read; `run` lazily imports the collector. Config *setters* are a
 * later PR — this ships only the reader.
 */

import { BIN_NAME, PROJECT_CONFIG_FILENAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/index.js";
import { configGetVerb } from "./get.verb.js";
import { configSetVerb } from "./set.verb.js";
import { configShowFormatters } from "./show.render.js";
import type { ConfigShowData } from "./types.js";
import { configUnsetVerb } from "./unset.verb.js";

const showVerb: VerbSpec<Record<string, unknown>, ConfigShowData> = {
  path: ["config", "show"],
  summary: "Show the resolved config and per-field provenance.",
  doc: `Merges built-in defaults, the global XDG config, and the nearest ${PROJECT_CONFIG_FILENAME}, marking which layer supplied each value.`,
  params: [],
  output: { formatters: configShowFormatters },
  examples: [
    { cmd: `${BIN_NAME} config show` },
    { cmd: `${BIN_NAME} config show --format json` },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (_params, runtime) =>
    import("./collectConfigShow.js").then((m) => m.collectConfigShow(runtime)),
};

/**
 * The `config` capability module, emitted in covenant order: the `show`
 * reader, the `get <key>` single-value reader, the `set <key> <value>`
 * writer, and the `unset <key>` clearer. The per-field `tier`/`channel`/
 * `detail` verbs were retired in favour of `config set` (AV-228 B3);
 * clearing moved from a magic `set` value to its own verb.
 */
export const configModule: CapabilityModule = {
  name: "config",
  verbs: [asVerb(showVerb), configGetVerb, configSetVerb, configUnsetVerb],
};
