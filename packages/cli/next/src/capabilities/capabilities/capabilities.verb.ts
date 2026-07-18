/**
 * The `capabilities` orientation verb (noun `capabilities`, self-verb).
 *
 * Storeless read: it returns the grammar-derived tool catalog + conventions +
 * discovery sequence an agent reads at session start. It replaces the retired
 * old-shell `llm` tool — the live-context half of that tool (tier/channel/entity
 * counts) is deliberately DROPPED here (it would require a store boot at
 * orientation) and lives in `info` / `config show` / `sources status` instead.
 *
 * `run` is a lazy thunk that dynamic-imports the catalog + the capability
 * registry barrel, so building the command tree never pulls the derivation onto
 * the `--help`/`__complete` fast path, and the tool never boots the store
 * (`store.booted` stays false — the storeless-spy invariant).
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { capabilitiesFormatters } from "./capabilities.render.js";
import type { CapabilitiesData } from "./types.js";

const capabilitiesVerb: VerbSpec<Record<string, unknown>, CapabilitiesData> = {
  path: ["capabilities"],
  summary:
    "Discover pragma conventions, the annotated tool catalog, and the discovery sequence.",
  doc: "Storeless orientation for agents. Returns the conventions (KG / tier-channel / SPARQL model), a 3-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.",
  params: [],
  output: { formatters: capabilitiesFormatters },
  examples: [
    { cmd: "pragma capabilities", note: "the annotated tool catalog" },
    { cmd: "pragma capabilities --format json", note: "the structured map" },
  ],
  capability: {
    needsStore: false,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (_params, _runtime) =>
    Promise.all([import("./catalog.js"), import("../index.js")]).then(
      ([catalog, registry]) =>
        catalog.buildCapabilitiesData(registry.capabilities),
    ),
};

/** The `capabilities` verb, widened for registry composition. */
export const capabilitiesSelfVerb = asVerb(capabilitiesVerb);
