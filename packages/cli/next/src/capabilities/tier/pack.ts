/**
 * The bundled `tier` pack — a flat, name-ordered list story.
 *
 * Tier hierarchy is encoded in the slash-separated path string (`apps/lxd`), not
 * in graph edges, so `tier list` is a flat list; the ordered-inheritance logic
 * lives in the block list's tier chain. SPARQL-sourced (a flat-ordered list).
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const tierPack: PackDefinition = {
  noun: "tier",
  description: "List all tiers in the design system ontology.",
  toolDescription:
    "List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.",
  list: {
    query: [
      "SELECT ?uri ?name WHERE {",
      "  ?uri a ds:Tier ;",
      "       ds:name ?name .",
      "} ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
    ],
  },
};
