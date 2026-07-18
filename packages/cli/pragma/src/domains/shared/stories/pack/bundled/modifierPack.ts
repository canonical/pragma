/**
 * Bundled transitional `modifier` pack.
 *
 * Replaces the hand-written `modifier` read wrappers (`modifier list`,
 * `modifier lookup` and their MCP twins) with a declarative story;
 * `modifier sample` stays a built-in until the generic pack sample verb
 * lands. Same tool/command names, same entities and values — compiled
 * through the shared pack kernel.
 *
 * @remarks transitional — ships inside pragma today; in P4 it moves into
 * the `@canonical/design-system` package as `stories/modifier.json`.
 *
 * Data-reality notes (live graph):
 * - Family↔value links are asserted in BOTH directions inconsistently:
 *   some families carry forward `ds:hasModifier`, some values carry only
 *   the reverse `ds:modifierFamily`. The list query walks the alternation
 *   path; the lookup uses `source: "graphql"`, where the compiled
 *   `ModifierFamily.modifiers` field is the declared-inverse union and
 *   resolves both directions in one generated document — this is exactly
 *   the case the GraphQL fetch path exists for.
 * - `ds:name` is the family's display name; matching is case-insensitive.
 */

import type { StoryPackDefinition } from "../types.js";

/** The `modifier` read stories as data. */
export const modifierPack: StoryPackDefinition = {
  noun: "modifier",
  description: "List all modifier families",
  toolDescription:
    "List all modifier families with their values. Use when browsing which " +
    "modifier families exist and the values each allows. Example: " +
    "modifier_list {}.",
  list: {
    // The alternation path (forward ds:hasModifier | reverse
    // ds:modifierFamily) collects values regardless of which direction the
    // data asserts; GROUP_CONCAT flattens them into one display column.
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
      // The install command lives in the message: a pack's `cli` hint is a
      // copy-paste suggestion and must be a pragma command (validated at
      // pack load), never arbitrary shell.
      message:
        "Install the design system packages that provide modifiers " +
        "(bun add -D @canonical/design-system).",
      cli: "pragma doctor",
    },
  },
  lookup: {
    source: "graphql",
    toolDescription:
      "Get values and usage details for one or more modifier families by " +
      "name. Use when you need the allowed values of specific families. " +
      'Example: modifier_lookup { names: ["importance"] }.',
    by: "ds:name",
    type: "ds:ModifierFamily",
    // No flat fields: the old ModifierFamily shape was {uri, name, values},
    // and live families carry only an empty ds:summary.
    expand: [
      {
        name: "values",
        heading: "Values",
        relation: "ds:hasModifier",
        select: [{ name: "name", property: "ds:name" }],
      },
    ],
  },
};
