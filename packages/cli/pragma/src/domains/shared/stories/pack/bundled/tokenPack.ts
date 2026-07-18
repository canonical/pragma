/**
 * Bundled transitional `token` pack.
 *
 * Replaces the hand-written `token` read wrappers (`token list`, `token
 * lookup` and their MCP twins) with a declarative story; `pragma tokens
 * add-config` (a mutation on the plural noun) and `token sample` stay
 * built-in. Same tool/command names, same entities and values — compiled
 * through the shared pack kernel.
 *
 * @remarks transitional — ships inside pragma today; in P4 it moves into
 * the `@canonical/design-system` package as `stories/token.json`.
 *
 * Data-reality notes (live graph):
 * - There are currently ZERO `ds:Token` triples and no Token class in the
 *   ontology, so this pack stays on the SPARQL source (the OWL-derived
 *   GraphQL schema has no Token type to project against) and its
 *   `emptyRecovery` install hint is the story users actually see.
 * - The old `--category` free-string filter is intentionally dropped: pack
 *   filters are closed enums by design (injection safety), and with no
 *   token data there exists no category vocabulary to enumerate. It can
 *   return declaratively once token types ship with the data.
 * - Tokens are named by `ds:tokenId` (`color.primary`), not `ds:name`;
 *   matching is case-insensitive (the old lookup was case-sensitive — the
 *   relaxation is deliberate, consistent with every other pack lookup).
 */

import type { StoryPackDefinition } from "../types.js";

/** The `token` read stories as data. */
export const tokenPack: StoryPackDefinition = {
  noun: "token",
  description: "List all design tokens",
  toolDescription:
    "List all design tokens with their type. Use when browsing which tokens " +
    "exist under the active scope. Example: token_list {}.",
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
      // The install command lives in the message: a pack's `cli` hint is a
      // copy-paste suggestion and must be a pragma command (validated at
      // pack load), never arbitrary shell.
      message:
        "Install the design system packages that provide tokens " +
        "(bun add -D @canonical/design-system).",
      cli: "pragma doctor",
    },
  },
  lookup: {
    toolDescription:
      "Get type and theme values for one or more design tokens by name. Use " +
      "when resolving specific tokens' light/dark values. Example: " +
      'token_lookup { names: ["color.primary"] }.',
    by: "ds:tokenId",
    type: "ds:Token",
    fields: [
      // The type name hangs off the token's tokenType node — a property
      // path the SPARQL lookup generator supports natively.
      { name: "category", property: "ds:tokenType/rdfs:label", label: "Type" },
      { name: "valueLight", property: "ds:valueLight", label: "Light value" },
      { name: "valueDark", property: "ds:valueDark", label: "Dark value" },
    ],
  },
};
