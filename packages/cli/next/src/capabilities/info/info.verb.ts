/**
 * The `info` verb spec (noun `info`, self-verb).
 *
 * `run` is a lazy thunk: it dynamic-imports the collector, so building the
 * command tree (help, completion, surface emit) reads this spec without pulling
 * the config reader or zod onto the fast path.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { infoFormatters } from "./info.render.js";
import type { InfoData } from "./types.js";

const infoVerb: VerbSpec<Record<string, unknown>, InfoData> = {
  path: ["info"],
  summary: "Show version, resolved config, provenance, and update status.",
  doc: "Storeless — reports the CLI version, how it was installed, the layered config with per-field origins, an entity total from the pack index, and (network, silent-fail) whether a newer release is available.",
  params: [],
  output: { formatters: infoFormatters },
  examples: [
    { cmd: "pragma info", note: "human-readable summary" },
    {
      cmd: "pragma info --format json",
      note: "the full {ok,data,meta} envelope",
    },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    // Network-aware (PR6 enrichment): the update-check reads the registry. This
    // does NOT affect the emitted surface — `emitVerb` ignores `needsNetwork`.
    needsNetwork: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (_params, runtime) =>
    import("./collectInfo.js").then((m) => m.collectInfo(runtime)),
};

/** The `info` capability module. */
export const infoModule: CapabilityModule = {
  name: "info",
  verbs: [asVerb(infoVerb)],
};
