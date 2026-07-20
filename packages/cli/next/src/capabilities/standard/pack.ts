/**
 * The bundled `standard` pack — code standards as data.
 *
 * `standard list|lookup|categories|sample` compile from this definition through
 * the one pack kernel. Normalized for v2: the old `digest` level is renamed to
 * the canonical `standard`, so disclosure gates by the canonical index; the
 * default is `summary` (base fields by name), `--detail standard` adds the `dos`
 * examples, `--detail detailed` adds `donts`. `cs:extends` stays the raw IRI in
 * JSON (renderers compact it at display time).
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const standardPack: PackDefinition = {
  noun: "standard",
  description: "List all code standards.",
  toolDescription:
    "List code standards. Optionally filter by category or search term.",
  list: {
    query: [
      "SELECT ?uri ?name ?category ?description",
      "WHERE {",
      "  ?uri a cs:CodeStandard ;",
      "       cs:description ?description .",
      "  OPTIONAL { ?uri cs:name ?n . }",
      '  BIND(COALESCE(?n, REPLACE(STRAFTER(STR(?uri), "#"), "\\\\.", "/")) AS ?name)',
      "  OPTIONAL {",
      "    ?uri cs:hasCategory ?cat .",
      "    ?cat cs:slug ?category .",
      "  }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "category", label: "Category" },
      { field: "description", label: "Description" },
    ],
    filters: [
      {
        param: "category",
        variable: "category",
        description: "Filter by category name.",
      },
    ],
    search: {
      variables: ["name", "description"],
      description: "Search in name and description.",
    },
  },
  verbs: [
    {
      verb: "categories",
      description: "List all standard categories with counts.",
      toolDescription: "List all code standard categories.",
      query: [
        "SELECT ?name (COUNT(?standard) AS ?count)",
        "WHERE {",
        "  ?cat a cs:Category ;",
        "       cs:slug ?name .",
        "  OPTIONAL {",
        "    ?standard a cs:CodeStandard ;",
        "              cs:hasCategory ?cat .",
        "  }",
        "}",
        "GROUP BY ?name",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Category" },
        { field: "count", label: "Standards" },
      ],
    },
  ],
  lookup: {
    source: "sparql",
    by: "cs:name",
    type: "cs:CodeStandard",
    description:
      "Look up detailed information for a standard by name, IRI, or glob.",
    toolDescription:
      "Get detailed information about one or more code standards including dos and donts with code examples. Address standards by name, prefixed name (cs:…), absolute IRI, or glob pattern (react/component/*).",
    fields: [
      {
        name: "category",
        property: "cs:hasCategory/cs:slug",
        label: "Category",
      },
      { name: "description", property: "cs:description", label: "Description" },
      { name: "extends", property: "cs:extends", label: "Extends" },
    ],
    expand: [
      {
        name: "dos",
        heading: "Do",
        relation: "cs:do",
        select: [
          { name: "caption", property: "cs:description" },
          { name: "language", property: "cs:language" },
          { name: "code", property: "cs:code" },
        ],
        level: "standard",
      },
      {
        name: "donts",
        heading: "Don't",
        relation: "cs:dont",
        select: [
          { name: "caption", property: "cs:description" },
          { name: "language", property: "cs:language" },
          { name: "code", property: "cs:code" },
        ],
        level: "detailed",
      },
    ],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "summary",
    },
    sample: {
      description:
        "Return randomly selected complete standard instances as exemplars for shape discovery.",
      toolDescription:
        "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
    },
  },
};
