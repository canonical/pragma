/**
 * The bundled `token` pack — design tokens as data.
 *
 * SPARQL-sourced on both verbs: there is no `ds:Token` GraphQL type to project
 * against when the graph ships no tokens, and the lookup reads a property path
 * (`ds:tokenType/rdfs:label`) only SPARQL can express. `token add-config` (a
 * mutation) is out of PR3; the `emptyRecovery` install hint is the story users
 * see on an empty store.
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const tokenPack: PackDefinition = {
  noun: "token",
  description: "List all design tokens.",
  toolDescription:
    "List all design tokens with their type. Use when browsing which tokens exist under the active scope. Example: token_list {}.",
  list: {
    query: [
      "SELECT ?uri ?name ?category WHERE {",
      "  ?uri a ds:Token ;",
      "       ds:tokenId ?name .",
      "  OPTIONAL {",
      "    ?uri ds:tokenType ?type .",
      "    ?type rdfs:label ?category .",
      "  }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "category", label: "Type" },
    ],
    emptyRecovery: {
      message:
        "No tokens in the store. Build it from the configured design-system packages.",
      cli: "pragma sources update",
    },
  },
  lookup: {
    source: "sparql",
    by: "ds:tokenId",
    type: "ds:Token",
    toolDescription:
      'Get type and theme values for one or more design tokens by name. Use when resolving specific tokens\' light/dark values. Example: token_lookup { names: ["color.primary"] }.',
    fields: [
      { name: "category", property: "ds:tokenType/rdfs:label", label: "Type" },
      { name: "valueLight", property: "ds:valueLight", label: "Light value" },
      { name: "valueDark", property: "ds:valueDark", label: "Dark value" },
    ],
    sample: {
      fixedCount: true,
      toolDescription:
        "Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes.",
    },
  },
};
