/**
 * The pragma distribution config — identity, default packs, and the read
 * stories those packs supply.
 *
 * Consumed three times: statically imported by `src/kernel/config/defaults.ts`
 * as the lowest config layer (compiled with the source — no fs), by
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
 * temporal-dead-zone cycle. It is also why no string below names the binary
 * except `name` itself: an `emptyRecovery.cli` is the command WITHOUT the
 * binary name, and the renderer prepends the consuming distribution's.
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
- **Concepts** — the long-form documentation that belongs to no single block:
  foundations, decision guides, and how-to guides, each typed by a
  \`ds:ConceptType\`.
- **Implementations** — which library implements which block, in which
  framework, with a source link pinned to the release that shipped it: the
  spec and the code realizing it are edges in one graph.

## How it fits together

- **Tiers** are a hierarchy (\`global\` > \`apps\` > \`apps/lxd\`): a lower tier
  inherits and overrides the blocks of its ancestors, so scoping a query to a
  tier walks that chain.
- **Channels** (\`normal\`, \`experimental\`, \`prerelease\`) gate visibility, so an
  in-progress block never leaks into a stable answer.

## Why RDF

One graph makes every relationship first-class and queryable: \`block lookup\`
follows edges to modifiers and subcomponents, \`concept lookup\` reads the
long-form documentation, \`graph query\` runs arbitrary SPARQL, and
\`ontology lookup\` reads the schema itself. Which React components implement
a global-tier block is one query, not an afternoon. The store is built once
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
  // `block list` is declared content (L-OPEN-9): one unfiltered SELECT over
  // the four UIBlock classes, listing ALL blocks — experimental and alpha ones
  // included, for everyone — until filtering returns in declared form. The
  // hand-written tier-chain/channel filtering (and its `--all-tiers` escape)
  // is removed with the code, an owner-signed consequence. Display parity
  // lives IN the query: `VALUES ?class` closes the type set, so the BINDs
  // that derive `name` (declared name, else the IRI's local name), `type`
  // (lowercased class local name), and `tier` (tier IRI's local name) operate
  // over known shapes — the `standard` story's BIND/COALESCE precedent.
  //
  // `block lookup` is served over the GraphQL fetch path (ONE generated document
  // over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent).
  // Base level mirrors the old summary view (name/tier/summary); the default is
  // `detailed`, matching the old CLI which rendered anatomy and modifiers
  // without a flag. A derived name that maps onto no schema field is omitted
  // (OPTIONAL parity), so a graph missing one of these properties degrades
  // gracefully rather than erroring.
  //
  // That graceful degradation is also how this story went silent: it used to
  // read `ds:whenToUse`/`ds:whenNotToUse`, which the ontology RETIRED in favour
  // of a single `ds:usage` — "Subsumes the former whenToUse/whenNotToUse" is
  // that property's own skos:definition. The shipped pack asserts `ds:usage` on
  // all 264 blocks and neither retired term on any of them, so every
  // `block lookup` on every install rendered no usage narrative at all —
  // silently, because a name that maps onto no schema field is exactly the case
  // OPTIONAL parity swallows. The retired terms are NOT kept as a fallback:
  // `ds:usage` subsumes them, so a pack carrying both would print the same
  // guidance twice, and a declaration no shipped graph can satisfy is
  // untestable by construction — which is what let the silence ship.
  // `block.shipped.exec.test.ts` now holds every graph term declared here — the
  // identity property, fields, sections, expand relations, and every term
  // selected beneath them, walked recursively — to being DEFINED as a property
  // by the SHIPPED ontology. Defined, not asserted, and the difference is the
  // whole point: a term the ontology never defines is a story bug that can
  // never render, on any block, on any install — this defect. A term it defines
  // that no instance asserts yet (`ds:figmaLink` today) is a content gap
  // upstream, which the OPTIONAL parity above degrades over gracefully and
  // which this pack has no business failing on. `ds:usage` alone is ALSO held
  // to being asserted, on every block, because its absence is what shipped.
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
    description: "List all design system blocks.",
    toolDescription:
      "List all design system blocks with their type, tier, and modifier families. Use when browsing which blocks exist. Example: block_list {}.",
    colophon: DESIGN_SYSTEM_COLOPHON,
    list: {
      query: [
        "SELECT ?uri ?name ?type ?tier",
        '       (GROUP_CONCAT(DISTINCT ?modName; separator=", ") AS ?modifiers)',
        "WHERE {",
        "  VALUES ?class { ds:Component ds:Pattern ds:Layout ds:Subcomponent }",
        "  ?uri a ?class .",
        "  OPTIONAL { ?uri ds:name ?dsName }",
        "  OPTIONAL { ?uri ds:tier ?tierUri . OPTIONAL { ?tierUri ds:name ?tierName } }",
        "  OPTIONAL { ?uri ds:hasModifierFamily ?family . ?family ds:name ?modName }",
        '  BIND(COALESCE(?dsName, REPLACE(STR(?uri), "^.*[/#]", "")) AS ?name)',
        '  BIND(LCASE(REPLACE(STR(?class), "^.*[/#]", "")) AS ?type)',
        '  BIND(REPLACE(STR(?tierUri), "^.*[/#]", "") AS ?tier)',
        // `ORDER BY ?name` alone is not a total order, and 25 names here are
        // shared by two or three blocks. SPARQL says nothing about tied rows,
        // so the store's scan decided: ONE run gave `Button` launchpad-first
        // and `CheckboxInput` global-first. Tier depth, then `STR(?uri)`,
        // makes it total — the shallower tier leads its name group, and equal
        // depths fall back to a key that cannot tie.
        //
        // The depth is the same one `lookup` ranks by, spelled out because a
        // list query is declared TEXT the kernel does not compose. Only the
        // depth: a browse ordered by NAME is not the place to re-litigate which
        // block the name MEANS (that is `lookup`'s ranking, which also weighs
        // the block's type), and every row here already prints its own type.
        //
        // The depth-0 IF is the store's, not style: oxigraph raises on
        // `0.2 * 0`, and a raising BIND leaves `?tierRank` unbound — which is
        // exactly how a top-tier block silently sorted last (see
        // `sparqlProduct` in kernel/packs/sparql/buildLookupQuery.ts).
        '  BIND(STRLEN(?tierName) - STRLEN(REPLACE(?tierName, "/", "")) AS ?tierDepth)',
        "  BIND(COALESCE(IF(?tierDepth = 0, 1, 1 - (0.2 * ?tierDepth)), 0) AS ?tierRank)",
        "}",
        "GROUP BY ?uri ?name ?type ?tier ?tierRank",
        "ORDER BY ?name DESC(?tierRank) STR(?uri)",
      ].join("\n"),
      columns: [
        { field: "name", label: "Name" },
        { field: "type", label: "Type" },
        { field: "tier", label: "Tier" },
        { field: "modifiers", label: "Modifiers" },
        { field: "uri", label: "IRI" },
      ],
      emptyRecovery: {
        message:
          "No blocks in the store. Build it from the configured design-system packs.",
        cli: "sources update",
      },
    },
    lookup: {
      source: "graphql",
      toolDescription:
        'Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { name: ["Button"] }.',
      by: "ds:name",
      types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
      // A subcomponent is a PART of a block, never the block someone means:
      // for the query "button" the 86 `…-close_button` subcomponents used to
      // outrank `ds:global.component.button` on the alphabet alone. Weighting
      // them below 1 sinks every one of them under every component at equal
      // match score, lowers their `annotations.priority` in the resource
      // listing, and — since a name resolve now RANKS rather than picks — sorts
      // them under every component a shared name also reaches.
      weights: { "ds:Subcomponent": 0.6 },
      // The other half of that judgement, and the reason it is a PRODUCT and
      // not a tiebreak. 25 live block names are shared by two or three blocks
      // across tiers, and `weights` alone cannot separate two components; the
      // alphabet decided, so `Button` answered with Launchpad's and never
      // mentioned the global one. A tier's DEPTH is what ranks it: `Global` is
      // depth 1 and worth 1, `Apps/Launchpad` is depth 2 and worth 0.8, so
      //
      //   Button    global component 1 × 1   >  launchpad component 1 × 0.8
      //   TextInput global SUBcomponent 0.6 × 1  <  launchpad component 1 × 0.8
      //
      // — the global block wins where both are whole blocks, and the editorial
      // rule that a whole component beats a part survives the addition. A pure
      // tier tiebreak would have inverted the second case.
      //
      // DERIVED, never enumerated: the depth is the `/` count in the tier's
      // OWN `ds:name` (`"Apps/Launchpad"`), not in its IRI (`ds:apps_launchpad`
      // — the slash exists only in the name), so a tier added upstream tomorrow
      // is ranked correctly without editing anything here.
      //
      // Declared as DATA beside `weights` for the same reason `weights` is:
      // editorial judgement the ontology has not yet made belongs in the config
      // layer, which "wins every harvest" when upstream is silent. `asserted`
      // is the exit: the day `ds:tierRank` is asserted upstream it takes
      // precedence over the derived depth (`COALESCE`), and this whole entry is
      // deleted with no code change.
      scopeWeight: {
        via: "ds:tier",
        by: "ds:name",
        falloff: 0.2,
        asserted: "ds:tierRank",
      },
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
        // ONE section, because `ds:usage` is ONE property: its literal is
        // free-text Markdown carrying its own `### When to use` / `### When not
        // to use` sub-sections (78 and 71 of the 126 non-empty ones do), so
        // splitting it back into two headings here would mean parsing prose the
        // graph deliberately keeps whole. The renderer demotes a body's own ATX
        // headings below the section heading, so those sub-sections nest UNDER
        // `### Usage` instead of colliding with it. Half the blocks assert an
        // EMPTY `ds:usage` (138 of 264); the renderer skips empty sections, so
        // those print no heading rather than an empty one.
        {
          name: "usage",
          property: "ds:usage",
          label: "Usage",
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
          "Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names. Example: block_sample {}.",
      },
    },
  },

  // Design tokens: SPARQL-sourced on both verbs. There is no `ds:Token` GraphQL
  // type to project against when the graph ships no tokens, and the lookup reads
  // a property path (`ds:tokenType/rdfs:label`) only SPARQL can express. The
  // `emptyRecovery` install hint is the story users see on an empty store. The
  // noun is now purely declarative: `token add-config` wrote a starter file, and
  // L-OPEN-9 removed it rather than growing the read grammar a mutation verb.
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
        cli: "sources update",
      },
    },
    lookup: {
      source: "sparql",
      by: "ds:tokenId",
      type: "ds:Token",
      toolDescription:
        'Get type and theme values for one or more design tokens by name. Use when resolving specific tokens\' light/dark values. Example: token_lookup { name: ["color.primary"] }.',
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
          "Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes. Example: token_sample {}.",
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
        cli: "sources update",
      },
    },
    lookup: {
      source: "graphql",
      by: "ds:name",
      type: "ds:ModifierFamily",
      toolDescription:
        'Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { name: ["importance"] }.',
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
          "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes. Example: modifier_sample {}.",
      },
    },
  },

  // Tiers. The hierarchy is encoded in the slash-separated path string
  // (`apps/lxd`), not in graph edges, so `tier list` is a flat, name-ordered
  // list. `tier lookup` resolves a tier by its declared name and expands the
  // blocks scoped DIRECTLY to it through the inverse path `^ds:tier` — a
  // single-hop expand the generated sub-SELECT emits as `<tier> ^ds:tier ?child`
  // (property paths, inverse included, are in-contract for `PackExpand.relation`).
  // Retiring the bespoke single-`<name>` lookup for this declared variadic one
  // is an L-OPEN-9 covenant change, recorded in the covenant's $comment.
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
    lookup: {
      source: "sparql",
      by: "ds:name",
      type: "ds:Tier",
      description: "Show tiers by name, with the blocks scoped to each.",
      toolDescription:
        'Get one or more tiers by name, with the blocks scoped directly to each. Use when you need which blocks a specific tier carries. Example: tier_lookup { name: ["apps/lxd"] }.',
      expand: [
        {
          name: "blocks",
          heading: "Blocks",
          relation: "^ds:tier",
          select: [{ name: "name", property: "ds:name" }],
        },
      ],
    },
  },
];

/**
 * The `concept` story the design-system pack also supplies: long-form
 * documentation not bound to a single UIBlock (foundations, how-to guides,
 * decision guides) — ds:Concept entries ingested from Coda. The list stays
 * terse (name/type/summary); the Markdown body is the lookup's payload,
 * served at the `standard` level with knownEdgeCases behind `detailed`.
 */
const conceptStory: PackDefinition = {
  noun: "concept",
  description: "List design-system concepts.",
  toolDescription:
    'List design-system concepts — long-form foundations, how-to guides, and decision guides not bound to a single UI block. Optionally filter by type or search. Example: concept_list { type: "Explanation" }.',
  list: {
    query: [
      "SELECT ?uri ?name ?type ?summary",
      "WHERE {",
      "  ?uri a ds:Concept ;",
      "       ds:name ?name .",
      "  OPTIONAL { ?uri ds:conceptType/ds:name ?type . }",
      "  OPTIONAL { ?uri ds:summary ?summary . }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "type", label: "Type" },
      { field: "summary", label: "Summary" },
    ],
    filters: [
      {
        param: "type",
        variable: "type",
        // `ds:ConceptType` is the vocabulary; the concepts are the population.
        // The shipped graph declares six types and uses two, so validating
        // against the rows rejected "Decision guide" — a type the ontology
        // declares — as an invalid argument instead of answering with the
        // empty list it actually has.
        vocabulary: {
          query: [
            "SELECT DISTINCT ?name WHERE {",
            "  ?conceptType a ds:ConceptType ;",
            "               ds:name ?name .",
            "}",
          ].join("\n"),
          variable: "name",
        },
        description: "Filter by concept type (e.g. Explanation, How-to guide).",
      },
    ],
    search: {
      variables: ["name", "summary"],
      description: "Search in name and summary.",
    },
    emptyRecovery: {
      message:
        "No concepts in the store. The @canonical/design-system pack provides them; refresh the local store.",
      cli: "sources update",
    },
  },
  lookup: {
    source: "sparql",
    by: "ds:name",
    type: "ds:Concept",
    description:
      "Look up a concept's full documentation by name, IRI, or glob.",
    toolDescription:
      'Get a design-system concept\'s full Markdown documentation. Address concepts by the name concept_list publishes, by prefixed name (ds:concept.…), by absolute IRI, or by a glob. Example: concept_lookup { name: ["Foundations: Grid"] }.',
    fields: [
      { name: "type", property: "ds:conceptType/ds:name", label: "Type" },
      { name: "tier", property: "ds:tier", label: "Tier" },
      { name: "summary", property: "ds:summary", label: "Summary" },
    ],
    sections: [
      {
        name: "content",
        property: "ds:content",
        label: "Content",
        level: "standard",
      },
      {
        name: "knownEdgeCases",
        property: "ds:knownEdgeCases",
        label: "Known edge cases",
        level: "detailed",
      },
    ],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "standard",
    },
  },
};

/**
 * The read story the implementation-graph pack supplies — which library
 * implements which block, collected from the `@implements` annotations in this
 * monorepo's source.
 *
 * The join this noun exists for crosses two packs: `ds:implementsBlock` points
 * from an implementation collected HERE at the IRI of a block declared in
 * `@canonical/design-system`. Both land in one store under the pinned `ds:`
 * namespace, so `implementation list` answers "which React components implement
 * a global-tier block" as a query rather than an afternoon of grepping — which
 * is what {@link DESIGN_SYSTEM_COLOPHON} promises.
 *
 * LIST-ONLY, deliberately. A `ds:ImplementationObject` carries no name literal
 * — it IS the edge from a library to a block, plus the two source links — so
 * there is nothing a `lookup` could disclose that the list row does not already
 * hold. The grammar admits a story with only one half; a lookup keyed on a
 * synthesised name would be a name nobody would ever type. The libraries
 * themselves ARE named, and `implementation libraries` lists them through the
 * same list machinery (as `standard categories` does).
 */
const implementationStory: PackDefinition = {
  noun: "implementation",
  description: "List which library implements which design-system block.",
  toolDescription:
    'List the implementations of design-system blocks — which library implements which block, on which platform, and the source file it lives in. Optionally filter by platform or library, or search. Example: implementation_list { platform: "react" }.',
  list: {
    // The library is the subject that carries the platform, so the row is
    // assembled from BOTH ends of `ds:hasImplementation`. `?block` prefers the
    // block's own `ds:name` and falls back to its IRI local name, so a row
    // stays readable even when the design-system pack is absent from the store
    // and only the bare `ds:implementsBlock` IRI is known.
    query: [
      "SELECT ?uri ?block ?library ?platform ?source",
      "WHERE {",
      "  ?libUri a ds:ImplementationLibrary ;",
      "          ds:libraryName ?library ;",
      "          ds:hasImplementation ?uri .",
      "  ?uri a ds:ImplementationObject ;",
      "       ds:implementsBlock ?blockUri .",
      "  OPTIONAL { ?libUri ds:platform ?platform }",
      "  OPTIONAL { ?uri ds:headLink ?source }",
      "  OPTIONAL { ?blockUri ds:name ?dsName }",
      '  BIND(COALESCE(?dsName, REPLACE(STR(?blockUri), "^.*[/#]", "")) AS ?block)',
      "}",
      "ORDER BY ?block ?library",
    ].join("\n"),
    columns: [
      { field: "block", label: "Block" },
      { field: "library", label: "Library" },
      { field: "platform", label: "Platform" },
      { field: "source", label: "Source" },
      { field: "uri", label: "IRI" },
    ],
    filters: [
      // Both vocabularies are read off `ds:ImplementationLibrary`, the subject
      // that carries them — the same terms `implementation libraries`
      // enumerates. A library that implements nothing yet still exists, and
      // asking for it is an empty answer rather than a bad argument.
      {
        param: "platform",
        variable: "platform",
        vocabulary: {
          query: [
            "SELECT DISTINCT ?platform WHERE {",
            "  ?lib a ds:ImplementationLibrary ;",
            "       ds:platform ?platform .",
            "}",
          ].join("\n"),
        },
        description: "Filter by platform (e.g. react, svelte, typescript).",
      },
      {
        param: "library",
        variable: "library",
        vocabulary: {
          query: [
            "SELECT DISTINCT ?library WHERE {",
            "  ?lib a ds:ImplementationLibrary ;",
            "       ds:libraryName ?library .",
            "}",
          ].join("\n"),
        },
        description: "Filter by implementation library name.",
      },
    ],
    search: {
      variables: ["block", "library"],
      description: "Search in block and library name.",
    },
    emptyRecovery: {
      message:
        "No implementations in the store. The @canonical/ds-implementations pack provides them; refresh the local store.",
      cli: "sources update",
    },
  },
  verbs: [
    {
      verb: "libraries",
      description: "List the implementation libraries.",
      toolDescription:
        "List the design-system implementation libraries — platform, tier, released version, and how many blocks each one implements. Example: implementation_libraries {}.",
      // `ds:implementationCount` is asserted by the aggregate index on the SAME
      // subject the per-library file describes, so the two merge in the store
      // and the count needs no aggregation here.
      query: [
        "SELECT ?uri ?name ?platform ?tier ?version ?count",
        "WHERE {",
        "  ?uri a ds:ImplementationLibrary ;",
        "       ds:libraryName ?name .",
        "  OPTIONAL { ?uri ds:platform ?platform }",
        "  OPTIONAL { ?uri ds:libraryTier ?tierUri }",
        "  OPTIONAL { ?uri ds:version ?version }",
        "  OPTIONAL { ?uri ds:implementationCount ?count }",
        '  BIND(REPLACE(STR(?tierUri), "^.*[/#]", "") AS ?tier)',
        "}",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Library" },
        { field: "platform", label: "Platform" },
        { field: "tier", label: "Tier" },
        { field: "version", label: "Version" },
        { field: "count", label: "Blocks" },
        { field: "uri", label: "IRI" },
      ],
      emptyRecovery: {
        message:
          "No implementation libraries in the store. The @canonical/ds-implementations pack provides them; refresh the local store.",
        cli: "sources update",
      },
    },
  ],
};

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
      'List code standards: one ROW per standard — its IRI, name, category and description — not the standards themselves. Take a row\'s `name` VERBATIM to standard_lookup for the dos and donts. Optionally filter by category slug (a parent slug answers for its whole branch; standard_categories lists them) or by search term. Example: standard_list { category: "react" }.',
    list: {
      query: [
        // `?category` is the LEAF a standard is filed under — what a row
        // displays. `?categories` is that leaf plus every ancestor, which is
        // what `--category` matches against, so asking for a parent answers for
        // the whole branch. The traversal is written ONCE, here, rather than
        // repeated by each consumer.
        "SELECT ?uri ?name ?category ?description",
        '       (GROUP_CONCAT(DISTINCT ?ancestorSlug; SEPARATOR=" ") AS ?categories)',
        "WHERE {",
        "  ?uri a cs:CodeStandard ;",
        "       cs:description ?description .",
        "  OPTIONAL { ?uri cs:name ?n . }",
        '  BIND(COALESCE(?n, REPLACE(STRAFTER(STR(?uri), "#"), "\\\\.", "/")) AS ?name)',
        "  OPTIONAL {",
        "    ?uri cs:hasCategory ?cat .",
        "    ?cat cs:slug ?category .",
        // `skos:broader` is deliberately NOT transitive, and this store
        // (oxigraph) has no reasoner — so `skos:broaderTransitive` returns zero
        // rows and hand-asserting it would be materialisation wearing a
        // standards badge. `broader*` is the only thing that works.
        // The `*` is REFLEXIVE and that is load-bearing: `+` would silently
        // drop every standard filed DIRECTLY on the category being asked for
        // (one of the 8 under `testing` today). Do not "correct" it.
        "    ?cat skos:broader* ?ancestor .",
        "    ?ancestor cs:slug ?ancestorSlug .",
        "  }",
        "}",
        "GROUP BY ?uri ?name ?category ?description",
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
          variable: "categories",
          match: "set",
          // The SAME terms `standard categories` enumerates (`cs:Category` /
          // `cs:slug`), so the slugs that surface hands out are exactly the
          // slugs this filter accepts. Read from the graph rather than the
          // returned ROWS: a category the graph declares with no standards
          // filed under it is reported by `standard categories` with count 0,
          // and asking for it must be the documented calm empty list, not
          // INVALID_INPUT.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?slug WHERE {",
              "  ?cat a cs:Category ;",
              "       cs:slug ?slug .",
              "}",
            ].join("\n"),
            variable: "slug",
          },
          description:
            "Filter by category slug. A parent category answers for its whole branch.",
        },
      ],
      search: {
        variables: ["name", "description"],
        description: "Search in name and description.",
      },
      // Deliberately NOT `sources update`: the code standards ship in the
      // embedded snapshot and answer with no update at all, so the generic
      // build hint is actively wrong here. An empty result on this noun means
      // the filter, and the vocabulary it must be drawn from lives in the graph
      // — which is what `standard categories` reads out.
      emptyRecovery: {
        message:
          "Category slugs come from the graph, and a parent slug answers for its whole branch — read them out rather than guessing.",
        cli: "standard categories",
      },
    },
    verbs: [
      {
        verb: "categories",
        description:
          "List all standard categories with counts (a parent counts its whole branch).",
        toolDescription:
          "List all code standard categories with the number of standards each covers. Categories are a hierarchy: a parent's count includes every descendant, and `standard_list { category }` answers for the same set. Use this to pick a valid slug before filtering. Example: standard_categories {}.",
        query: [
          // The same reflexive roll-up `list` filters with — written the other
          // way round (every category whose broader-chain reaches ?cat), so the
          // count a category reports and the rows `--category` returns are the
          // same set. `COUNT(DISTINCT ?standard)`: a standard reachable by two
          // paths is still one standard.
          "SELECT ?name (COUNT(DISTINCT ?standard) AS ?count)",
          "WHERE {",
          "  ?cat a cs:Category ;",
          "       cs:slug ?name .",
          "  OPTIONAL {",
          "    ?descendant skos:broader* ?cat .",
          "    ?standard a cs:CodeStandard ;",
          "              cs:hasCategory ?descendant .",
          "  }",
          "}",
          "GROUP BY ?name",
          "ORDER BY ?name",
        ].join("\n"),
        columns: [
          { field: "name", label: "Category" },
          { field: "count", label: "Standards" },
        ],
        // Also not `sources update`. The categories ride the same embedded
        // snapshot, so zero rows means the store did not load — a health
        // question, not a staleness one.
        emptyRecovery: {
          message:
            "The code standards ship in the embedded snapshot, so no categories at all means the store did not load rather than that it is out of date.",
          cli: "doctor",
        },
      },
    ],
    lookup: {
      source: "sparql",
      by: "cs:name",
      // The one story whose `list` PUBLISHES a synthesized name: `cs:name` is
      // an optional display title (22 of 156 standards carry one), so the row
      // name for the other ~87% is derived from the IRI local name. Declaring
      // the fallback here is what keeps the two halves of the two-step grammar
      // over one population — the same derivation, read from the other side.
      // It is deliberately NOT declared on `block`/`token`/`tier`/`concept`:
      // each of those lists REQUIRES its `by` property, so an entity without
      // one is a row they never publish, and making it addressable (or
      // sampleable) here would be the mirror of the defect this repairs.
      nameFallback: "iri",
      type: "cs:CodeStandard",
      description:
        "Look up one or more standards by name, IRI, or glob. --detail standard adds the dos, --detail detailed adds the don'ts.",
      toolDescription:
        'Get one or more code standards in full, with dos and don\'ts as code examples. `detail` DEFAULTS to "summary", which returns neither: pass detail: "standard" for the dos and detail: "detailed" for dos AND don\'ts. Address a standard by the name standard_list publishes (`react/component/tsdoc`), by prefixed name (`cs:react.component.tsdoc`), by absolute IRI, or by a glob over any of those. Example: standard_lookup { name: ["react/component/tsdoc"], detail: "detailed" }.',
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
          "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances. Example: standard_sample { count: 2 }.",
      },
    },
  },
];

export default {
  name: "pragma",
  help: "Explore the design system",
  // The `--help` wordmark. Data, not code: `kernel/copy.test.ts` forbids any
  // kernel string from naming the distribution, and a wordmark spells the name.
  // Lines rather than one string — the art holds a backtick and backslashes.
  logo: [
    "              _",
    "            /' `\\",
    "          /'     )",
    "        /' (___,/'____     ____     ____     ,__________     ____",
    "      /'        )'    )--/'    )  /'    )   /'    )     )  /'    )",
    "    /'        /'       /'    /' /'    /'  /'    /'    /' /'    /'",
    "(,/'        /'        (___,/(__(___,/(__/'    /'    /(__(___,/(__",
    "                                  /'",
    "                          /     /'",
    "                         (___,/'",
  ],
  // The toolchain's own colophon — CONTENT this distribution declares, not
  // machinery: `pragma colophon` renders whatever stands here as its first
  // section, titled with the distribution's name, before any active pack's
  // domain colophon. A fork tells its own story by editing this declaration.
  // `markdown` is the full narrative; `summary` is the condensed `--format llm`
  // form. Both are BODIES with no leading H1 (the renderer supplies the
  // heading), grounded in this tree's real architecture.
  colophon: {
    // The architecture handoff is a URL, not a repo path: `docs/` is outside
    // the package's `files` allowlist and is not copied into `dist`, so an
    // installed user has no `docs/architecture.md` to open.
    markdown: `pragma is a **domain-based toolchain** — one CLI and one MCP server
projected from a single grammar. That machinery is documented at
https://github.com/canonical/pragma/blob/main/packages/cli/pragma/docs/architecture.md;
what follows is the domain it serves.

Made by the Canonical Webteam — https://canonical.com.`,
    summary: `pragma is a domain-based toolchain: one CLI + MCP server projected from a single grammar (https://github.com/canonical/pragma/blob/main/packages/cli/pragma/docs/architecture.md). The domain it serves follows.

Made by the Canonical Webteam — https://canonical.com.`,
  },
  issuesUrl: "https://github.com/canonical/pragma/issues",
  packs: [
    {
      name: "@canonical/design-system",
      source: "git+https://github.com/canonical/design-system.git#main",
      stories: [...designSystemStories, conceptStory],
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
    // The implementation graph: ds:ImplementationLibrary / ds:ImplementationObject
    // nodes collected from `@implements` annotations across this monorepo
    // (regenerated each release into the root `data/` directory, which is what
    // a git ref scans — the npm distribution is `@canonical/ds-implementations`).
    {
      name: "@canonical/ds-implementations",
      source: "git+https://github.com/canonical/pragma.git#main",
      stories: [implementationStory],
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
