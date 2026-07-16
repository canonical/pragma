/**
 * Bundled transitional `standard` pack.
 *
 * Replaces the hand-written `standard` domain (~1,300 LOC of command/
 * operation/formatter/orchestration/MCP wiring) with a declarative pack
 * definition. `standard list|lookup|categories|sample` and the
 * `standard_list|_lookup|_categories|_sample` MCP tools compile from this
 * definition through the same kernel as every other pack, so the CLI core
 * stops carrying standard-specific TypeScript.
 *
 * @remarks transitional — this ships inside pragma today; in P4 it moves
 * into the `@canonical/code-standards` package as `stories/standard.json`
 * alongside that package's prefix declaration, at which point the core
 * carries no standard at all.
 *
 * Scope notes (semantic parity, not byte parity — see standardParity.test):
 * - Rows/entities are the uniform pack shapes: the list SELECT binds the
 *   standard IRI to `uri` and renames `categoryName` → `category`, so JSON
 *   carries the same keys as the old summary items.
 * - The old domain's `--digest`/`--detailed` LIST enrichment is not
 *   reproduced (pack lists have a single level); the same data is reachable
 *   through `standard lookup --detail …` and `standard sample`.
 * - Lookup disclosure keeps three levels. The old digest's bespoke
 *   "first do-example truncated to 120 chars" rendering is not expressible
 *   generically; here `digest` gates the full `dos` expand (richer than the
 *   old digest) and `detailed` adds `donts`.
 * - `extends` stays the raw IRI in JSON (renderers compact it at display
 *   time); the old domain compacted it in resolved data.
 */

import type { StoryPackDefinition } from "../types.js";

/**
 * The `standard` read stories as data.
 *
 * The list SELECT mirrors the query the old `listStandards` operation sent
 * the store — `cs:name` and the category path stay OPTIONAL so a standard
 * without a display name or category still appears — while `ORDER BY ?name`
 * sorts by the human-facing name. The BIND reproduces the old
 * `deriveStandardName` fallback declaratively: a standard without `cs:name`
 * displays its IRI fragment with dots rendered as slashes
 * (`…#react.component.props` → `react/component/props`). Category filtering
 * is value-free (the category set lives in the graph) and search covers
 * name + description; both are post-query row predicates, so user input
 * never touches this query text.
 */
export const standardPack: StoryPackDefinition = {
  noun: "standard",
  description: "List all code standards",
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
        description: "Filter by category name",
      },
    ],
    search: {
      variables: ["name", "description"],
      description: "Search in name and description",
    },
  },
  verbs: [
    {
      verb: "categories",
      description: "List all standard categories with counts",
      toolDescription: "List all code standard categories.",
      // OPTIONAL keeps zero-count categories in the result (a category with
      // no standards still lists, with count 0), mirroring the old
      // listCategories operation.
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
    by: "cs:name",
    type: "cs:CodeStandard",
    description: "Look up detailed information for a standard by name or IRI",
    toolDescription:
      "Get detailed information about one or more code standards including dos and donts with code examples.",
    fields: [
      {
        name: "category",
        property: "cs:hasCategory/cs:slug",
        label: "Category",
      },
      {
        name: "description",
        property: "cs:description",
        label: "Description",
      },
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
        level: "digest",
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
    disclosure: { levels: ["summary", "digest", "detailed"] },
    sample: {
      description:
        "Return randomly selected complete standard instances as exemplars for shape discovery",
      toolDescription:
        "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
    },
  },
};
