/**
 * The `colophon` verb spec (noun `colophon`, self-verb).
 *
 * `run` is a lazy thunk: it dynamic-imports the collector, so building the
 * command tree (help, completion, surface emit) reads this spec without pulling
 * the config reader or the registry onto the fast path — identical to
 * `infoVerb` / `doctorVerb` / `capabilitiesVerb`.
 */

import { BIN_NAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { colophonFormatters } from "./colophon.render.js";
import type { ColophonData } from "./types.js";

const colophonVerb: VerbSpec<Record<string, unknown>, ColophonData> = {
  path: ["colophon"],
  summary: `Narrate how ${BIN_NAME} and the active domain are made.`,
  // The doc says what the verb DOES, never what the colophon says. It used to
  // enumerate this distribution's five chapters ("the effect monad, one-
  // grammar-many-projections, …"), which was true only while the narrative was
  // kernel code; it is declared content now, so that sentence became a
  // description of a fork's colophon that a fork does not have — and of a
  // section a distribution may decline to declare at all. It is published in
  // four places (`--help`, the MCP tool description, `commands.md`,
  // `tools.md`), and neither the copy guard nor the fork probe can see it: it
  // names no distribution, it composes `${BIN_NAME}`, and it quotes no command.
  // `colophon.test.ts` holds it to the declaration instead.
  doc: `Storeless — a colophon for the toolchain. Prints the distribution's own section, when ${BIN_NAME} declares one, followed by the domain colophon of each active pack. Every section is authored CONTENT — a Markdown body the distribution or the pack supplies — so this command narrates what it is given rather than a story it carries. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.`,
  params: [],
  output: { formatters: colophonFormatters },
  examples: [
    {
      cmd: `${BIN_NAME} colophon`,
      note: "the toolchain + active domain story",
    },
    {
      cmd: `${BIN_NAME} colophon --format llm`,
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
