/**
 * The `capabilities` orientation verb (noun `capabilities`, self-verb).
 *
 * Storeless read: it returns the grammar-derived tool catalog + conventions +
 * discovery sequence an agent reads at session start. Live context
 * (tier/channel/entity counts) is deliberately NOT here — it would require a
 * store boot at orientation — and lives in `info` / `config show` /
 * `sources status` instead.
 *
 * `run` is a lazy thunk that dynamic-imports the catalog, the capability
 * registry barrel and the dispatch-time merge, so building the command tree
 * never pulls the derivation onto the `--help`/`__complete` fast path, and the
 * tool never boots the store (`store.booted` stays false — the storeless-spy
 * invariant).
 *
 * It reports the EFFECTIVE modules, not the static registry: the MCP server
 * registers its tools from the same merge, so a catalog built from the static
 * set would omit exactly the config- and package-declared nouns `tools/list`
 * advertises — the hand-maintained drift this catalog exists to end. With no
 * declared stories the merge returns the registry by identity, so the payload is
 * unchanged.
 *
 * `doc`'s parenthetical enumerates the four conventions and must track
 * `CONVENTIONS` in `kernel/orientation.ts`. It is the FIRST writing an agent reads — MCP
 * `tools/list` serves it before the tool is ever called — so a stale one sets
 * an expectation the payload then denies. It named a tier/channel scoping model
 * after `CONVENTIONS.model` had been rewritten to state that reads are
 * unscoped, which told agents to reach for `config_set` to narrow a read that
 * narrows for nobody.
 */

import { BIN_NAME } from "../../constants.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { capabilitiesFormatters } from "./capabilities.render.js";
import type { CapabilitiesData } from "./types.js";

const capabilitiesVerb: VerbSpec<Record<string, unknown>, CapabilitiesData> = {
  path: ["capabilities"],
  summary: `Discover ${BIN_NAME} conventions, the annotated tool catalog, and the discovery sequence.`,
  doc: "Storeless orientation for agents. Returns the four conventions (what this server is, the UNSCOPED read rule, SPARQL/prefixed-IRI addressing, and the plan-first mutation gate), a four-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.",
  params: [],
  output: { formatters: capabilitiesFormatters },
  examples: [
    { cmd: `${BIN_NAME} capabilities`, note: "the annotated tool catalog" },
    {
      cmd: `${BIN_NAME} capabilities --format json`,
      note: "the structured map",
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
  run: async (_params, runtime) => {
    const [catalog, registry, collect] = await Promise.all([
      import("./catalog.js"),
      import("../index.js"),
      import("../../kernel/packs/collect.js"),
    ]);
    const { modules } = await collect.loadEffectiveModules(
      registry.capabilities,
      runtime.cwd,
    );
    return catalog.buildCapabilitiesData(modules);
  },
};

/** The `capabilities` verb, widened for registry composition. */
export const capabilitiesSelfVerb = asVerb(capabilitiesVerb);
