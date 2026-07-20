/**
 * The `colophon` verb spec (noun `colophon`, self-verb).
 *
 * `run` is a lazy thunk: it dynamic-imports the collector, so building the
 * command tree (help, completion, surface emit) reads this spec without pulling
 * the config reader or the registry onto the fast path — identical to
 * `infoVerb` / `doctorVerb` / `capabilitiesVerb`.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { colophonFormatters } from "./colophon.render.js";
import type { ColophonData } from "./types.js";

const colophonVerb: VerbSpec<Record<string, unknown>, ColophonData> = {
  path: ["colophon"],
  summary: "Narrate how pragma and the active domain are made.",
  doc: "Storeless — a colophon for the toolchain. Prints pragma's own story (the effect monad, one-grammar-many-projections, the render/LLM-output model, storeless modularity, and the domain-as-data pack model) followed by the active pack's domain colophon. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.",
  params: [],
  output: { formatters: colophonFormatters },
  examples: [
    { cmd: "pragma colophon", note: "the toolchain + active domain story" },
    {
      cmd: "pragma colophon --format llm",
      note: "condensed Markdown for agents",
    },
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
    import("./collectColophon.js").then((m) => m.collectColophon(runtime)),
};

/** The `colophon` capability module (a single storeless self-verb). */
export const colophonModule: CapabilityModule = {
  name: "colophon",
  verbs: [asVerb(colophonVerb)],
};
