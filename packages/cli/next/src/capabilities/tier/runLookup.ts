/**
 * The `tier lookup` run body (lazily imported, off the fast path).
 *
 * Bespoke (not a pack lookup): the covenant freezes `tier_lookup` with a SINGLE
 * `<name>` positional, whereas a pack lookup emits the variadic `<name...>`.
 * Resolves the tier by its `ds:name` and returns the blocks scoped directly to
 * it (a joined OPTIONAL, so a tier with no direct members still resolves).
 */

import { PragmaError } from "../../kernel/error/PragmaError.js";
import { compactUri } from "../../kernel/render/compactUri.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { TierLookupData } from "./lookup.render.js";

interface Row {
  readonly uri?: string;
  readonly blockName?: string;
}

/**
 * Look up one tier by name.
 *
 * @param rt - The runtime (its store is booted by the projector for needsStore).
 * @param name - The tier name (its `ds:name`, e.g. `apps/lxd`).
 * @returns The tier's IRI, name, and directly-scoped block names.
 * @throws PragmaError ENTITY_NOT_FOUND when no tier has that name.
 */
export async function runTierLookup(
  rt: PragmaRuntime,
  name: string,
): Promise<TierLookupData> {
  const query = [
    "SELECT ?uri ?blockName WHERE {",
    "  ?uri a ds:Tier ; ds:name ?tierName .",
    `  FILTER(STR(?tierName) = ${JSON.stringify(name)})`,
    "  OPTIONAL { ?block ds:tier ?uri ; ds:name ?blockName }",
    "}",
    "ORDER BY ?blockName",
  ].join("\n");

  const result = (await rt.query.sparql(query)) as {
    type?: string;
    bindings?: Row[];
  };
  const rows = result.type === "select" ? (result.bindings ?? []) : [];
  const uri = rows[0]?.uri;
  if (!uri) {
    throw PragmaError.notFound("tier", name, {
      recovery: {
        message: "List available tiers.",
        cli: "pragma tier list",
        mcp: { tool: "tier_list" },
      },
    });
  }
  const blocks = rows
    .map((row) => row.blockName)
    .filter((block): block is string => Boolean(block));
  return { uri: compactUri(uri, DEFAULT_PREFIX_MAP), name, blocks };
}
