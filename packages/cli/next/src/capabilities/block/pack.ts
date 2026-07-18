/**
 * The bundled `block` pack — the lookup verb only.
 *
 * `block lookup` is served over the GraphQL fetch path (ONE generated document
 * over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent);
 * `block list` deliberately stays HAND-WRITTEN (tier-chain inheritance + channel
 * + `--all-tiers` — see ./blockList.verb). Base level mirrors the old summary
 * view (name/tier/summary); the default is `detailed`, matching the old CLI
 * which rendered anatomy and modifiers without a flag. A derived name that maps
 * onto no schema field is omitted (OPTIONAL parity), so a graph lacking
 * whenToUse/whenNotToUse degrades gracefully.
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

export const blockPack: PackDefinition = {
  noun: "block",
  description: "Look up design system blocks.",
  lookup: {
    source: "graphql",
    toolDescription:
      'Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { names: ["Button"] }.',
    by: "ds:name",
    types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
    graphqlType: "UIBlock",
    fields: [
      { name: "tier", property: "ds:tier", label: "Tier" },
      {
        name: "figmaLink",
        property: "ds:figmaLink",
        label: "Figma",
        level: "detailed",
      },
    ],
    sections: [
      { name: "summary", property: "ds:summary", label: "Summary" },
      {
        name: "whenToUse",
        property: "ds:whenToUse",
        label: "When to use",
        level: "detailed",
      },
      {
        name: "whenNotToUse",
        property: "ds:whenNotToUse",
        label: "When not to use",
        level: "detailed",
      },
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
      {
        name: "anatomyClassic",
        property: "ds:anatomyClassic",
        label: "Anatomy (classic)",
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
        kind: "table",
        level: "detailed",
        select: [
          { name: "name", property: "ds:name" },
          { name: "type", property: "ds:propertyType" },
          { name: "optional", property: "ds:optional" },
        ],
      },
      {
        name: "subcomponents",
        heading: "Subcomponents",
        relation: "ds:hasSubcomponent",
        level: "detailed",
        select: [
          { name: "name", property: "ds:name" },
          { name: "uri", property: "ds:name", graphqlField: "uri" },
        ],
      },
    ],
    disclosure: { levels: ["summary", "detailed"], default: "detailed" },
    sample: {
      fixedCount: true,
      toolDescription:
        "Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.",
    },
  },
};
