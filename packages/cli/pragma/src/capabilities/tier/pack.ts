/**
 * The bundled `tier` pack — a flat, name-ordered list story.
 *
 * Tier hierarchy is encoded in the slash-separated path string (`apps/lxd`), not
 * in graph edges, so `tier list` is a flat list; the ordered-inheritance logic
 * lives in the block list's tier chain. SPARQL-sourced (a flat-ordered list).
 */

import type { PackDefinition } from "../../kernel/packs/types.js";
import { VOCABULARY } from "../../kernel/vocabulary.js";

/**
 * The class every tier entity carries — pack CONTENT, authored once here.
 *
 * The list query below, the bespoke `tier lookup` and its completion ref all
 * read it, so the noun cannot disagree with itself about what a tier is. It is
 * not promoted to the distribution declaration: no kernel module needs it, and
 * a fork replacing this noun replaces this module wholesale.
 */
export const TIER_TYPE = "ds:Tier";

export const tierPack: PackDefinition = {
  noun: "tier",
  description: "List all tiers in the design system ontology.",
  toolDescription:
    "List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.",
  list: {
    // The name property is the DECLARED one, so what `tier list` shows, what
    // the index offers as completions, and what `tier lookup` matches are one
    // decision made in one place.
    query: [
      "SELECT ?uri ?name WHERE {",
      `  ?uri a ${TIER_TYPE} ;`,
      `       ${VOCABULARY.altName} ?name .`,
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
    ],
  },
};
