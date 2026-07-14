/**
 * Standard-noun parity pilot fixtures.
 *
 * The built-in `standard` list/lookup read stories re-expressed as a v0
 * story-pack definition, plus the honest record of what v0 cannot yet
 * reproduce. Together they form the pilot's contract: the definition is
 * asserted byte-compatible with the built-in output where the format
 * reaches (`standardParity.test.ts`), and every remaining divergence
 * must appear in {@link PARITY_GAPS} rather than being papered over.
 */

import type { StoryPackDefinition } from "../domains/shared/stories/pack/types.js";

/**
 * The built-in `standard` stories as a declarative pack definition.
 *
 * The list SELECT mirrors the query `listStandards` sends the store,
 * with variables renamed to the built-in's output fields (`?standard` →
 * `?uri`, `?categoryName` → `?category`) so pack rows carry the same
 * keys as the built-in summary items. The lookup mirrors the built-in
 * title and inline fields as far as v0 reaches — {@link PARITY_GAPS}
 * lists what it cannot express.
 */
export const STANDARD_PACK_STORY: StoryPackDefinition = {
  noun: "standard",
  description: "List all code standards",
  list: {
    query: [
      "SELECT ?uri ?name ?category ?description",
      "WHERE {",
      "  ?uri a cs:CodeStandard ;",
      "       cs:name ?name ;",
      "       cs:description ?description .",
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
  },
  lookup: {
    type: "cs:CodeStandard",
    by: "cs:name",
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
  },
};

/**
 * Every place the v0 pack format cannot reproduce the built-in standard
 * stories — the pilot's primary output. Each entry names the concrete
 * missing pack-format capability; remove an entry only when the format
 * gains the capability and the parity test asserts it.
 */
export const PARITY_GAPS: readonly string[] = [
  "list params: packs declare no story parameters, so the built-in --category and --search filters (and their MCP tool arguments) cannot be expressed",
  "list disclosure: no digest/detailed progressive-disclosure levels — the built-in --digest/--detailed flags enrich rows with extends/example/dos/donts and add disclosure meta to the MCP envelope; pack lists always render summary rows",
  "list empty guard: the built-in raises EMPTY_RESULTS with an install-hint recovery when no standards load; the pack format has no emptyError hook, so a pack list renders nothing",
  "list plain template: packs render the shared aligned-column table; the built-in renders stacked `name [category]` blocks with an indented description — v0 columns carry no layout or template control",
  "list llm template: pack headings are `## <Noun> (<count>)` with `` `iri` — **name** value | value `` items; the built-in emits `## Standards` with `- **name** [category]` plus an indented description line — heading text and item template are not authorable",
  "lookup uri field: the entity IRI cannot be declared as an inline field — v0 fields are property-derived, and a field named `uri` generates a duplicate ?uri SELECT variable the store rejects; the built-in renders `URI: cs:...` as its first lookup field",
  "lookup property paths: `category` needs the two-hop path cs:hasCategory/cs:slug; the documented v0 `property` contract is a single predicate, and the path only passes validation because the prefixed-name pattern rejects `/` in the first character alone — multi-hop fields need first-class support",
  "lookup data compaction: the built-in compacts `extends` in resolved data (JSON shows `cs:ComponentFolderStructure`); pack rows keep the raw IRI, so lookup JSON diverges for standards with cs:extends (plain/llm still match because renderers compact at display time)",
  "lookup sections: dos/donts (cs:do/cs:dont → Example nodes with description/language/code) cannot be declared — v0 sections are single-valued field/code kinds, and the generated single-row lookup query cannot collect arrays of structured code blocks",
  "lookup detailed toggle: no detailedParam — the built-in CLI adds Do/Don't sections under --detailed and MCP defaults to detailed with a summary projection (project); a pack lookup has one fixed output shape",
  "lookup empty placeholders: the built-in renders `Category: —` for a standard without a category; pack renderers skip empty fields — no fallback/placeholder declaration (every current standard has a category, so outputs match today)",
  "lookup glob expansion: the built-in expands glob queries (e.g. `react/*`) via expandLookupQueries before resolving; pack lookups pass names through verbatim",
  "lookup by IRI: the built-in resolves an IRI or prefixed name (e.g. `cs:ComponentProps`) as the query; a pack lookup only matches the `by` property's string value, and only case-insensitively — exact-match semantics are not selectable",
  "lookup recovery copy: built-in not-found errors carry cross-domain hints and the recovery message `List available standards.`; pack errors generate `List available standard entries.` — recovery copy is not authorable",
  "lookup descriptions and examples: the pack lookup CLI description, tool description, names description, and examples are generated from the noun; the built-in curates all of them (e.g. `Look up detailed information for a standard by name or IRI`)",
  "ink renderers: the built-in stories declare renderInk TUI views; the pack format has none",
  "extra verbs: the standard noun also ships `categories` and `sample` commands; v0 packs compile only list and lookup",
  "noun cutover: a pack story cannot register the noun `standard` while the built-in exists (reserved-noun guard in collectPackStories), so cutover must remove the built-in stories in the same release",
];
