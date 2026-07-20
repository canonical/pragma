/**
 * `tier lookup <name>` — the covenant `tier_lookup` tool.
 *
 * Bespoke store-backed lookup with a SINGLE `<name>` positional (a pack lookup
 * would emit the variadic `<name...>`), so it emits
 * `{ v: "lookup", args: ["<name>"], needsStore: true, mcp: "tier_lookup" }`.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { type TierLookupData, tierLookupFormatters } from "./lookup.render.js";

const tierLookupSpec: VerbSpec<Record<string, unknown>, TierLookupData> = {
  path: ["tier", "lookup"],
  summary: "Show one tier by name, with the blocks scoped to it.",
  doc: "Look up a single tier by its name (e.g. apps/lxd) and list the blocks scoped directly to it.",
  params: [
    {
      kind: "string",
      name: "name",
      doc: "The tier name (e.g. apps/lxd).",
      positional: true,
      required: true,
      complete: { kind: "names", source: { from: "tiers" } },
    },
  ],
  output: { formatters: tierLookupFormatters },
  examples: [{ cmd: "pragma tier lookup apps/lxd" }],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: (params, rt) =>
    import("./runLookup.js").then((m) =>
      m.runTierLookup(rt, String(params.name)),
    ),
};

/** The `tier lookup` verb, widened for registry composition. */
export const tierLookupVerb = asVerb(tierLookupSpec);
