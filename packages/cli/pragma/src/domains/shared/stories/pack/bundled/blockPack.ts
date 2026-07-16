/**
 * Bundled transitional `block` pack — the lookup verb only.
 *
 * `block lookup` / `block_lookup` are served by this pack over the
 * GraphQL fetch path; **`block list` deliberately stays built-in**. The
 * list is config-filtered (tier chain via `buildTierFilter`, channel via
 * `buildChannelFilter`, plus `--all-tiers` and the digest/detailed
 * enrichment passes) — behavior packs cannot express declaratively yet.
 * Per-verb reservation supports exactly this partial migration: deleting
 * only the lookup wrapper frees `block lookup` for the pack while the
 * built-in keeps the noun's `list` reserved.
 *
 * @remarks transitional — ships inside pragma today; in P4 it moves into
 * the `@canonical/design-system` package as `stories/block.json`.
 *
 * Data-reality notes (live graph — trust these over the old TS surface):
 * - Block anatomy is `ds:anatomyDsl`, a YAML STRING rendered as a code
 *   block. There is no anatomy node tree in the data.
 * - `ds:usesToken` and implementation links resolve to zero rows — the old
 *   sections they fed rendered empty and are dropped here.
 * - Real block detail = name/summary/tier + guidelines + anatomyDsl +
 *   properties (blank-node records) + modifier families with values (a
 *   2-hop nest — the reason this lookup is `source: "graphql"`: ONE
 *   generated document replaces the old domain's ~7 SPARQL queries).
 * - Block names recur across tiers (three distinct `Button`s). The name
 *   resolve returns the lexicographically-first IRI deterministically; the
 *   old multi-match flattening and IRI-based lookup are not reproduced
 *   (IRI lookup is a flat-compiler primitive arriving with P1.5).
 */

import type { StoryPackDefinition } from "../types.js";

/** The `block` lookup story as data. */
export const blockPack: StoryPackDefinition = {
  noun: "block",
  description: "Look up design system blocks",
  toolDescription:
    "Get detailed information about one or more design system blocks including anatomy, modifiers, and properties.",
  lookup: {
    source: "graphql",
    by: "ds:name",
    // Blocks span four concrete classes; the VALUES-constrained resolve
    // keeps suggestions and completions scoped to blocks, and the UIBlock
    // interface fragment covers every one of them in the document.
    types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
    graphqlType: "UIBlock",
    fields: [{ name: "tier", property: "ds:tier", label: "Tier" }],
    sections: [
      { name: "summary", property: "ds:summary", label: "Summary" },
      {
        name: "guidelines",
        property: "ds:guidelines",
        label: "Guidelines",
        level: "detailed",
      },
      {
        name: "anatomyDsl",
        property: "ds:anatomyDsl",
        label: "Anatomy (DSL)",
        kind: "code",
        level: "detailed",
      },
    ],
    expand: [
      {
        name: "modifierFamilies",
        heading: "Modifier Families",
        relation: "ds:hasModifierFamily",
        level: "detailed",
        select: [
          { name: "name", property: "ds:name" },
          // The 2-hop nest: family → values, resolved inside the same
          // document through the declared-inverse `modifiers` connection.
          {
            name: "values",
            relation: "ds:hasModifier",
            select: [{ name: "name", property: "ds:name" }],
          },
        ],
      },
      {
        name: "properties",
        heading: "Properties",
        relation: "ds:hasProperty",
        level: "detailed",
        select: [
          { name: "name", property: "ds:name" },
          { name: "type", property: "ds:propertyType" },
          { name: "optional", property: "ds:optional" },
          { name: "default", property: "ds:defaultValue" },
        ],
      },
    ],
    // Base level mirrors the old summary view (name/tier/summary); the
    // default is `detailed` — matching the old CLI default, which rendered
    // anatomy and modifiers without any flag.
    disclosure: { levels: ["summary", "detailed"], default: "detailed" },
  },
};
