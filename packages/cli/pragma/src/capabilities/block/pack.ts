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
 *
 * Disclosure declares the FULL canonical ladder `[summary, standard, detailed]`
 * (B4), the same set `standard` declares, so a config `detail=standard` names a
 * level `block` advertises rather than one it silently accepts-then-degrades.
 * Block carries no `standard`-tier content of its own — gating is by canonical
 * index, so `standard` resolves to the base view — but the declared set now
 * matches its sibling reads. The per-noun DEFAULT stays domain-tuned (`block`
 * rich-by-default, `standard` terse-by-default); only the level SET is aligned.
 */

import type { PackDefinition } from "../../kernel/packs/types.js";

/**
 * The bundled design-system domain colophon — the ontology + graph story,
 * surfaced by `pragma colophon` after pragma's own. Authored on the flagship
 * UI-block noun because `block` most embodies the design system; it narrates the
 * DOMAIN (what the graph models), not the toolchain (pragma's built-in section).
 */
const DESIGN_SYSTEM_COLOPHON = `The Canonical design system is a **knowledge graph**, not a component library.
Every block, token, modifier, standard, and tier is a node in an RDF store,
described by the \`ds:\` ontology and queried the same way whether you reach it
over GraphQL or raw SPARQL.

## What the graph models

- **Blocks** — components, patterns, layouts, and subcomponents (the \`ds:UIBlock\`
  family). A block carries its anatomy, guidelines, and \`when to use\` / \`when
  not to use\` narrative as graph properties, not prose in a wiki.
- **Modifiers** — families of variant values (\`ds:hasModifierFamily\` →
  \`ds:hasModifier\`) a block composes, so a variant is a relationship, not a
  string.
- **Tokens** — the themeable design values, resolved per theme.
- **Standards** — the do / don't coding guidance, categorized and linked to the
  blocks they govern.

## How it fits together

- **Tiers** are a hierarchy (\`global\` > \`apps\` > \`apps/lxd\`): a lower tier
  inherits and overrides the blocks of its ancestors, so scoping a query to a
  tier walks that chain.
- **Channels** (\`normal\`, \`experimental\`, \`prerelease\`) gate visibility, so an
  in-progress block never leaks into a stable answer.

## Why RDF

One graph makes every relationship first-class and queryable: \`block lookup\`
follows edges to modifiers and subcomponents, \`graph query\` runs arbitrary
SPARQL, and \`ontology show\` reads the schema itself. The store is built once
by \`sources update\` and addressed by content hash, so the domain you query is
exactly the domain that was published.`;

export const blockPack: PackDefinition = {
  noun: "block",
  description: "Look up design system blocks.",
  colophon: DESIGN_SYSTEM_COLOPHON,
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
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "detailed",
    },
    sample: {
      fixedCount: true,
      toolDescription:
        "Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.",
    },
  },
};
