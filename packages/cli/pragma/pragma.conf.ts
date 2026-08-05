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

## How it fits together

- **Tiers** are a hierarchy (\`global\` > \`apps\` > \`apps/lxd\`): a lower tier
  inherits and overrides the blocks of its ancestors. A block records the tier
  it belongs to, and \`block lookup\` reports it.
- **Channels** (\`normal\`, \`experimental\`, \`prerelease\`) record how finished a
  block is.

Neither is a filter today: reads answer from the whole graph, and the \`tier\`
and \`channel\` settings narrow nothing.

## Why RDF

One graph makes every relationship first-class and queryable: \`block lookup\`
follows edges to modifiers and subcomponents, \`graph query\` runs arbitrary
SPARQL, and \`ontology lookup\` reads the schema itself. The store is built once
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
  // `block list` selects every UI block in the store. It is UNFILTERED: the
  // hand-written verb it replaces narrowed the rows by the configured tier's
  // parent chain and by the channel's release levels, and the grammar has a
  // term for neither, so both are gone rather than reimplemented here. Every
  // block lists for everyone, experimental and alpha included.
  //
  // The row shape is preserved against the renderer's expectations by doing the
  // local-name extraction IN SPARQL — `type` and `tier` are display words
  // (`component`, `global`), not compacted IRIs — and by falling an unnamed
  // block back to its own local name so it still shows a token. `?type` and
  // `?tier` ride OPTIONAL, so an untiered or unnamed block is listed rather
  // than dropped from the join.
  //
  // `block lookup` is served over the GraphQL fetch path (ONE generated document
  // over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent).
  // Its base level is name/tier/summary; the default is `detailed`, so anatomy
  // and modifiers render without a flag. A derived name that maps onto no schema
  // field is omitted (OPTIONAL parity), so a graph lacking whenToUse/whenNotToUse
  // degrades gracefully.
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
      "List every design-system block — components, patterns, layouts and subcomponents — with its type, tier and modifier families. Use when browsing what exists before looking one up. Example: block_list {}.",
    colophon: DESIGN_SYSTEM_COLOPHON,
    list: {
      query: [
        "SELECT ?uri ?name ?type ?tier",
        // COALESCE, exactly as `?tier` below: a block with no
        // `ds:hasModifierFamily` leaves `?modName` unbound, and an aggregate
        // over an empty group projects UNBOUND rather than "". An unbound
        // projection is an ABSENT key in the row, so `row.modifiers` would be
        // `undefined` on 248 of the 251 live blocks while the declared column
        // and the tool description both promise it. Measured on the live graph:
        // 3 blocks bind a family, 248 do not.
        '       (COALESCE(GROUP_CONCAT(DISTINCT ?modName; separator=", "), "") AS ?modifiers)',
        "WHERE {",
        "  VALUES ?class { ds:Component ds:Pattern ds:Layout ds:Subcomponent }",
        "  ?uri a ?class .",
        "  OPTIONAL { ?uri ds:name ?declaredName }",
        "  OPTIONAL { ?uri ds:tier ?tierUri }",
        "  OPTIONAL { ?uri ds:hasModifierFamily ?family . ?family ds:name ?modName }",
        '  BIND(REPLACE(STR(?uri), "^.*[/#]", "") AS ?localName)',
        "  BIND(COALESCE(?declaredName, ?localName) AS ?name)",
        '  BIND(LCASE(REPLACE(STR(?class), "^.*[/#]", "")) AS ?type)',
        '  BIND(COALESCE(REPLACE(STR(?tierUri), "^.*[/#]", ""), "") AS ?tier)',
        "}",
        "GROUP BY ?uri ?name ?type ?tier",
        "ORDER BY ?name",
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
  // `emptyRecovery` install hint is the story users see on an empty store.
  {
    noun: "token",
    description: "List all design tokens.",
    toolDescription:
      "List every design token in the graph with its type. Use when browsing what exists before looking one up. Example: token_list {}.",
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
          "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.",
      },
    },
  },

  // Tiers. The hierarchy is encoded in the slash-separated path string
  // (`apps/lxd`), not in graph edges, so `tier list` is a flat, name-ordered
  // list.
  //
  // A tier carries exactly two facts in this graph — its class and its name —
  // so the lookup declares no fields: it resolves a name (or prefixed name,
  // IRI, or glob) to the entity, and that IS the whole record. The blocks
  // scoped to a tier are NOT here: that is the inverse of `ds:tier`, which the
  // grammar admits in neither source (a term must start with a letter, so
  // `^ds:tier` is not a term, and an expand walks a relation forward from the
  // resolved entity). Blocks name their own tier — `block lookup` shows it.
  {
    noun: "tier",
    description: "List all tiers in the design system ontology.",
    toolDescription:
      "List all tiers in the design-system ontology. Use when you need the tier hierarchy the design system is organized by, or a tier's IRI. Example: tier_list {}.",
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
      by: "ds:name",
      type: "ds:Tier",
      description: "Resolve tiers by name, IRI, or glob.",
      toolDescription:
        "Resolve one or more tiers to their graph identity by name, prefixed name, IRI, or glob. Use to confirm a tier exists and to get the graph's own spelling of its name — the plain and llm renderings print that name and nothing else, while the JSON payload carries the tier's IRI beside it. To browse the hierarchy with an IRI column, list the tiers instead. Example: tier_lookup { name: [\"apps/lxd\"] }.",
    },
  },
];

/**
 * The read story the code-standards pack supplies — `standard` as declared data.
 *
 * Disclosure gates by the CANONICAL index, so the level a story declares must
 * be one of `summary`/`standard`/`detailed`. The default is
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

/**
 * THIS distribution's colophon — how the toolchain itself is made.
 *
 * Content, declared beside the identity it describes. It used to be
 * `src/capabilities/colophon/pragmaColophon.ts`, the last file in the tree a
 * fork read in another distribution's voice: measured at 4 / 2 / 6 occurrences
 * of this distribution's name (plain / llm / json) on a fork build, and the one
 * file `kernel/copy.test.ts` had to exempt from both of its capability rules.
 * That exemption is gone with it.
 *
 * Moved VERBATIM, architecture narrative included. A fork inherits none of it —
 * which is the point: a fork may have changed the machinery this describes, and
 * a colophon it did not write is a colophon that can be wrong about it.
 *
 * BOTH are bodies with NO leading H1: the renderer supplies the heading (the
 * distribution's own `name`), so a section is never double-titled.
 * `DISTRIBUTION_COLOPHON_SUMMARY` is not decoration — `--format llm` emits
 * `summary ?? markdown`, so without it an agent asking for the condensed form
 * would be handed the whole essay.
 */
const DISTRIBUTION_COLOPHON = `pragma is a **domain-based toolchain**: one CLI and one MCP server projected
from a single grammar, serving a knowledge-graph domain that reads as data.

## The effect monad

Reads are plain \`async\` functions; a mutation instead *describes* its effects
as a \`Task\` (\`@canonical/task\`) that is interpreted — under the real node
interpreter, a \`--dry-run\` planner, or an \`--undo\` reverser. Describe-then-
interpret means dry-run and undo come for free, and the dispatcher tells the two
worlds apart on one bit: \`capability.mutates\`.

## One grammar, many projections

Every capability is a \`VerbSpec\` — a noun, its params, its effect profile, its
formatters. The CLI commands, the MCP tools, shell completion, and the
surface/docs are all *projections* of that one shape, so they cannot drift. The
projected surface is frozen in a covenant (\`surface/covenant.json\`): a single
source of truth a test asserts the live grammar still emits, tool for tool.

## LLM-optimized output

Each verb renders three ways — \`plain\` for a terminal, \`json\` for the machine
envelope, and \`llm\` for condensed Markdown. \`--format llm\` (or a non-interactive
stdout) selects the agent form: the same data, shaped for a model to read. This
colophon is itself a showcase of that render model.

## Modular, storeless by construction

Capabilities ship as **modules** — named bundles of verbs with optional
boot / resource / prompt hooks. A verb declares whether it \`needsStore\`, and
the dispatcher boots the triple store *only* for those; a storeless verb
(\`info\`, \`config\`, \`capabilities\`, \`colophon\`) never pays for the graph.

## Scaffolding

\`pragma create\` scaffolds components, packages, and applications through the
\`@canonical/summon-*\` generators, reusing summon's rich Ink wizard when it runs
interactively.

## The domain reads as data

A domain is a **pack**: a declarative \`PackDefinition\` (its list / lookup
queries) compiled into verbs, backed by a content-addressed graphpack that
\`sources update\` builds once. Swap the pack and the same pragma serves a
different domain — including the domain colophon printed below this one.`;

/** The condensed body `--format llm` prefers (Markdown, no leading H1). */
const DISTRIBUTION_COLOPHON_SUMMARY = `pragma is a domain-based toolchain: one CLI + MCP server projected from a single \`VerbSpec\` grammar.

- **Effect monad** (\`@canonical/task\`): reads are async; a mutation returns an interpreted \`Task\`, so \`--dry-run\` and \`--undo\` are free. The dispatcher branches on \`capability.mutates\`.
- **One grammar, many projections**: CLI, MCP tools, completion, and docs all project one \`VerbSpec\`; the emitted surface is frozen in a covenant so the projections never drift.
- **LLM-optimized output**: every verb renders \`plain\` / \`json\` / \`llm\`; \`--format llm\` (or a piped stdout) emits condensed Markdown for agents.
- **Modular + storeless**: capability modules; the triple store boots only for \`needsStore\` verbs.
- **Domain as data**: a pack is a declarative \`PackDefinition\` compiled to verbs over a content-addressed graph built by \`sources update\`.`;

export default {
  name: "pragma",
  help: "Explore the design system",
  colophon: {
    markdown: `${DISTRIBUTION_COLOPHON}\n\nMade by the Canonical Webteam — https://canonical.com.`,
    summary: DISTRIBUTION_COLOPHON_SUMMARY,
  },
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
