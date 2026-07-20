/**
 * The bundled `modifier` pack — modifier families as data.
 *
 * `modifier list` is SPARQL (an alternation path collects values asserted in
 * either direction); `modifier lookup` is GRAPHQL, where the compiled
 * `ModifierFamily.modifiers` field is the declared-inverse union and resolves
 * both directions in ONE generated document — exactly the case the GraphQL fetch
 * path exists for.
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const modifierPack: PackDefinition = {
  noun: "modifier",
  description: "List all modifier families.",
  toolDescription:
    "List all modifier families with their values. Use when browsing which modifier families exist and the values each allows. Example: modifier_list {}.",
  list: {
    query: [
      "SELECT ?uri ?name",
      '       (GROUP_CONCAT(DISTINCT ?valueName; separator=", ") AS ?values)',
      "WHERE {",
      "  ?uri a ds:ModifierFamily ;",
      "       ds:name ?name .",
      "  OPTIONAL {",
      "    ?uri (ds:hasModifier|^ds:modifierFamily) ?value .",
      "    ?value ds:name ?valueName .",
      "  }",
      "}",
      "GROUP BY ?uri ?name",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "values", label: "Values" },
    ],
    emptyRecovery: {
      message:
        "No modifier families in the store. Build it from the configured design-system packages.",
      cli: "pragma sources update",
    },
  },
  lookup: {
    source: "graphql",
    by: "ds:name",
    type: "ds:ModifierFamily",
    toolDescription:
      'Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { names: ["importance"] }.',
    expand: [
      {
        name: "values",
        heading: "Values",
        relation: "ds:hasModifier",
        select: [{ name: "name", property: "ds:name" }],
      },
    ],
    sample: {
      fixedCount: true,
      toolDescription:
        "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.",
    },
  },
};
