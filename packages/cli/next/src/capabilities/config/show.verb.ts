/**
 * The `config show` verb spec (noun `config`, verb `show`).
 *
 * Storeless read; `run` lazily imports the collector. Config *setters* are a
 * later PR — this ships only the reader.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { configFieldVerbs } from "./fields.js";
import { configShowFormatters } from "./show.render.js";
import type { ConfigShowData } from "./types.js";

const showVerb: VerbSpec<Record<string, unknown>, ConfigShowData> = {
  path: ["config", "show"],
  summary: "Show the resolved config and per-field provenance.",
  doc: "Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.",
  params: [],
  output: { formatters: configShowFormatters },
  examples: [
    { cmd: "pragma config show" },
    { cmd: "pragma config show --format json" },
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
 * The `config` capability module: the `show` reader (PR1) plus the storeless
 * `tier`/`channel`/`detail` setters (PR6), emitted in covenant order.
 */
export const configModule: CapabilityModule = {
  name: "config",
  verbs: [asVerb(showVerb), ...configFieldVerbs],
};
