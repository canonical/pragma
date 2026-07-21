/**
 * The bundled `concept` pack — standalone design-system documentation as data.
 *
 * A `ds:Concept` is documentation NOT bound to a single UIBlock: cross-cutting
 * guides, disambiguations, foundations, decisions (e.g. "Foundations: Grid",
 * "How to differentiate components"). `concept list` is a SPARQL SELECT over
 * `ds:Concept`; `concept lookup` renders the long-form Markdown `ds:content`
 * body as a fenced code section, alongside the summary, type, and tier.
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const conceptPack: PackDefinition = {
  noun: "concept",
  description: "List design-system concepts (standalone documentation).",
  toolDescription:
    "List design-system concepts — standalone documentation not bound to a single component (foundations, disambiguations, decision guides). Use when browsing cross-cutting design guidance. Example: concept_list {}.",
  list: {
    query: [
      "SELECT ?uri ?name ?type ?tier ?summary",
      "WHERE {",
      "  ?uri a ds:Concept ;",
      "       ds:name ?name .",
      "  OPTIONAL { ?uri ds:conceptType ?typeUri . ?typeUri ds:name ?type }",
      "  OPTIONAL { ?uri ds:tier ?tierUri . ?tierUri ds:name ?tier }",
      "  OPTIONAL { ?uri ds:summary ?summary }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "type", label: "Type" },
      { field: "tier", label: "Tier" },
    ],
    search: {
      variables: ["name", "summary", "type"],
    },
    emptyRecovery: {
      message:
        "No concepts in the store. Build it from the configured design-system packages.",
      cli: "pragma sources update",
    },
  },
  lookup: {
    source: "sparql",
    by: "ds:name",
    type: "ds:Concept",
    toolDescription:
      'Get the full documentation body of one or more concepts by name — the Markdown content, summary, type, and tier. Use when you need the actual guidance a concept documents. Example: concept_lookup { name: ["Foundations: Grid"] }.',
    fields: [
      { name: "type", property: "ds:conceptType", label: "Type" },
      { name: "tier", property: "ds:tier", label: "Tier" },
    ],
    sections: [
      {
        name: "summary",
        property: "ds:summary",
        label: "Summary",
        kind: "field",
      },
      {
        name: "content",
        property: "ds:content",
        label: "Content",
        kind: "code",
      },
      {
        name: "knownEdgeCases",
        property: "ds:knownEdgeCases",
        label: "Known edge cases",
        kind: "field",
      },
    ],
    sample: {
      toolDescription:
        "Return randomly selected complete concepts (with their Markdown body) as exemplars. Use BEFORE writing queries to see actual data shapes.",
    },
  },
};
