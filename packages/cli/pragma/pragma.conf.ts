/**
 * The pragma distribution config — identity, default packs, the read stories
 * those packs supply, and generators.
 *
 * Consumed three times: statically imported by `src/kernel/config/defaults.ts`
 * as the lowest config layer (compiled into the binary — no fs), by
 * `src/capabilities/distribution.ts` (which compiles the declared stories into
 * capability modules at module load), and at build time by the bundler. A
 * NON-magic name on purpose: `findProjectConfig` only discovers
 * `pragma.config.{ts,js}`, so this file is never mistaken for a project config.
 * Validated by the same `parseRawConfig` as every layer.
 *
 * INERT DATA. It must never gain a value import: `src/constants.ts` statically
 * imports it to project the program's identity, so anything that runs at this
 * module's load runs on `--help`, `__complete` and `--version`. That also makes
 * the reverse edge impossible — importing `constants.js` from here is a
 * temporal-dead-zone cycle — which is why the `emptyRecovery.cli` hints below
 * spell `pragma …` out rather than composing it from `RECOVERY_CLI_PREFIX`.
 * `capabilities/lazy.test.ts` pins both halves of that.
 */

import type { RawConfig } from "./src/kernel/config/types.js";
import type { PackDefinition } from "./src/kernel/packs/types.js";

/**
 * The design-system domain colophon — the ontology + graph story, surfaced by
 * `pragma colophon` after pragma's own. Declared on the flagship UI-block noun
 * because `block` most embodies the design system; it narrates the DOMAIN (what
 * the graph models), not the toolchain (pragma's built-in section).
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

/**
 * The read stories the design-system pack supplies — `block`, `token`,
 * `modifier` and `tier` as declared data rather than code.
 *
 * The association with the pack is the point: when `@canonical/design-system`
 * starts shipping its own `stories/*.json`, this block is deleted and the
 * package tier takes over with no code change here or anywhere else. The local
 * `readonly PackDefinition[]` annotation is what type-checks them —
 * `PackSource.stories` is deliberately `readonly unknown[]`, because the config
 * layer does not know the pack grammar (`parsePackDefinition` does).
 */
const designSystemStories: readonly PackDefinition[] = [
  // `block lookup` is served over the GraphQL fetch path (ONE generated document
  // over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent);
  // `block list` deliberately stays HAND-WRITTEN (tier-chain inheritance +
  // channel + `--all-tiers`), so this story ships the lookup half only. Base
  // level mirrors the old summary view (name/tier/summary); the default is
  // `detailed`, matching the old CLI which rendered anatomy and modifiers
  // without a flag. A derived name that maps onto no schema field is omitted
  // (OPTIONAL parity), so a graph lacking whenToUse/whenNotToUse degrades
  // gracefully.
  //
  // Disclosure declares the FULL canonical ladder `[summary, standard,
  // detailed]` — the same set `standard` declares — so a config
  // `detail=standard` names a level `block` advertises rather than one it
  // silently accepts-then-degrades. Block carries no `standard`-tier content of
  // its own; gating is by canonical index, so `standard` resolves to the base
  // view. Only the level SET is aligned: the per-noun DEFAULT stays domain-tuned
  // (`block` rich-by-default, `standard` terse-by-default).
  {
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
  },

  // Design tokens: SPARQL-sourced on both verbs. There is no `ds:Token` GraphQL
  // type to project against when the graph ships no tokens, and the lookup reads
  // a property path (`ds:tokenType/rdfs:label`) only SPARQL can express. The
  // `emptyRecovery` install hint is the story users see on an empty store;
  // `token add-config` (a mutation) stays hand-written — the pack compiler emits
  // reads only.
  {
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
          "No tokens in the store. Build it from the configured design-system packs.",
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
        {
          name: "category",
          property: "ds:tokenType/rdfs:label",
          label: "Type",
        },
        { name: "valueLight", property: "ds:valueLight", label: "Light value" },
        { name: "valueDark", property: "ds:valueDark", label: "Dark value" },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes.",
      },
    },
  },

  // Modifier families. `modifier list` is SPARQL (an alternation path collects
  // values asserted in either direction); `modifier lookup` is GRAPHQL, where
  // the compiled `ModifierFamily.modifiers` field is the declared-inverse union
  // and resolves both directions in ONE generated document — exactly the case
  // the GraphQL fetch path exists for.
  {
    noun: "modifier",
    description: "List all modifier families.",
    toolDescription:
      "List all modifier families with their values. Use when browsing which modifier families exist and the values each allows. Example: modifier_list {}.",
    list: {
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
        message:
          "No modifier families in the store. Build it from the configured design-system packs.",
        cli: "pragma sources update",
      },
    },
    lookup: {
      source: "graphql",
      by: "ds:name",
      type: "ds:ModifierFamily",
      toolDescription:
        'Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { names: ["importance"] }.',
      expand: [
        {
          name: "values",
          heading: "Values",
          relation: "ds:hasModifier",
          select: [{ name: "name", property: "ds:name" }],
        },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.",
      },
    },
  },

  // Tiers. The hierarchy is encoded in the slash-separated path string
  // (`apps/lxd`), not in graph edges, so `tier list` is a flat, name-ordered
  // list; the ordered-inheritance logic lives in the block list's tier chain.
  // `tier lookup` stays hand-written because the covenant freezes it with a
  // single `<name>` positional where a pack lookup emits a variadic `<name...>`.
  {
    noun: "tier",
    description: "List all tiers in the design system ontology.",
    toolDescription:
      "List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.",
    list: {
      query: [
        "SELECT ?uri ?name WHERE {",
        "  ?uri a ds:Tier ;",
        "       ds:name ?name .",
        "} ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "uri", label: "IRI" },
        { field: "name", label: "Name" },
      ],
    },
  },
];

/**
 * The read story the code-standards pack supplies — `standard` as declared data.
 *
 * Normalized for the v2 grammar: the old `digest` level is the canonical
 * `standard`, so disclosure gates by the canonical index. The default is
 * `summary` (base fields by name), `--detail standard` adds the `dos` examples,
 * `--detail detailed` adds `donts`. `cs:extends` stays the raw IRI in JSON
 * (renderers compact it at display time).
 */
const codeStandardsStories: readonly PackDefinition[] = [
  {
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
  },
];

export default {
  name: "pragma",
  help: "Explore the design system",
  colophon: "Made by the Canonical Webteam — https://canonical.com.",
  issuesUrl: "https://github.com/canonical/pragma/issues",
  packs: [
    {
      name: "@canonical/design-system",
      source: "git+https://github.com/canonical/design-system.git#main",
      stories: designSystemStories,
    },
    {
      name: "@canonical/anatomy-dsl",
      source: "git+https://github.com/canonical/anatomy-dsl.git#main",
    },
    {
      name: "@canonical/code-standards",
      source: "git+https://github.com/canonical/web-code-standards.git#main",
      stories: codeStandardsStories,
    },
  ],
  // This distribution's domain namespaces, declared once and read twice.
  //
  // (1) They pin what `sources update` builds the store with. The design system
  // declares `ds:` twice — `…/` in `definitions/` and `…/data/` in `data/` —
  // and prefix harvesting is last-wins over a filename sort, so which one binds
  // is an accident of file naming. The config layer wins every harvest: without
  // this pin an added or renamed upstream file can silently compact every `ds:`
  // entity to the wrong prefix, and `block list` stops resolving.
  //
  // (2) They are the domain half of the kernel's `DEFAULT_PREFIX_MAP`
  // (`src/kernel/render/prefixes.ts`) — what the CLI compacts in output AND
  // what it expands a user-typed `ds:Button` / `cs:rule` through before a
  // lookup. Drop a namespace here and its lookups stop resolving; that is why
  // `cs:` is listed even though nothing rebinds it upstream.
  prefixes: {
    ds: "https://ds.canonical.com/",
    cs: "http://pragma.canonical.com/codestandards#",
  },
  generators: [
    {
      name: "@canonical/summon-component",
      source: "npm:@canonical/summon-component@^0.33.0",
    },
    {
      name: "@canonical/summon-package",
      source: "npm:@canonical/summon-package@^0.33.0",
    },
    {
      name: "@canonical/summon-application",
      source: "npm:@canonical/summon-application@^0.33.0",
    },
  ],
  channel: "normal",
  detail: "standard",
} satisfies RawConfig;

/**
 * The domain terms the kernel reads this distribution's graph with.
 *
 * A separate export because it is NOT a config layer field: it is compiled in
 * and read at module load by `src/kernel/vocabulary.ts`, whose readers (the
 * storeless completion fast path, the pack index builder) cannot reach a config
 * layer at all. Layering it would let a project config set it and change
 * nothing. A fork edits these values and rebuilds; `parseVocabulary` type-checks
 * the shape and rejects a term that is not a prefixed name.
 *
 * Every prefix used here must be bound in `prefixes` above. `rdfs:label` and
 * `rdfs:comment` are deliberately absent — the kernel treats standard
 * vocabulary as universal.
 *
 * The `prompt` terms are a READ CONTRACT, not a claim about instances: this
 * distribution's graph currently carries no `ds:Prompt` entities at all, so
 * `prompt list` is honestly empty. Declaring the shape anyway is what makes an
 * empty result mean "the graph has none" rather than "nothing was declared".
 */
export const vocabulary = {
  altName: "ds:name",
  prompt: {
    type: "ds:Prompt",
    body: "ds:promptBody",
    argument: "ds:promptArgument",
    argName: "ds:argName",
    argRequired: "ds:argRequired",
  },
};
