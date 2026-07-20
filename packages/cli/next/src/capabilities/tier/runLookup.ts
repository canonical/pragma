/**
 * The `tier lookup` run body (lazily imported, off the fast path).
 *
 * Bespoke (not a pack lookup): the covenant freezes `tier_lookup` with a SINGLE
 * `<name>` positional, whereas a pack lookup emits the variadic `<name...>`.
 * Resolves the tier by its `ds:name` and returns the blocks scoped directly to
 * it (a joined OPTIONAL, so a tier with no direct members still resolves).
 */

import { PragmaError } from "../../kernel/error/PragmaError.js";
import { runSelect } from "../../kernel/packs/sparql/runSelect.js";
import { suggestNames } from "../../kernel/project/cli/suggestNames.js";
import { compactUri } from "../../kernel/render/compactUri.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { TierLookupData } from "./lookup.render.js";

/**
 * Read every tier name in the store (its `ds:name`), ordered.
 *
 * The bespoke lookup already holds the machinery to reach the store, so a
 * name-not-found can rank "did you mean?" candidates the same way every other
 * entity lookup does — the tier list is a single cheap SELECT away.
 *
 * @param rt - The runtime (its store is booted by the projector for needsStore).
 * @returns The tier names, ordered.
 * @note Impure — queries the store through `runSelect`.
 */
async function selectTierNames(rt: PragmaRuntime): Promise<string[]> {
  const rows = await runSelect(
    rt,
    "SELECT ?name WHERE { ?tier a ds:Tier ; ds:name ?name } ORDER BY ?name",
    "tier",
  );
  return rows
    .map((row) => row.name as string | undefined)
    .filter((name): name is string => Boolean(name));
}

/**
 * Look up one tier by name.
 *
 * @param rt - The runtime (its store is booted by the projector for needsStore).
 * @param name - The tier name (its `ds:name`, e.g. `apps/lxd`).
 * @returns The tier's IRI, name, and directly-scoped block names.
 * @throws PragmaError ENTITY_NOT_FOUND when no tier has that name;
 *   STORE_UNAVAILABLE (exit 3) when the store is unseeded for this project.
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

  // Route through `runSelect` (not `rt.query.sparql` directly) so a cold/unseeded
  // store — a generated `ds:` query hitting an unknown prefix — is remapped to an
  // actionable STORE_UNAVAILABLE with `pragma sources update` recovery, instead of
  // a raw "Prefix not found" collapsing to INTERNAL_ERROR at the boundary.
  const rows = await runSelect(rt, query, "tier");
  const uri = rows[0]?.uri;
  if (!uri) {
    // Rank "did you mean?" candidates from the full tier list — the only entity
    // lookup that used to omit suggestions, though (like the others) it has the
    // names in hand. The suggestion query runs only on this cold, not-found path.
    const suggestions = suggestNames(name, await selectTierNames(rt));
    throw PragmaError.notFound("tier", name, {
      suggestions,
      recovery: {
        message: "List available tiers.",
        cli: "pragma tier list",
        mcp: { tool: "tier_list" },
      },
    });
  }
  const blocks = rows
    // `blockName` rides an OPTIONAL, so the key is absent for a memberless tier.
    .map((row) => row.blockName as string | undefined)
    .filter((block): block is string => Boolean(block));
  return { uri: compactUri(uri, DEFAULT_PREFIX_MAP), name, blocks };
}
